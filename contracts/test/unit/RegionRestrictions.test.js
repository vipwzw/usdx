const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Region Restrictions Comprehensive Tests", () => {
  let token;
  let deployer, complianceOfficer, user1, user2, user3;
  const REGION_RESTRICTION = 15;
  const SUCCESS = 0;

  beforeEach(async () => {
    [deployer, complianceOfficer, user1, user2, user3] = await ethers.getSigners();

    const USDXToken = await ethers.getContractFactory("USDXToken");
    token = await upgrades.deployProxy(USDXToken, [
      "USDX Stablecoin",
      "USDX",
      ethers.parseUnits("1000000", 6), // 1M tokens
      deployer.address,
    ]);

    // 给合规官员分配 COMPLIANCE_ROLE
    const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();
    await token.grantRole(COMPLIANCE_ROLE, complianceOfficer.address);

    // 设置所有测试地址为 KYC 验证用户
    await token.connect(complianceOfficer).setKYCVerified(user1.address, true);
    await token.connect(complianceOfficer).setKYCVerified(user2.address, true);
    await token.connect(complianceOfficer).setKYCVerified(user3.address, true);

    // 给用户一些代币用于测试
    await token.mint(user1.address, ethers.parseUnits("10000", 6));
    await token.mint(user2.address, ethers.parseUnits("10000", 6));
    await token.mint(user3.address, ethers.parseUnits("10000", 6));
  });

  describe("Region Restrictions基础功能测试", () => {
    it("默认情况下，地区限制应该是禁用的", async () => {
      expect(await token.isRegionRestrictionsEnabled()).to.be.false;
    });

    it("应该能够启用地区限制功能", async () => {
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);
      expect(await token.isRegionRestrictionsEnabled()).to.be.true;
    });

    it("应该能够禁用地区限制功能", async () => {
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(false);
      expect(await token.isRegionRestrictionsEnabled()).to.be.false;
    });

    it("只有 COMPLIANCE_ROLE 可以设置地区限制状态", async () => {
      await expect(token.connect(user1).setRegionRestrictionsEnabled(true)).to.be.reverted;
    });
  });

  describe("Region Code管理测试", () => {
    it("应该能够设置地址的地区代码", async () => {
      await token.connect(complianceOfficer).setRegionCode(user1.address, 1); // 美国
      expect(await token.getRegionCode(user1.address)).to.equal(1);
    });

    it("不能为零地址设置地区代码", async () => {
      await expect(
        token.connect(complianceOfficer).setRegionCode(ethers.ZeroAddress, 1),
      ).to.be.revertedWithCustomError(token, "CannotSetLimitForZeroAddress");
    });

    it("只有 COMPLIANCE_ROLE 可以设置地区代码", async () => {
      await expect(token.connect(user1).setRegionCode(user2.address, 1)).to.be.reverted;
    });

    it("应该能够设置多个不同的地区代码", async () => {
      await token.connect(complianceOfficer).setRegionCode(user1.address, 1); // 美国
      await token.connect(complianceOfficer).setRegionCode(user2.address, 44); // 英国
      await token.connect(complianceOfficer).setRegionCode(user3.address, 86); // 中国

      expect(await token.getRegionCode(user1.address)).to.equal(1);
      expect(await token.getRegionCode(user2.address)).to.equal(44);
      expect(await token.getRegionCode(user3.address)).to.equal(86);
    });

    it("默认地区代码应该是0", async () => {
      expect(await token.getRegionCode(user1.address)).to.equal(0);
      expect(await token.getRegionCode(user2.address)).to.equal(0);
      expect(await token.getRegionCode(user3.address)).to.equal(0);
    });
  });

  describe("Allowed Regions管理测试", () => {
    it("应该能够设置允许的地区", async () => {
      await token.connect(complianceOfficer).setAllowedRegion(1, true); // 允许美国
      await token.connect(complianceOfficer).setAllowedRegion(44, true); // 允许英国

      expect(await token.isRegionAllowed(1)).to.be.true;
      expect(await token.isRegionAllowed(44)).to.be.true;
    });

    it("应该能够移除允许的地区", async () => {
      await token.connect(complianceOfficer).setAllowedRegion(1, true);
      expect(await token.isRegionAllowed(1)).to.be.true;

      await token.connect(complianceOfficer).setAllowedRegion(1, false); // 禁止美国
      expect(await token.isRegionAllowed(1)).to.be.false;
    });

    it("只有 COMPLIANCE_ROLE 可以设置允许地区", async () => {
      await expect(token.connect(user1).setAllowedRegion(1, true)).to.be.reverted;
    });

    it("应该能够设置地区代码0（默认地区）", async () => {
      await token.connect(complianceOfficer).setAllowedRegion(0, true);
      expect(await token.isRegionAllowed(0)).to.be.true;
    });

    it("默认情况下地区应该是不被允许的", async () => {
      expect(await token.isRegionAllowed(1)).to.be.false;
      expect(await token.isRegionAllowed(44)).to.be.false;
      expect(await token.isRegionAllowed(86)).to.be.false;
      expect(await token.isRegionAllowed(0)).to.be.false;
    });
  });

  describe("Region Restriction逻辑测试", () => {
    const transferAmount = ethers.parseUnits("100", 6);

    beforeEach(async () => {
      // 启用地区限制
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);
    });

    it("当双方都在允许地区时，转账应该成功", async () => {
      // 设置地区代码
      await token.connect(complianceOfficer).setRegionCode(user1.address, 1); // 美国
      await token.connect(complianceOfficer).setRegionCode(user2.address, 1); // 美国

      // 将美国设为允许地区
      await token.connect(complianceOfficer).setAllowedRegion(1, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("当发送方在禁止地区时，转账应该被阻止", async () => {
      // 设置地区代码
      await token.connect(complianceOfficer).setRegionCode(user1.address, 999); // 禁止地区
      await token.connect(complianceOfficer).setRegionCode(user2.address, 1); // 美国

      // 只允许美国
      await token.connect(complianceOfficer).setAllowedRegion(1, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(REGION_RESTRICTION);
    });

    it("当接收方在禁止地区时，转账应该被阻止", async () => {
      // 设置地区代码
      await token.connect(complianceOfficer).setRegionCode(user1.address, 1); // 美国
      await token.connect(complianceOfficer).setRegionCode(user2.address, 999); // 禁止地区

      // 只允许美国
      await token.connect(complianceOfficer).setAllowedRegion(1, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(REGION_RESTRICTION);
    });

    it("当双方都在禁止地区时，转账应该被阻止", async () => {
      // 设置地区代码
      await token.connect(complianceOfficer).setRegionCode(user1.address, 999); // 禁止地区
      await token.connect(complianceOfficer).setRegionCode(user2.address, 888); // 另一个禁止地区

      // 只允许美国
      await token.connect(complianceOfficer).setAllowedRegion(1, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(REGION_RESTRICTION);
    });

    it("默认地区代码0应该被特殊处理", async () => {
      // 用户没有设置地区代码（默认为0）
      // 没有设置地区0为允许地区

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(REGION_RESTRICTION);
    });

    it("当允许地区0时，默认用户应该可以转账", async () => {
      // 允许地区0（默认地区）
      await token.connect(complianceOfficer).setAllowedRegion(0, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("跨允许地区的转账应该成功", async () => {
      // 设置不同的允许地区
      await token.connect(complianceOfficer).setRegionCode(user1.address, 1); // 美国
      await token.connect(complianceOfficer).setRegionCode(user2.address, 44); // 英国

      // 允许这两个地区
      await token.connect(complianceOfficer).setAllowedRegion(1, true);
      await token.connect(complianceOfficer).setAllowedRegion(44, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("实际转账应该被阻止并显示正确的错误", async () => {
      // 设置禁止地区
      await token.connect(complianceOfficer).setRegionCode(user1.address, 999);
      await token.connect(complianceOfficer).setAllowedRegion(1, true); // 只允许地区1

      await expect(token.connect(user1).transfer(user2.address, transferAmount))
        .to.be.revertedWithCustomError(token, "TransferRestricted")
        .withArgs(REGION_RESTRICTION, "Region restricted");
    });
  });

  describe("Region Restrictions与其他限制的交互测试", () => {
    const transferAmount = ethers.parseUnits("100", 6);

    beforeEach(async () => {
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);
      await token.connect(complianceOfficer).setRegionCode(user1.address, 999); // 禁止地区
      await token.connect(complianceOfficer).setAllowedRegion(1, true); // 只允许地区1
    });

    it("REGION_RESTRICTION 优先级应该低于黑名单检查", async () => {
      // 将发送方加入黑名单
      await token.setBlacklisted(user1.address, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );

      // 应该返回黑名单错误，而不是地区限制
      expect(restrictionCode).to.equal(2); // BLACKLISTED_SENDER
    });

    it("REGION_RESTRICTION 优先级应该低于制裁检查", async () => {
      // 将发送方加入制裁名单
      await token.setSanctioned(user1.address, true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );

      // 应该返回制裁错误，而不是地区限制
      expect(restrictionCode).to.equal(9); // SANCTIONED_ADDRESS
    });

    it("REGION_RESTRICTION 优先级应该低于KYC检查", async () => {
      // 移除发送方的KYC验证
      await token.connect(complianceOfficer).setKYCVerified(user1.address, false);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );

      // 应该返回KYC错误，而不是地区限制
      expect(restrictionCode).to.equal(6); // INVALID_KYC_SENDER
    });

    it("禁用地区限制后，地区限制应该不再生效", async () => {
      // 首先确认地区限制生效
      let restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(REGION_RESTRICTION);

      // 禁用地区限制
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(false);

      // 现在应该不再有地区限制
      restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });
  });

  describe("Mint和Burn操作的地区限制测试", () => {
    const transferAmount = ethers.parseUnits("100", 6);

    beforeEach(async () => {
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);
      await token.connect(complianceOfficer).setRegionCode(user1.address, 999); // 禁止地区
      await token.connect(complianceOfficer).setAllowedRegion(1, true); // 只允许地区1
    });

    it("mint 操作不受地区限制影响", async () => {
      // mint 到禁止地区的地址应该成功
      await expect(token.mint(user1.address, transferAmount)).to.not.be.reverted;
    });

    it("burn 操作不受地区限制影响", async () => {
      // 从禁止地区的地址burn应该成功
      await expect(token.connect(user1).burn(transferAmount)).to.not.be.reverted;
    });

    it("零地址相关操作不受地区限制影响", async () => {
      // 检查从零地址转账（mint场景）
      const restrictionCode1 = await token.detectTransferRestriction(
        ethers.ZeroAddress,
        user1.address,
        transferAmount,
      );
      expect(restrictionCode1).to.equal(SUCCESS);

      // 检查到零地址转账（burn场景）
      const restrictionCode2 = await token.detectTransferRestriction(
        user1.address,
        ethers.ZeroAddress,
        transferAmount,
      );
      expect(restrictionCode2).to.equal(SUCCESS);
    });
  });

  describe("边界情况和错误处理测试", () => {
    it("应该能够处理大量地区代码", async () => {
      const largeRegionCode = 999999;
      await token.connect(complianceOfficer).setRegionCode(user1.address, largeRegionCode);
      await token.connect(complianceOfficer).setAllowedRegion(largeRegionCode, true);

      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user1.address, // 自转账
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("未设置地区代码的地址应该使用默认值0", async () => {
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);
      // 用户没有设置地区代码，默认为0
      // 没有允许地区0

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(REGION_RESTRICTION);
    });

    it("相同地区内的转账应该成功", async () => {
      await token.connect(complianceOfficer).setRegionCode(user1.address, 1);
      await token.connect(complianceOfficer).setRegionCode(user2.address, 1);
      await token.connect(complianceOfficer).setAllowedRegion(1, true);
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(SUCCESS);
    });

    it("自转账应该遵循地区限制规则", async () => {
      await token.connect(complianceOfficer).setRegionCode(user1.address, 999); // 禁止地区
      await token.connect(complianceOfficer).setAllowedRegion(1, true); // 只允许地区1
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user1.address, // 自转账
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(REGION_RESTRICTION);
    });
  });

  describe("批量地区管理测试", () => {
    it("应该能够批量设置多个地区代码", async () => {
      const users = [user1, user2, user3];
      const regionCodes = [1, 44, 86]; // 美国、英国、中国

      for (let i = 0; i < users.length; i++) {
        await token.connect(complianceOfficer).setRegionCode(users[i].address, regionCodes[i]);
      }

      // 允许所有这些地区
      for (const code of regionCodes) {
        await token.connect(complianceOfficer).setAllowedRegion(code, true);
      }

      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);

      // 测试跨地区转账
      const transferAmount = ethers.parseUnits("100", 6);
      for (let i = 0; i < users.length; i++) {
        for (let j = 0; j < users.length; j++) {
          if (i !== j) {
            const restrictionCode = await token.detectTransferRestriction(
              users[i].address,
              users[j].address,
              transferAmount,
            );
            expect(restrictionCode).to.equal(SUCCESS);
          }
        }
      }
    });

    it("应该能够批量移除地区权限", async () => {
      const regionCodes = [1, 44, 86];

      // 先允许所有地区
      for (const code of regionCodes) {
        await token.connect(complianceOfficer).setAllowedRegion(code, true);
      }

      // 然后禁止所有地区
      for (const code of regionCodes) {
        await token.connect(complianceOfficer).setAllowedRegion(code, false);
      }

      // 设置用户地区
      await token.connect(complianceOfficer).setRegionCode(user1.address, 1);
      await token.connect(complianceOfficer).setRegionCode(user2.address, 44);
      await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);

      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(REGION_RESTRICTION);
    });
  });

  describe("Message测试", () => {
    it("应该返回正确的限制消息", async () => {
      const message = await token.messageForTransferRestriction(REGION_RESTRICTION);
      expect(message).to.equal("Region restricted");
    });
  });
});
