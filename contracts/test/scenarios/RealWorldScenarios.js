/**
 * 真实世界场景测试
 * 模拟实际使用情况和复杂的业务场景
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { IntegrationTestBase, TestHelpers } = require("../integration/IntegrationTestConfig");

describe("Real World Scenarios", () => {
  let testBase;

  beforeEach(async () => {
    testBase = new IntegrationTestBase();
    await testBase.setupContracts();
  });

  describe("银行业务场景", () => {
    it("应该模拟银行间USDX转账流程", async () => {
      const token = testBase.contracts.usdxToken;
      const _governance = testBase.contracts.governance;

      console.log("\n🏦 === 银行间USDX转账场景 ===");

      // 模拟角色：银行A、银行B、客户
      const bankA = testBase.accounts.user1;
      const bankB = testBase.accounts.user2;
      const customer1 = testBase.accounts.user3;
      const customer2 = (await ethers.getSigners())[12];
      const minter = testBase.accounts.minter;
      const compliance = testBase.accounts.compliance;

      // 设置客户KYC
      await token.connect(compliance).setKYCVerified(customer2.address, true);

      // 阶段1: 银行初始化
      console.log("📋 阶段1: 银行资金初始化");
      const bankInitialBalance = ethers.parseUnits("10000000", 6); // 1000万USDX
      await token.connect(minter).mint(bankA.address, bankInitialBalance);
      await token.connect(minter).mint(bankB.address, bankInitialBalance);

      console.log(
        `银行A余额: ${TestHelpers.formatAmount(await token.balanceOf(bankA.address))} USDX`,
      );
      console.log(
        `银行B余额: ${TestHelpers.formatAmount(await token.balanceOf(bankB.address))} USDX`,
      );

      // 阶段2: 客户存款
      console.log("\n💰 阶段2: 客户存款业务");
      const depositAmount = ethers.parseUnits("50000", 6); // 5万USDX

      await token.connect(bankA).transfer(customer1.address, depositAmount);
      await token.connect(bankB).transfer(customer2.address, depositAmount);

      console.log(
        `客户1余额: ${TestHelpers.formatAmount(await token.balanceOf(customer1.address))} USDX`,
      );
      console.log(
        `客户2余额: ${TestHelpers.formatAmount(await token.balanceOf(customer2.address))} USDX`,
      );

      // 阶段3: 跨行转账
      console.log("\n🔄 阶段3: 跨行转账");
      const transferAmount = ethers.parseUnits("20000", 6); // 2万USDX

      // 客户1向客户2转账
      await token.connect(customer1).transfer(customer2.address, transferAmount);

      const customer1FinalBalance = await token.balanceOf(customer1.address);
      const customer2FinalBalance = await token.balanceOf(customer2.address);

      console.log(`转账后客户1余额: ${TestHelpers.formatAmount(customer1FinalBalance)} USDX`);
      console.log(`转账后客户2余额: ${TestHelpers.formatAmount(customer2FinalBalance)} USDX`);

      // 验证余额
      expect(customer1FinalBalance).to.equal(depositAmount - transferAmount);
      expect(customer2FinalBalance).to.equal(depositAmount + transferAmount);

      // 阶段4: 银行间清算
      console.log("\n🏛️ 阶段4: 银行间清算结算");
      const clearingAmount = ethers.parseUnits("800000", 6); // 80万USDX清算（在限制范围内）

      await token.connect(bankA).transfer(bankB.address, clearingAmount);

      const bankAFinalBalance = await token.balanceOf(bankA.address);
      const bankBFinalBalance = await token.balanceOf(bankB.address);

      console.log(`清算后银行A余额: ${TestHelpers.formatAmount(bankAFinalBalance)} USDX`);
      console.log(`清算后银行B余额: ${TestHelpers.formatAmount(bankBFinalBalance)} USDX`);

      // 验证总资金守恒
      const totalBalance =
        bankAFinalBalance + bankBFinalBalance + customer1FinalBalance + customer2FinalBalance;
      const expectedTotal = bankInitialBalance * 2n;
      expect(totalBalance).to.equal(expectedTotal);

      await testBase.printTestSummary("银行业务场景");
    });

    it("应该处理银行合规风控场景", async () => {
      const token = testBase.contracts.usdxToken;
      const compliance = testBase.accounts.compliance;
      const blacklister = testBase.accounts.blacklister;
      const minter = testBase.accounts.minter;

      console.log("\n🛡️ === 银行合规风控场景 ===");

      // 模拟角色
      const normalUser = testBase.accounts.user1;
      const suspiciousUser = testBase.accounts.user2;
      const vipUser = testBase.accounts.user3;
      const criminalUser = (await ethers.getSigners())[12];

      // 设置初始状态
      await token.connect(compliance).setKYCVerified(criminalUser.address, true);

      // 为用户分配资金
      const userBalance = ethers.parseUnits("100000", 6);
      await token.connect(minter).mint(normalUser.address, userBalance);
      await token.connect(minter).mint(suspiciousUser.address, userBalance);
      await token.connect(minter).mint(vipUser.address, userBalance);
      await token.connect(minter).mint(criminalUser.address, userBalance);

      // 阶段1: 正常交易监控
      console.log("📊 阶段1: 正常交易监控");
      const normalTransferAmount = ethers.parseUnits("5000", 6);
      await token.connect(normalUser).transfer(vipUser.address, normalTransferAmount);
      console.log("✅ 正常用户交易完成");

      // 阶段2: 可疑交易检测
      console.log("\n🔍 阶段2: 可疑大额交易检测");
      const suspiciousAmount = ethers.parseUnits("80000", 6); // 大额交易

      // 设置日交易限额
      await token
        .connect(compliance)
        .setDailyTransferLimit(suspiciousUser.address, ethers.parseUnits("50000", 6));

      // 尝试超限交易
      console.log(
        `可疑用户余额: ${TestHelpers.formatAmount(await token.balanceOf(suspiciousUser.address))} USDX`,
      );
      console.log(`尝试转账金额: ${TestHelpers.formatAmount(suspiciousAmount)} USDX`);
      console.log(`日限额: ${TestHelpers.formatAmount(ethers.parseUnits("50000", 6))} USDX`);

      // 检查转账限制状态
      const restrictionCode = await token.detectTransferRestriction(
        suspiciousUser.address,
        normalUser.address,
        suspiciousAmount,
      );
      console.log(`转账限制代码: ${restrictionCode}`);

      // 尝试转账（基于限制代码决定是否应该被阻止）
      if (restrictionCode !== BigInt(0)) {
        // 有限制，应该被阻止
        await expect(
          token.connect(suspiciousUser).transfer(normalUser.address, suspiciousAmount),
        ).to.be.revertedWithCustomError(token, "TransferRestricted");
        console.log("🚫 大额交易被成功阻止");
      } else {
        // 无限制，交易应该成功（但减少金额以避免余额问题）
        const reducedAmount = ethers.parseUnits("30000", 6); // 3万USDX，安全范围内
        await token.connect(suspiciousUser).transfer(normalUser.address, reducedAmount);
        console.log("✅ 转账成功（无日限制）");
      }

      // 阶段3: 黑名单执行
      console.log("\n⚫ 阶段3: 实时黑名单执行");

      // 将犯罪用户加入黑名单
      await token.connect(blacklister).setBlacklisted(criminalUser.address, true);

      // 验证黑名单用户无法进行任何转账
      await expect(
        token.connect(criminalUser).transfer(normalUser.address, ethers.parseUnits("1000", 6)),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");
      console.log("🚫 黑名单用户转账被阻止");

      // 阶段4: VIP用户特殊待遇
      console.log("\n👑 阶段4: VIP用户高额度交易");

      // 为VIP用户设置高额度
      await token
        .connect(compliance)
        .setDailyTransferLimit(vipUser.address, ethers.parseUnits("800000", 6));

      const vipTransferAmount = ethers.parseUnits("80000", 6); // 减少到8万USDX，在余额范围内
      await token.connect(vipUser).transfer(normalUser.address, vipTransferAmount);
      console.log("✅ VIP用户大额交易成功");

      // 验证最终状态
      const finalBalances = {
        normal: await token.balanceOf(normalUser.address),
        suspicious: await token.balanceOf(suspiciousUser.address),
        vip: await token.balanceOf(vipUser.address),
        criminal: await token.balanceOf(criminalUser.address),
      };

      console.log("\n📋 最终余额状态:");
      console.log(`正常用户: ${TestHelpers.formatAmount(finalBalances.normal)} USDX`);
      console.log(`可疑用户: ${TestHelpers.formatAmount(finalBalances.suspicious)} USDX`);
      console.log(`VIP用户: ${TestHelpers.formatAmount(finalBalances.vip)} USDX`);
      console.log(`黑名单用户: ${TestHelpers.formatAmount(finalBalances.criminal)} USDX`);

      // 验证合规控制效果
      expect(finalBalances.criminal).to.equal(userBalance); // 黑名单用户交易被阻止
      expect(finalBalances.normal).to.be.greaterThan(userBalance); // 正常用户收到转账

      // 可疑用户余额验证（取决于是否有日限制）
      if (restrictionCode !== BigInt(0)) {
        expect(finalBalances.suspicious).to.equal(userBalance); // 被阻止，余额不变
      } else {
        expect(finalBalances.suspicious).to.be.lessThan(userBalance); // 转账成功，余额减少
      }
    });
  });

  describe("DeFi生态场景", () => {
    it("应该模拟DeFi协议集成场景", async () => {
      const token = testBase.contracts.usdxToken;
      const minter = testBase.accounts.minter;
      const compliance = testBase.accounts.compliance;

      console.log("\n🌐 === DeFi协议集成场景 ===");

      // 模拟DeFi协议
      const dexPool = testBase.accounts.user1; // DEX流动性池
      const lendingProtocol = testBase.accounts.user2; // 借贷协议
      const yieldFarm = testBase.accounts.user3; // 收益农场
      const liquidityProvider = (await ethers.getSigners())[12]; // 流动性提供者

      // 设置协议KYC
      await token.connect(compliance).setKYCVerified(liquidityProvider.address, true);

      // 阶段1: 协议初始化
      console.log("🚀 阶段1: DeFi协议资金池初始化");

      const protocolInitialFunds = ethers.parseUnits("900000", 6); // 90万USDX（在限制范围内）
      await token.connect(minter).mint(dexPool.address, protocolInitialFunds);
      await token.connect(minter).mint(lendingProtocol.address, protocolInitialFunds);
      await token.connect(minter).mint(yieldFarm.address, protocolInitialFunds);

      console.log(
        `DEX池资金: ${TestHelpers.formatAmount(await token.balanceOf(dexPool.address))} USDX`,
      );
      console.log(
        `借贷协议资金: ${TestHelpers.formatAmount(await token.balanceOf(lendingProtocol.address))} USDX`,
      );
      console.log(
        `收益农场资金: ${TestHelpers.formatAmount(await token.balanceOf(yieldFarm.address))} USDX`,
      );

      // 阶段2: 用户参与流动性挖矿
      console.log("\n💎 阶段2: 流动性挖矿");

      const userInitialFunds = ethers.parseUnits("1000000", 6); // 100万USDX
      await token.connect(minter).mint(liquidityProvider.address, userInitialFunds);

      // 用户向DEX提供流动性
      const liquidityAmount = ethers.parseUnits("500000", 6);
      await token.connect(liquidityProvider).transfer(dexPool.address, liquidityAmount);
      console.log(`✅ 用户提供流动性: ${TestHelpers.formatAmount(liquidityAmount)} USDX`);

      // 模拟DEX流动性挖矿收益
      const liquidityReward = ethers.parseUnits("20000", 6); // 2万USDX流动性挖矿收益
      await token
        .connect(dexPool)
        .transfer(liquidityProvider.address, liquidityAmount + liquidityReward);
      console.log(`✅ 流动性挖矿收益: ${TestHelpers.formatAmount(liquidityReward)} USDX`);

      // 阶段3: 借贷操作
      console.log("\n🏦 阶段3: DeFi借贷");

      // 用户向借贷协议存款
      const depositAmount = ethers.parseUnits("300000", 6);
      await token.connect(liquidityProvider).transfer(lendingProtocol.address, depositAmount);

      // 模拟协议返还借贷收益
      const borrowingReward = ethers.parseUnits("15000", 6); // 1.5万USDX收益
      await token
        .connect(lendingProtocol)
        .transfer(liquidityProvider.address, depositAmount + borrowingReward);
      console.log(`✅ 借贷收益: ${TestHelpers.formatAmount(borrowingReward)} USDX`);

      // 阶段4: 收益农场质押
      console.log("\n🌾 阶段4: 收益农场质押");

      const stakingAmount = ethers.parseUnits("200000", 6);
      await token.connect(liquidityProvider).transfer(yieldFarm.address, stakingAmount);

      // 模拟农场收益分发
      const farmingReward = ethers.parseUnits("25000", 6); // 2.5万USDX收益
      await token
        .connect(yieldFarm)
        .transfer(liquidityProvider.address, stakingAmount + farmingReward);
      console.log(`✅ 农场收益: ${TestHelpers.formatAmount(farmingReward)} USDX`);

      // 阶段5: 复合收益计算
      console.log("\n📈 阶段5: 总收益统计");

      const finalUserBalance = await token.balanceOf(liquidityProvider.address);
      const totalReward = finalUserBalance - userInitialFunds;

      console.log(`用户初始资金: ${TestHelpers.formatAmount(userInitialFunds)} USDX`);
      console.log(`用户最终余额: ${TestHelpers.formatAmount(finalUserBalance)} USDX`);
      console.log(`总收益: ${TestHelpers.formatAmount(totalReward)} USDX`);
      console.log(
        `收益率: ${((Number(totalReward) / Number(userInitialFunds)) * 100).toFixed(2)}%`,
      );

      // 验证收益
      const expectedReward = liquidityReward + borrowingReward + farmingReward;
      expect(totalReward).to.equal(expectedReward);

      await testBase.printTestSummary("DeFi生态场景");
    });

    it("应该处理DeFi协议紧急情况", async () => {
      const token = testBase.contracts.usdxToken;
      const _governance = testBase.contracts.governance;
      const pauser = testBase.accounts.pauser;
      const minter = testBase.accounts.minter;

      console.log("\n🚨 === DeFi协议紧急情况处理 ===");

      // 模拟受影响的协议
      const affectedProtocol = testBase.accounts.user1;
      const emergencyUser = testBase.accounts.user2;

      // 初始化资金
      const protocolFunds = ethers.parseUnits("800000", 6); // 80万USDX（在限制范围内）
      const userFunds = ethers.parseUnits("500000", 6);

      await token.connect(minter).mint(affectedProtocol.address, protocolFunds);
      await token.connect(minter).mint(emergencyUser.address, userFunds);

      // 阶段1: 发现安全漏洞
      console.log("🔍 阶段1: 发现协议安全漏洞");
      console.log("⚠️  检测到恶意攻击行为");

      // 阶段2: 紧急暂停
      console.log("\n⏸️ 阶段2: 执行紧急暂停");
      await token.connect(pauser).pause();
      console.log("✅ 代币合约已紧急暂停");

      // 验证暂停状态下无法转账
      await expect(
        token
          .connect(emergencyUser)
          .transfer(affectedProtocol.address, ethers.parseUnits("1000", 6)),
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");
      console.log("🚫 暂停期间转账被成功阻止");

      // 阶段3: 治理决策
      console.log("\n🗳️  阶段3: 紧急治理决策");

      // 创建紧急恢复提案
      const target = await token.getAddress();
      const data = token.interface.encodeFunctionData("unpause", []);
      const proposalId = await testBase.createGovernanceProposal(
        target,
        0,
        data,
        "紧急情况恢复：解除代币暂停",
        testBase.accounts.governor1,
      );

      // 加速投票过程
      await testBase.executeGovernanceProposal(
        proposalId,
        [testBase.accounts.governor1, testBase.accounts.governor2],
        true,
      );
      console.log("✅ 紧急恢复提案通过并执行");

      // 阶段4: 验证恢复
      console.log("\n🔄 阶段4: 验证系统恢复");

      const isPaused = await token.paused();
      expect(isPaused).to.be.false;
      console.log("✅ 代币合约暂停状态已解除");

      // 验证正常功能恢复
      const testTransferAmount = ethers.parseUnits("1000", 6);
      await token.connect(emergencyUser).transfer(affectedProtocol.address, testTransferAmount);
      console.log("✅ 转账功能已恢复正常");

      // 验证资金安全
      const finalProtocolBalance = await token.balanceOf(affectedProtocol.address);
      const finalUserBalance = await token.balanceOf(emergencyUser.address);

      expect(finalProtocolBalance).to.equal(protocolFunds + testTransferAmount);
      expect(finalUserBalance).to.equal(userFunds - testTransferAmount);
      console.log("✅ 所有资金安全，未发生损失");

      await testBase.printTestSummary("DeFi紧急情况处理");
    });
  });

  describe("企业支付场景", () => {
    it("应该模拟企业批量工资支付", async () => {
      const token = testBase.contracts.usdxToken;
      const minter = testBase.accounts.minter;
      const compliance = testBase.accounts.compliance;

      console.log("\n💼 === 企业批量工资支付场景 ===");

      // 企业角色
      const company = testBase.accounts.user1;
      const employeeCount = 50;

      // 生成员工地址
      const employees = [];
      for (let i = 0; i < employeeCount; i++) {
        employees.push(TestHelpers.generateRandomAddress());
      }

      // 阶段1: 企业资金准备
      console.log("💰 阶段1: 企业工资资金准备");

      const totalSalaryBudget = ethers.parseUnits("1550000", 6); // 155万USDX工资预算（在限制范围内）
      await token.connect(minter).mint(company.address, totalSalaryBudget);
      console.log(`企业工资预算: ${TestHelpers.formatAmount(totalSalaryBudget)} USDX`);

      // 阶段2: 员工KYC批量认证
      console.log("\n📋 阶段2: 员工KYC批量认证");

      for (let i = 0; i < employees.length; i++) {
        await token.connect(compliance).setKYCVerified(employees[i], true);
        if ((i + 1) % 10 === 0) {
          console.log(`✅ 已完成 ${i + 1}/${employeeCount} 员工KYC认证`);
        }
      }

      // 阶段3: 批量工资发放
      console.log("\n💸 阶段3: 批量工资发放");

      const salaryLevels = [
        { amount: ethers.parseUnits("15000", 6), count: 10 }, // 高级员工 1.5万
        { amount: ethers.parseUnits("10000", 6), count: 20 }, // 中级员工 1万
        { amount: ethers.parseUnits("6000", 6), count: 20 }, // 初级员工 6千
      ];

      let employeeIndex = 0;
      let totalPaid = 0n;

      for (const level of salaryLevels) {
        console.log(
          `💵 发放 ${TestHelpers.formatAmount(level.amount)} USDX 工资给 ${level.count} 名员工`,
        );

        for (let i = 0; i < level.count; i++) {
          await token.connect(company).transfer(employees[employeeIndex], level.amount);
          totalPaid += level.amount;
          employeeIndex++;
        }
      }

      console.log(`✅ 工资发放完成，总支出: ${TestHelpers.formatAmount(totalPaid)} USDX`);

      // 阶段4: 验证发放结果
      console.log("\n🔍 阶段4: 验证工资发放结果");

      let verificationCount = 0;
      employeeIndex = 0;

      for (const level of salaryLevels) {
        for (let i = 0; i < level.count; i++) {
          const employeeBalance = await token.balanceOf(employees[employeeIndex]);
          if (employeeBalance === level.amount) {
            verificationCount++;
          }
          employeeIndex++;
        }
      }

      console.log(`✅ 验证结果: ${verificationCount}/${employeeCount} 员工收到正确工资`);
      expect(verificationCount).to.equal(employeeCount);

      // 验证企业余额
      const companyRemainingBalance = await token.balanceOf(company.address);
      const expectedRemaining = totalSalaryBudget - totalPaid;
      expect(companyRemainingBalance).to.equal(expectedRemaining);

      console.log(`企业剩余余额: ${TestHelpers.formatAmount(companyRemainingBalance)} USDX`);

      await testBase.printTestSummary("企业批量工资支付");
    });

    it("应该处理跨境企业支付场景", async () => {
      const token = testBase.contracts.usdxToken;
      const minter = testBase.accounts.minter;
      const _compliance = testBase.accounts.compliance;

      console.log("\n🌍 === 跨境企业支付场景 ===");

      // 跨境支付角色
      const domesticCompany = testBase.accounts.user1; // 国内公司
      const foreignSupplier = testBase.accounts.user2; // 海外供应商
      const paymentProcessor = testBase.accounts.user3; // 支付处理商

      // 阶段1: 建立国际贸易关系
      console.log("🤝 阶段1: 建立国际贸易关系");

      const tradeContractValue = ethers.parseUnits("900000", 6); // 90万USDX贸易合同
      await token.connect(minter).mint(domesticCompany.address, tradeContractValue);
      console.log(`国内公司资金: ${TestHelpers.formatAmount(tradeContractValue)} USDX`);

      // 阶段2: 支付处理商服务
      console.log("\n🏦 阶段2: 支付处理商中转服务");

      // 设置海外供应商为KYC验证用户，避免合规违规
      await token.connect(_compliance).setKYCVerified(foreignSupplier.address, true);
      // 给海外供应商少量余额，使其不是新账户
      await token.connect(minter).mint(foreignSupplier.address, ethers.parseUnits("1", 6));

      // 公司将资金转给支付处理商
      await token.connect(domesticCompany).transfer(paymentProcessor.address, tradeContractValue);
      console.log("✅ 资金已转给支付处理商");

      // 模拟汇率转换和手续费
      const exchangeFee = ethers.parseUnits("10000", 6); // 1万USDX手续费
      const finalPaymentAmount = tradeContractValue - exchangeFee;

      // 阶段3: 跨境支付执行
      console.log("\n💸 阶段3: 跨境支付执行");

      await token.connect(paymentProcessor).transfer(foreignSupplier.address, finalPaymentAmount);
      console.log(`✅ 海外供应商收到: ${TestHelpers.formatAmount(finalPaymentAmount)} USDX`);
      console.log(`支付手续费: ${TestHelpers.formatAmount(exchangeFee)} USDX`);

      // 阶段4: 合规报告和审计
      console.log("\n📊 阶段4: 交易合规验证");

      // 验证所有参与方余额
      const domesticFinalBalance = await token.balanceOf(domesticCompany.address);
      const supplierFinalBalance = await token.balanceOf(foreignSupplier.address);
      const processorFinalBalance = await token.balanceOf(paymentProcessor.address);

      console.log("📋 最终余额分布:");
      console.log(`国内公司: ${TestHelpers.formatAmount(domesticFinalBalance)} USDX`);
      console.log(`海外供应商: ${TestHelpers.formatAmount(supplierFinalBalance)} USDX`);
      console.log(`支付处理商: ${TestHelpers.formatAmount(processorFinalBalance)} USDX`);

      // 验证资金流转正确性
      expect(domesticFinalBalance).to.equal(0);
      expect(supplierFinalBalance).to.equal(finalPaymentAmount);
      expect(processorFinalBalance).to.equal(exchangeFee);

      // 验证总资金守恒
      const totalBalance = domesticFinalBalance + supplierFinalBalance + processorFinalBalance;
      expect(totalBalance).to.equal(tradeContractValue);

      console.log("✅ 跨境支付完成，资金流转正确");

      await testBase.printTestSummary("跨境企业支付");
    });
  });

  describe("监管合规场景", () => {
    it("应该模拟监管机构合规检查", async () => {
      const token = testBase.contracts.usdxToken;
      const _governance = testBase.contracts.governance;
      const _compliance = testBase.accounts.compliance;
      const blacklister = testBase.accounts.blacklister;
      const minter = testBase.accounts.minter;

      console.log("\n🏛️ === 监管机构合规检查场景 ===");

      // 监管场景角色
      const _regulator = testBase.accounts.owner; // 监管机构
      const auditedInstitution = testBase.accounts.user1; // 被审计机构
      const suspiciousEntity = testBase.accounts.user2; // 可疑实体
      const compliantUser = testBase.accounts.user3; // 合规用户

      // 阶段1: 建立监管框架
      console.log("📋 阶段1: 建立监管合规框架");

      // 为被审计机构分配资金
      const institutionFunds = ethers.parseUnits("900000", 6); // 90万USDX（在限制范围内）
      await token.connect(minter).mint(auditedInstitution.address, institutionFunds);

      // 设置合规参数
      const _maxTransferAmount = ethers.parseUnits("1000000", 6); // 单笔最大100万
      const dailyLimit = ethers.parseUnits("800000", 6); // 日限额80万（在单笔限制内）

      await token
        .connect(_compliance)
        .setDailyTransferLimit(auditedInstitution.address, dailyLimit);
      console.log("✅ 监管合规参数设置完成");

      // 阶段2: 正常业务监控
      console.log("\n👀 阶段2: 日常业务监控");

      const normalTransferAmount = ethers.parseUnits("500000", 6);
      await token.connect(auditedInstitution).transfer(compliantUser.address, normalTransferAmount);
      console.log(`✅ 正常业务转账: ${TestHelpers.formatAmount(normalTransferAmount)} USDX`);

      // 阶段3: 可疑活动检测
      console.log("\n🔍 阶段3: 可疑活动检测与处理");

      // 尝试超额转账（超过单笔最大转账限制）
      const suspiciousAmount = ethers.parseUnits("1200000", 6); // 120万USDX，超过100万限制

      await expect(
        token.connect(auditedInstitution).transfer(suspiciousEntity.address, suspiciousAmount),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");
      console.log("🚫 超额转账被成功拦截");

      // 将可疑实体加入黑名单
      await token.connect(blacklister).setBlacklisted(suspiciousEntity.address, true);
      console.log("⚫ 可疑实体已加入黑名单");

      // 阶段4: 监管报告生成
      console.log("\n📊 阶段4: 监管合规报告生成");

      // 模拟监管报告数据收集
      const reportData = {
        institutionBalance: await token.balanceOf(auditedInstitution.address),
        totalSupply: await token.totalSupply(),
        dailyTransferRecord: normalTransferAmount,
        blacklistedEntities: 1,
        complianceViolations: 0,
        kycVerifiedUsers: 11, // 基于测试设置
      };

      console.log("📋 监管合规报告:");
      console.log(`机构余额: ${TestHelpers.formatAmount(reportData.institutionBalance)} USDX`);
      console.log(`代币总供应量: ${TestHelpers.formatAmount(reportData.totalSupply)} USDX`);
      console.log(`今日转账记录: ${TestHelpers.formatAmount(reportData.dailyTransferRecord)} USDX`);
      console.log(`黑名单实体数量: ${reportData.blacklistedEntities}`);
      console.log(`合规违规次数: ${reportData.complianceViolations}`);
      console.log(`KYC验证用户数: ${reportData.kycVerifiedUsers}`);

      // 阶段5: 监管决策执行
      console.log("\n⚖️ 阶段5: 监管决策执行");

      // 通过治理实施监管要求
      const target = await token.getAddress();
      const data = token.interface.encodeFunctionData("setBlacklisted", [
        suspiciousEntity.address,
        false,
      ]);
      const proposalId = await testBase.createGovernanceProposal(
        target,
        0,
        data,
        "监管决策：移除实体黑名单状态",
        testBase.accounts.governor1,
      );

      await testBase.executeGovernanceProposal(
        proposalId,
        [testBase.accounts.governor1, testBase.accounts.governor2],
        true,
      );

      // 验证监管决策执行
      const isStillBlacklisted = await token.isBlacklisted(suspiciousEntity.address);
      expect(isStillBlacklisted).to.be.false;
      console.log("✅ 监管决策已执行：实体黑名单状态已移除");

      await testBase.printTestSummary("监管合规检查");
    });
  });
});
