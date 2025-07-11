#!/bin/bash

# ========================================
# VSCode 扩展自动安装脚本
# ========================================

set -e

echo "🚀 开始安装 VSCode 扩展..."

# 检查 code 命令是否可用
if ! command -v code &> /dev/null; then
    echo "❌ 错误: VSCode CLI 不可用"
    echo "   请确保 VSCode 已安装并配置了 PATH"
    echo "   参考: https://code.visualstudio.com/docs/editor/command-line"
    exit 1
fi

echo "✅ VSCode CLI 可用"

# 定义扩展列表
# 核心必需扩展
CORE_EXTENSIONS=(
    "JuanBlanco.solidity"
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslint"
)

# 推荐扩展
RECOMMENDED_EXTENSIONS=(
    "eamodio.gitlens"
    "AuxiliaryBytes.hardhat-vscode"
    "streetsidesoftware.code-spell-checker"
)

# 可选增强扩展
OPTIONAL_EXTENSIONS=(
    "tintinweb.solidity-visual-auditor"
    "PKief.material-icon-theme"
    "formulahendry.auto-rename-tag"
    "aaron-bond.better-comments"
    "donjayamanne.githistory"
)

# 安装函数
install_extension() {
    local id=$1

    # 检查是否已安装
    if code --list-extensions | grep -q "^${id}$"; then
        echo "   ✅ $id - 已安装"
        return 0
    fi

    echo "   📦 正在安装: $id"
    if code --install-extension "$id" --force; then
        echo "   ✅ $id - 安装成功"
        return 0
    else
        echo "   ❌ $id - 安装失败"
        return 1
    fi
}

# 安装核心扩展
echo ""
echo "🔴 安装核心必需扩展..."
for ext in "${CORE_EXTENSIONS[@]}"; do
    install_extension "$ext"
done

# 安装推荐扩展
echo ""
echo "🟡 安装推荐扩展..."
for ext in "${RECOMMENDED_EXTENSIONS[@]}"; do
    install_extension "$ext"
done

# 询问是否安装可选扩展
echo ""
read -p "🟢 是否安装可选增强扩展? (y/N): " install_optional

if [[ $install_optional =~ ^[Yy]$ ]]; then
    echo "🟢 安装可选增强扩展..."
    for ext in "${OPTIONAL_EXTENSIONS[@]}"; do
        install_extension "$ext"
    done
else
    echo "⏭️  跳过可选扩展安装"
fi

echo ""
echo "📊 安装完成！检查最终状态..."

# 检查核心扩展状态
missing_core=()

for ext in "${CORE_EXTENSIONS[@]}"; do
    if ! code --list-extensions | grep -q "^${ext}$"; then
        missing_core+=("$ext")
    fi
done

if [ ${#missing_core[@]} -eq 0 ]; then
    echo "✅ 所有核心扩展已安装"
else
    echo "⚠️  以下核心扩展未安装："
    for ext in "${missing_core[@]}"; do
        echo "   - $ext"
    done
fi

echo ""
echo "🎉 扩展安装过程完成！"
echo ""
echo "📋 下一步："
echo "1. 重启 VSCode 以激活扩展"
echo "2. 打开 contracts/ 目录: code contracts/"
echo "3. 测试源代码跳转功能"
echo ""
echo "💡 提示："
echo "- 首次使用可能需要等待扩展初始化"
echo "- 如有问题，请查看 VSCode 输出面板"
echo "- 详细使用指南: docs/SOLIDITY_CODE_NAVIGATION.md"
