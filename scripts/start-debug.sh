#!/bin/bash

# JavaScript调试快速启动脚本
# 使用方法: ./scripts/start-debug.sh [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}$1${NC}"
}

print_message "🔧 JavaScript调试环境启动器" "$BLUE"
print_message "================================" "$BLUE"

# 检查Node.js版本
NODE_VERSION=$(node -v)
print_message "Node.js版本: $NODE_VERSION" "$GREEN"

# 检查VSCode是否安装
if command -v code &> /dev/null; then
    print_message "✅ VSCode已安装" "$GREEN"
else
    print_message "❌ VSCode未安装，请先安装VSCode" "$RED"
    exit 1
fi

# 进入contracts目录
cd contracts

# 检查依赖
if [ ! -d "node_modules" ]; then
    print_message "📦 安装依赖..." "$YELLOW"
    npm install
fi

# 显示调试选项菜单
show_menu() {
    print_message "\n🎯 请选择调试模式:" "$BLUE"
    echo "1) 调试测试文件"
    echo "2) 调试部署脚本"
    echo "3) 调试Gas报告"
    echo "4) 启动本地网络 + 调试"
    echo "5) 打开VSCode调试面板"
    echo "6) 查看调试配置"
    echo "7) 退出"
    echo
}

# 启动本地网络
start_local_network() {
    print_message "🌐 启动本地Hardhat网络..." "$YELLOW"

    # 检查端口8545是否被占用
    if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null ; then
        print_message "⚠️  端口8545已被占用，尝试停止现有进程..." "$YELLOW"
        pkill -f "hardhat node" || true
        sleep 2
    fi

    # 后台启动Hardhat网络
    nohup npx hardhat node > hardhat-node.log 2>&1 &
    HARDHAT_PID=$!

    print_message "✅ 本地网络已启动 (PID: $HARDHAT_PID)" "$GREEN"
    print_message "📄 日志文件: contracts/hardhat-node.log" "$GREEN"

    # 等待网络启动
    sleep 3

    # 验证网络是否正常运行
    if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null; then
        print_message "✅ 网络运行正常" "$GREEN"
    else
        print_message "❌ 网络启动失败" "$RED"
        exit 1
    fi
}

# 调试测试文件
debug_test() {
    print_message "🧪 调试测试文件" "$BLUE"

    # 列出可用的测试文件
    print_message "\n📁 可用的测试文件:" "$YELLOW"
    ls -1 test/*.js | nl

    echo
    read -p "输入测试文件编号或文件名: " test_choice

    if [[ "$test_choice" =~ ^[0-9]+$ ]]; then
        # 如果输入的是数字，获取对应的文件
        test_file=$(ls -1 test/*.js | sed -n "${test_choice}p")
    else
        # 如果输入的是文件名
        test_file="test/$test_choice"
        if [[ ! "$test_file" =~ \.js$ ]]; then
            test_file="${test_file}.js"
        fi
    fi

    if [ -f "$test_file" ]; then
        print_message "🔍 调试文件: $test_file" "$GREEN"
        code -g "$test_file:1"
        print_message "💡 请在VSCode中设置断点，然后按F5开始调试" "$YELLOW"
        print_message "💡 选择调试配置: 'Hardhat Test Debug'" "$YELLOW"
    else
        print_message "❌ 文件不存在: $test_file" "$RED"
    fi
}

# 调试部署脚本
debug_deploy() {
    print_message "🚀 调试部署脚本" "$BLUE"

    # 确保本地网络运行
    if ! curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null; then
        print_message "🌐 本地网络未运行，正在启动..." "$YELLOW"
        start_local_network
    fi

    # 列出可用的脚本文件
    print_message "\n📁 可用的脚本文件:" "$YELLOW"
    ls -1 scripts/*.js | nl

    echo
    read -p "输入脚本文件编号或文件名: " script_choice

    if [[ "$script_choice" =~ ^[0-9]+$ ]]; then
        script_file=$(ls -1 scripts/*.js | sed -n "${script_choice}p")
    else
        script_file="scripts/$script_choice"
        if [[ ! "$script_file" =~ \.js$ ]]; then
            script_file="${script_file}.js"
        fi
    fi

    if [ -f "$script_file" ]; then
        print_message "🔍 调试文件: $script_file" "$GREEN"
        code -g "$script_file:1"
        print_message "💡 请在VSCode中设置断点，然后按F5开始调试" "$YELLOW"
        print_message "💡 选择调试配置: 'Deploy Script Debug'" "$YELLOW"
    else
        print_message "❌ 文件不存在: $script_file" "$RED"
    fi
}

# 调试Gas报告
debug_gas_report() {
    print_message "⛽ 调试Gas报告生成" "$BLUE"

    code -g "scripts/generate-gas-report.js:1"
    print_message "💡 请在VSCode中设置断点，然后按F5开始调试" "$YELLOW"
    print_message "💡 选择调试配置: 'Debug Gas Report'" "$YELLOW"
}

# 打开VSCode调试面板
open_vscode_debug() {
    print_message "🎯 打开VSCode调试面板" "$BLUE"

    # 打开调试面板
    code --command "workbench.view.debug"

    print_message "💡 调试面板已打开，您可以:" "$YELLOW"
    print_message "   1. 选择调试配置" "$YELLOW"
    print_message "   2. 设置断点" "$YELLOW"
    print_message "   3. 按F5开始调试" "$YELLOW"
}

# 查看调试配置
show_debug_config() {
    print_message "⚙️  可用的调试配置:" "$BLUE"

    echo "1. Hardhat Test Debug - 调试测试文件"
    echo "2. Deploy Script Debug - 调试部署脚本"
    echo "3. Debug Gas Report - 调试Gas报告"
    echo "4. Debug Specific Test - 调试特定测试"
    echo "5. Current Node.js File - 调试当前文件"
    echo

    print_message "📖 详细使用方法请查看: docs/JAVASCRIPT_DEBUG_GUIDE.md" "$GREEN"
}

# 清理函数
cleanup() {
    print_message "\n🧹 清理资源..." "$YELLOW"

    # 停止Hardhat网络
    if [ ! -z "$HARDHAT_PID" ]; then
        kill $HARDHAT_PID 2>/dev/null || true
        print_message "✅ 本地网络已停止" "$GREEN"
    fi
}

# 设置信号处理
trap cleanup EXIT

# 主循环
while true; do
    show_menu
    read -p "请选择 (1-7): " choice

    case $choice in
        1)
            debug_test
            ;;
        2)
            debug_deploy
            ;;
        3)
            debug_gas_report
            ;;
        4)
            start_local_network
            print_message "💡 网络已启动，现在可以开始调试了" "$GREEN"
            ;;
        5)
            open_vscode_debug
            ;;
        6)
            show_debug_config
            ;;
        7)
            print_message "👋 再见!" "$GREEN"
            exit 0
            ;;
        *)
            print_message "❌ 无效选择，请输入1-7" "$RED"
            ;;
    esac

    echo
    read -p "按回车键继续..."
done
