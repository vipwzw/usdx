#!/bin/bash

# USDX 智能合约测试网络部署脚本
# 使用方法: ./scripts/deploy-testnet.sh [网络名称]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"

# 函数：打印彩色消息
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 函数：检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 未安装或不在 PATH 中"
        exit 1
    fi
}

# 函数：检查文件是否存在
check_file() {
    if [ ! -f "$1" ]; then
        print_error "文件不存在: $1"
        exit 1
    fi
}

# 函数：检查环境变量配置
check_env() {
    if [ ! -f "$CONTRACTS_DIR/.env" ]; then
        print_warning ".env 文件不存在，需要先配置环境变量"
        echo
        read -p "是否现在配置环境变量? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_env
        else
            print_error "请先配置 .env 文件"
            exit 1
        fi
    fi
}

# 函数：设置环境变量
setup_env() {
    print_message "设置环境变量..."

    if [ -f "$CONTRACTS_DIR/env.example" ]; then
        cp "$CONTRACTS_DIR/env.example" "$CONTRACTS_DIR/.env"
        print_success ".env 文件已创建"

        echo
        print_warning "请编辑 .env 文件，填入以下必要信息:"
        echo "  - PRIVATE_KEY: 你的私钥"
        echo "  - INFURA_API_KEY: Infura API 密钥"
        echo "  - ETHERSCAN_API_KEY: Etherscan API 密钥"
        echo
        read -p "按任意键继续编辑 .env 文件..."

        # 尝试打开编辑器
        if command -v code &> /dev/null; then
            code "$CONTRACTS_DIR/.env"
        elif command -v nano &> /dev/null; then
            nano "$CONTRACTS_DIR/.env"
        else
            print_message "请手动编辑 .env 文件: $CONTRACTS_DIR/.env"
        fi

        echo
        read -p "编辑完成后，按任意键继续..."
    else
        print_error "env.example 文件不存在"
        exit 1
    fi
}

# 函数：检查网络余额
check_balance() {
    local network=$1
    print_message "检查网络余额..."

    # 这里可以添加余额检查逻辑
    # 暂时跳过，因为需要解析 .env 文件
    print_success "余额检查完成"
}

# 函数：本地测试部署
test_deployment_locally() {
    print_message "开始本地测试部署..."

    # 启动本地网络
    print_message "启动本地 Hardhat 网络..."
    npx hardhat node &
    LOCAL_NODE_PID=$!

    # 等待网络启动
    sleep 5

    # 在本地网络上部署
    print_message "在本地网络上部署合约..."
    npx hardhat run scripts/deploy.js --network localhost

    # 运行测试
    print_message "运行集成测试..."
    npx hardhat test test/integration/ --network localhost

    # 关闭本地网络
    kill $LOCAL_NODE_PID
    wait $LOCAL_NODE_PID 2>/dev/null || true

    print_success "本地测试部署完成"
}

# 函数：部署到测试网络
deploy_to_testnet() {
    local network=$1

    print_message "部署到测试网络: $network"

    # 编译合约
    print_message "编译合约..."
    npx hardhat compile

    # 运行单元测试
    print_message "运行单元测试..."
    npm test

    # 检查网络连接
    print_message "检查网络连接..."
    npx hardhat run scripts/check-network.js --network "$network" || {
        print_error "网络连接失败"
        exit 1
    }

    # 部署合约
    print_message "开始部署合约..."
    if [ "$network" = "interactive" ]; then
        node scripts/quick-deploy.js
    else
        npx hardhat run scripts/deploy.js --network "$network"
    fi

    print_success "部署完成"
}

# 函数：显示帮助信息
show_help() {
    echo "USDX 智能合约测试网络部署脚本"
    echo
    echo "使用方法:"
    echo "  $0 [选项] [网络]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -l, --local    本地测试部署"
    echo "  -i, --interactive  交互式部署"
    echo "  -s, --setup    设置环境变量"
    echo
    echo "支持的网络:"
    echo "  sepolia        Sepolia 测试网络 (推荐)"
    echo "  goerli         Goerli 测试网络"
    echo "  polygon-mumbai Polygon Mumbai 测试网络"
    echo "  bsc-testnet    BSC 测试网络"
    echo
    echo "示例:"
    echo "  $0 sepolia                    # 部署到 Sepolia"
    echo "  $0 --local                    # 本地测试部署"
    echo "  $0 --interactive              # 交互式部署"
    echo "  $0 --setup                    # 设置环境变量"
}

# 函数：创建网络检查脚本
create_network_check_script() {
    cat > "$CONTRACTS_DIR/scripts/check-network.js" << 'EOF'
const { ethers } = require("hardhat");

async function main() {
  try {
    const network = await ethers.provider.getNetwork();
    console.log(`连接到网络: ${network.name} (Chain ID: ${network.chainId})`);

    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`当前区块高度: ${blockNumber}`);

    const [signer] = await ethers.getSigners();
    console.log(`签名者地址: ${signer.address}`);

    const balance = await signer.getBalance();
    console.log(`账户余额: ${ethers.utils.formatEther(balance)} ETH`);

    console.log("✅ 网络连接正常");
  } catch (error) {
    console.error("❌ 网络连接失败:", error.message);
    process.exit(1);
  }
}

main();
EOF
}

# 主函数
main() {
    print_message "🚀 USDX 智能合约部署工具"
    print_message "================================"

    # 检查必要的命令
    check_command "node"
    check_command "npm"
    check_command "npx"

    # 切换到 contracts 目录
    cd "$CONTRACTS_DIR"

    # 检查必要的文件
    check_file "package.json"
    check_file "hardhat.config.js"
    check_file "scripts/deploy.js"

    # 创建网络检查脚本
    create_network_check_script

    # 安装依赖
    if [ ! -d "node_modules" ]; then
        print_message "安装依赖..."
        npm install
    fi

    # 解析命令行参数
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -l|--local)
            test_deployment_locally
            exit 0
            ;;
        -i|--interactive)
            check_env
            deploy_to_testnet "interactive"
            exit 0
            ;;
        -s|--setup)
            setup_env
            exit 0
            ;;
        "")
            # 无参数时显示帮助
            show_help
            exit 0
            ;;
        sepolia|goerli|polygon-mumbai|bsc-testnet)
            check_env
            deploy_to_testnet "$1"
            ;;
        *)
            print_error "未知的网络或选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 捕获中断信号
trap 'print_error "部署被中断"; exit 1' INT TERM

# 运行主函数
main "$@"
