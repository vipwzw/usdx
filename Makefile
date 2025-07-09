# ==============================================================================
# USDX 稳定币项目 Makefile
# ==============================================================================
# 提供常用的开发、测试、部署命令的简化接口

.PHONY: help install clean build test coverage lint deploy docs security

# 默认目标
.DEFAULT_GOAL := help

# 变量定义
CONTRACTS_DIR = contracts
NODE_BIN = $(CONTRACTS_DIR)/node_modules/.bin
NPM = npm
NETWORK ?= localhost

# 颜色定义
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# ==============================================================================
# 帮助命令
# ==============================================================================

help: ## 显示此帮助信息
	@echo "$(GREEN)USDX 稳定币项目 - 可用命令:$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)环境变量:$(NC)"
	@echo "  NETWORK    - 部署网络 (默认: localhost)"
	@echo "  REPORT_GAS - 启用Gas报告 (true/false)"
	@echo ""

# ==============================================================================
# 环境设置
# ==============================================================================

install: ## 安装依赖
	@echo "$(GREEN)安装项目依赖...$(NC)"
	$(NPM) install
	cd $(CONTRACTS_DIR) && $(NPM) install
	@echo "$(GREEN)依赖安装完成!$(NC)"

setup: install ## 项目初始化设置
	@echo "$(GREEN)项目初始化...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)创建 .env 文件...$(NC)"; \
		cp env.example .env; \
		echo "$(YELLOW)请编辑 .env 文件并配置必要的环境变量$(NC)"; \
	fi
	@echo "$(GREEN)项目初始化完成!$(NC)"

# ==============================================================================
# 清理命令
# ==============================================================================

clean: ## 清理缓存和构建文件
	@echo "$(GREEN)清理缓存和构建文件...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run clean
	rm -rf node_modules coverage .nyc_output
	@echo "$(GREEN)清理完成!$(NC)"

clean-all: clean ## 完全清理 (包括 node_modules)
	@echo "$(GREEN)完全清理项目...$(NC)"
	cd $(CONTRACTS_DIR) && rm -rf node_modules
	rm -rf node_modules
	@echo "$(GREEN)完全清理完成!$(NC)"

# ==============================================================================
# 构建和编译
# ==============================================================================

build: ## 编译智能合约
	@echo "$(GREEN)编译智能合约...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run compile
	@echo "$(GREEN)编译完成!$(NC)"

build-optimized: ## 优化编译智能合约
	@echo "$(GREEN)优化编译智能合约...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run compile:optimized
	@echo "$(GREEN)优化编译完成!$(NC)"

# ==============================================================================
# 测试命令
# ==============================================================================

test: ## 运行所有测试
	@echo "$(GREEN)运行测试...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) test
	@echo "$(GREEN)测试完成!$(NC)"

test-watch: ## 监视模式运行测试
	@echo "$(GREEN)监视模式运行测试...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run test:watch

test-parallel: ## 并行运行测试
	@echo "$(GREEN)并行运行测试...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run test:parallel

coverage: ## 生成测试覆盖率报告
	@echo "$(GREEN)生成测试覆盖率报告...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run coverage
	@echo "$(GREEN)覆盖率报告已生成: contracts/coverage/index.html$(NC)"

gas-report: ## 生成Gas使用报告
	@echo "$(GREEN)生成Gas使用报告...$(NC)"
	cd $(CONTRACTS_DIR) && REPORT_GAS=true $(NPM) test
	@echo "$(GREEN)Gas报告生成完成!$(NC)"

# ==============================================================================
# 代码质量
# ==============================================================================

lint: ## 运行代码检查
	@echo "$(GREEN)运行代码检查...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run lint
	@echo "$(GREEN)代码检查完成!$(NC)"

lint-fix: ## 自动修复代码问题
	@echo "$(GREEN)自动修复代码问题...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run lint:fix
	@echo "$(GREEN)代码修复完成!$(NC)"

format: ## 格式化代码
	@echo "$(GREEN)格式化代码...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run format
	@echo "$(GREEN)代码格式化完成!$(NC)"

# ==============================================================================
# 安全检查
# ==============================================================================

security: ## 运行安全分析
	@echo "$(GREEN)运行安全分析...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run security-check
	@echo "$(GREEN)安全分析完成!$(NC)"

security-slither: ## 运行Slither安全扫描
	@echo "$(GREEN)运行Slither安全扫描...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run security:slither
	@echo "$(GREEN)Slither扫描完成!$(NC)"

audit: ## 运行完整审计 (依赖 + 安全检查)
	@echo "$(GREEN)运行完整审计...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run audit
	@echo "$(GREEN)审计完成!$(NC)"

# ==============================================================================
# 部署命令
# ==============================================================================

node: ## 启动本地Hardhat节点
	@echo "$(GREEN)启动本地Hardhat节点...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run node

deploy: ## 部署到指定网络
	@echo "$(GREEN)部署到 $(NETWORK) 网络...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run deploy:$(NETWORK)
	@echo "$(GREEN)部署完成!$(NC)"

deploy-local: ## 部署到本地网络
	@$(MAKE) deploy NETWORK=local

deploy-goerli: ## 部署到Goerli测试网
	@$(MAKE) deploy NETWORK=goerli

deploy-mainnet: ## 部署到以太坊主网
	@$(MAKE) deploy NETWORK=mainnet

verify: ## 验证合约
	@echo "$(GREEN)验证合约...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run verify:$(NETWORK)
	@echo "$(GREEN)验证完成!$(NC)"

# ==============================================================================
# 分析和报告
# ==============================================================================

size: ## 分析合约大小
	@echo "$(GREEN)分析合约大小...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run size
	@echo "$(GREEN)大小分析完成!$(NC)"

analyze: ## 运行合约分析
	@echo "$(GREEN)运行合约分析...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run analyze
	@echo "$(GREEN)分析完成!$(NC)"

benchmark: ## 运行性能基准测试
	@echo "$(GREEN)运行性能基准测试...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run benchmark
	@echo "$(GREEN)基准测试完成!$(NC)"

# ==============================================================================
# 文档生成
# ==============================================================================

docs: ## 生成合约文档
	@echo "$(GREEN)生成合约文档...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run docs
	@echo "$(GREEN)文档生成完成!$(NC)"

docs-serve: ## 启动文档服务器
	@echo "$(GREEN)启动文档服务器...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run docs:serve

flatten: ## 扁平化合约
	@echo "$(GREEN)扁平化合约...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run flatten:all
	@echo "$(GREEN)合约扁平化完成!$(NC)"

# ==============================================================================
# 实用工具
# ==============================================================================

console: ## 启动Hardhat控制台
	@echo "$(GREEN)启动Hardhat控制台...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run console

check: ## 运行所有检查 (lint + test + size)
	@echo "$(GREEN)运行所有检查...$(NC)"
	cd $(CONTRACTS_DIR) && $(NPM) run check
	@echo "$(GREEN)所有检查完成!$(NC)"

ci: ## CI/CD 流水线命令
	@echo "$(GREEN)运行CI/CD流水线...$(NC)"
	@$(MAKE) install
	@$(MAKE) lint
	@$(MAKE) build
	@$(MAKE) test
	@$(MAKE) coverage
	@$(MAKE) security
	@echo "$(GREEN)CI/CD流水线完成!$(NC)"

# ==============================================================================
# 信息显示
# ==============================================================================

status: ## 显示项目状态
	@echo "$(GREEN)项目状态:$(NC)"
	@echo "  当前网络: $(NETWORK)"
	@echo "  Node版本: $(shell node --version)"
	@echo "  NPM版本:  $(shell npm --version)"
	@echo "  Git分支:  $(shell git branch --show-current 2>/dev/null || echo 'N/A')"
	@echo "  Git提交:  $(shell git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"

# ==============================================================================
# 错误处理
# ==============================================================================

# 确保在出错时停止
.ONESHELL:

# 默认的错误处理
%:
	@echo "$(RED)错误: 未知命令 '$@'$(NC)"
	@echo "运行 'make help' 查看可用命令"
	@exit 1
