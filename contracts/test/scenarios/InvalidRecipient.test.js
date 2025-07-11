const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("INVALID_RECIPIENT 限制测试", function () {
  let token;
  let deployer, complianceOfficer, user1, validRecipient, invalidRecipient;
  const INVALID_RECIPIENT = 11;
  const SUCCESS = 0;

  beforeEach(async function () {
    [deployer, complianceOfficer, user1, validRecipient, invalidRecipient] =
      await ethers.getSigners();

    const USDXToken = await ethers.getContractFactory("USDXToken");
    token = await upgrades.deployProxy(USDXToken, [
      "USDX Stablecoin",
      "USDX",
      ethers.parseEther("1000000"), // 1M tokens
      deployer.address,
    ]);

    // 给合规官员分配 COMPLIANCE_ROLE
    const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();
    await token.grantRole(COMPLIANCE_ROLE, complianceOfficer.address);

    // 设置 user1 为 KYC 验证用户（mint之前需要）
    await token.connect(complianceOfficer).setKYCVerified(user1.address, true);
    await token.connect(complianceOfficer).setKYCVerified(validRecipient.address, true);
    await token.connect(complianceOfficer).setKYCVerified(invalidRecipient.address, true);

    // 给 user1 一些代币用于测试 (使用6位精度)
    await token.mint(user1.address, ethers.parseUnits("10000", 6));
  });

  describe("接收方验证功能测试", function () {
    it("默认情况下，接收方验证应该是禁用的", async function () {
      expect(await token.isRecipientValidationRequired()).to.be.false;

      // 默认情况下应该可以向任何地址转账
      const transferAmount = ethers.parseUnits("100", 6); // USDX uses 6 decimals
      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        invalidRecipient.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("应该能够启用接收方验证功能", async function () {
      await token.connect(complianceOfficer).setRecipientValidationRequired(true);
      expect(await token.isRecipientValidationRequired()).to.be.true;
    });

    it("应该能够禁用接收方验证功能", async function () {
      await token.connect(complianceOfficer).setRecipientValidationRequired(true);
      await token.connect(complianceOfficer).setRecipientValidationRequired(false);
      expect(await token.isRecipientValidationRequired()).to.be.false;
    });

    it("只有 COMPLIANCE_ROLE 可以设置接收方验证要求", async function () {
      await expect(token.connect(user1).setRecipientValidationRequired(true)).to.be.reverted;
    });
  });

  describe("有效接收方管理测试", function () {
    beforeEach(async function () {
      // 启用接收方验证
      await token.connect(complianceOfficer).setRecipientValidationRequired(true);
    });

    it("应该能够设置有效接收方", async function () {
      await token.connect(complianceOfficer).setValidRecipient(validRecipient.address, true);
      expect(await token.isValidRecipient(validRecipient.address)).to.be.true;
    });

    it("应该能够移除有效接收方", async function () {
      await token.connect(complianceOfficer).setValidRecipient(validRecipient.address, true);
      await token.connect(complianceOfficer).setValidRecipient(validRecipient.address, false);
      expect(await token.isValidRecipient(validRecipient.address)).to.be.false;
    });

    it("不能设置零地址为有效接收方", async function () {
      await expect(
        token.connect(complianceOfficer).setValidRecipient(ethers.ZeroAddress, true),
      ).to.be.revertedWithCustomError(token, "CannotSetLimitForZeroAddress");
    });

    it("只有 COMPLIANCE_ROLE 可以设置有效接收方", async function () {
      await expect(token.connect(user1).setValidRecipient(validRecipient.address, true)).to.be
        .reverted;
    });

    it("默认情况下地址不是有效接收方", async function () {
      expect(await token.isValidRecipient(invalidRecipient.address)).to.be.false;
    });
  });

  describe("INVALID_RECIPIENT 限制逻辑测试", function () {
    const transferAmount = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      // 启用接收方验证
      await token.connect(complianceOfficer).setRecipientValidationRequired(true);
      // 设置一个有效接收方
      await token.connect(complianceOfficer).setValidRecipient(validRecipient.address, true);
    });

    it("向有效接收方转账应该成功", async function () {
      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        validRecipient.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("向无效接收方转账应该返回 INVALID_RECIPIENT", async function () {
      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        invalidRecipient.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(INVALID_RECIPIENT);
    });

    it("向无效接收方转账应该返回正确的错误消息", async function () {
      const message = await token.messageForTransferRestriction(INVALID_RECIPIENT);
      expect(message).to.equal("Invalid recipient");
    });

    it("实际转账应该被阻止并显示正确的错误", async function () {
      await expect(token.connect(user1).transfer(invalidRecipient.address, transferAmount))
        .to.be.revertedWithCustomError(token, "TransferRestricted")
        .withArgs(INVALID_RECIPIENT, "Invalid recipient");
    });

    it("mint 操作不受接收方验证限制", async function () {
      // mint 操作应该始终成功，不受 INVALID_RECIPIENT 限制
      await expect(token.mint(invalidRecipient.address, transferAmount)).to.not.be.reverted;
    });

    it("零地址(burn)不受接收方验证限制", async function () {
      // burn 操作的 to 地址是零地址，应该不受限制
      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        ethers.ZeroAddress,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });
  });

  describe("与其他限制的交互测试", function () {
    const transferAmount = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      await token.connect(complianceOfficer).setRecipientValidationRequired(true);
      await token.connect(complianceOfficer).setValidRecipient(validRecipient.address, true);
    });

    it("INVALID_RECIPIENT 优先级应该低于黑名单检查", async function () {
      // 将有效接收方加入黑名单
      await token.setBlacklisted(validRecipient.address, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        validRecipient.address,
        transferAmount,
      );

      // 应该返回黑名单错误，而不是 INVALID_RECIPIENT
      expect(restrictionCode).to.equal(3); // BLACKLISTED_RECEIVER
    });

    it("INVALID_RECIPIENT 优先级应该低于制裁检查", async function () {
      // 将有效接收方加入制裁名单
      await token.setSanctioned(validRecipient.address, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        validRecipient.address,
        transferAmount,
      );

      // 应该返回制裁错误，而不是 INVALID_RECIPIENT
      expect(restrictionCode).to.equal(9); // SANCTIONED_ADDRESS
    });

    it("禁用接收方验证后，所有地址都应该可以接收", async function () {
      // 首先确认无效接收方会被阻止
      let restrictionCode = await token.detectTransferRestriction(
        user1.address,
        invalidRecipient.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(INVALID_RECIPIENT);

      // 禁用接收方验证
      await token.connect(complianceOfficer).setRecipientValidationRequired(false);

      // 现在应该可以向任何地址转账
      restrictionCode = await token.detectTransferRestriction(
        user1.address,
        invalidRecipient.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });
  });

  describe("边界情况测试", function () {
    const transferAmount = ethers.parseUnits("100", 6);

    it("当接收方验证未启用时，设置有效接收方应该无效果", async function () {
      // 接收方验证未启用
      expect(await token.isRecipientValidationRequired()).to.be.false;

      // 设置有效接收方
      await token.connect(complianceOfficer).setValidRecipient(validRecipient.address, true);

      // 向未在列表中的地址转账应该成功（因为验证未启用）
      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        invalidRecipient.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("大量设置有效接收方应该正常工作", async function () {
      await token.connect(complianceOfficer).setRecipientValidationRequired(true);

      // 创建多个测试地址
      const recipients = [];
      for (let i = 0; i < 10; i++) {
        const wallet = ethers.Wallet.createRandom();
        recipients.push(wallet.address);
      }

      // 批量设置为有效接收方（同时设置KYC验证）
      for (const recipient of recipients) {
        await token.connect(complianceOfficer).setKYCVerified(recipient, true);
        await token.connect(complianceOfficer).setValidRecipient(recipient, true);
        expect(await token.isValidRecipient(recipient)).to.be.true;
      }

      // 验证转账
      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        recipients[0],
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });
  });
});
