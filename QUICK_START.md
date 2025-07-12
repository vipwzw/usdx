# 🚀 USDX 智能合约快速部署指南

## 一键部署到测试网络

### 方法 1: 使用部署脚本（推荐）

```bash
# 交互式部署（推荐新手使用）
./scripts/deploy-testnet.sh --interactive

# 直接部署到指定网络
./scripts/deploy-testnet.sh sepolia

# 本地测试部署
./scripts/deploy-testnet.sh --local
```

### 方法 2: 使用 Hardhat 命令

```bash
# 进入合约目录
cd contracts

# 配置环境变量
cp env.example .env
# 编辑 .env 文件，填入你的私钥和 API 密钥

# 编译合约
npx hardhat compile

# 部署到测试网络
npx hardhat run scripts/deploy.js --network sepolia
```

## 🔧 环境配置

### 1. 获取 API 密钥

- **Infura**: https://infura.io (免费注册，获取 API 密钥)
- **Etherscan**: https://etherscan.io/apis (用于合约验证)

### 2. 获取测试网络 ETH

- **Sepolia**: https://sepoliafaucet.com/
- **Goerli**: https://goerlifaucet.com/
- **Polygon Mumbai**: https://faucet.polygon.technology/

### 3. 设置环境变量

```bash
# 自动设置
./scripts/deploy-testnet.sh --setup

# 或手动编辑 .env 文件
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 🌐 支持的网络

| 网络           | 名称           | 推荐度 | 水龙头                                                 |
| -------------- | -------------- | ------ | ------------------------------------------------------ |
| sepolia        | Sepolia        | ⭐⭐⭐⭐⭐  | [获取测试币](https://sepoliafaucet.com/)               |
| goerli         | Goerli         | ⭐⭐⭐⭐   | [获取测试币](https://goerlifaucet.com/)                |
| polygon-mumbai | Polygon Mumbai | ⭐⭐⭐    | [获取测试币](https://faucet.polygon.technology/)       |
| bsc-testnet    | BSC Testnet    | ⭐⭐⭐    | [获取测试币](https://testnet.binance.org/faucet-smart) |

## 📝 部署后操作

### 1. 验证合约

```bash
# 验证代币合约
npx hardhat verify --network sepolia <TOKEN_ADDRESS>

# 验证治理合约
npx hardhat verify --network sepolia <GOVERNANCE_ADDRESS>
```

### 2. 测试合约功能

```bash
# 运行集成测试
npx hardhat test test/integration/ --network sepolia

# 运行安全检查
npx hardhat run scripts/security-check.js --network sepolia
```

## 🛠️ 常见问题解决

### Q1: 部署失败，提示 "insufficient funds"

**解决方案**: 
1. 确保钱包有足够的测试币
2. 从对应的水龙头获取测试币
3. 检查网络是否正确

### Q2: 私钥相关错误

**解决方案**:
1. 确保私钥格式正确（以 0x 开头）
2. 检查 .env 文件是否正确配置
3. 确保私钥对应的地址有足够余额

### Q3: 网络连接超时

**解决方案**:
1. 检查 Infura API 密钥是否有效
2. 尝试更换网络（如从 Goerli 换到 Sepolia）
3. 检查网络连接

## 🎯 快速开始示例

```bash
# 第一次使用
git clone <repository>
cd usdt

# 设置环境（首次使用）
./scripts/deploy-testnet.sh --setup

# 本地测试（验证合约逻辑）
./scripts/deploy-testnet.sh --local

# 部署到测试网络
./scripts/deploy-testnet.sh --interactive
```

## 📚 更多文档

- [详细部署指南](contracts/DEPLOYMENT_GUIDE.md)
- [本地测试指南](docs/LOCAL_CI_TESTING.md)
- [JavaScript 调试指南](docs/JAVASCRIPT_DEBUG_GUIDE.md)

## 🔐 安全注意事项

1. **私钥安全**: 永远不要提交私钥到代码仓库
2. **测试网络**: 始终先在测试网络上验证
3. **余额检查**: 确保有足够的测试币支付 gas
4. **网络确认**: 确认部署到正确的网络

## 📞 获取帮助

如果遇到问题：
1. 查看错误日志
2. 检查网络连接和余额
3. 查看 [GitHub Issues](https://github.com/your-repo/issues)
4. 联系开发团队

---

**🎉 现在就开始部署你的第一个 USDX 智能合约！**

```bash
./scripts/deploy-testnet.sh --interactive
``` 
