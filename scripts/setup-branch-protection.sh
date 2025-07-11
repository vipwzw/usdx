#!/bin/bash

# 设置分支保护规则脚本
# 需要 GitHub CLI (gh) 工具

set -e

echo "🔒 设置main分支保护规则"

# 检查是否安装了 GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI 未安装。请先安装 gh 工具:"
    echo "   macOS: brew install gh"
    echo "   Ubuntu: sudo apt install gh"
    echo "   Windows: winget install --id GitHub.cli"
    exit 1
fi

# 检查是否已登录
if ! gh auth status &> /dev/null; then
    echo "❌ 请先登录 GitHub CLI:"
    echo "   gh auth login"
    exit 1
fi

# 获取仓库信息
REPO_NAME=$(gh repo view --json name --jq '.name')
REPO_OWNER=$(gh repo view --json owner --jq '.owner.login')

echo "📋 仓库信息:"
echo "   - Owner: $REPO_OWNER"
echo "   - Name: $REPO_NAME"

# 设置分支保护规则
echo "🔧 正在设置分支保护规则..."

# 主要设置
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection" \
  --raw-field '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "Test Smart Contracts",
        "Code Quality",
        "Security Analysis",
        "Gas Usage Report",
        "Build and Archive Artifacts"
      ]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_approving_review_count": 1,
      "require_last_push_approval": false
    },
    "restrictions": null,
    "required_linear_history": false,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "block_creations": false,
    "required_conversation_resolution": true,
    "lock_branch": false,
    "allow_fork_syncing": true
  }'

echo "✅ 分支保护规则设置完成!"

# 验证设置
echo "🔍 验证设置:"
gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection" \
  --jq '{
    "required_status_checks": .required_status_checks.contexts,
    "require_pr_reviews": .required_pull_request_reviews.required_approving_review_count,
    "dismiss_stale_reviews": .required_pull_request_reviews.dismiss_stale_reviews,
    "require_code_owner_reviews": .required_pull_request_reviews.require_code_owner_reviews,
    "conversation_resolution": .required_conversation_resolution,
    "linear_history": .required_linear_history,
    "force_push": .allow_force_pushes,
    "deletions": .allow_deletions
  }'

echo ""
echo "🎉 分支保护规则配置完成!"
echo ""
echo "📋 保护规则详情:"
echo "   ✅ 必须通过所有状态检查"
echo "   ✅ 需要1个代码审查"
echo "   ✅ 代码所有者审查"
echo "   ✅ 关闭过时的审查"
echo "   ✅ 需要解决所有对话"
echo "   ❌ 禁止强制推送"
echo "   ❌ 禁止删除分支"
echo ""
echo "🔗 查看保护规则: https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
