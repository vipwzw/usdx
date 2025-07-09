#!/bin/bash

# 本地测试启动脚本
# 启动 Hardhat 本地节点并运行测试

echo "🚀 USDX 本地测试环境启动脚本"
echo "================================="

# 检查是否在 contracts 目录
if [ ! -f "hardhat.config.js" ]; then
    echo "❌ 请在 contracts 目录下运行此脚本"
    exit 1
fi

# 检查依赖
if ! command -v npx &> /dev/null; then
    echo "❌ 请先安装 Node.js 和 npm"
    exit 1
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动本地节点
echo "🌐 启动 Hardhat 本地节点..."
echo "   节点地址: http://127.0.0.1:8545"
echo "   Chain ID: 31337"
echo ""

# 显示可用账户
echo "👥 可用测试账户:"
echo "   账户 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (部署者)"
echo "   私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "   余额: 10000 ETH"
echo ""
echo "   账户 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (治理者1)"
echo "   私钥: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
echo "   余额: 10000 ETH"
echo ""
echo "   账户 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (治理者2)"
echo "   私钥: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
echo "   余额: 10000 ETH"
echo ""

echo "⚠️  注意：这些私钥仅用于本地测试，切勿在生产环境使用！"
echo ""

# 检查是否有进程在 8545 端口
if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口 8545 已被占用，正在终止现有进程..."
    kill -9 $(lsof -Pi :8545 -sTCP:LISTEN -t) 2>/dev/null
    sleep 2
fi

# 启动节点（后台运行）
echo "🔄 启动本地节点..."
npx hardhat node > hardhat-node.log 2>&1 &
NODE_PID=$!

# 等待节点启动
echo "⏳ 等待节点启动..."
sleep 5

# 检查节点是否启动成功
if ! curl -s http://127.0.0.1:8545 > /dev/null; then
    echo "❌ 本地节点启动失败！"
    kill $NODE_PID 2>/dev/null
    exit 1
fi

echo "✅ 本地节点启动成功！"
echo ""

# 提供使用选项
echo "🛠️  可用操作:"
echo "   1. 运行完整测试套件: npm test"
echo "   2. 运行本地部署测试: npx hardhat run scripts/local-test.js --network localhost"
echo "   3. 编译合约: npx hardhat compile"
echo "   4. 运行覆盖率测试: npm run test:coverage"
echo "   5. 运行燃气报告: npm run test:gas"
echo ""

echo "📋 快速测试命令:"
echo "   # 在另一个终端窗口运行:"
echo "   cd contracts"
echo "   npx hardhat run scripts/local-test.js --network localhost"
echo ""

echo "🔧 管理命令:"
echo "   # 查看节点日志:"
echo "   tail -f hardhat-node.log"
echo ""
echo "   # 停止节点:"
echo "   kill $NODE_PID"
echo ""

echo "💡 提示："
echo "   - 本地节点会在后台运行 (PID: $NODE_PID)"
echo "   - 使用 Ctrl+C 停止此脚本不会停止节点"
echo "   - 手动停止节点请使用: kill $NODE_PID"
echo ""

# 等待用户输入
echo "按 Enter 键运行本地部署测试，或按 Ctrl+C 退出..."
read -r

echo "🚀 运行本地部署测试..."
npx hardhat run scripts/local-test.js --network localhost

echo ""
echo "🎉 测试完成！本地节点仍在后台运行 (PID: $NODE_PID)"
echo "要停止节点请运行: kill $NODE_PID" 