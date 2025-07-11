#!/bin/bash

# ========================================
# Solidity 源代码跳转功能自动设置脚本
# ========================================

set -e

echo "🚀 开始设置 Solidity 源代码跳转功能..."

# 检查当前目录是否是项目根目录
if [ ! -d "contracts" ] || [ ! -f "README.md" ]; then
    echo "❌ 错误: 请在项目根目录 (usdt/) 运行此脚本"
    echo "   当前目录: $(pwd)"
    echo "   预期包含: contracts/ 目录和 README.md 文件"
    exit 1
fi

# 检查 contracts/package.json
if [ ! -f "contracts/package.json" ]; then
    echo "❌ 错误: 未找到 contracts/package.json"
    exit 1
fi

echo "📁 检查项目结构..."

# 进入 contracts 目录
cd contracts

echo "📦 安装依赖..."
npm install

echo "🔧 编译合约..."
npx hardhat clean
npx hardhat compile

echo "📝 生成 TypeChain 类型..."
npx hardhat typechain

echo "✅ 验证配置文件..."

# 检查必需的配置文件
config_files=(
    "../.vscode/settings.json"
    "../.vscode/extensions.json"
    "../.vscode/launch.json"
    "../.vscode/tasks.json"
    "tsconfig.json"
    "solidity.json"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ❌ $file (缺失)"
    fi
done

echo "🔍 检查 VSCode 扩展..."

# 检查是否安装了 code 命令
if command -v code &> /dev/null; then
    echo "   ✓ VSCode CLI 可用"

    # 检查关键扩展
    extensions=(
        "JuanBlanco.solidity"
        "esbenp.prettier-vscode"
        "dbaeumer.vscode-eslint"
    )

    for ext in "${extensions[@]}"; do
        if code --list-extensions | grep -q "$ext"; then
            echo "   ✓ $ext 已安装"
        else
            echo "   ⚠️  $ext 未安装 (建议安装)"
        fi
    done
else
    echo "   ⚠️  VSCode CLI 不可用，无法检查扩展"
fi

echo "🧪 运行测试验证..."

# 运行基本测试
if npm test; then
    echo "   ✓ 合约测试通过"
else
    echo "   ⚠️  测试失败，但不影响代码跳转功能"
fi

echo "📊 生成项目报告..."

# 生成合约大小报告
if npx hardhat size-contracts > /dev/null 2>&1; then
    echo "   ✓ 合约大小分析完成"
else
    echo "   ⚠️  合约大小分析跳过"
fi

# 返回项目根目录
cd ..

echo ""
echo "🎉 设置完成！"
echo ""
echo "📋 接下来的步骤:"
echo ""
echo "1. 📖 阅读使用指南:"
echo "   docs/SOLIDITY_CODE_NAVIGATION.md"
echo ""
echo "2. 🔧 在 VSCode 中打开项目:"
echo "   code contracts/"
echo ""
echo "3. 📱 安装推荐扩展:"
echo "   VSCode 会自动提示安装推荐扩展"
echo ""
echo "4. 🎯 开始使用源代码跳转:"
echo "   - Ctrl+Click: 跳转到定义"
echo "   - F12: 跳转到定义"
echo "   - Shift+F12: 查找所有引用"
echo "   - F2: 重命名符号"
echo ""

# 创建验证函数
function verify_navigation() {
    echo "🔍 验证源代码跳转功能..."

    # 检查编译产物
    if [ -d "contracts/artifacts" ] && [ -d "contracts/typechain-types" ]; then
        echo "   ✓ 编译产物存在"
    else
        echo "   ❌ 编译产物缺失"
        return 1
    fi

    # 检查主要合约文件
    if [ -f "contracts/src/USDXToken.sol" ]; then
        echo "   ✓ 主合约文件存在"
    else
        echo "   ❌ 主合约文件缺失"
        return 1
    fi

    # 检查接口文件
    if [ -f "contracts/src/interfaces/IERC1404.sol" ]; then
        echo "   ✓ 接口文件存在"
    else
        echo "   ❌ 接口文件缺失"
        return 1
    fi

    echo "   ✅ 基本验证通过"
    return 0
}

# 运行验证
verify_navigation

echo ""
echo "💡 提示:"
echo "   - 如果遇到问题，请查看故障排除部分"
echo "   - 确保在 VSCode 中打开 contracts/ 目录"
echo "   - 首次使用可能需要等待扩展加载"
echo ""
echo "🌟 享受您的 Solidity 开发体验！"
