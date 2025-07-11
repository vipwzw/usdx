@echo off
setlocal enabledelayedexpansion

echo 🔒 设置main分支保护规则

REM 检查是否安装了 GitHub CLI
where gh >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ GitHub CLI 未安装。请先安装 gh 工具:
    echo    Windows: winget install --id GitHub.cli
    echo    或访问: https://cli.github.com/
    exit /b 1
)

REM 检查是否已登录
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 请先登录 GitHub CLI:
    echo    gh auth login
    exit /b 1
)

REM 获取仓库信息
for /f "tokens=*" %%a in ('gh repo view --json name --jq .name') do set REPO_NAME=%%a
for /f "tokens=*" %%a in ('gh repo view --json owner --jq .owner.login') do set REPO_OWNER=%%a

echo 📋 仓库信息:
echo    - Owner: %REPO_OWNER%
echo    - Name: %REPO_NAME%

REM 设置分支保护规则
echo 🔧 正在设置分支保护规则...

REM 创建临时JSON文件
set TEMP_JSON=%TEMP%\branch-protection.json
(
echo {
echo   "required_status_checks": {
echo     "strict": true,
echo     "contexts": [
echo       "Test Smart Contracts",
echo       "Code Quality",
echo       "Security Analysis",
echo       "Gas Usage Report",
echo       "Build and Archive Artifacts"
echo     ]
echo   },
echo   "enforce_admins": false,
echo   "required_pull_request_reviews": {
echo     "dismiss_stale_reviews": true,
echo     "require_code_owner_reviews": true,
echo     "required_approving_review_count": 1,
echo     "require_last_push_approval": false
echo   },
echo   "restrictions": null,
echo   "required_linear_history": false,
echo   "allow_force_pushes": false,
echo   "allow_deletions": false,
echo   "block_creations": false,
echo   "required_conversation_resolution": true,
echo   "lock_branch": false,
echo   "allow_fork_syncing": true
echo }
) > "%TEMP_JSON%"

REM 应用保护规则
gh api --method PUT -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "/repos/%REPO_OWNER%/%REPO_NAME%/branches/main/protection" --input "%TEMP_JSON%"

REM 删除临时文件
del "%TEMP_JSON%"

echo ✅ 分支保护规则设置完成!

REM 验证设置
echo 🔍 验证设置:
gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "/repos/%REPO_OWNER%/%REPO_NAME%/branches/main/protection" --jq "{\"required_status_checks\": .required_status_checks.contexts, \"require_pr_reviews\": .required_pull_request_reviews.required_approving_review_count, \"dismiss_stale_reviews\": .required_pull_request_reviews.dismiss_stale_reviews, \"require_code_owner_reviews\": .required_pull_request_reviews.require_code_owner_reviews, \"conversation_resolution\": .required_conversation_resolution, \"linear_history\": .required_linear_history, \"force_push\": .allow_force_pushes, \"deletions\": .allow_deletions}"

echo.
echo 🎉 分支保护规则配置完成!
echo.
echo 📋 保护规则详情:
echo    ✅ 必须通过所有状态检查
echo    ✅ 需要1个代码审查
echo    ✅ 代码所有者审查
echo    ✅ 关闭过时的审查
echo    ✅ 需要解决所有对话
echo    ❌ 禁止强制推送
echo    ❌ 禁止删除分支
echo.
echo 🔗 查看保护规则: https://github.com/%REPO_OWNER%/%REPO_NAME%/settings/branches

pause
