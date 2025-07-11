const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Comprehensive Integration Tests", () => {
  let token, governance;
  let deployer, compliance, blacklister, minter, pauser, upgrader;
  let user1, user2, user3, user4, user5;

  beforeEach(async () => {
    [
      deployer,
      compliance,
      blacklister,
      minter,
      pauser,
      upgrader,
      user1,
      user2,
      user3,
      user4,
      user5,
    ] = await ethers.getSigners();

    // Deploy contracts
    const USDXToken = await ethers.getContractFactory("USDXToken");
    token = await upgrades.deployProxy(USDXToken, [
      "USDX Stablecoin",
      "USDX",
      ethers.parseUnits("1000000", 6),
      deployer.address,
    ]);

    const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
    governance = await upgrades.deployProxy(USDXGovernance, [
      token.target,
      [deployer.address, user1.address, user2.address],
      2, // requiredVotes
      86400, // votingPeriod
      3600, // executionDelay
    ]);

    // Setup roles
    const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();
    const BLACKLISTER_ROLE = await token.BLACKLISTER_ROLE();
    const MINTER_ROLE = await token.MINTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();
    const UPGRADER_ROLE = await token.UPGRADER_ROLE();

    await token.grantRole(COMPLIANCE_ROLE, compliance.address);
    await token.grantRole(BLACKLISTER_ROLE, blacklister.address);
    await token.grantRole(MINTER_ROLE, minter.address);
    await token.grantRole(PAUSER_ROLE, pauser.address);
    await token.grantRole(UPGRADER_ROLE, upgrader.address);
  });

  describe("Multi-Restriction Interaction Tests", () => {
    it("应该正确处理多重限制的优先级", async () => {
      // 设置复杂的限制环境
      await token.connect(compliance).setKYCVerified(user1.address, true);
      await token.connect(compliance).setKYCVerified(user2.address, true);
      await token.connect(minter).mint(user1.address, ethers.parseUnits("1000000", 6));

      // 1. 黑名单检查（最高优先级）
      await token.connect(blacklister).setBlacklisted(user2.address, true);

      let restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(3); // BLACKLISTED_RECEIVER

      // 移除黑名单，测试制裁检查
      await token.connect(blacklister).setBlacklisted(user2.address, false);
      await token.connect(compliance).setSanctioned(user2.address, true);

      restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(9); // SANCTIONED_ADDRESS

      // 移除制裁，测试地区限制
      await token.connect(compliance).setSanctioned(user2.address, false);
      await token.connect(compliance).setRegionRestrictionsEnabled(true);
      await token.connect(compliance).setRegionCode(user1.address, 1); // US
      await token.connect(compliance).setRegionCode(user2.address, 86); // China
      await token.connect(compliance).setAllowedRegion(1, true); // 只允许美国

      restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(15); // REGION_RESTRICTION
    });

    it("应该正确处理合规违规的复杂场景", async () => {
      // 设置复杂的合规违规场景
      await token.connect(compliance).setKYCVerified(user1.address, true);
      await token.connect(minter).mint(user1.address, ethers.parseUnits("1000000", 6));

      // 场景1: 超大额转账到已KYC新账户（第二个合规违规条件）
      await token.connect(compliance).setKYCVerified(user2.address, true);
      const veryLargeAmount = ethers.parseUnits("800000", 6); // > 75% of max (1M)
      let restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address, // 已KYC但余额为0（新账户）
        veryLargeAmount,
      );
      expect(restrictionCode).to.equal(13); // COMPLIANCE_VIOLATION

      // 场景2: 验证第二个合规违规条件确实触发
      const largeAmount = ethers.parseUnits("600000", 6); // < 75% but > 50%
      restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        largeAmount,
      );
      expect(restrictionCode).to.equal(0); // SUCCESS - 不触发合规违规

      // 场景3: 给账户一些余额，使其不是新账户
      await token.connect(minter).mint(user2.address, ethers.parseUnits("1", 6));
      restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        veryLargeAmount,
      );
      expect(restrictionCode).to.equal(0); // SUCCESS
    });
  });

  describe("Full Lifecycle Integration Tests", () => {
    it("应该完成完整的用户生命周期", async () => {
      console.log("\n🔄 完整用户生命周期测试");

      // 阶段1: 用户注册和KYC
      console.log("📋 阶段1: 用户注册和KYC验证");
      await token.connect(compliance).setKYCVerified(user1.address, true);
      await token.connect(compliance).setKYCVerified(user2.address, true);

      expect(await token.isKYCVerified(user1.address)).to.be.true;
      expect(await token.isKYCVerified(user2.address)).to.be.true;

      // 阶段2: 初始资金分配
      console.log("💰 阶段2: 初始资金分配");
      const initialAmount = ethers.parseUnits("100000", 6);

      // 获取mint前的持有者计数
      const holderCountBeforeMint = await token.getCurrentHolderCount();
      await token.connect(minter).mint(user1.address, initialAmount);

      expect(await token.balanceOf(user1.address)).to.equal(initialAmount);
      expect(await token.getCurrentHolderCount()).to.equal(holderCountBeforeMint + 1n); // +user1

      // 阶段3: 日常交易
      console.log("🔄 阶段3: 日常交易活动");
      const transferAmount = ethers.parseUnits("10000", 6);
      const holderCountBeforeTransfer = await token.getCurrentHolderCount();
      await token.connect(user1).transfer(user2.address, transferAmount);

      expect(await token.balanceOf(user1.address)).to.equal(initialAmount - transferAmount);
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await token.getCurrentHolderCount()).to.equal(holderCountBeforeTransfer + 1n); // +user2

      // 阶段4: 合规检查和限制
      console.log("🛡️ 阶段4: 合规检查和限制");
      // 设置日限额
      const dailyLimit = ethers.parseUnits("50000", 6);
      await token.connect(compliance).setDailyTransferLimit(user1.address, dailyLimit);

      // 在限额内的转账应该成功
      await token.connect(user1).transfer(user2.address, ethers.parseUnits("30000", 6));

      // 超出限额的转账应该失败
      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseUnits("30000", 6)),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");

      // 阶段5: 紧急情况处理
      console.log("🚨 阶段5: 紧急情况处理");
      // 模拟可疑活动，加入黑名单
      await token.connect(blacklister).setBlacklisted(user1.address, true);

      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseUnits("1000", 6)),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");

      // 阶段6: 问题解决和恢复
      console.log("✅ 阶段6: 问题解决和恢复");
      await token.connect(blacklister).setBlacklisted(user1.address, false);

      // 现在应该可以正常转账
      await token.connect(user1).transfer(user2.address, ethers.parseUnits("1000", 6));
    });

    it("应该正确处理企业级批量操作", async () => {
      console.log("\n🏢 企业级批量操作测试");

      const userCount = 20;
      const users = [user1, user2, user3, user4, user5];

      // 扩展用户列表
      while (users.length < userCount) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        users.push(wallet);
      }

      // 阶段1: 批量KYC验证
      console.log("📋 阶段1: 批量KYC验证");
      for (let i = 0; i < users.length; i++) {
        await token.connect(compliance).setKYCVerified(users[i].address, true);
      }

      // 验证所有用户都已KYC验证
      for (const user of users) {
        expect(await token.isKYCVerified(user.address)).to.be.true;
      }

      // 阶段2: 批量资金分配（如工资发放）
      console.log("💰 阶段2: 批量资金分配");
      const salaryAmount = ethers.parseUnits("5000", 6);

      for (let i = 0; i < users.length; i++) {
        await token.connect(minter).mint(users[i].address, salaryAmount);
      }

      // 验证所有用户余额
      for (const user of users) {
        expect(await token.balanceOf(user.address)).to.equal(salaryAmount);
      }

      // 阶段3: 批量合规设置
      console.log("🛡️ 阶段3: 批量合规设置");
      const dailyLimit = ethers.parseUnits("10000", 6);

      for (let i = 0; i < Math.min(10, users.length); i++) {
        await token.connect(compliance).setDailyTransferLimit(users[i].address, dailyLimit);
      }

      // 阶段4: 验证系统稳定性
      console.log("🔍 阶段4: 系统稳定性验证");
      const totalSupplyBefore = await token.totalSupply();
      const holderCountBefore = await token.getCurrentHolderCount();

      // 执行一些转账
      const transferAmount = ethers.parseUnits("1000", 6);
      for (let i = 0; i < Math.min(5, users.length - 1); i++) {
        await token.connect(users[i]).transfer(users[i + 1].address, transferAmount);
      }

      // 验证总供应量不变
      expect(await token.totalSupply()).to.equal(totalSupplyBefore);

      // 验证持有者数量正确（转账不会改变总持有者数量，只是重新分配）
      expect(await token.getCurrentHolderCount()).to.be.at.least(holderCountBefore);

      console.log(`✅ 批量操作完成：${users.length}个用户，总供应量保持一致`);
    });
  });

  describe("Governance Integration Tests", () => {
    it("应该通过治理正确执行合规决策", async () => {
      console.log("\n🗳️ 治理合规决策集成测试");

      // 准备测试环境
      await token.connect(compliance).setKYCVerified(user3.address, true);
      await token.connect(minter).mint(user3.address, ethers.parseUnits("10000", 6));

      // 场景: 通过治理决定解除用户制裁
      await token.connect(compliance).setSanctioned(user3.address, true);

      // 验证用户被制裁
      expect(await token.isSanctioned(user3.address)).to.be.true;

      // 先给治理合约合规权限
      const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();
      await token.connect(deployer).grantRole(COMPLIANCE_ROLE, governance.target);

      // 创建治理提案解除制裁
      const target = token.target;
      const data = token.interface.encodeFunctionData("setSanctioned", [user3.address, false]);

      const tx = await governance.connect(deployer).propose(target, 0, data, "解除用户制裁状态");
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args[0];

      // 治理者投票
      await governance.connect(deployer).castVote(proposalId, true);
      await governance.connect(user1).castVote(proposalId, true);

      // 等待投票期结束
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      // 等待执行延迟
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      // 执行提案
      await governance.connect(deployer).execute(proposalId);

      // 验证制裁已被解除
      expect(await token.isSanctioned(user3.address)).to.be.false;

      // 先设置user4的KYC验证
      await token.connect(compliance).setKYCVerified(user4.address, true);

      // 验证用户现在可以正常转账
      await token.connect(user3).transfer(user4.address, ethers.parseUnits("1000", 6));
      expect(await token.balanceOf(user4.address)).to.equal(ethers.parseUnits("1000", 6));

      console.log("✅ 治理决策成功执行，用户制裁状态已解除");
    });

    it("应该正确处理紧急暂停和恢复流程", async () => {
      console.log("\n🚨 紧急暂停和恢复流程测试");

      // 准备正常用户
      await token.connect(compliance).setKYCVerified(user1.address, true);
      await token.connect(compliance).setKYCVerified(user2.address, true);
      await token.connect(minter).mint(user1.address, ethers.parseUnits("10000", 6));

      // 验证正常状态下可以转账
      await token.connect(user1).transfer(user2.address, ethers.parseUnits("1000", 6));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseUnits("1000", 6));

      // 紧急暂停
      await token.connect(pauser).pause();
      expect(await token.paused()).to.be.true;

      // 暂停期间转账应该失败
      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseUnits("1000", 6)),
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");

      // 先给治理合约暂停权限
      const PAUSER_ROLE = await token.PAUSER_ROLE();
      await token.connect(deployer).grantRole(PAUSER_ROLE, governance.target);

      // 通过治理恢复合约
      const target = token.target;
      const data = token.interface.encodeFunctionData("unpause", []);

      const tx = await governance.connect(deployer).propose(target, 0, data, "恢复合约正常运行");
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args[0];

      // 治理投票和执行
      await governance.connect(deployer).castVote(proposalId, true);
      await governance.connect(user1).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await governance.connect(deployer).execute(proposalId);

      // 验证合约已恢复
      expect(await token.paused()).to.be.false;

      // 验证可以正常转账
      await token.connect(user1).transfer(user2.address, ethers.parseUnits("1000", 6));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseUnits("2000", 6));

      console.log("✅ 紧急暂停和恢复流程成功完成");
    });
  });

  describe("Cross-Feature Integration Tests", () => {
    it("应该正确处理复杂的跨功能交互", async () => {
      console.log("\n🔗 复杂跨功能交互测试");

      // 设置复杂环境
      await token.connect(compliance).setKYCVerified(user1.address, true);
      await token.connect(compliance).setKYCVerified(user2.address, true);
      await token.connect(compliance).setKYCVerified(user3.address, true);
      await token.connect(compliance).setKYCVerified(user4.address, true);

      // 启用多种限制
      await token.connect(compliance).setRegionRestrictionsEnabled(true);
      await token.connect(compliance).setRecipientValidationRequired(true);
      await token.connect(compliance).setTransferAuthorizationRequired(true);

      // 设置地区代码
      await token.connect(compliance).setRegionCode(user1.address, 1); // US
      await token.connect(compliance).setRegionCode(user2.address, 1); // US
      await token.connect(compliance).setRegionCode(user3.address, 86); // China
      await token.connect(compliance).setAllowedRegion(1, true); // 允许美国

      // 设置授权和验证
      await token.connect(compliance).setAuthorizedSender(user1.address, true);
      await token.connect(compliance).setValidRecipient(user2.address, true);

      // 资金准备
      await token.connect(minter).mint(user1.address, ethers.parseUnits("100000", 6));

      // 测试1: 符合所有条件的转账应该成功
      await token.connect(user1).transfer(user2.address, ethers.parseUnits("10000", 6));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseUnits("10000", 6));

      // 测试2: 接收方验证应该阻止转账（优先级比地区限制高）
      const restrictionCode1 = await token.detectTransferRestriction(
        user1.address,
        user3.address, // 不是有效接收方
        ethers.parseUnits("1000", 6),
      );
      expect(restrictionCode1).to.equal(11); // INVALID_RECIPIENT

      // 测试3: 接收方验证应该阻止转账
      const restrictionCode2 = await token.detectTransferRestriction(
        user1.address,
        user4.address, // 不是有效接收方
        ethers.parseUnits("1000", 6),
      );
      expect(restrictionCode2).to.equal(11); // INVALID_RECIPIENT

      // 测试4: 发送方授权应该阻止转账
      await token.connect(compliance).setValidRecipient(user4.address, true);
      const restrictionCode3 = await token.detectTransferRestriction(
        user2.address, // 不是授权发送方
        user4.address,
        ethers.parseUnits("1000", 6),
      );
      expect(restrictionCode3).to.equal(10); // UNAUTHORIZED_TRANSFER

      console.log("✅ 复杂跨功能交互测试通过，所有限制按预期工作");
    });
  });
});
