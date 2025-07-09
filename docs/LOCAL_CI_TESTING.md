# 本地 GitHub Actions CI/CD 测试指南

本指南将帮助您在本地环境中测试GitHub Actions工作流，避免每次都需要推送到远程仓库进行测试。

## 📋 目录

- [环境要求](#环境要求)
- [安装依赖](#安装依赖)
- [快速开始](#快速开始)
- [详细使用方法](#详细使用方法)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

## 🔧 环境要求

- **macOS/Linux/Windows** (推荐 macOS 或 Linux)
- **Docker Desktop** (必须运行)
- **act** 工具 (GitHub Actions 本地运行器)
- **bash** shell

## 📦 安装依赖

### 1. 安装 Docker Desktop

```bash
# macOS (使用 Homebrew)
brew install --cask docker

# 或者从官网下载: https://www.docker.com/products/docker-desktop
```

启动 Docker Desktop 并确保其正在运行。

### 2. 安装 act 工具

```bash
# macOS (使用 Homebrew)
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (使用 Chocolatey)
choco install act-cli
```

### 3. 验证安装

```bash
# 检查 Docker
docker --version

# 检查 act
act --version
```

## 🚀 快速开始

### 方法一：使用便捷脚本

```bash
# 给脚本执行权限
chmod +x scripts/test-ci-locally.sh

# 运行所有本地测试
./scripts/test-ci-locally.sh

# 查看帮助
./scripts/test-ci-locally.sh --help
```

### 方法二：直接使用 act 命令

```bash
# 列出所有可用的作业
act -l

# 运行本地测试作业
act -W .github/workflows/local-test.yml -j local-test

# 运行代码质量检查
act -W .github/workflows/local-test.yml -j local-lint
```

## 📖 详细使用方法

### 🎯 使用便捷脚本

我们提供了 `scripts/test-ci-locally.sh` 脚本来简化操作：

```bash
# 运行所有测试
./scripts/test-ci-locally.sh

# 只运行合约测试
./scripts/test-ci-locally.sh -j local-test

# 只运行代码质量检查
./scripts/test-ci-locally.sh -j local-lint

# 干运行模式（仅验证配置）
./scripts/test-ci-locally.sh -n

# 列出所有可用作业
./scripts/test-ci-locally.sh -l

# 运行完整的CI流程
./scripts/test-ci-locally.sh -w ci.yml
```

### 🔧 直接使用 act 命令

#### 基本用法

```bash
# 干运行模式（验证配置）
act -n

# 运行特定工作流
act -W .github/workflows/local-test.yml

# 运行特定作业
act -j local-test

# 详细输出
act -v
```

#### 高级用法

```bash
# 使用特定平台镜像
act -P ubuntu-latest=catthehacker/ubuntu:act-latest

# 绑定工作目录而不是复制
act --bind

# 设置环境变量
act --env NODE_ENV=test

# 使用secrets文件
act --secret-file .secrets
```

### 📋 可用的作业

| 作业名称 | 描述 | 用途 |
|---------|------|------|
| `local-test` | 运行智能合约测试 | 验证合约功能 |
| `local-lint` | 代码质量检查 | 验证代码规范 |
| `test` | 完整测试套件 | 完整CI测试 |
| `lint` | 完整代码质量检查 | 完整linting |
| `security` | 安全分析 | 安全扫描 |

## 🐛 故障排除

### 常见问题

#### 1. Docker 连接错误
```bash
Error: Cannot connect to the Docker daemon
```

**解决方案**：
- 确保 Docker Desktop 正在运行
- 检查 Docker 权限：`docker ps`

#### 2. 缓存路径问题
```bash
Error: Some specified paths were not resolved, unable to cache dependencies
```

**解决方案**：
- 使用本地测试工作流 (`local-test.yml`)，它已移除缓存配置
- 或使用 `--no-cache-server` 选项

#### 3. Node.js 版本问题
```bash
Error: EBADENGINE Unsupported engine
```

**解决方案**：
- 检查 `.github/workflows/` 中的 Node.js 版本设置
- 确保使用 Node.js 20

#### 4. 权限问题
```bash
Permission denied
```

**解决方案**：
```bash
# 给脚本执行权限
chmod +x scripts/test-ci-locally.sh

# 检查Docker权限
sudo usermod -aG docker $USER
```

### 调试技巧

#### 1. 详细输出
```bash
act -v -j local-test
```

#### 2. 查看容器内容
```bash
# 保留容器进行调试
act --reuse -j local-test
```

#### 3. 检查工作流语法
```bash
act --validate
```

## 🎯 最佳实践

### 1. 开发流程

```bash
# 1. 修改代码后，先本地测试
./scripts/test-ci-locally.sh -j local-test

# 2. 检查代码质量
./scripts/test-ci-locally.sh -j local-lint

# 3. 全面测试
./scripts/test-ci-locally.sh

# 4. 推送到远程
git push origin main
```

### 2. 工作流配置

- 为本地测试创建简化的工作流文件
- 移除依赖外部服务的步骤
- 使用 `|| true` 避免非关键步骤失败

### 3. 性能优化

```bash
# 使用本地Docker镜像缓存
act --pull=false

# 绑定工作目录
act --bind

# 重用容器
act --reuse
```

### 4. 团队协作

- 将 `scripts/test-ci-locally.sh` 加入项目
- 在PR模板中建议本地测试
- 文档化本地测试流程

## 📊 监控和报告

### 测试结果

本地测试会显示：
- ✅ **106/106** 合约测试通过
- ⚠️ Linting警告和错误
- 📊 执行时间统计

### 输出示例

```bash
[CI Local Test] USDX稳定币项目 - 本地GitHub Actions测试
[CI Local Test] ================================================
✅ 所有依赖检查通过
[CI Local Test] 运行所有本地测试...
[CI Local Test] 1. 运行合约测试...
[CI Local Test] 运行作业: local-test

  106 passing (9s)

✅ 所有测试完成！
```

## 🔗 相关资源

- [act 官方文档](https://github.com/nektos/act)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [项目主要 CI/CD 配置](.github/workflows/ci.yml)

---

💡 **提示**：建议在每次提交前运行本地测试，这样可以大大减少远程CI失败的次数，提高开发效率！
