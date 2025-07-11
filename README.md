# USDX Stablecoin

## 企业级稳定币智能合约系统

<div align="center">

[![CI/CD](https://github.com/vipwzw/usdx/actions/workflows/ci.yml/badge.svg)](https://github.com/vipwzw/usdx/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/vipwzw/usdx/branch/main/graph/badge.svg)](https://codecov.io/gh/vipwzw/usdx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.22-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org/)

</div>

---

## 🎯 项目概述

**USDX** 是新一代企业级稳定币，采用 **ERC-20 + ERC-1404** 双标准实现，提供完整的合规性、安全性和可扩展性解决方案。

### 🌟 核心特性

- 🔒 **企业级安全** - 多重安全机制和权限控制
- 📊 **完全合规** - ERC-1404标准，实时合规检查
- 🏛️ **去中心化治理** - 多签治理，透明决策
- 🔧 **可升级架构** - UUPS代理模式，支持安全升级
- ⚡ **高性能** - 优化的Gas使用和交易效率

---

## 📋 功能特性

### 基础功能

- ✅ **ERC-20 标准兼容** - 完整的代币功能
- ✅ **ERC-1404 合规标准** - 16种转账限制检测
- ✅ **铸造和销毁** - 灵活的供应量管理
- ✅ **暂停机制** - 紧急情况风险控制

### 合规特性

- ✅ **KYC验证系统** - 用户身份验证
- ✅ **黑名单管理** - 动态风险地址管理
- ✅ **转账限制** - 单笔和日限额控制
- ✅ **制裁检查** - 实时制裁名单筛查

### 治理功能

- ✅ **多签治理** - 2/3多重签名验证
- ✅ **提案系统** - 透明的决策流程
- ✅ **时间锁保护** - 执行延迟安全机制
- ✅ **权限管理** - 基于角色的访问控制

### 安全机制

- ✅ **重入攻击防护** - ReentrancyGuard保护
- ✅ **整数溢出防护** - Solidity 0.8+内置保护
- ✅ **权限访问控制** - OpenZeppelin AccessControl
- ✅ **可升级安全** - 治理控制的UUPS代理

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│              应用层                       │
│  DApps │ 钱包 │ 交易所 │ 企业应用        │
├─────────────────────────────────────────┤
│              智能合约层                    │
│  USDX Token │ 治理合约 │ 代理合约        │
├─────────────────────────────────────────┤
│              区块链基础层                  │
│         Ethereum Mainnet                │
└─────────────────────────────────────────┘
```

### 合约架构

- **USDXToken.sol** - 主要代币合约 (ERC-20 + ERC-1404)
- **USDXGovernance.sol** - 治理合约 (多签决策)
- **IERC1404.sol** - ERC-1404接口定义

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git** >= 2.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/vipwzw/usdx.git
cd usdx

# 安装依赖
cd contracts
npm install

# 编译合约
npm run compile

# 运行测试
npm test
```

### 🎯 Solidity 源代码跳转设置

支持完整的代码导航功能，快速配置：

```bash
# 自动设置（推荐）
# Linux/macOS
./scripts/setup-code-navigation.sh

# Windows  
scripts\setup-code-navigation.bat
```

#### 功能特性

- **函数跳转**: `Ctrl+Click` 或 `F12` 跳转到定义
- **查找引用**: `Shift+F12` 查找所有使用位置  
- **重命名符号**: `F2` 智能重命名变量/函数
- **智能提示**: 自动完成和参数提示
- **悬停信息**: 鼠标悬停显示文档

详细配置指南: [docs/SOLIDITY_CODE_NAVIGATION.md](docs/SOLIDITY_CODE_NAVIGATION.md)

### 🎯 JavaScript 代码跳转设置

支持完整的JavaScript代码导航功能，包括智能感知、函数跳转、变量追踪等：

```bash
# 自动配置已完成，直接使用
code contracts/  # 在VSCode中打开项目
```

#### 功能特性

- **函数跳转**: `Ctrl+Click` 或 `F12` 跳转到函数定义
- **模块导入**: 智能跳转到导入的模块文件
- **变量追踪**: 快速定位变量声明位置
- **智能提示**: 自动完成和参数提示
- **路径别名**: 支持 `@scripts/*`, `@test/*` 等路径别名

详细配置指南: [docs/JAVASCRIPT_CODE_NAVIGATION.md](docs/JAVASCRIPT_CODE_NAVIGATION.md)

### 📋 技术文档

- **[分支保护配置](docs/BRANCH_PROTECTION_GUIDE.md)** - GitHub分支保护规则设置
- **[GitHub Actions权限配置](docs/GITHUB_ACTIONS_PERMISSIONS.md)** - CI/CD权限配置指南
- **[Gas报告生成器](docs/GAS_REPORT_GUIDE.md)** - 智能合约Gas使用报告生成工具
- **[JavaScript代码跳转](docs/JAVASCRIPT_CODE_NAVIGATION.md)** - JavaScript代码跳转和智能感知配置

### 📊 Gas使用分析

项目包含专门的Gas报告生成器，用于生成清洁、可读的Gas使用报告：

```bash
# 生成Gas报告
cd contracts
npm run gas:report

# 查看详细分析
npm run gas:analyze
```

#### 功能特性

- **自动清理乱码** - 去除ANSI控制字符
- **智能数据提取** - 准确提取gas使用数据
- **格式化输出** - 标准markdown表格格式
- **中文界面** - 友好的中文字段说明
- **CI/CD集成** - 自动在PR中生成报告

详细使用指南: [docs/GAS_REPORT_GUIDE.md](docs/GAS_REPORT_GUIDE.md)

### 测试覆盖率

```bash
# 生成覆盖率报告
npm run coverage

# 查看详细报告
open coverage/index.html
```

---

## 📦 部署指南

### 本地开发

```bash
# 启动本地节点
npm run node

# 部署到本地网络
npm run deploy:local

# 运行交互脚本
npm run console
```

### 测试网部署

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加必要的配置

# 部署到 Goerli 测试网
npm run deploy:goerli

# 验证合约
npm run verify:goerli
```

### 主网部署

```bash
# 部署到以太坊主网
npm run deploy:mainnet

# 验证合约
npm run verify:mainnet
```

---

## 🔧 开发指南

### 项目结构

```
usdx/
├── contracts/                 # 智能合约项目
│   ├── src/                  # 合约源码
│   │   ├── USDXToken.sol     # 主要代币合约
│   │   ├── USDXGovernance.sol # 治理合约
│   │   └── interfaces/       # 接口定义
│   ├── test/                 # 测试文件
│   ├── scripts/              # 部署脚本
│   └── hardhat.config.js     # Hardhat配置
├── docs/                     # 技术文档
├── .github/                  # GitHub Actions
└── README.md                 # 项目说明
```

### 常用命令

```bash
# 开发命令
npm run compile          # 编译合约
npm run test            # 运行测试
npm run coverage        # 测试覆盖率
npm run lint            # 代码检查
npm run lint:fix        # 自动修复

# 部署命令
npm run deploy:local    # 本地部署
npm run deploy:goerli   # 测试网部署
npm run deploy:mainnet  # 主网部署

# 工具命令
npm run console         # 交互控制台
npm run flatten         # 合约扁平化
npm run size           # 合约大小分析
```

---

## 🧪 测试

### 测试覆盖

- **261个测试用例** - 100%通过率
- **95%+代码覆盖率** - 全面测试覆盖
- **真实场景测试** - 完整的业务场景验证

### 测试分类

| 测试类型 | 数量  | 覆盖范围     |
| -------- | ----- | ------------ |
| 单元测试 | 156个 | 基础功能验证 |
| 集成测试 | 45个  | 合约交互测试 |
| 场景测试 | 35个  | 真实业务场景 |
| 边界测试 | 25个  | 边界条件验证 |

### 运行特定测试

```bash
# 运行单个测试文件
npx hardhat test test/USDXToken.test.js

# 运行特定测试用例
npx hardhat test --grep "Should mint tokens"

# 生成Gas报告
REPORT_GAS=true npx hardhat test
```

---

## 🔐 安全

### 安全特性

- **多重签名** - 2/3治理签名要求
- **时间锁** - 24小时执行延迟
- **权限控制** - 基于角色的访问管理
- **暂停机制** - 紧急情况立即响应

### 安全审计

- ✅ **自动化测试** - 261个测试用例
- ✅ **静态分析** - Slither安全扫描
- ✅ **代码审查** - 多轮人工审查
- 🔄 **专业审计** - 计划中

### 漏洞报告

如发现安全漏洞，请发送邮件至：<security@usdx.finance>

**请勿在GitHub Issues中公开安全漏洞**

---

## 📊 合规

### 📋 USDX 完整转账限制代码列表

根据 `IERC1404.sol` 接口文件，USDX项目实现了**16种转账限制代码**，涵盖所有可能的合规和安全检查：

| 代码   | 限制类型                | 说明             | 触发条件                   |
| ------ | ----------------------- | ---------------- | -------------------------- |
| **0**  | `SUCCESS`               | ✅ 转账允许       | 通过所有检查               |
| **1**  | `FAILURE`               | ❌ 一般性失败     | 未知错误或一般性问题       |
| **2**  | `BLACKLISTED_SENDER`    | 🚫 发送方被黑名单 | 发送地址在黑名单中         |
| **3**  | `BLACKLISTED_RECEIVER`  | 🚫 接收方被黑名单 | 接收地址在黑名单中         |
| **4**  | `INSUFFICIENT_BALANCE`  | 💰 余额不足       | 发送方余额小于转账金额     |
| **5**  | `PAUSED`                | ⏸️ 合约已暂停     | 合约处于暂停状态           |
| **6**  | `INVALID_KYC_SENDER`    | 📄 发送方KYC无效  | 发送方未通过KYC验证        |
| **7**  | `INVALID_KYC_RECEIVER`  | 📄 接收方KYC无效  | 接收方未通过KYC验证        |
| **8**  | `AMOUNT_EXCEEDS_LIMIT`  | 📊 超出转账限额   | 转账金额超过每日或单次限额 |
| **9**  | `SANCTIONED_ADDRESS`    | ⚖️ 地址被制裁     | 地址在国际制裁名单中       |
| **10** | `UNAUTHORIZED_TRANSFER` | 🔒 转账未授权     | 发送方未获得转账授权       |
| **11** | `INVALID_RECIPIENT`     | ❌ 无效接收方     | 接收方不在有效收款人名单   |
| **12** | `TRANSFER_LOCKED`       | 🔐 转账被锁定     | 转账功能被管理员锁定       |
| **13** | `COMPLIANCE_VIOLATION`  | ⚠️ 合规违规       | 触发合规规则违规           |
| **14** | `EXCEEDS_HOLDER_LIMIT`  | 👥 超出持有者限制 | 超过最大持有者数量限制     |
| **15** | `REGION_RESTRICTION`    | 🌍 地区限制       | 转账涉及受限制地区         |

### 🔍 限制类别分析

#### **安全控制类 (4个)**

- `BLACKLISTED_SENDER` (2) - 黑名单发送方
- `BLACKLISTED_RECEIVER` (3) - 黑名单接收方  
- `SANCTIONED_ADDRESS` (9) - 制裁地址
- `TRANSFER_LOCKED` (12) - 转账锁定

#### **合规验证类 (4个)**

- `INVALID_KYC_SENDER` (6) - 发送方KYC
- `INVALID_KYC_RECEIVER` (7) - 接收方KYC
- `COMPLIANCE_VIOLATION` (13) - 合规违规
- `REGION_RESTRICTION` (15) - 地区限制

#### **授权控制类 (2个)**

- `UNAUTHORIZED_TRANSFER` (10) - 未授权转账
- `INVALID_RECIPIENT` (11) - 无效收款人

#### **数量限制类 (2个)**

- `AMOUNT_EXCEEDS_LIMIT` (8) - 金额限制
- `EXCEEDS_HOLDER_LIMIT` (14) - 持有者限制

#### **系统状态类 (3个)**

- `INSUFFICIENT_BALANCE` (4) - 余额不足
- `PAUSED` (5) - 系统暂停
- `FAILURE` (1) - 一般失败

#### **成功状态 (1个)**

- `SUCCESS` (0) - 转账成功

### 🛠️ 使用示例

```javascript
// 检查转账限制
const restrictionCode = await usdxToken.detectTransferRestriction(
  fromAddress, 
  toAddress, 
  amount
);

// 获取限制消息
const message = await usdxToken.messageForTransferRestriction(restrictionCode);

// 根据限制代码处理
switch(restrictionCode) {
  case 0:  // SUCCESS
    await usdxToken.transfer(toAddress, amount);
    break;
  case 2:  // BLACKLISTED_SENDER
    console.log("发送方被列入黑名单");
    break;
  case 13: // COMPLIANCE_VIOLATION
    console.log("触发合规违规检查");
    break;
  // ... 其他处理逻辑
}
```

这套完整的限制代码系统使USDX能够满足各种监管要求，确保只有合规的转账才能执行！🎯

### 监管合规

- **KYC/AML** - 身份验证和反洗钱
- **制裁筛查** - 实时制裁名单检查
- **审计追踪** - 完整的交易记录
- **监管报告** - 自动化合规报告

---

## 🤝 贡献指南

### 开发流程

1. **Fork** 项目仓库
2. **创建** 特性分支 (`git checkout -b feature/AmazingFeature`)
3. **提交** 更改 (`git commit -m 'Add some AmazingFeature'`)
4. **推送** 分支 (`git push origin feature/AmazingFeature`)
5. **创建** Pull Request

### 代码规范

- 遵循 [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- 使用 ESLint 和 Prettier 格式化代码
- 添加充分的测试覆盖
- 编写清晰的提交信息

### 测试要求

- 新功能必须包含测试用例
- 测试覆盖率不得低于95%
- 所有测试必须通过
- 包含安全测试验证

---

## 📈 路线图

### 2025 Q2 ✅

- [x] 核心合约开发完成
- [x] 测试覆盖率达到100%
- [x] 技术文档完善
- [x] CI/CD流程建立

### 2025 Q3 🔄

- [ ] 专业安全审计
- [ ] 测试网部署和测试
- [ ] 社区测试计划
- [ ] 合作伙伴集成

### 2025 Q4 🔮

- [ ] 主网部署
- [ ] 流动性启动
- [ ] 交易所上线
- [ ] 生态系统扩展

### 2026 Q1 🔮

- [ ] DeFi协议集成
- [ ] 跨链桥接支持
- [ ] 机构客户服务
- [ ] 国际市场扩展

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 📞 联系我们

- **项目网站**: <https://usdx.finance>
- **技术文档**: <https://docs.usdx.finance>
- **GitHub**: <https://github.com/vipwzw/usdx>
- **邮箱**: <contact@usdx.finance>

---

## 🙏 致谢

感谢所有贡献者和以下开源项目：

- [OpenZeppelin](https://openzeppelin.com/) - 安全的智能合约库
- [Hardhat](https://hardhat.org/) - 以太坊开发环境
- [ERC-1404](https://erc1404.org/) - 受限代币标准

---

<div align="center">

**让数字金融更安全、更合规、更可靠**

[![Star this repo](https://img.shields.io/github/stars/vipwzw/usdx?style=social)](https://github.com/vipwzw/usdx)
[![Follow on GitHub](https://img.shields.io/github/followers/vipwzw?style=social)](https://github.com/vipwzw)

</div>
