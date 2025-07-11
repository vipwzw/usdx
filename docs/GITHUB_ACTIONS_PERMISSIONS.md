# GitHub Actions 权限配置指南

## 🔐 概述

本文档详细说明了USDX项目中GitHub Actions工作流的权限配置，以及如何解决常见的权限问题。

## 🛡️ 权限类型

### 全局权限配置

我们在CI/CD Pipeline工作流中设置了以下全局权限：

```yaml
permissions:
  contents: read          # 读取仓库内容
  pull-requests: write    # 在PR上创建/更新评论
  issues: write          # 在Issue上创建/更新评论
  actions: read          # 读取Actions数据
  checks: read           # 读取检查状态
```

### 各Job的权限配置

#### Gas Report Job
```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```
- **用途**: 在PR上发布gas使用报告
- **需要**: 创建PR评论的权限

#### Build Artifacts Job
```yaml
permissions:
  contents: read
  actions: write
```
- **用途**: 构建和上传制品
- **需要**: 写入Actions制品的权限

#### Deployment Preparation Job
```yaml
permissions:
  contents: read
  actions: write
```
- **用途**: 准备部署制品
- **需要**: 写入Actions制品的权限

#### Summary Report Job
```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```
- **用途**: 生成CI/CD流水线摘要报告
- **需要**: 创建PR/Issue评论的权限

## 🔧 权限配置说明

### 为什么需要这些权限？

1. **contents: read**
   - 允许Actions读取仓库代码
   - 这是大多数Actions的基本权限

2. **pull-requests: write**
   - 允许在PR上创建、更新、删除评论
   - 用于发布测试报告、gas报告等

3. **issues: write**
   - 允许在Issue上创建、更新、删除评论
   - 用于发布自动化报告

4. **actions: write**
   - 允许上传Actions制品
   - 用于保存构建结果、测试报告等

5. **checks: read**
   - 允许读取检查状态
   - 用于获取其他Actions的状态

## 🚨 常见权限问题及解决方案

### 问题1: "Resource not accessible by integration"

**错误信息**:
```
RequestError [HttpError]: Resource not accessible by integration
status: 403
```

**原因**: GitHub Actions默认token权限不足

**解决方案**:
1. 在工作流级别添加权限配置
2. 在特定job级别添加权限配置
3. 显式指定github-token

**示例**:
```yaml
- name: Comment on PR
  uses: actions/github-script@v7
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: 'Your comment here'
      });
```

### 问题2: 无法上传制品

**错误信息**:
```
Error: Failed to upload artifact
```

**解决方案**:
添加actions: write权限到相关job

### 问题3: 无法读取其他Actions的状态

**解决方案**:
添加checks: read权限到相关job

## 📋 权限配置清单

在配置GitHub Actions权限时，请检查以下项目：

### ✅ 全局权限配置
- [ ] 在工作流文件顶部添加permissions配置
- [ ] 确保包含所需的基本权限
- [ ] 避免授予过多权限

### ✅ Job级别权限配置
- [ ] 为需要特殊权限的job添加permissions配置
- [ ] 确保权限符合最小权限原则
- [ ] 测试权限配置是否有效

### ✅ Token配置
- [ ] 在github-script中显式指定github-token
- [ ] 确保使用正确的token类型
- [ ] 检查token的有效性

## 🔒 最佳实践

### 1. 最小权限原则
- 只授予必要的权限
- 避免使用过于宽泛的权限
- 定期检查和清理不必要的权限

### 2. 权限分离
- 为不同的job配置不同的权限
- 避免在全局级别授予过多权限
- 使用job级别的权限配置

### 3. 安全考虑
- 定期审查权限配置
- 监控权限使用情况
- 及时撤销不必要的权限

### 4. 测试和验证
- 在测试环境中验证权限配置
- 监控Actions的执行日志
- 及时修复权限问题

## 📖 相关资源

- [GitHub Actions权限官方文档](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs)
- [GITHUB_TOKEN权限](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [GitHub Actions安全指南](https://docs.github.com/en/actions/security-guides)

## 🔍 排查权限问题

### 检查清单

1. **检查全局权限配置**
   ```bash
   # 查看工作流权限配置
   grep -n "permissions:" .github/workflows/ci.yml
   ```

2. **检查job权限配置**
   ```bash
   # 查看特定job的权限配置
   grep -A 5 -B 5 "permissions:" .github/workflows/ci.yml
   ```

3. **检查token使用**
   ```bash
   # 查看github-token的使用
   grep -n "github-token" .github/workflows/ci.yml
   ```

4. **查看Actions日志**
   - 访问GitHub Actions页面
   - 检查失败的job日志
   - 查找权限相关错误信息

### 常用调试命令

```bash
# 检查当前权限配置
gh api repos/OWNER/REPO/actions/permissions

# 检查特定工作流的权限
gh api repos/OWNER/REPO/actions/workflows/ci.yml/permissions

# 查看最近的工作流运行
gh run list --workflow=ci.yml
```

---

**注意**: 修改权限配置后，需要重新运行Actions来验证配置是否有效。如果遇到问题，请检查GitHub Actions的日志输出。 
