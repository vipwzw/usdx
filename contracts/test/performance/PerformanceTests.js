/**
 * 性能测试套件
 * 测试智能合约在高负载下的表现和Gas消耗
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { IntegrationTestBase, TestHelpers } = require("../integration/IntegrationTestConfig");

describe("Performance Tests", () => {
  let testBase;
  let gasTracker;

  // Gas消耗跟踪器
  class GasTracker {
    constructor() {
      this.operations = [];
      this.totalGas = 0n;
    }

    async track(operationName, txPromise) {
      const startTime = Date.now();
      const tx = await txPromise;
      const receipt = await tx.wait();
      const endTime = Date.now();

      const gasUsed = receipt.gasUsed;
      const gasPrice = tx.gasPrice || (await ethers.provider.getGasPrice());
      const gasCost = gasUsed * gasPrice;

      const operation = {
        name: operationName,
        gasUsed: gasUsed.toString(),
        gasPrice: gasPrice.toString(),
        gasCost: gasCost.toString(),
        duration: endTime - startTime,
        blockNumber: receipt.blockNumber,
      };

      this.operations.push(operation);
      this.totalGas += gasUsed;

      console.log(
        `🔥 ${operationName}: ${gasUsed.toLocaleString()} gas (${endTime - startTime}ms)`,
      );
      return { tx, receipt, gasUsed };
    }

    getReport() {
      const avgGas =
        this.operations.length > 0 ? Number(this.totalGas / BigInt(this.operations.length)) : 0;

      return {
        totalOperations: this.operations.length,
        totalGas: this.totalGas.toString(),
        averageGas: avgGas,
        operations: this.operations,
      };
    }

    printReport() {
      const report = this.getReport();
      console.log("\n📊 === Gas消耗性能报告 ===");
      console.log(`总操作数: ${report.totalOperations}`);
      console.log(`总Gas消耗: ${Number(report.totalGas).toLocaleString()}`);
      console.log(`平均Gas消耗: ${report.averageGas.toLocaleString()}`);
      console.log("\n详细操作:");
      report.operations.forEach((op, index) => {
        console.log(
          `${index + 1}. ${op.name}: ${Number(op.gasUsed).toLocaleString()} gas (${op.duration}ms)`,
        );
      });
      console.log("================================\n");
    }
  }

  beforeEach(async () => {
    testBase = new IntegrationTestBase();
    gasTracker = new GasTracker();
    await testBase.setupContracts();
  });

  afterEach(async () => {
    gasTracker.printReport();
  });

  describe("批量操作性能测试", () => {
    it("应该高效处理批量铸币操作", async () => {
      const batchSize = 50;
      const mintAmount = testBase.config.AMOUNTS.MINT_AMOUNT;
      const token = testBase.contracts.usdxToken;
      const minter = testBase.accounts.minter;

      console.log(`\n🚀 开始批量铸币测试 (${batchSize}个操作)`);

      // 生成随机地址
      const recipients = [];
      for (let i = 0; i < batchSize; i++) {
        recipients.push(TestHelpers.generateRandomAddress());
      }

      // 为随机地址设置KYC
      const compliance = testBase.accounts.compliance;
      for (let i = 0; i < recipients.length; i++) {
        await gasTracker.track(
          `设置KYC-${i + 1}`,
          token.connect(compliance).setKYCVerified(recipients[i], true),
        );
      }

      // 批量铸币
      for (let i = 0; i < recipients.length; i++) {
        await gasTracker.track(
          `铸币-${i + 1}`,
          token.connect(minter).mint(recipients[i], mintAmount),
        );
      }

      // 验证结果
      for (const recipient of recipients) {
        const balance = await token.balanceOf(recipient);
        expect(balance).to.equal(mintAmount);
      }

      // 检查总供应量
      const expectedTotalSupply =
        testBase.config.TOKEN.INITIAL_SUPPLY + mintAmount * BigInt(batchSize);
      const actualTotalSupply = await token.totalSupply();
      expect(actualTotalSupply).to.equal(expectedTotalSupply);
    });

    it("应该高效处理批量转账操作", async () => {
      const batchSize = 30;
      const transferAmount = testBase.config.AMOUNTS.TRANSFER_AMOUNT;
      const token = testBase.contracts.usdxToken;
      const sender = testBase.accounts.user1;

      console.log(`\n🚀 开始批量转账测试 (${batchSize}个操作)`);

      // 为发送者铸币
      const totalNeeded = transferAmount * BigInt(batchSize);
      await gasTracker.track(
        "初始铸币",
        token.connect(testBase.accounts.minter).mint(sender.address, totalNeeded),
      );

      // 生成接收者地址并设置KYC
      const recipients = [];
      for (let i = 0; i < batchSize; i++) {
        const recipient = TestHelpers.generateRandomAddress();
        recipients.push(recipient);
        await gasTracker.track(
          `设置KYC-${i + 1}`,
          token.connect(testBase.accounts.compliance).setKYCVerified(recipient, true),
        );
      }

      // 批量转账
      for (let i = 0; i < recipients.length; i++) {
        await gasTracker.track(
          `转账-${i + 1}`,
          token.connect(sender).transfer(recipients[i], transferAmount),
        );
      }

      // 验证结果
      for (const recipient of recipients) {
        const balance = await token.balanceOf(recipient);
        expect(balance).to.equal(transferAmount);
      }

      // 验证发送者余额
      const senderBalance = await token.balanceOf(sender.address);
      expect(senderBalance).to.equal(0);
    });
  });

  describe("治理操作性能测试", () => {
    it("应该高效处理多个治理提案", async () => {
      const proposalCount = 10;
      const token = testBase.contracts.usdxToken;
      const governance = testBase.contracts.governance;
      const governors = [testBase.accounts.governor1, testBase.accounts.governor2];

      console.log(`\n🚀 开始治理提案性能测试 (${proposalCount}个提案)`);

      const proposalIds = [];

      // 创建多个提案
      for (let i = 0; i < proposalCount; i++) {
        const target = await token.getAddress();
        const value = 0;
        const mintAmount = ethers.parseUnits((1000 * (i + 1)).toString(), 6);
        const data = token.interface.encodeFunctionData("mint", [
          testBase.accounts.user1.address,
          mintAmount,
        ]);
        const description = `批量提案 ${i + 1}: 铸币 ${1000 * (i + 1)} USDX`;

        const { receipt } = await gasTracker.track(
          `创建提案-${i + 1}`,
          governance.connect(testBase.accounts.governor1).propose(target, value, data, description),
        );

        const proposalId = receipt.logs[0].args.proposalId;
        proposalIds.push(proposalId);
      }

      // 为所有提案投票
      for (let i = 0; i < proposalIds.length; i++) {
        const proposalId = proposalIds[i];

        for (let j = 0; j < governors.length; j++) {
          await gasTracker.track(
            `投票-提案${i + 1}-投票者${j + 1}`,
            governance.connect(governors[j]).castVote(proposalId, true),
          );
        }
      }

      // 快进时间
      await testBase.fastForwardTime(
        testBase.config.GOVERNANCE.VOTING_PERIOD + testBase.config.GOVERNANCE.EXECUTION_DELAY + 1,
      );

      // 执行所有提案
      for (let i = 0; i < proposalIds.length; i++) {
        await gasTracker.track(
          `执行提案-${i + 1}`,
          governance.connect(testBase.accounts.governor1).execute(proposalIds[i]),
        );
      }

      // 验证结果
      const expectedFinalBalance = proposalIds.reduce((sum, _, index) => {
        return sum + ethers.parseUnits((1000 * (index + 1)).toString(), 6);
      }, 0n);

      const actualBalance = await token.balanceOf(testBase.accounts.user1.address);
      expect(actualBalance).to.equal(expectedFinalBalance);
    });
  });

  describe("合规检查性能测试", () => {
    it("应该高效处理大量合规检查", async () => {
      const checkCount = 100;
      const token = testBase.contracts.usdxToken;
      const amount = testBase.config.AMOUNTS.TRANSFER_AMOUNT;

      console.log(`\n🚀 开始合规检查性能测试 (${checkCount}次检查)`);

      // 生成测试地址
      const addresses = [];
      for (let i = 0; i < checkCount; i++) {
        addresses.push(TestHelpers.generateRandomAddress());
      }

      // 批量合规检查
      for (let i = 0; i < addresses.length; i++) {
        await gasTracker.track(
          `合规检查-${i + 1}`,
          token.detectTransferRestriction(testBase.accounts.user1.address, addresses[i], amount),
        );
      }

      // 设置部分地址为KYC验证状态
      const kycCount = Math.floor(checkCount / 2);
      for (let i = 0; i < kycCount; i++) {
        await gasTracker.track(
          `设置KYC-${i + 1}`,
          token.connect(testBase.accounts.compliance).setKYCVerified(addresses[i], true),
        );
      }

      // 再次进行合规检查，验证性能差异
      for (let i = 0; i < kycCount; i++) {
        await gasTracker.track(
          `KYC后检查-${i + 1}`,
          token.detectTransferRestriction(testBase.accounts.user1.address, addresses[i], amount),
        );
      }
    });

    it("应该高效处理黑名单批量操作", async () => {
      const blacklistCount = 50;
      const token = testBase.contracts.usdxToken;
      const blacklister = testBase.accounts.blacklister;

      console.log(`\n🚀 开始黑名单批量操作测试 (${blacklistCount}个地址)`);

      // 生成地址
      const addresses = [];
      for (let i = 0; i < blacklistCount; i++) {
        addresses.push(TestHelpers.generateRandomAddress());
      }

      // 批量添加到黑名单
      for (let i = 0; i < addresses.length; i++) {
        await gasTracker.track(
          `添加黑名单-${i + 1}`,
          token.connect(blacklister).setBlacklisted(addresses[i], true),
        );
      }

      // 验证黑名单状态
      for (const address of addresses) {
        const isBlacklisted = await token.isBlacklisted(address);
        expect(isBlacklisted).to.be.true;
      }

      // 批量移除黑名单
      for (let i = 0; i < addresses.length; i++) {
        await gasTracker.track(
          `移除黑名单-${i + 1}`,
          token.connect(blacklister).setBlacklisted(addresses[i], false),
        );
      }

      // 再次验证状态
      for (const address of addresses) {
        const isBlacklisted = await token.isBlacklisted(address);
        expect(isBlacklisted).to.be.false;
      }
    });
  });

  describe("极限负载测试", () => {
    it("应该在极限条件下保持稳定性", async () => {
      const extremeCount = 200;
      const token = testBase.contracts.usdxToken;
      const minter = testBase.accounts.minter;

      console.log(`\n🚀 开始极限负载测试 (${extremeCount}个操作)`);

      // 准备大量地址
      const addresses = [];
      for (let i = 0; i < extremeCount; i++) {
        addresses.push(TestHelpers.generateRandomAddress());
      }

      console.log("⚡ 阶段1: 批量KYC设置");
      // 分批处理KYC设置
      const batchSize = 20;
      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        for (let j = 0; j < batch.length; j++) {
          await gasTracker.track(
            `KYC设置-批次${Math.floor(i / batchSize) + 1}-${j + 1}`,
            token.connect(testBase.accounts.compliance).setKYCVerified(batch[j], true),
          );
        }

        // 每批次之间稍作休息
        if (i + batchSize < addresses.length) {
          await TestHelpers.waitBlocks(1);
        }
      }

      console.log("⚡ 阶段2: 批量铸币");
      // 分批铸币
      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        for (let j = 0; j < batch.length; j++) {
          await gasTracker.track(
            `铸币-批次${Math.floor(i / batchSize) + 1}-${j + 1}`,
            token.connect(minter).mint(batch[j], ethers.parseUnits("1000", 6)),
          );
        }

        if (i + batchSize < addresses.length) {
          await TestHelpers.waitBlocks(1);
        }
      }

      console.log("⚡ 阶段3: 状态验证");
      // 验证所有操作成功
      let successCount = 0;
      for (const address of addresses) {
        const balance = await token.balanceOf(address);
        const isKYCVerified = await token.isKYCVerified(address);

        if (balance === ethers.parseUnits("1000", 6) && isKYCVerified) {
          successCount++;
        }
      }

      console.log(
        `✅ 成功处理: ${successCount}/${extremeCount} (${((successCount / extremeCount) * 100).toFixed(2)}%)`,
      );

      // 期望至少95%成功率
      expect(successCount).to.be.greaterThan(extremeCount * 0.95);
    });
  });

  describe("Gas优化验证", () => {
    it("应该验证关键操作的Gas效率", async () => {
      const token = testBase.contracts.usdxToken;
      const governance = testBase.contracts.governance;

      console.log("\n🚀 开始Gas效率验证测试");

      // 定义Gas基准（可根据实际情况调整）
      const gasBenchmarks = {
        mint: 100000, // 铸币操作
        transfer: 80000, // 转账操作
        setKYC: 50000, // KYC设置
        blacklist: 50000, // 黑名单操作
        propose: 200000, // 创建提案
        vote: 80000, // 投票
        execute: 150000, // 执行提案
      };

      // 测试铸币Gas消耗
      const { gasUsed: mintGas } = await gasTracker.track(
        "Gas测试-铸币",
        token
          .connect(testBase.accounts.minter)
          .mint(testBase.accounts.user1.address, testBase.config.AMOUNTS.MINT_AMOUNT),
      );

      // 测试转账Gas消耗
      const { gasUsed: transferGas } = await gasTracker.track(
        "Gas测试-转账",
        token
          .connect(testBase.accounts.user1)
          .transfer(testBase.accounts.user2.address, testBase.config.AMOUNTS.TRANSFER_AMOUNT),
      );

      // 测试KYC设置Gas消耗
      const { gasUsed: kycGas } = await gasTracker.track(
        "Gas测试-KYC设置",
        token
          .connect(testBase.accounts.compliance)
          .setKYCVerified(TestHelpers.generateRandomAddress(), true),
      );

      // 测试黑名单操作Gas消耗
      const { gasUsed: blacklistGas } = await gasTracker.track(
        "Gas测试-黑名单操作",
        token
          .connect(testBase.accounts.blacklister)
          .setBlacklisted(TestHelpers.generateRandomAddress(), true),
      );

      // 测试治理提案Gas消耗
      const target = await token.getAddress();
      const data = token.interface.encodeFunctionData("pause", []);
      const { gasUsed: proposeGas } = await gasTracker.track(
        "Gas测试-创建提案",
        governance.connect(testBase.accounts.governor1).propose(target, 0, data, "暂停合约"),
      );

      // Gas消耗验证
      console.log("\n📊 Gas消耗对比基准:");
      console.log(
        `铸币: ${mintGas} vs ${gasBenchmarks.mint} (${mintGas <= gasBenchmarks.mint ? "✅" : "❌"})`,
      );
      console.log(
        `转账: ${transferGas} vs ${gasBenchmarks.transfer} (${transferGas <= gasBenchmarks.transfer ? "✅" : "❌"})`,
      );
      console.log(
        `KYC: ${kycGas} vs ${gasBenchmarks.setKYC} (${kycGas <= gasBenchmarks.setKYC ? "✅" : "❌"})`,
      );
      console.log(
        `黑名单: ${blacklistGas} vs ${gasBenchmarks.blacklist} (${blacklistGas <= gasBenchmarks.blacklist ? "✅" : "❌"})`,
      );
      console.log(
        `提案: ${proposeGas} vs ${gasBenchmarks.propose} (${proposeGas <= gasBenchmarks.propose ? "✅" : "❌"})`,
      );

      // 基准验证（允许一定的波动范围）
      expect(Number(mintGas)).to.be.lessThan(gasBenchmarks.mint * 1.2);
      expect(Number(transferGas)).to.be.lessThan(gasBenchmarks.transfer * 1.2);
      expect(Number(kycGas)).to.be.lessThan(gasBenchmarks.setKYC * 1.2);
      expect(Number(blacklistGas)).to.be.lessThan(gasBenchmarks.blacklist * 1.2);
      expect(Number(proposeGas)).to.be.lessThan(gasBenchmarks.propose * 1.2);
    });
  });
});
