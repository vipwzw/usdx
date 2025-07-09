#!/bin/bash

# ===================================
# 本地GitHub Actions测试脚本
# ===================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${BLUE}[CI Local Test]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查依赖
check_dependencies() {
    print_message "检查依赖..."

    if ! command -v act &> /dev/null; then
        print_error "act 工具未安装。请先安装: brew install act"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装或未启动"
        exit 1
    fi

    print_success "所有依赖检查通过"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -j, --job JOB_NAME    运行特定的作业 (test, lint, security, etc.)"
    echo "  -l, --list           列出所有可用的作业"
    echo "  -n, --dry-run        仅验证配置，不实际运行"
    echo "  -w, --workflow FILE  指定工作流文件 (默认: local-test.yml)"
    echo "  -h, --help           显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                   # 运行所有本地测试作业"
    echo "  $0 -j test          # 只运行测试作业"
    echo "  $0 -j lint          # 只运行代码质量检查"
    echo "  $0 -l               # 列出所有作业"
    echo "  $0 -n               # 干运行模式"
}

# 列出所有作业
list_jobs() {
    print_message "列出所有可用的GitHub Actions作业..."
    act -l
}

# 运行特定作业
run_job() {
    local job_name=$1
    local workflow_file=${2:-"local-test.yml"}
    local dry_run=$3

    local act_cmd="act"

    if [ ! -z "$workflow_file" ] && [ "$workflow_file" != "local-test.yml" ]; then
        act_cmd="$act_cmd -W .github/workflows/$workflow_file"
    elif [ -f ".github/workflows/local-test.yml" ]; then
        act_cmd="$act_cmd -W .github/workflows/local-test.yml"
    fi

    if [ ! -z "$job_name" ]; then
        act_cmd="$act_cmd -j $job_name"
    fi

    if [ "$dry_run" = "true" ]; then
        act_cmd="$act_cmd -n"
        print_message "运行干运行模式: $act_cmd"
    else
        print_message "运行作业: $job_name"
    fi

    eval $act_cmd
}

# 运行所有本地测试
run_all_tests() {
    print_message "运行所有本地测试..."

    print_message "1. 运行合约测试..."
    run_job "local-test" "local-test.yml"

    print_message "2. 运行代码质量检查..."
    run_job "local-lint" "local-test.yml"

    print_success "所有测试完成！"
}

# 主函数
main() {
    local job_name=""
    local workflow_file="local-test.yml"
    local dry_run="false"
    local list_only="false"

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -j|--job)
                job_name="$2"
                shift 2
                ;;
            -w|--workflow)
                workflow_file="$2"
                shift 2
                ;;
            -n|--dry-run)
                dry_run="true"
                shift
                ;;
            -l|--list)
                list_only="true"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    print_message "USDX稳定币项目 - 本地GitHub Actions测试"
    print_message "================================================"

    check_dependencies

    if [ "$list_only" = "true" ]; then
        list_jobs
        exit 0
    fi

    if [ ! -z "$job_name" ]; then
        run_job "$job_name" "$workflow_file" "$dry_run"
    else
        if [ "$dry_run" = "true" ]; then
            print_message "验证所有工作流配置..."
            run_job "local-test" "$workflow_file" "true"
            run_job "local-lint" "$workflow_file" "true"
            print_success "所有工作流配置验证通过！"
        else
            run_all_tests
        fi
    fi
}

# 运行主函数
main "$@"
