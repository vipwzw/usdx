# USDT Stablecoin Smart Contracts

基于ERC-1404标准的USDT稳定币智能合约，具有传输限制、合规性和治理功能。

## 🚀 功能特性

### 核心功能
- **ERC-1404标准**: 实现传输限制和合规性检查
- **ERC-20兼容**: 完全兼容ERC-20标准
- **铸币和销毁**: 受控制的代币发行和销毁机制
- **黑名单管理**: 阻止特定地址的交易
- **KYC验证**: 身份验证要求
- **暂停功能**: 紧急情况下暂停所有交易
- **角色管理**: 基于角色的访问控制
- **可升级性**: 使用UUPS代理模式支持合约升级

### 治理功能
- **多重签名**: 多签名治理合约
- **提案系统**: 创建和投票提案
- **时间锁**: 执行延迟机制
- **权限管理**: 角色和权限管理

## 📦 安装和设置

### 1. 克隆项目

```bash
git clone <repository-url>
cd usdt/contracts
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

创建`.env`文件：

```bash
# 私钥 (部署用)
PRIVATE_KEY=your_private_key_here

# API Keys
INFURA_API_KEY=your_infura_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here

# Gas Reporter
REPORT_GAS=false

# 代币配置
TOKEN_NAME=USD Tether
TOKEN_SYMBOL=USDT
INITIAL_SUPPLY=1000000000000000 # 1B tokens with 6 decimals

# 部署配置
INITIAL_OWNER=0x0000000000000000000000000000000000000000
INITIAL_GOVERNORS=0x0000000000000000000000000000000000000000
REQUIRED_VOTES=1
VOTING_PERIOD=86400 # 24 hours
EXECUTION_DELAY=3600 # 1 hour
```

## 🏗️ 编译和部署

### 编译合约

```bash
npm run compile
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行覆盖率测试
npm run test:coverage

# 生成Gas报告
npm run gas-reporter
```

### 部署合约

```bash
# 部署到本地网络
npm run deploy:local

# 部署到Goerli测试网
npm run deploy:goerli

# 部署到主网
npm run deploy:mainnet
```

### 验证合约

```bash
# 验证Goerli合约
npm run verify:goerli

# 验证主网合约
npm run verify:mainnet
```

## 📖 合约架构

### 核心合约

#### 1. USDTToken.sol
主要的稳定币合约，实现ERC-1404和ERC-20功能。

**主要功能：**
- 代币发行和管理
- 传输限制检查
- 黑名单管理
- KYC验证
- 暂停功能
- 角色管理

**关键角色：**
- `MINTER_ROLE`: 铸币权限
- `BURNER_ROLE`: 销毁权限
- `BLACKLISTER_ROLE`: 黑名单管理权限
- `PAUSER_ROLE`: 暂停权限
- `COMPLIANCE_ROLE`: 合规管理权限
- `UPGRADER_ROLE`: 升级权限

#### 2. USDTGovernance.sol
多重签名治理合约，管理重要的系统参数和升级。

**主要功能：**
- 创建和管理提案
- 投票系统
- 执行延迟
- 治理者管理

#### 3. IERC1404.sol
ERC-1404接口定义和限制代码库。

**限制代码：**
- `0` - SUCCESS: 传输允许
- `1` - FAILURE: 传输失败
- `2` - BLACKLISTED_SENDER: 发送方被黑名单
- `3` - BLACKLISTED_RECEIVER: 接收方被黑名单
- `4` - INSUFFICIENT_BALANCE: 余额不足
- `5` - PAUSED: 合约已暂停
- `6` - INVALID_KYC_SENDER: 发送方KYC无效
- `7` - INVALID_KYC_RECEIVER: 接收方KYC无效
- `8` - AMOUNT_EXCEEDS_LIMIT: 超出传输限制
- `9` - SANCTIONED_ADDRESS: 制裁地址
- `10` - UNAUTHORIZED_TRANSFER: 未授权传输
- `11` - INVALID_RECIPIENT: 无效接收方
- `12` - TRANSFER_LOCKED: 传输锁定
- `13` - COMPLIANCE_VIOLATION: 合规违规
- `14` - EXCEEDS_HOLDER_LIMIT: 超出持有者限制
- `15` - REGION_RESTRICTION: 地区限制

## 🔧 使用指南

### 基本操作

#### 1. 铸币

```javascript
// 授予铸币权限
await usdtToken.grantRole(MINTER_ROLE, minterAddress);

// 铸币
await usdtToken.mint(recipientAddress, amount);
```

#### 2. 销毁

```javascript
// 销毁自己的代币
await usdtToken.burn(amount);

// 销毁其他地址的代币 (需要BURNER_ROLE)
await usdtToken.burnFrom(fromAddress, amount);
```

#### 3. 黑名单管理

```javascript
// 添加到黑名单
await usdtToken.setBlacklisted(address, true);

// 从黑名单移除
await usdtToken.setBlacklisted(address, false);

// 查询黑名单状态
const isBlacklisted = await usdtToken.isBlacklisted(address);
```

#### 4. KYC管理

```javascript
// 设置KYC验证状态
await usdtToken.setKYCVerified(address, true);

// 查询KYC状态
const isKYCVerified = await usdtToken.isKYCVerified(address);
```

#### 5. 暂停功能

```javascript
// 暂停合约
await usdtToken.pause();

// 恢复合约
await usdtToken.unpause();

// 查询暂停状态
const isPaused = await usdtToken.paused();
```

### 传输限制检查

```javascript
// 检查传输限制
const restrictionCode = await usdtToken.detectTransferRestriction(
  fromAddress,
  toAddress,
  amount
);

// 获取限制消息
const message = await usdtToken.messageForTransferRestriction(restrictionCode);

if (restrictionCode === 0) {
  // 传输允许
  await usdtToken.transfer(toAddress, amount);
} else {
  // 传输被限制
  console.log("Transfer restricted:", message);
}
```

### 治理操作

#### 1. 创建提案

```javascript
// 创建提案
const proposalId = await governance.propose(
  targetAddress,
  value,
  callData,
  description
);
```

#### 2. 投票

```javascript
// 投票支持
await governance.castVote(proposalId, true);

// 投票反对
await governance.castVote(proposalId, false);
```

#### 3. 执行提案

```javascript
// 执行提案
await governance.execute(proposalId);
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npx hardhat test test/USDTToken.test.js

# 运行特定测试
npx hardhat test --grep "should mint tokens"
```

### 测试覆盖率

```bash
npm run test:coverage
```

### Gas优化

```bash
npm run gas-reporter
```

## 🔒 安全注意事项

### 1. 权限管理
- 仔细管理各种角色权限
- 使用多重签名管理关键操作
- 定期审查权限分配

### 2. 升级安全
- 使用时间锁执行升级
- 充分测试升级合约
- 准备紧急暂停机制

### 3. 合规性
- 确保KYC流程完整
- 及时更新黑名单
- 监控大额交易

### 4. 审计
- 定期进行安全审计
- 使用静态分析工具
- 监控合约事件

## 📚 API参考

### USDTToken合约

#### 主要函数

```solidity
// ERC-1404函数
function detectTransferRestriction(address from, address to, uint256 value) external view returns (uint8);
function messageForTransferRestriction(uint8 restrictionCode) external view returns (string memory);

// 铸币和销毁
function mint(address to, uint256 amount) external;
function burn(uint256 amount) external;
function burnFrom(address from, uint256 amount) external;

// 黑名单管理
function setBlacklisted(address account, bool blacklisted) external;
function isBlacklisted(address account) external view returns (bool);

// KYC管理
function setKYCVerified(address account, bool verified) external;
function isKYCVerified(address account) external view returns (bool);

// 暂停功能
function pause() external;
function unpause() external;
function paused() external view returns (bool);

// 查询函数
function getCurrentHolderCount() external view returns (uint256);
function getMaxHolderCount() external view returns (uint256);
function getMaxTransferAmount() external view returns (uint256);
function getMinTransferAmount() external view returns (uint256);
```

#### 事件

```solidity
event BlacklistUpdated(address indexed account, bool blacklisted);
event KYCStatusUpdated(address indexed account, bool verified);
event DailyTransferLimitUpdated(address indexed account, uint256 limit);
event SanctionStatusUpdated(address indexed account, bool sanctioned);
```

### USDTGovernance合约

#### 主要函数

```solidity
// 提案管理
function propose(address target, uint256 value, bytes calldata data, string calldata description) external returns (uint256);
function castVote(uint256 proposalId, bool support) external;
function execute(uint256 proposalId) external;
function cancel(uint256 proposalId) external;

// 治理者管理
function addGovernor(address governor) external;
function removeGovernor(address governor) external;
function getGovernors() external view returns (address[] memory);

// 查询函数
function getProposal(uint256 proposalId) external view returns (...);
function getProposalState(uint256 proposalId) external view returns (string memory);
function hasVoted(uint256 proposalId, address voter) external view returns (bool);
```

#### 事件

```solidity
event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ...);
event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
event ProposalExecuted(uint256 indexed proposalId);
event ProposalCancelled(uint256 indexed proposalId);
event GovernorAdded(address indexed governor);
event GovernorRemoved(address indexed governor);
```

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License - 详见LICENSE文件

## 🆘 支持

如有问题，请：
1. 查看文档和FAQ
2. 搜索现有Issues
3. 创建新Issue
4. 联系开发团队

## 🚀 路线图

- [x] ERC-1404基础实现
- [x] 多重签名治理
- [x] 单元测试
- [x] 部署脚本
- [ ] 集成测试
- [ ] 前端界面
- [ ] 后端API
- [ ] 监控和警报
- [ ] 安全审计
- [ ] 主网部署 