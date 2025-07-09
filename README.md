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

- **106个测试用例** - 100%通过率
- **95%+代码覆盖率** - 全面测试覆盖
- **安全测试** - 完整的安全机制验证

### 测试分类

| 测试类型 | 数量 | 覆盖范围 |
|----------|------|----------|
| 单元测试 | 85个 | 基础功能验证 |
| 集成测试 | 15个 | 合约交互测试 |
| 安全测试 | 6个 | 安全机制验证 |

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

- ✅ **自动化测试** - 106个测试用例
- ✅ **静态分析** - Slither安全扫描
- ✅ **代码审查** - 多轮人工审查
- 🔄 **专业审计** - 计划中

### 漏洞报告

如发现安全漏洞，请发送邮件至：security@usdx.finance

**请勿在GitHub Issues中公开安全漏洞**

---

## 📊 合规

### ERC-1404 标准

USDX完整实现ERC-1404标准，支持16种转账限制检测：

| 代码 | 限制类型 | 说明 |
|------|----------|------|
| 0 | SUCCESS | 允许转账 |
| 2 | BLACKLISTED_SENDER | 发送方被黑名单 |
| 3 | BLACKLISTED_RECEIVER | 接收方被黑名单 |
| 6 | INVALID_KYC_SENDER | 发送方KYC无效 |
| 7 | INVALID_KYC_RECEIVER | 接收方KYC无效 |
| 8 | AMOUNT_EXCEEDS_LIMIT | 超出转账限额 |

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

### 2024 Q1 ✅
- [x] 核心合约开发完成
- [x] 测试覆盖率达到100%
- [x] 技术文档完善
- [x] CI/CD流程建立

### 2024 Q2 🔄
- [ ] 专业安全审计
- [ ] 测试网部署和测试
- [ ] 社区测试计划
- [ ] 合作伙伴集成

### 2024 Q3 🔮
- [ ] 主网部署
- [ ] 流动性启动
- [ ] 交易所上线
- [ ] 生态系统扩展

### 2024 Q4 🔮
- [ ] DeFi协议集成
- [ ] 跨链桥接支持
- [ ] 机构客户服务
- [ ] 国际市场扩展

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 📞 联系我们

- **项目网站**: https://usdx.finance
- **技术文档**: https://docs.usdx.finance
- **GitHub**: https://github.com/vipwzw/usdx
- **邮箱**: contact@usdx.finance

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