const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("UNAUTHORIZED_TRANSFER 限制测试", function () {
  let token;
  let deployer, complianceOfficer, user1, authorizedSender, unauthorizedSender;
  const UNAUTHORIZED_TRANSFER = 10;
  const SUCCESS = 0;

  beforeEach(async function () {
    [deployer, complianceOfficer, user1, authorizedSender, unauthorizedSender] =
      await ethers.getSigners();

    const USDXToken = await ethers.getContractFactory("USDXToken");
    token = await upgrades.deployProxy(USDXToken, [
      "USDX Stablecoin",
      "USDX",
      ethers.parseUnits("1000000", 6), // 1M tokens with 6 decimals
      deployer.address,
    ]);

    // 给合规官员分配 COMPLIANCE_ROLE
    const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();
    await token.grantRole(COMPLIANCE_ROLE, complianceOfficer.address);

    // 设置所有测试地址为 KYC 验证用户
    await token.connect(complianceOfficer).setKYCVerified(user1.address, true);
    await token.connect(complianceOfficer).setKYCVerified(authorizedSender.address, true);
    await token.connect(complianceOfficer).setKYCVerified(unauthorizedSender.address, true);

    // 给测试地址一些代币用于测试 (使用6位精度)
    await token.mint(authorizedSender.address, ethers.parseUnits("10000", 6));
    await token.mint(unauthorizedSender.address, ethers.parseUnits("10000", 6));
  });

  describe("转账授权功能测试", function () {
    it("默认情况下，转账授权验证应该是禁用的", async function () {
      expect(await token.isTransferAuthorizationRequired()).to.be.false;

      // 默认情况下应该可以从任何地址转账
      const transferAmount = ethers.parseUnits("100", 6);
      const restrictionCode = await token.detectTransferRestriction(
        unauthorizedSender.address,
        user1.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("应该能够启用转账授权验证功能", async function () {
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);
      expect(await token.isTransferAuthorizationRequired()).to.be.true;
    });

    it("应该能够禁用转账授权验证功能", async function () {
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(false);
      expect(await token.isTransferAuthorizationRequired()).to.be.false;
    });

    it("只有 COMPLIANCE_ROLE 可以设置转账授权要求", async function () {
      await expect(token.connect(user1).setTransferAuthorizationRequired(true)).to.be.reverted;
    });
  });

  describe("授权发送方管理测试", function () {
    beforeEach(async function () {
      // 启用转账授权验证
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);
    });

    it("应该能够设置授权发送方", async function () {
      await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, true);
      expect(await token.isAuthorizedSender(authorizedSender.address)).to.be.true;
    });

    it("应该能够移除授权发送方", async function () {
      await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, true);
      await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, false);
      expect(await token.isAuthorizedSender(authorizedSender.address)).to.be.false;
    });

    it("不能设置零地址为授权发送方", async function () {
      await expect(
        token.connect(complianceOfficer).setAuthorizedSender(ethers.ZeroAddress, true),
      ).to.be.revertedWithCustomError(token, "CannotSetLimitForZeroAddress");
    });

    it("只有 COMPLIANCE_ROLE 可以设置授权发送方", async function () {
      await expect(token.connect(user1).setAuthorizedSender(authorizedSender.address, true)).to.be
        .reverted;
    });

    it("默认情况下地址不是授权发送方", async function () {
      expect(await token.isAuthorizedSender(unauthorizedSender.address)).to.be.false;
    });
  });

  describe("UNAUTHORIZED_TRANSFER 限制逻辑测试", function () {
    const transferAmount = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      // 启用转账授权验证
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);
      // 设置一个授权发送方
      await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, true);
    });

    it("授权发送方转账应该成功", async function () {
      const restrictionCode = await token.detectTransferRestriction(
        authorizedSender.address,
        user1.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("未授权发送方转账应该返回 UNAUTHORIZED_TRANSFER", async function () {
      const restrictionCode = await token.detectTransferRestriction(
        unauthorizedSender.address,
        user1.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(UNAUTHORIZED_TRANSFER);
    });

    it("未授权发送方转账应该返回正确的错误消息", async function () {
      const message = await token.messageForTransferRestriction(UNAUTHORIZED_TRANSFER);
      expect(message).to.equal("Transfer unauthorized");
    });

    it("实际转账应该被阻止并显示正确的错误", async function () {
      await expect(token.connect(unauthorizedSender).transfer(user1.address, transferAmount))
        .to.be.revertedWithCustomError(token, "TransferRestricted")
        .withArgs(UNAUTHORIZED_TRANSFER, "Transfer unauthorized");
    });

    it("mint 操作不受转账授权限制", async function () {
      // mint 操作应该始终成功，不受 UNAUTHORIZED_TRANSFER 限制
      await expect(token.mint(unauthorizedSender.address, transferAmount)).to.not.be.reverted;
    });

    it("零地址(burn)不受转账授权限制", async function () {
      // burn 操作的 from 地址检查会跳过授权验证
      // 这里测试从零地址转账的场景
      const restrictionCode = await token.detectTransferRestriction(
        ethers.ZeroAddress,
        user1.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });
  });

  describe("与其他限制的交互测试", function () {
    const transferAmount = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);
      await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, true);
    });

    it("UNAUTHORIZED_TRANSFER 优先级应该低于黑名单检查", async function () {
      // 将授权发送方加入黑名单
      await token.setBlacklisted(authorizedSender.address, true);

      const restrictionCode = await token.detectTransferRestriction(
        authorizedSender.address,
        user1.address,
        transferAmount,
      );

      // 应该返回黑名单错误，而不是 UNAUTHORIZED_TRANSFER
      expect(restrictionCode).to.equal(2); // BLACKLISTED_SENDER
    });

    it("UNAUTHORIZED_TRANSFER 优先级应该低于制裁检查", async function () {
      // 将授权发送方加入制裁名单
      await token.setSanctioned(authorizedSender.address, true);

      const restrictionCode = await token.detectTransferRestriction(
        authorizedSender.address,
        user1.address,
        transferAmount,
      );

      // 应该返回制裁错误，而不是 UNAUTHORIZED_TRANSFER
      expect(restrictionCode).to.equal(9); // SANCTIONED_ADDRESS
    });

    it("UNAUTHORIZED_TRANSFER 优先级应该低于KYC检查", async function () {
      // 移除发送方的KYC验证
      await token.connect(complianceOfficer).setKYCVerified(unauthorizedSender.address, false);

      const restrictionCode = await token.detectTransferRestriction(
        unauthorizedSender.address,
        user1.address,
        transferAmount,
      );

      // 应该返回KYC错误，而不是 UNAUTHORIZED_TRANSFER
      expect(restrictionCode).to.equal(6); // INVALID_KYC_SENDER
    });

    it("禁用转账授权验证后，所有地址都应该可以发送", async function () {
      // 首先确认未授权发送方会被阻止
      let restrictionCode = await token.detectTransferRestriction(
        unauthorizedSender.address,
        user1.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(UNAUTHORIZED_TRANSFER);

      // 禁用转账授权验证
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(false);

      // 现在应该可以从任何地址转账
      restrictionCode = await token.detectTransferRestriction(
        unauthorizedSender.address,
        user1.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });
  });

  describe("边界情况测试", function () {
    const transferAmount = ethers.parseUnits("100", 6);

    it("当转账授权验证未启用时，设置授权发送方应该无效果", async function () {
      // 转账授权验证未启用
      expect(await token.isTransferAuthorizationRequired()).to.be.false;

      // 设置授权发送方
      await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, true);

      // 从未在列表中的地址转账应该成功（因为验证未启用）
      const restrictionCode = await token.detectTransferRestriction(
        unauthorizedSender.address,
        user1.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("大量设置授权发送方应该正常工作", async function () {
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);

      // 创建多个测试地址
      const senders = [];
      for (let i = 0; i < 10; i++) {
        const wallet = ethers.Wallet.createRandom();
        senders.push(wallet.address);
      }

      // 批量设置为授权发送方（同时设置KYC验证）
      for (const sender of senders) {
        await token.connect(complianceOfficer).setKYCVerified(sender, true);
        await token.connect(complianceOfficer).setAuthorizedSender(sender, true);
        expect(await token.isAuthorizedSender(sender)).to.be.true;
      }

      // 给第一个地址一些代币并验证转账
      await token.mint(senders[0], transferAmount);
      const restrictionCode = await token.detectTransferRestriction(
        senders[0],
        user1.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("transferFrom 操作应该同样受到授权限制", async function () {
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);

      // 给 user1 授权使用 unauthorizedSender 的代币
      await token.connect(unauthorizedSender).approve(user1.address, transferAmount);

      // user1 尝试从 unauthorizedSender 转账应该失败
      const restrictionCode = await token.detectTransferRestriction(
        unauthorizedSender.address,
        authorizedSender.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(UNAUTHORIZED_TRANSFER);
    });

    it("从部分授权的地址转出大量代币", async function () {
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);
      await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, true);

      // 测试大额转账
      const largeAmount = ethers.parseUnits("5000", 6);
      const restrictionCode = await token.detectTransferRestriction(
        authorizedSender.address,
        user1.address,
        largeAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });
  });

  describe("实际转账执行测试", function () {
    const transferAmount = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);
      await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, true);
    });

    it("授权发送方的实际转账应该成功", async function () {
      const initialBalance = await token.balanceOf(user1.address);

      await token.connect(authorizedSender).transfer(user1.address, transferAmount);

      const finalBalance = await token.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(transferAmount);
    });

    it("未授权发送方的实际转账应该失败", async function () {
      await expect(
        token.connect(unauthorizedSender).transfer(user1.address, transferAmount),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");
    });

    it("授权后再转账应该成功", async function () {
      // 首先确认转账会失败
      await expect(
        token.connect(unauthorizedSender).transfer(user1.address, transferAmount),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");

      // 然后授权该地址
      await token.connect(complianceOfficer).setAuthorizedSender(unauthorizedSender.address, true);

      // 现在转账应该成功
      const initialBalance = await token.balanceOf(user1.address);
      await token.connect(unauthorizedSender).transfer(user1.address, transferAmount);
      const finalBalance = await token.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(transferAmount);
    });
  });
});
