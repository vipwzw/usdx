# USDX 本地测试指南

## 📋 概述

本指南介绍如何在本地环境中测试 USDX 稳定币合约，无需连接到真实的区块链网络。

## 🔧 准备工作

### 1. 环境要求

- Node.js 18.0+
- npm 或 yarn
- Git

### 2. 安装依赖

```bash
cd contracts
npm install
```

## 🚀 快速开始

### 方法一：使用自动化脚本

#### Linux/macOS:

```bash
cd contracts
chmod +x scripts/start-local-test.sh
./scripts/start-local-test.sh
```

#### Windows:

```cmd
cd contracts
scripts\start-local-test.bat
```

### 方法二：手动执行

#### 1. 编译合约

```bash
cd contracts
npx hardhat compile
```

#### 2. 运行测试

```bash
# 运行本地部署测试
npx hardhat run scripts/local-test.js --network hardhat

# 运行完整测试套件
npm test

# 运行覆盖率测试
npm run test:coverage

# 运行燃气报告
npm run test:gas
```

## 🔑 测试账户信息

### 默认测试账户

本地测试使用 Hardhat 默认的测试账户：

```javascript
账户 0 (部署者): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
余额: 10000 ETH

账户 1 (治理者1): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
私钥: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
余额: 10000 ETH

账户 2 (治理者2): 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
私钥: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
余额: 10000 ETH
```

⚠️ **重要提醒**: 这些私钥仅用于本地测试，切勿在生产环境使用！

## 📊 测试功能

### 本地部署测试 (`local-test.js`)

运行此脚本将执行以下操作：

1. **网络信息显示**
   - 显示 Chain ID 和网络名称
   - 显示可用测试账户及余额

2. **合约部署**
   - 部署 USDXToken 合约
   - 部署 USDXGovernance 合约

3. **基础功能测试**
   - 检查代币基本信息 (名称、符号、精度、总供应量)
   - 进行 KYC 验证
   - 测试转账功能
   - 测试治理合约功能

4. **结果保存**
   - 生成部署信息文件 (`local-deployment.json`)

### 测试示例输出

```
🚀 开始本地测试部署和验证
==================================================

🌐 网络信息:
   Chain ID: 31337
   网络名称: hardhat

👥 可用账户:
   账户 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   余额: 10000.0 ETH

📦 开始部署合约...
🏗️  部署 USDXToken...
✅ USDXToken 部署成功: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

🧪 开始基础功能测试...
代币名称: USDX Stablecoin
代币符号: USDX
代币精度: 6
总供应量: 1000000000000000000000.0

🔐 进行 KYC 验证...
💸 测试转账功能...
✅ 转账成功！接收者余额: 1000.0 USDX

🎉 本地测试完成！
```

## 🛠️ 高级用法

### 1. 自定义配置

编辑 `local-config.js` 文件来自定义测试配置：

```javascript
module.exports = {
  contracts: {
    token: {
      name: "USDX Stablecoin",
      symbol: "USDX",
      initialSupply: "1000000000000000000000000000", // 1 billion tokens
      initialOwner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    },
    governance: {
      governors: [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      ],
      requiredVotes: 2,
      votingPeriod: 86400, // 24 hours
      executionDelay: 3600, // 1 hour
    },
  },
};
```

### 2. 使用本地节点

如果需要持久化的本地网络：

```bash
# 启动本地节点
npx hardhat node

# 在另一个终端运行测试
npx hardhat run scripts/local-test.js --network localhost
```

### 3. 连接 MetaMask

1. 打开 MetaMask
2. 添加网络：
   - 网络名称: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - 货币符号: ETH

3. 导入测试账户私钥

## 🧪 测试命令参考

```bash
# 基础测试
npm test                    # 运行所有测试
npm run test:coverage      # 运行覆盖率测试
npm run test:gas          # 运行燃气报告测试

# 代码质量
npm run lint              # 运行代码检查
npm run lint:fix          # 自动修复代码问题
npm run format            # 格式化代码

# 合约操作
npx hardhat compile       # 编译合约
npx hardhat clean         # 清理编译文件
npx hardhat size          # 检查合约大小
```

## 📁 相关文件

- `local-config.js` - 本地测试配置
- `scripts/local-test.js` - 本地部署测试脚本
- `scripts/start-local-test.sh` - Linux/macOS 启动脚本
- `scripts/start-local-test.bat` - Windows 启动脚本
- `local-deployment.json` - 部署信息文件 (自动生成)

## 🔍 故障排除

### 常见问题

1. **端口占用**

   ```bash
   # 查找占用端口 8545 的进程
   lsof -i :8545

   # 终止进程
   kill -9 <PID>
   ```

2. **依赖问题**

   ```bash
   # 清理并重新安装依赖
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **编译错误**
   ```bash
   # 清理编译缓存
   npx hardhat clean
   npx hardhat compile
   ```

### 获取帮助

- 查看 Hardhat 文档：https://hardhat.org/docs
- 查看 OpenZeppelin 文档：https://docs.openzeppelin.com/
- 项目 GitHub Issues：https://github.com/vipwzw/usdx/issues

## 🎯 下一步

1. **开发测试**：在本地环境中开发和测试新功能
2. **集成测试**：运行完整的测试套件
3. **性能优化**：使用燃气报告优化合约
4. **部署准备**：准备测试网部署

---

✅ **本地测试配置完成！**
现在您可以在本地环境中安全地测试 USDX 稳定币合约了。
