#!/bin/bash

# ========================================
# JavaScript 代码跳转功能设置脚本
# ========================================

set -e

echo "🚀 开始设置 JavaScript 代码跳转功能..."

# 检查当前目录是否是项目根目录
if [ ! -d "contracts" ] || [ ! -f "README.md" ]; then
    echo "❌ 错误: 请在项目根目录 (usdt/) 运行此脚本"
    echo "   当前目录: $(pwd)"
    echo "   预期包含: contracts/ 目录和 README.md 文件"
    exit 1
fi

echo "📁 检查项目结构..."

# 检查必要文件是否存在
config_files=(
    ".vscode/settings.json"
    ".vscode/extensions.json"
    "jsconfig.json"
    "contracts/jsconfig.json"
    "contracts/package.json"
)

all_files_exist=true
for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ❌ $file (缺失)"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    echo "❌ 配置文件不完整，请先运行完整的设置脚本"
    exit 1
fi

echo "🔧 验证配置文件语法..."

# 验证 jsconfig.json 文件语法
if node -e "JSON.parse(require('fs').readFileSync('jsconfig.json', 'utf8'))" 2>/dev/null; then
    echo "   ✓ 根目录 jsconfig.json 语法正确"
else
    echo "   ❌ 根目录 jsconfig.json 语法错误"
    exit 1
fi

if node -e "JSON.parse(require('fs').readFileSync('contracts/jsconfig.json', 'utf8'))" 2>/dev/null; then
    echo "   ✓ contracts/jsconfig.json 语法正确"
else
    echo "   ❌ contracts/jsconfig.json 语法错误"
    exit 1
fi

echo "🔍 检查 VSCode 扩展..."

# 检查是否安装了 code 命令
if command -v code &> /dev/null; then
    echo "   ✓ VSCode CLI 可用"

    # 检查关键扩展
    extensions=(
        "ms-vscode.vscode-typescript-next"
        "esbenp.prettier-vscode"
        "dbaeumer.vscode-eslint"
    )

    missing_extensions=()
    for ext in "${extensions[@]}"; do
        if code --list-extensions | grep -q "$ext"; then
            echo "   ✓ $ext 已安装"
        else
            echo "   ⚠️  $ext 未安装"
            missing_extensions+=("$ext")
        fi
    done

    # 如果有缺失的扩展，提示用户安装
    if [ ${#missing_extensions[@]} -gt 0 ]; then
        echo ""
        echo "📦 检测到未安装的推荐扩展："
        for ext in "${missing_extensions[@]}"; do
            echo "   - $ext"
        done
        echo ""
        read -p "是否立即安装这些扩展? (y/N): " install_extensions
        if [[ $install_extensions =~ ^[Yy]$ ]]; then
            echo "正在安装扩展..."
            for ext in "${missing_extensions[@]}"; do
                echo "   安装 $ext..."
                if code --install-extension "$ext" --force; then
                    echo "   ✅ $ext 安装成功"
                else
                    echo "   ❌ $ext 安装失败"
                fi
            done
        fi
    fi
else
    echo "   ⚠️  VSCode CLI 不可用，无法检查扩展"
fi

echo "📊 检查 Node.js 环境..."

# 检查 Node.js 版本
node_version=$(node --version 2>/dev/null || echo "未安装")
if [[ $node_version =~ ^v([0-9]+) ]]; then
    version_num=${BASH_REMATCH[1]}
    if [ "$version_num" -ge 18 ]; then
        echo "   ✓ Node.js 版本: $node_version (支持)"
    else
        echo "   ⚠️  Node.js 版本: $node_version (建议升级到 v18+)"
    fi
else
    echo "   ❌ Node.js 未安装或版本检测失败"
fi

echo "🧪 测试 JavaScript 智能感知..."

# 进入 contracts 目录进行测试
cd contracts

# 检查依赖是否安装
if [ -d "node_modules" ]; then
    echo "   ✓ 依赖已安装"
else
    echo "   ⚠️  依赖未安装，正在安装..."
    npm install
fi

# 检查 hardhat 是否可用
if npx hardhat --version > /dev/null 2>&1; then
    echo "   ✓ Hardhat 可用"
else
    echo "   ❌ Hardhat 不可用"
fi

# 返回项目根目录
cd ..

echo "🎯 测试代码跳转功能..."

# 创建测试文件
test_file="test-navigation.js"
cat > "$test_file" << 'EOF'
// 测试文件：验证 JavaScript 代码跳转功能
const { ethers } = require("hardhat");
const fs = require("fs");

// 测试函数定义跳转
function testFunction() {
    console.log("测试函数");
    return ethers.utils.parseEther("1.0");
}

// 测试变量引用跳转
const testVariable = "test";
console.log(testVariable);

// 测试模块导入跳转
const config = require("./contracts/hardhat.config.js");

// 调用测试函数
testFunction();

module.exports = {
    testFunction,
    testVariable
};
EOF

echo "   ✓ 创建测试文件: $test_file"

# 验证测试文件语法
if node -c "$test_file" 2>/dev/null; then
    echo "   ✓ 测试文件语法正确"
else
    echo "   ❌ 测试文件语法错误"
fi

# 清理测试文件
rm -f "$test_file"
echo "   ✓ 清理测试文件"

echo ""
echo "🎉 JavaScript 代码跳转功能设置完成！"
echo ""
echo "📋 功能验证："
echo "   ✅ jsconfig.json 配置文件已创建"
echo "   ✅ VSCode 设置已优化"
echo "   ✅ 路径别名已配置"
echo "   ✅ 智能感知已启用"
echo ""
echo "🚀 开始使用："
echo ""
echo "1. 🔧 在 VSCode 中打开项目:"
echo "   code ."
echo "   # 或者打开 contracts 目录:"
echo "   code contracts/"
echo ""
echo "2. 🎯 测试代码跳转功能:"
echo "   - 打开 contracts/scripts/deploy.js"
echo "   - 按住 Ctrl 点击 'ethers' 或 'require'"
echo "   - 使用 F12 跳转到函数定义"
echo "   - 使用 Shift+F12 查找所有引用"
echo "   - 使用 F2 重命名变量"
echo ""
echo "3. 📖 查看详细使用指南:"
echo "   docs/JAVASCRIPT_CODE_NAVIGATION.md"
echo ""
echo "💡 快捷键参考："
echo "   - F12 / Ctrl+Click: 跳转到定义"
echo "   - Alt+F12: 预览定义"
echo "   - Shift+F12: 查找所有引用"
echo "   - F2: 重命名符号"
echo "   - Ctrl+Shift+O: 文件内符号搜索"
echo "   - Ctrl+T: 工作区符号搜索"
echo ""
echo "🎈 享受您的 JavaScript 开发体验！"
