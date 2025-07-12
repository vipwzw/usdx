# USDX 智能合约测试网络部署指南

## 概述

本指南将帮助你将 USDX 智能合约部署到测试网络上。项目包含两个主要合约：
- **USDXToken**: 主要的 USDX 代币合约
- **USDXGovernance**: 治理合约，用于管理代币合约

## 前提条件

1. **Node.js**: 版本 16+ 
2. **npm**: 包管理器
3. **测试网络 ETH**: 用于部署合约
4. **API 密钥**: Infura/Alchemy 和 Etherscan 的 API 密钥

## 支持的测试网络

- **Sepolia** (推荐): 以太坊官方测试网络
- **Goerli**: 以太坊测试网络
- **Polygon Mumbai**: Polygon 测试网络
- **BSC Testnet**: Binance Smart Chain 测试网络

## 部署步骤

### 1. 环境配置

#### 1.1 复制环境变量文件
```bash
cd contracts
cp env.example .env
```

#### 1.2 配置环境变量
编辑 `.env` 文件，填入以下必要信息：

```bash
# 部署者私钥 (务必保密)
PRIVATE_KEY=your_private_key_here

# API 密钥
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# 代币配置
TOKEN_NAME=USD Exchange
TOKEN_SYMBOL=USDX
INITIAL_SUPPLY=1000000000000000  # 1 billion tokens with 6 decimals

# 初始角色地址
INITIAL_OWNER=your_wallet_address
INITIAL_GOVERNORS=your_wallet_address
```

#### 1.3 获取测试网络 ETH
- **Sepolia**: https://sepoliafaucet.com/
- **Goerli**: https://goerlifaucet.com/
- **Polygon Mumbai**: https://faucet.polygon.technology/

### 2. 安装依赖

```bash
cd contracts
npm install
```

### 3. 编译合约

```bash
npx hardhat compile
```

### 4. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npx hardhat test test/USDXToken.test.js
npx hardhat test test/USDXGovernance.test.js
```

### 5. 部署合约

#### 5.1 部署到 Sepolia 测试网络
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

#### 5.2 部署到其他测试网络
```bash
# Goerli
npx hardhat run scripts/deploy.js --network goerli

# Polygon Mumbai
npx hardhat run scripts/deploy.js --network polygon-mumbai

# BSC Testnet
npx hardhat run scripts/deploy.js --network bsc-testnet
```

### 6. 验证合约

部署完成后，验证合约代码：

```bash
# 验证代币合约
npx hardhat verify --network sepolia USDX_TOKEN_ADDRESS

# 验证治理合约
npx hardhat verify --network sepolia GOVERNANCE_ADDRESS
```

## 部署后操作

### 1. 检查部署状态
```bash
npx hardhat run scripts/verify-deployment.js --network sepolia
```

### 2. 设置监控
```bash
npx hardhat run scripts/monitor.js --network sepolia
```

### 3. 运行安全检查
```bash
npx hardhat run scripts/security-check.js --network sepolia
```

## 常见问题

### Q1: 部署失败，提示 "insufficient funds"
**解决方案**: 确保你的钱包有足够的测试网络 ETH 来支付 gas 费用。

### Q2: 验证失败
**解决方案**: 
1. 检查合约地址是否正确
2. 确保 Etherscan API 密钥有效
3. 等待几分钟后重试

### Q3: 网络连接超时
**解决方案**: 
1. 检查 Infura/Alchemy API 密钥
2. 尝试更换网络提供商
3. 增加超时时间

## 部署配置说明

### 代币配置
- **名称**: USD Exchange
- **符号**: USDX
- **精度**: 6 位小数
- **初始供应量**: 10 亿代币

### 治理配置
- **投票期**: 24 小时
- **执行延迟**: 1 小时
- **所需投票数**: 根据治理者数量设置

### 角色权限
- **Owner**: 合约拥有者
- **Minter**: 铸币权限
- **Burner**: 销毁权限
- **Blacklister**: 黑名单管理
- **Pauser**: 暂停权限

## 安全注意事项

1. **私钥安全**: 
   - 永远不要在代码中硬编码私钥
   - 使用环境变量或硬件钱包
   - 定期轮换私钥

2. **测试网络验证**:
   - 在主网部署前，务必在测试网络上充分测试
   - 验证所有功能是否正常工作

3. **权限管理**:
   - 谨慎分配管理员权限
   - 建议使用多重签名钱包

4. **监控设置**:
   - 设置部署后监控
   - 监控异常交易和事件

## 下一步

1. **功能测试**: 测试代币的各项功能
2. **集成测试**: 与前端应用集成
3. **安全审计**: 进行安全审计
4. **主网部署**: 准备主网部署

## 联系支持

如果遇到问题，请：
1. 检查日志文件
2. 查看 Hardhat 文档
3. 联系开发团队

---

**注意**: 这是测试网络部署指南，主网部署需要更多的安全考虑和审计。 
