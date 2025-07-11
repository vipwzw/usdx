# USDX 集成测试指南

## 概述

本指南介绍USDX稳定币项目的集成测试框架，包括性能测试、场景测试和部署测试。

## 测试架构

### 目录结构
```
test/
├── integration/           # 集成测试核心
│   ├── IntegrationTestConfig.js  # 测试配置和基础类
│   └── DeploymentTests.js        # 部署流程测试
├── performance/           # 性能测试
│   └── PerformanceTests.js       # 性能和Gas测试
├── scenarios/            # 场景测试
│   └── RealWorldScenarios.js     # 真实业务场景
├── Integration.test.js   # 原有集成测试
├── USDXToken.test.js     # 代币单元测试
└── USDXGovernance.test.js # 治理单元测试
```

## 测试类型

### 1. 集成测试 (Integration Tests)
测试多个合约之间的交互和完整的业务流程。

**运行命令:**
```bash
npm run test:integration
```

**测试内容:**
- 治理控制的代币操作
- 端到端代币生命周期
- 合约升级流程
- 角色权限管理
- 事件监控

### 2. 性能测试 (Performance Tests)
测试合约在高负载下的表现和Gas消耗优化。

**运行命令:**
```bash
npm run test:performance
```

**测试内容:**
- 批量操作性能 (铸币、转账)
- 治理提案处理性能
- 合规检查性能
- 极限负载测试
- Gas效率验证

**性能基准:**
```javascript
const gasBenchmarks = {
  mint: 100000,        // 铸币操作
  transfer: 80000,     // 转账操作
  setKYC: 50000,       // KYC设置
  blacklist: 50000,    // 黑名单操作
  propose: 200000,     // 创建提案
  vote: 80000,         // 投票
  execute: 150000,     // 执行提案
};
```

### 3. 场景测试 (Scenario Tests)
模拟真实世界的业务场景和用户行为。

**运行命令:**
```bash
npm run test:scenarios
```

**测试场景:**
- **银行业务场景**
  - 银行间USDX转账
  - 合规风控处理
- **DeFi生态场景**
  - DeFi协议集成
  - 紧急情况处理
- **企业支付场景**
  - 批量工资支付
  - 跨境企业支付
- **监管合规场景**
  - 监管机构合规检查

### 4. 部署测试 (Deployment Tests)
测试完整的合约部署、初始化和配置流程。

**运行命令:**
```bash
npm run test:deployment
```

**测试内容:**
- 完整生态系统部署
- 分步骤部署流程
- 合约升级部署
- 多网络部署模拟

## 测试配置

### 基础配置类 (IntegrationTestBase)

```javascript
const testBase = new IntegrationTestBase();
await testBase.setupContracts();

// 访问合约
const token = testBase.contracts.usdxToken;
const governance = testBase.contracts.governance;

// 访问账户
const owner = testBase.accounts.owner;
const user1 = testBase.accounts.user1;
```

### 测试常量

```javascript
const TEST_CONSTANTS = {
  TOKEN: {
    NAME: "USDX Stablecoin",
    SYMBOL: "USDX",
    DECIMALS: 6,
    INITIAL_SUPPLY: ethers.parseUnits("1000000000", 6),
  },
  GOVERNANCE: {
    VOTING_PERIOD: 86400,    // 24小时
    EXECUTION_DELAY: 3600,   // 1小时
    REQUIRED_VOTES: 2,
  },
  AMOUNTS: {
    MINT_AMOUNT: ethers.parseUnits("1000000", 6),    // 100万
    TRANSFER_AMOUNT: ethers.parseUnits("100000", 6), // 10万
    DAILY_LIMIT: ethers.parseUnits("50000", 6),      // 5万
  },
};
```

## 辅助工具

### Gas跟踪器 (GasTracker)
监控和分析Gas消耗：

```javascript
const gasTracker = new GasTracker();

// 跟踪操作
const { gasUsed } = await gasTracker.track(
  "操作名称",
  token.connect(user).transfer(recipient, amount)
);

// 生成报告
gasTracker.printReport();
```

### 部署跟踪器 (DeploymentTracker)
跟踪部署流程：

```javascript
const deploymentTracker = new DeploymentTracker();

const contract = await deploymentTracker.trackDeployment(
  "合约名称",
  ContractFactory.deploy()
);

deploymentTracker.printSummary();
```

### 测试辅助函数 (TestHelpers)

```javascript
// 生成随机地址
const address = TestHelpers.generateRandomAddress();

// 格式化金额
const formatted = TestHelpers.formatAmount(amount, decimals);

// 解析金额
const parsed = TestHelpers.parseAmount("1000", 6);

// 计算Gas成本
const cost = await TestHelpers.calculateGasCost(tx);

// 快进时间
await testBase.fastForwardTime(3600); // 1小时
```

## 运行测试

### 本地开发环境

1. **启动本地网络:**
```bash
npm run start
```

2. **运行所有集成测试:**
```bash
npm run test:integration
```

3. **运行特定测试类型:**
```bash
npm run test:performance    # 性能测试
npm run test:scenarios      # 场景测试
npm run test:deployment     # 部署测试
```

4. **运行单个测试文件:**
```bash
npx hardhat test test/performance/PerformanceTests.js
```

### CI/CD环境

使用GitHub Actions自动运行集成测试：

```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration
    npm run test:performance
    npm run test:scenarios
```

## 测试报告

### 性能报告示例
```
📊 === Gas消耗性能报告 ===
总操作数: 50
总Gas消耗: 4,250,000
平均Gas消耗: 85,000

详细操作:
1. 铸币-1: 95,000 gas (120ms)
2. 转账-1: 75,000 gas (95ms)
3. KYC设置-1: 45,000 gas (80ms)
================================
```

### 部署报告示例
```
📊 === 部署总结 ===
总部署数量: 4
总Gas消耗: 8,750,000

详细部署信息:
1. USDXToken (Proxy)
   地址: 0x1234...5678
   Gas: 2,500,000
   耗时: 5000ms
===================
```

## 最佳实践

### 1. 测试设计原则
- **隔离性**: 每个测试用例相互独立
- **可重复性**: 测试结果应该一致
- **全面性**: 覆盖关键业务流程
- **真实性**: 模拟真实使用场景

### 2. 性能监控
- 设置合理的Gas基准
- 监控批量操作的性能退化
- 跟踪关键操作的Gas消耗趋势

### 3. 场景测试
- 基于真实业务需求设计
- 包含异常情况处理
- 验证端到端的用户体验

### 4. 部署验证
- 验证初始状态正确性
- 测试权限配置
- 确认升级流程安全性

## 故障排除

### 常见问题

1. **初始化错误**
```javascript
// ❌ 错误方式
const token = await USDXToken.deploy();
await token.initialize(...);

// ✅ 正确方式
const token = await upgrades.deployProxy(USDXToken, [...]);
```

2. **权限问题**
```javascript
// 确保角色正确设置
await token.grantRole(MINTER_ROLE, minter.address);
```

3. **时间相关测试**
```javascript
// 使用辅助函数快进时间
await testBase.fastForwardTime(86400); // 24小时
```

### 调试技巧

1. **使用测试摘要**
```javascript
await testBase.printTestSummary("测试名称");
```

2. **启用详细日志**
```javascript
console.log("🚀 开始测试:", testName);
console.log("✅ 测试完成:", result);
```

3. **Gas分析**
```javascript
gasTracker.printReport(); // 查看详细Gas消耗
```

## 扩展集成测试

### 添加新的测试场景

1. 在相应目录下创建测试文件
2. 继承或使用 `IntegrationTestBase`
3. 添加到package.json脚本中
4. 更新CI/CD配置

### 自定义测试工具

可以扩展现有的测试工具或创建新的辅助类：

```javascript
class CustomTestHelper extends IntegrationTestBase {
  async setupCustomScenario() {
    // 自定义设置逻辑
  }
  
  async validateCustomConditions() {
    // 自定义验证逻辑
  }
}
```

## 总结

USDX集成测试框架提供了全面的测试覆盖，包括：

- ✅ **功能完整性**: 验证所有核心功能正常工作
- ✅ **性能优化**: 确保Gas效率和高负载处理能力
- ✅ **业务场景**: 模拟真实世界的使用情况
- ✅ **部署安全**: 验证部署和升级流程的安全性

通过运行这些集成测试，可以确保USDX稳定币系统在生产环境中的稳定性和可靠性。 
