@echo off
setlocal enabledelayedexpansion

REM ========================================
REM VSCode 扩展自动安装脚本 (Windows)
REM ========================================

echo 🚀 开始安装 VSCode 扩展...

REM 检查 code 命令是否可用
where code >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: VSCode CLI 不可用
    echo    请确保 VSCode 已安装并配置了 PATH
    echo    参考: https://code.visualstudio.com/docs/editor/command-line
    pause
    exit /b 1
)

echo ✅ VSCode CLI 可用

REM 定义核心必需扩展
set "core_extensions=JuanBlanco.solidity esbenp.prettier-vscode dbaeumer.vscode-eslint"

REM 定义推荐扩展
set "recommended_extensions=eamodio.gitlens AuxiliaryBytes.hardhat-vscode streetsidesoftware.code-spell-checker"

REM 定义可选增强扩展
set "optional_extensions=tintinweb.solidity-visual-auditor PKief.material-icon-theme formulahendry.auto-rename-tag aaron-bond.better-comments donjayamanne.githistory"

echo.
echo 🔴 安装核心必需扩展...

for %%e in (%core_extensions%) do (
    call :install_extension "%%e"
)

echo.
echo 🟡 安装推荐扩展...

for %%e in (%recommended_extensions%) do (
    call :install_extension "%%e"
)

echo.
set /p install_optional="🟢 是否安装可选增强扩展? (y/N): "

if /i "%install_optional%"=="y" (
    echo 🟢 安装可选增强扩展...
    for %%e in (%optional_extensions%) do (
        call :install_extension "%%e"
    )
) else (
    echo ⏭️  跳过可选扩展安装
)

echo.
echo 📊 安装完成！检查最终状态...

REM 检查核心扩展状态
set "missing_core="
for %%e in (%core_extensions%) do (
    code --list-extensions | findstr /C:"%%e" >nul
    if !errorlevel! neq 0 (
        set "missing_core=!missing_core! %%e"
    )
)

if "%missing_core%"=="" (
    echo ✅ 所有核心扩展已安装
) else (
    echo ⚠️  以下核心扩展未安装:
    for %%e in (%missing_core%) do (
        echo    - %%e
    )
)

echo.
echo 🎉 扩展安装过程完成！
echo.
echo 📋 下一步:
echo 1. 重启 VSCode 以激活扩展
echo 2. 打开 contracts\ 目录: code contracts\
echo 3. 测试源代码跳转功能
echo.
echo 💡 提示:
echo - 首次使用可能需要等待扩展初始化
echo - 如有问题，请查看 VSCode 输出面板
echo - 详细使用指南: docs\SOLIDITY_CODE_NAVIGATION.md

pause
exit /b 0

REM 安装函数
:install_extension
set "extension_id=%~1"

REM 检查是否已安装
code --list-extensions | findstr /C:"%extension_id%" >nul
if %errorlevel% == 0 (
    echo    ✅ %extension_id% - 已安装
    goto :eof
)

echo    📦 正在安装: %extension_id%
code --install-extension "%extension_id%" --force >nul 2>&1
if %errorlevel% == 0 (
    echo    ✅ %extension_id% - 安装成功
) else (
    echo    ❌ %extension_id% - 安装失败
)

goto :eof
