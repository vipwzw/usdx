# 分支保护规则设置指南

## 🔒 概述

本指南将帮助您设置GitHub分支保护规则，确保只有通过所有CI检查的代码才能合并到`main`分支。

## 🚀 快速设置（自动化）

### 前置条件
1. 安装GitHub CLI工具
2. 拥有仓库的管理员权限

### 安装GitHub CLI

**macOS:**
```bash
brew install gh
```

**Ubuntu/Debian:**
```bash
sudo apt install gh
```

**Windows:**
```bash
winget install --id GitHub.cli
```

### 登录GitHub
```bash
gh auth login
```

### 运行自动化脚本

**Linux/macOS:**
```bash
chmod +x scripts/setup-branch-protection.sh
./scripts/setup-branch-protection.sh
```

**Windows:**
```cmd
scripts\setup-branch-protection.bat
```

## 🔧 手动设置（GitHub界面）

如果您更喜欢通过GitHub界面设置，请按照以下步骤：

### 步骤1: 访问分支设置页面

1. 打开您的GitHub仓库
2. 点击 **Settings** 标签
3. 在左侧菜单中选择 **Branches**
4. 点击 **Add rule** 按钮

### 步骤2: 配置分支保护规则

在 **Branch name pattern** 中输入 `main`，然后配置以下选项：

#### 必需的状态检查
✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- 添加以下状态检查：
  - `Test Smart Contracts`
  - `Code Quality`
  - `Security Analysis`
  - `Gas Usage Report`
  - `Build and Archive Artifacts`

#### 必需的代码审查
✅ **Require pull request reviews before merging**
- **Required approving reviews**: `1`
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require review from code owners**

#### 其他限制
✅ **Require conversation resolution before merging**
❌ **Require linear history** (可选)
❌ **Do not allow bypassing the above settings** (管理员可以覆盖)
❌ **Restrict pushes that create files** (可选)

### 步骤3: 保存规则

点击 **Create** 按钮保存规则。

## 📋 保护规则详情

以下是我们设置的保护规则详情：

### 🛡️ 状态检查要求

| 检查项目                    | 说明                             |
| --------------------------- | -------------------------------- |
| Test Smart Contracts        | 所有智能合约测试必须通过         |
| Code Quality                | 代码质量检查（ESLint + Solhint） |
| Security Analysis           | 安全分析（Slither + 自定义检查） |
| Gas Usage Report            | Gas使用报告生成                  |
| Build and Archive Artifacts | 构建和制品归档                   |

### 👥 代码审查要求

- **至少1个审查者批准**
- **代码所有者必须审查**
- **新提交会取消旧的审查**
- **必须解决所有对话**

### 🚫 限制规则

- **禁止强制推送**
- **禁止删除分支**
- **禁止绕过保护规则**

## 👨‍💻 CODEOWNERS文件

为确保代码审查质量，我们需要创建一个CODEOWNERS文件：

```
# 默认代码所有者
* @your-github-username

# 智能合约代码
/contracts/src/ @your-github-username @security-team-member
/contracts/test/ @your-github-username @test-team-member

# 部署脚本
/scripts/ @your-github-username @devops-team-member

# CI/CD配置
/.github/ @your-github-username @devops-team-member

# 文档
/docs/ @your-github-username @doc-team-member
```

## 🔍 验证设置

### 1. 通过GitHub界面验证

访问: `https://github.com/YOUR-USERNAME/YOUR-REPO/settings/branches`

### 2. 通过API验证

```bash
gh api repos/YOUR-USERNAME/YOUR-REPO/branches/main/protection
```

### 3. 测试保护规则

1. 创建一个测试分支
2. 创建一个会失败CI的提交
3. 尝试创建PR到main分支
4. 验证无法合并直到CI通过

## 🚨 常见问题解决

### Q: 状态检查没有显示
**A:** 确保CI工作流中的job名称与保护规则中的名称完全匹配。

### Q: 管理员无法合并
**A:** 检查 "Do not allow bypassing the above settings" 选项是否开启。

### Q: CI检查一直pending
**A:** 检查GitHub Actions工作流是否正确配置并且有权限运行。

### Q: 代码所有者审查失败
**A:** 确保CODEOWNERS文件格式正确，且指定的用户有仓库访问权限。

## 📖 相关文档

- [GitHub分支保护官方文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [CODEOWNERS文件语法](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Actions状态检查](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)

## 🎯 最佳实践

1. **定期更新状态检查列表**，确保与CI工作流同步
2. **合理设置审查者数量**，平衡安全性和开发效率
3. **使用CODEOWNERS文件**，确保关键代码得到专业审查
4. **定期检查保护规则**，根据团队需求调整
5. **为不同分支设置不同规则**，如develop分支可以更宽松

---

**注意**: 设置分支保护规则需要仓库管理员权限。如果您没有权限，请联系仓库管理员进行设置。 
