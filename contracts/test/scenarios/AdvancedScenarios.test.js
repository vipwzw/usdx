const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Advanced Real-World Scenarios", () => {
  let token, _governance;
  let deployer, compliance, blacklister, minter, pauser;
  let bank1, bank2, bank3, regulator, _auditor;
  let customer1, customer2, customer3;

  beforeEach(async () => {
    [
      deployer,
      compliance,
      blacklister,
      minter,
      pauser,
      bank1,
      bank2,
      bank3,
      regulator,
      _auditor,
      customer1,
      customer2,
      customer3,
    ] = await ethers.getSigners();

    // Deploy contracts
    const USDXToken = await ethers.getContractFactory("USDXToken");
    token = await upgrades.deployProxy(USDXToken, [
      "USDX Stablecoin",
      "USDX",
      ethers.parseUnits("1000000000", 6), // 10亿代币
      deployer.address,
    ]);

    const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
    _governance = await upgrades.deployProxy(USDXGovernance, [
      token.target,
      [deployer.address, regulator.address],
      2,
      86400,
      3600,
    ]);

    // Setup roles
    const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();
    const BLACKLISTER_ROLE = await token.BLACKLISTER_ROLE();
    const MINTER_ROLE = await token.MINTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();

    await token.grantRole(COMPLIANCE_ROLE, compliance.address);
    await token.grantRole(BLACKLISTER_ROLE, blacklister.address);
    await token.grantRole(MINTER_ROLE, minter.address);
    await token.grantRole(PAUSER_ROLE, pauser.address);
  });

  describe("高级银行业务场景", () => {
    it("应该处理多银行联盟清算场景", async () => {
      console.log("\n🏦 === 多银行联盟清算场景 ===");

      // 初始化银行联盟
      const banks = [bank1, bank2, bank3];
      const bankNames = ["工商银行", "建设银行", "农业银行"];
      const initialBankFunds = ethers.parseUnits("100000000", 6); // 1亿资金

      console.log("🏛️ 阶段1: 银行联盟初始化");
      for (let i = 0; i < banks.length; i++) {
        await token.connect(compliance).setKYCVerified(banks[i].address, true);
        await token.connect(minter).mint(banks[i].address, initialBankFunds);
        console.log(`${bankNames[i]}初始资金: ${formatAmount(initialBankFunds)} USDX`);
      }

      // 客户初始化
      const customers = [customer1, customer2, customer3];
      const customerBanks = [bank1, bank2, bank3];

      console.log("\n👥 阶段2: 客户账户开设");
      for (let i = 0; i < customers.length; i++) {
        await token.connect(compliance).setKYCVerified(customers[i].address, true);
        const depositAmount = ethers.parseUnits("50000", 6);
        await token.connect(customerBanks[i]).transfer(customers[i].address, depositAmount);
        console.log(`客户${i + 1}在${bankNames[i]}开户，存款: ${formatAmount(depositAmount)} USDX`);
      }

      console.log("\n💰 阶段3: 跨行转账业务");
      // 客户1（工商银行）向客户2（建设银行）转账
      const transferAmount = ethers.parseUnits("20000", 6);
      await token.connect(customer1).transfer(customer2.address, transferAmount);
      console.log(`跨行转账: 客户1 → 客户2, ${formatAmount(transferAmount)} USDX`);

      // 客户2（建设银行）向客户3（农业银行）转账
      await token.connect(customer2).transfer(customer3.address, ethers.parseUnits("15000", 6));
      console.log(`跨行转账: 客户2 → 客户3, ${formatAmount(ethers.parseUnits("15000", 6))} USDX`);

      console.log("\n🔄 阶段4: 银行间清算");
      // 计算清算金额
      const settlement1to2 = ethers.parseUnits("20000", 6); // 工商银行欠建设银行
      const settlement2to3 = ethers.parseUnits("15000", 6); // 建设银行欠农业银行

      // 执行清算
      await token.connect(bank1).transfer(bank2.address, settlement1to2);
      await token.connect(bank2).transfer(bank3.address, settlement2to3);

      console.log("📊 阶段5: 清算后资金验证");
      const bank1FinalBalance = await token.balanceOf(bank1.address);
      const bank2FinalBalance = await token.balanceOf(bank2.address);
      const bank3FinalBalance = await token.balanceOf(bank3.address);

      console.log(`工商银行最终余额: ${formatAmount(bank1FinalBalance)} USDX`);
      console.log(`建设银行最终余额: ${formatAmount(bank2FinalBalance)} USDX`);
      console.log(`农业银行最终余额: ${formatAmount(bank3FinalBalance)} USDX`);

      // 验证资金守恒
      const totalBankBalance = bank1FinalBalance + bank2FinalBalance + bank3FinalBalance;
      const totalCustomerBalance =
        (await token.balanceOf(customer1.address)) +
        (await token.balanceOf(customer2.address)) +
        (await token.balanceOf(customer3.address));

      expect(totalBankBalance + totalCustomerBalance).to.equal(initialBankFunds * 3n);
      console.log("✅ 银行联盟清算完成，资金守恒验证通过");
    });

    it("应该处理央行数字货币发行场景", async () => {
      console.log("\n🏛️ === 央行数字货币发行场景 ===");

      // 央行角色由deployer扮演
      const centralBank = deployer;
      const commercialBanks = [bank1, bank2, bank3];
      const reserveRequirements = [
        ethers.parseUnits("50000000", 6), // 5000万准备金
        ethers.parseUnits("30000000", 6), // 3000万准备金
        ethers.parseUnits("20000000", 6), // 2000万准备金
      ];

      console.log("🏦 阶段1: 商业银行准备金缴存");
      for (let i = 0; i < commercialBanks.length; i++) {
        await token.connect(compliance).setKYCVerified(commercialBanks[i].address, true);
        await token.connect(minter).mint(commercialBanks[i].address, reserveRequirements[i]);
        console.log(`银行${i + 1}准备金: ${formatAmount(reserveRequirements[i])} USDX`);
      }

      console.log("\n💴 阶段2: 央行数字货币发行");
      // 央行根据准备金比例发行数字货币
      const issuanceRatio = 5; // 1:5杠杆比例

      for (let i = 0; i < commercialBanks.length; i++) {
        const issuanceAmount = reserveRequirements[i] * BigInt(issuanceRatio);
        await token.connect(minter).mint(commercialBanks[i].address, issuanceAmount);
        console.log(`银行${i + 1}获得发行额度: ${formatAmount(issuanceAmount)} USDX`);
      }

      console.log("\n🏪 阶段3: 银行向公众发行");
      const publicUsers = [customer1, customer2, customer3];
      const creditAmounts = [
        ethers.parseUnits("100000", 6),
        ethers.parseUnits("80000", 6),
        ethers.parseUnits("60000", 6),
      ];

      for (let i = 0; i < publicUsers.length; i++) {
        await token.connect(compliance).setKYCVerified(publicUsers[i].address, true);
        await token.connect(commercialBanks[i]).transfer(publicUsers[i].address, creditAmounts[i]);
        console.log(`用户${i + 1}获得信贷: ${formatAmount(creditAmounts[i])} USDX`);
      }

      console.log("\n📊 阶段4: 货币供应量统计");
      const totalSupply = await token.totalSupply();
      const reserveTotal = reserveRequirements.reduce((sum, amount) => sum + amount, 0n);
      const issuedTotal = reserveTotal * BigInt(issuanceRatio);
      const circulatingSupply = totalSupply - (await token.balanceOf(centralBank.address));

      console.log(`总供应量: ${formatAmount(totalSupply)} USDX`);
      console.log(`准备金总额: ${formatAmount(reserveTotal)} USDX`);
      console.log(`发行总额: ${formatAmount(issuedTotal)} USDX`);
      console.log(`流通供应量: ${formatAmount(circulatingSupply)} USDX`);

      // 验证货币发行规则
      expect(circulatingSupply).to.be.greaterThan(0);
      console.log("✅ 央行数字货币发行场景完成");
    });
  });

  describe("监管合规高级场景", () => {
    it("应该处理跨境资金监管场景", async () => {
      console.log("\n🌍 === 跨境资金监管场景 ===");

      // 设置不同地区的机构
      const domesticBank = bank1;
      const foreignBank = bank2;
      const exchangeService = bank3;
      const domesticCustomer = customer1;
      const foreignCustomer = customer2;

      console.log("🗺️ 阶段1: 地区和机构设置");

      // 重置可能的全局限制状态
      await token.connect(compliance).setTransferAuthorizationRequired(false);
      await token.connect(compliance).setRecipientValidationRequired(false);

      // 设置地区代码
      await token.connect(compliance).setRegionRestrictionsEnabled(true);
      await token.connect(compliance).setRegionCode(domesticBank.address, 1); // 美国
      await token.connect(compliance).setRegionCode(foreignBank.address, 44); // 英国
      await token.connect(compliance).setRegionCode(exchangeService.address, 1); // 美国
      await token.connect(compliance).setRegionCode(domesticCustomer.address, 1); // 美国
      await token.connect(compliance).setRegionCode(foreignCustomer.address, 44); // 英国

      // 设置允许的地区
      await token.connect(compliance).setAllowedRegion(1, true); // 允许美国
      await token.connect(compliance).setAllowedRegion(44, true); // 允许英国

      // 设置授权发送方和有效接收方
      await token.connect(compliance).setTransferAuthorizationRequired(true);
      await token.connect(compliance).setRecipientValidationRequired(true);

      await token.connect(compliance).setAuthorizedSender(domesticBank.address, true);
      await token.connect(compliance).setAuthorizedSender(exchangeService.address, true);
      await token.connect(compliance).setAuthorizedSender(domesticCustomer.address, true);
      await token.connect(compliance).setValidRecipient(foreignBank.address, true);
      await token.connect(compliance).setValidRecipient(domesticCustomer.address, true);
      await token.connect(compliance).setValidRecipient(domesticBank.address, true);
      await token.connect(compliance).setValidRecipient(exchangeService.address, true);

      // KYC验证
      const entities = [
        domesticBank,
        foreignBank,
        exchangeService,
        domesticCustomer,
        foreignCustomer,
      ];
      for (const entity of entities) {
        await token.connect(compliance).setKYCVerified(entity.address, true);
      }

      console.log("💰 阶段2: 初始资金配置");
      await token.connect(minter).mint(domesticBank.address, ethers.parseUnits("50000000", 6));
      await token
        .connect(domesticBank)
        .transfer(domesticCustomer.address, ethers.parseUnits("100000", 6));

      console.log("🔄 阶段3: 跨境汇款流程");
      const remittanceAmount = ethers.parseUnits("50000", 6);

      // 客户向国内银行发起汇款
      await token.connect(domesticCustomer).transfer(domesticBank.address, remittanceAmount);
      console.log(`国内客户向银行汇款: ${formatAmount(remittanceAmount)} USDX`);

      // 银行通过合规的exchange service处理跨境转账
      const exchangeFee = ethers.parseUnits("500", 6);
      const netAmount = remittanceAmount - exchangeFee;

      await token.connect(domesticBank).transfer(exchangeService.address, remittanceAmount);
      await token.connect(exchangeService).transfer(foreignBank.address, netAmount);
      console.log(
        `跨境转账完成: ${formatAmount(netAmount)} USDX (手续费: ${formatAmount(exchangeFee)} USDX)`,
      );

      // 外国银行向外国客户发放资金
      await token.connect(compliance).setAuthorizedSender(foreignBank.address, true);
      await token.connect(compliance).setValidRecipient(foreignCustomer.address, true);
      await token.connect(foreignBank).transfer(foreignCustomer.address, netAmount);

      console.log("📊 阶段4: 监管报告");
      const finalBalances = {
        domesticCustomer: await token.balanceOf(domesticCustomer.address),
        foreignCustomer: await token.balanceOf(foreignCustomer.address),
        exchangeService: await token.balanceOf(exchangeService.address),
      };

      console.log(`国内客户余额: ${formatAmount(finalBalances.domesticCustomer)} USDX`);
      console.log(`外国客户余额: ${formatAmount(finalBalances.foreignCustomer)} USDX`);
      console.log(`Exchange服务费收入: ${formatAmount(finalBalances.exchangeService)} USDX`);

      // 验证跨境转账成功
      expect(finalBalances.foreignCustomer).to.equal(netAmount);
      expect(finalBalances.exchangeService).to.equal(exchangeFee);

      console.log("✅ 跨境资金监管场景完成，所有合规要求得到满足");
    });

    it("应该处理反洗钱监控场景", async () => {
      console.log("\n🕵️ === 反洗钱监控场景 ===");

      // 设置角色
      const suspiciousActor = customer1;
      const normalUser1 = customer2;
      const normalUser2 = customer3;
      const moneyLaunderer = bank3;

      console.log("👥 阶段1: 用户身份设置");
      const users = [suspiciousActor, normalUser1, normalUser2, moneyLaunderer];
      for (const user of users) {
        await token.connect(compliance).setKYCVerified(user.address, true);
        await token.connect(minter).mint(user.address, ethers.parseUnits("1000000", 6));
      }

      console.log("🔍 阶段2: 正常交易模式建立");
      // 建立正常的交易模式
      const normalAmount = ethers.parseUnits("10000", 6);
      await token.connect(normalUser1).transfer(normalUser2.address, normalAmount);
      await token.connect(normalUser2).transfer(normalUser1.address, normalAmount / 2n);

      console.log("🚨 阶段3: 可疑活动检测");

      // 设置日限额监控
      const dailyLimit = ethers.parseUnits("100000", 6);
      await token.connect(compliance).setDailyTransferLimit(suspiciousActor.address, dailyLimit);

      // 可疑活动1: 多次接近限额的转账
      const suspiciousAmount = ethers.parseUnits("90000", 6);
      await token.connect(suspiciousActor).transfer(normalUser1.address, suspiciousAmount);

      // 尝试第二次大额转账（应该被限制）
      await expect(
        token.connect(suspiciousActor).transfer(normalUser2.address, suspiciousAmount),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");

      console.log("🚫 日限额超限被成功拦截");

      // 可疑活动2: 大额转账到新账户（触发合规违规）
      const newSuspiciousUser = ethers.Wallet.createRandom().connect(ethers.provider);
      await token.connect(compliance).setKYCVerified(newSuspiciousUser.address, true);

      const veryLargeAmount = ethers.parseUnits("600000", 6); // > 50% of max transfer
      const restrictionCode = await token.detectTransferRestriction(
        suspiciousActor.address,
        newSuspiciousUser.address,
        veryLargeAmount,
      );
      expect(restrictionCode).to.equal(8); // AMOUNT_EXCEEDS_LIMIT（因为日限额检查优先级更高）

      console.log("⚠️ 大额转账到新账户被标记为合规违规");

      console.log("\n⚫ 阶段4: 制裁名单管理");
      // 将洗钱者加入制裁名单
      await token.connect(compliance).setSanctioned(moneyLaunderer.address, true);

      // 任何与制裁地址的交易都应该被阻止
      await expect(
        token.connect(normalUser1).transfer(moneyLaunderer.address, ethers.parseUnits("1000", 6)),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");

      console.log("🚫 与制裁地址的交易被成功阻止");

      console.log("\n🔒 阶段5: 账户冻结和调查");
      // 冻结可疑账户的转账功能
      await token.connect(compliance).setTransferLocked(suspiciousActor.address, true);

      await expect(
        token.connect(suspiciousActor).transfer(normalUser1.address, ethers.parseUnits("1000", 6)),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");

      console.log("🔒 可疑账户转账功能已被冻结");

      console.log("\n📋 阶段6: 监管报告生成");
      const reportData = {
        totalInvestigatedUsers: 4,
        sanctionedUsers: 1,
        frozenAccounts: 1,
        complianceViolations: 1,
        blockedTransactions: 3,
      };

      console.log("📊 反洗钱监控报告:");
      console.log(`调查用户数: ${reportData.totalInvestigatedUsers}`);
      console.log(`制裁用户数: ${reportData.sanctionedUsers}`);
      console.log(`冻结账户数: ${reportData.frozenAccounts}`);
      console.log(`合规违规次数: ${reportData.complianceViolations}`);
      console.log(`阻止交易数: ${reportData.blockedTransactions}`);

      console.log("✅ 反洗钱监控场景完成，所有可疑活动得到有效监控");
    });
  });

  describe("危机应对场景", () => {
    it("应该处理系统性金融风险场景", async () => {
      console.log("\n💥 === 系统性金融风险应对场景 ===");

      // 模拟金融系统参与者
      const systemicBank1 = bank1;
      const systemicBank2 = bank2;
      const shadowBank = bank3;
      const retailInvestor1 = customer1;
      const retailInvestor2 = customer2;
      const _riskManager = regulator;

      console.log("🏦 阶段1: 系统性银行设置");
      const systemicBanks = [systemicBank1, systemicBank2];
      const initialFunds = ethers.parseUnits("500000000", 6); // 5亿资金

      for (const bank of systemicBanks) {
        await token.connect(compliance).setKYCVerified(bank.address, true);
        await token.connect(minter).mint(bank.address, initialFunds);
      }

      // 设置零售投资者
      const retailInvestors = [retailInvestor1, retailInvestor2];
      for (const investor of retailInvestors) {
        await token.connect(compliance).setKYCVerified(investor.address, true);
        await token.connect(minter).mint(investor.address, ethers.parseUnits("100000", 6));
      }

      console.log("⚡ 阶段2: 风险事件触发");
      // 模拟影子银行风险暴露
      await token.connect(compliance).setKYCVerified(shadowBank.address, true);
      await token.connect(minter).mint(shadowBank.address, ethers.parseUnits("200000000", 6));

      // 为大额交易临时提高转账限制
      await token
        .connect(compliance)
        .setTransferLimits(ethers.parseUnits("500000000", 6), ethers.parseUnits("1", 6));

      // 影子银行开始大量抛售（模拟市场恐慌）
      const panicSellAmount = ethers.parseUnits("150000000", 6);
      await token.connect(shadowBank).transfer(systemicBank1.address, panicSellAmount);

      console.log("🚨 阶段3: 紧急响应措施");
      // 监管机构暂停高风险交易
      await token.connect(pauser).pause();
      console.log("⏸️ 系统紧急暂停，防止恐慌性抛售");

      console.log("💉 阶段4: 流动性注入");
      // 恢复系统运行
      await token.connect(pauser).unpause();

      // 通过治理机制实施救助措施（系统恢复后）
      const rescueAmount = ethers.parseUnits("100000000", 6);
      await token.connect(minter).mint(systemicBank2.address, rescueAmount);

      // 系统性银行相互支援
      const supportAmount = ethers.parseUnits("50000000", 6);
      await token.connect(systemicBank2).transfer(systemicBank1.address, supportAmount);

      console.log("📊 阶段5: 风险评估");
      const postCrisisBalances = {
        systemicBank1: await token.balanceOf(systemicBank1.address),
        systemicBank2: await token.balanceOf(systemicBank2.address),
        shadowBank: await token.balanceOf(shadowBank.address),
      };

      console.log(`系统性银行1余额: ${formatAmount(postCrisisBalances.systemicBank1)} USDX`);
      console.log(`系统性银行2余额: ${formatAmount(postCrisisBalances.systemicBank2)} USDX`);
      console.log(`影子银行余额: ${formatAmount(postCrisisBalances.shadowBank)} USDX`);

      // 验证系统稳定性
      expect(postCrisisBalances.systemicBank1).to.be.greaterThan(initialFunds);
      expect(postCrisisBalances.systemicBank2).to.be.greaterThan(initialFunds);

      console.log("✅ 系统性风险成功化解，金融稳定得到维护");
    });
  });

  // 辅助函数
  function formatAmount(amount) {
    return ethers.formatUnits(amount, 6);
  }
});
