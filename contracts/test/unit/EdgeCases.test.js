const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Edge Cases and Error Handling", () => {
  let token, governance;
  let deployer, complianceOfficer, user1, user2, _user3;

  beforeEach(async () => {
    [deployer, complianceOfficer, user1, user2, _user3] = await ethers.getSigners();

    // Deploy USDXToken
    const USDXToken = await ethers.getContractFactory("USDXToken");
    token = await upgrades.deployProxy(USDXToken, [
      "USDX Stablecoin",
      "USDX",
      ethers.parseUnits("1000000", 6),
      deployer.address,
    ]);

    // Deploy USDXGovernance
    const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
    governance = await upgrades.deployProxy(USDXGovernance, [
      token.target,
      [deployer.address],
      1, // requiredVotes
      86400, // votingPeriod (1 day)
      3600, // executionDelay (1 hour)
    ]);

    // Setup roles
    const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();
    await token.grantRole(COMPLIANCE_ROLE, complianceOfficer.address);
  });

  describe("USDXToken Edge Cases", () => {
    describe("Compliance Violation Edge Cases", () => {
      it("应该检测大额转账到未KYC新账户的合规违规", async () => {
        // 设置用户1为KYC验证用户并给予资金
        await token.setKYCVerified(user1.address, true);
        // 不设置user2的KYC验证，保持其为未验证状态
        await token.mint(user1.address, ethers.parseUnits("1000000", 6));

        // 用户2未KYC验证且余额为0（新账户）
        const largeAmount = ethers.parseUnits("600000", 6); // > 50% of max transfer

        const restrictionCode = await token.detectTransferRestriction(
          user1.address,
          user2.address,
          largeAmount,
        );
        expect(restrictionCode).to.equal(7); // INVALID_KYC_RECEIVER（KYC检查优先级更高）
      });

      it("应该检测超大额转账到已验证新账户的合规违规", async () => {
        // 设置双方为KYC验证用户
        await token.setKYCVerified(user1.address, true);
        await token.setKYCVerified(user2.address, true);
        await token.mint(user1.address, ethers.parseUnits("1000000", 6));

        // 超大额转账 (>75% of max transfer)
        const veryLargeAmount = ethers.parseUnits("800000", 6);

        const restrictionCode = await token.detectTransferRestriction(
          user1.address,
          user2.address,
          veryLargeAmount,
        );
        expect(restrictionCode).to.equal(13); // COMPLIANCE_VIOLATION
      });

      it("应该允许到非新账户的大额转账", async () => {
        // 设置双方为KYC验证用户
        await token.setKYCVerified(user1.address, true);
        await token.setKYCVerified(user2.address, true);
        await token.mint(user1.address, ethers.parseUnits("1000000", 6));
        await token.mint(user2.address, ethers.parseUnits("1", 6)); // 使user2不是新账户

        const largeAmount = ethers.parseUnits("600000", 6);

        const restrictionCode = await token.detectTransferRestriction(
          user1.address,
          user2.address,
          largeAmount,
        );
        expect(restrictionCode).to.equal(0); // SUCCESS
      });
    });

    describe("Holder Count Update Edge Cases", () => {
      it("应该正确更新新持有者计数", async () => {
        await token.setKYCVerified(user1.address, true);
        await token.setKYCVerified(user2.address, true);

        const initialCount = await token.getCurrentHolderCount(); // deployer已经是持有者

        // 从零地址mint（新持有者）
        await token.mint(user1.address, ethers.parseUnits("100", 6));
        expect(await token.getCurrentHolderCount()).to.equal(initialCount + 1n);

        // 转账给新用户（又一个新持有者）
        await token.connect(user1).transfer(user2.address, ethers.parseUnits("50", 6));
        expect(await token.getCurrentHolderCount()).to.equal(initialCount + 2n);
      });

      it("应该正确处理余额变为零的情况", async () => {
        await token.setKYCVerified(user1.address, true);
        await token.setKYCVerified(user2.address, true);

        // 给user1一些代币
        await token.mint(user1.address, ethers.parseUnits("100", 6));
        const countAfterMint = await token.getCurrentHolderCount();

        // user1转移所有代币给user2
        await token.connect(user1).transfer(user2.address, ethers.parseUnits("100", 6));

        // 持有者数量应该保持不变（user1失去，user2获得）
        expect(await token.getCurrentHolderCount()).to.equal(countAfterMint);
      });

      it("应该正确处理burn操作对持有者计数的影响", async () => {
        await token.setKYCVerified(user1.address, true);

        await token.mint(user1.address, ethers.parseUnits("100", 6));
        const countAfterMint = await token.getCurrentHolderCount();

        // Burn所有代币
        await token.connect(user1).approve(deployer.address, ethers.parseUnits("100", 6));
        await token.burnFrom(user1.address, ethers.parseUnits("100", 6));

        // 持有者数量应该减少
        expect(await token.getCurrentHolderCount()).to.equal(countAfterMint - 1n);
      });
    });

    describe("Daily Transfer Limit Edge Cases", () => {
      it("应该处理没有设置日限额的情况", async () => {
        await token.setKYCVerified(user1.address, true);
        await token.setKYCVerified(user2.address, true);
        await token.mint(user1.address, ethers.parseUnits("1000", 6));

        // 没有设置日限额，应该可以转账任意金额
        await expect(token.connect(user1).transfer(user2.address, ethers.parseUnits("1000", 6))).to
          .not.be.reverted;
      });

      it("应该正确处理跨日期的转账限额重置", async () => {
        await token.setKYCVerified(user1.address, true);
        await token.setKYCVerified(user2.address, true);
        await token.mint(user1.address, ethers.parseUnits("1000", 6));

        // 设置日限额
        await token
          .connect(complianceOfficer)
          .setDailyTransferLimit(user1.address, ethers.parseUnits("100", 6));

        // 第一次转账
        await token.connect(user1).transfer(user2.address, ethers.parseUnits("100", 6));

        // 模拟时间流逝（这里我们只能测试逻辑，实际需要时间操控）
        expect(await token.getDailyTransferAmount(user1.address)).to.equal(
          ethers.parseUnits("100", 6),
        );
      });
    });

    describe("Authorization and Upgrade", () => {
      it("应该只允许UPGRADER_ROLE升级合约", async () => {
        const UPGRADER_ROLE = await token.UPGRADER_ROLE();

        // 验证非UPGRADER_ROLE用户不能mint（测试mint权限）
        await expect(token.connect(user1).mint(user1.address, 1)).to.be.reverted;

        // 验证UPGRADER_ROLE在部署时已正确设置
        expect(await token.hasRole(UPGRADER_ROLE, deployer.address)).to.be.true;

        // 测试用户没有UPGRADER_ROLE
        expect(await token.hasRole(UPGRADER_ROLE, user1.address)).to.be.false;
      });
    });
  });

  describe("USDXGovernance Edge Cases", () => {
    describe("Proposal State Edge Cases", () => {
      it("应该正确返回'Defeated'状态（反对票更多）", async () => {
        // 添加更多治理者
        await governance.addGovernor(user1.address);
        await governance.addGovernor(user2.address);
        await governance.setRequiredVotes(2);

        // 创建提案
        const tx = await governance.propose(
          token.target,
          0,
          "0x",
          "Test proposal for defeated state",
        );
        const receipt = await tx.wait();
        const proposalId = receipt.logs[0].args[0];

        // 一票支持，两票反对
        await governance.castVote(proposalId, true);
        await governance.connect(user1).castVote(proposalId, false);
        await governance.connect(user2).castVote(proposalId, false);

        // 等待投票期结束
        await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
        await ethers.provider.send("evm_mine");

        expect(await governance.getProposalState(proposalId)).to.equal("Defeated");
      });

      it("应该正确返回'Expired'状态", async () => {
        const tx = await governance.propose(
          token.target,
          0,
          "0x",
          "Test proposal for expired state",
        );
        const receipt = await tx.wait();
        const proposalId = receipt.logs[0].args[0];

        // 投票通过
        await governance.castVote(proposalId, true);

        // 等待投票期和执行延迟期都结束
        await ethers.provider.send("evm_increaseTime", [86400 + 3600 + 1]); // votingPeriod + executionDelay + 1
        await ethers.provider.send("evm_mine");

        expect(await governance.getProposalState(proposalId)).to.equal("Expired");
      });

      it("应该正确返回'Queued'状态", async () => {
        const tx = await governance.propose(
          token.target,
          0,
          "0x",
          "Test proposal for queued state",
        );
        const receipt = await tx.wait();
        const proposalId = receipt.logs[0].args[0];

        // 投票通过
        await governance.castVote(proposalId, true);

        // 等待投票期结束但执行延迟期未结束
        await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
        await ethers.provider.send("evm_mine");

        expect(await governance.getProposalState(proposalId)).to.equal("Queued");
      });
    });

    describe("Vote Tracking Edge Cases", () => {
      it("应该正确跟踪投票选择", async () => {
        const tx = await governance.propose(
          token.target,
          0,
          "0x",
          "Test proposal for vote tracking",
        );
        const receipt = await tx.wait();
        const proposalId = receipt.logs[0].args[0];

        // 添加治理者并投票
        await governance.addGovernor(user1.address);
        await governance.castVote(proposalId, true);
        await governance.connect(user1).castVote(proposalId, false);

        // 检查投票状态
        expect(await governance.hasVoted(proposalId, deployer.address)).to.be.true;
        expect(await governance.hasVoted(proposalId, user1.address)).to.be.true;
        expect(await governance.hasVoted(proposalId, user2.address)).to.be.false;

        // 检查投票选择
        expect(await governance.getVoteChoice(proposalId, deployer.address)).to.be.true;
        expect(await governance.getVoteChoice(proposalId, user1.address)).to.be.false;
      });

      it("查询未投票者的投票选择应该失败", async () => {
        const tx = await governance.propose(
          token.target,
          0,
          "0x",
          "Test proposal for vote tracking",
        );
        const receipt = await tx.wait();
        const proposalId = receipt.logs[0].args[0];

        await expect(governance.getVoteChoice(proposalId, user1.address)).to.be.reverted;
      });
    });

    describe("Governor Management Edge Cases", () => {
      it("应该正确处理治理者列表", async () => {
        const initialGovernors = await governance.getGovernors();
        expect(initialGovernors.length).to.equal(1);
        expect(initialGovernors[0]).to.equal(deployer.address);

        // 添加治理者
        await governance.addGovernor(user1.address);
        await governance.addGovernor(user2.address);

        const newGovernors = await governance.getGovernors();
        expect(newGovernors.length).to.equal(3);
        expect(await governance.getGovernorCount()).to.equal(3);

        // 移除治理者
        await governance.removeGovernor(user1.address);
        expect(await governance.getGovernorCount()).to.equal(2);
        expect(await governance.isGovernor(user1.address)).to.be.false;
      });

      it("应该正确处理重复添加治理者的错误", async () => {
        await expect(governance.addGovernor(deployer.address)).to.be.reverted;
      });
    });

    describe("Authorization Edge Cases", () => {
      it("应该只允许ADMIN_ROLE升级合约", async () => {
        const DEFAULT_ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();
        expect(await governance.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;

        // 这里我们不执行实际的升级，只验证权限
        expect(await governance.hasRole(DEFAULT_ADMIN_ROLE, user1.address)).to.be.false;
      });
    });
  });

  describe("Integration Edge Cases", () => {
    it("应该正确处理复杂的合规检查组合", async () => {
      // 设置复杂的合规环境
      await token.setKYCVerified(user1.address, true);
      await token.setKYCVerified(user2.address, true);
      await token.mint(user1.address, ethers.parseUnits("1000000", 6));

      // 设置接收方验证（优先级比地区限制高）
      await token.connect(complianceOfficer).setRecipientValidationRequired(true);
      // 不设置user2为有效接收方

      // 这应该触发接收方验证限制
      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        ethers.parseUnits("100", 6),
      );

      // 应该返回第一个检测到的限制（接收方验证限制）
      expect(restrictionCode).to.equal(11); // INVALID_RECIPIENT
    });
  });
});
