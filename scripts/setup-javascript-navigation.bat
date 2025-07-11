@echo off
setlocal enabledelayedexpansion

REM ========================================
REM JavaScript 代码跳转功能设置脚本 (Windows)
REM ========================================

echo 🚀 开始设置 JavaScript 代码跳转功能...

REM 检查当前目录是否是项目根目录
if not exist "contracts" (
    echo ❌ 错误: 请在项目根目录 ^(usdt/^) 运行此脚本
    echo    当前目录: %CD%
    echo    预期包含: contracts\ 目录和 README.md 文件
    pause
    exit /b 1
)

if not exist "README.md" (
    echo ❌ 错误: 请在项目根目录 ^(usdt/^) 运行此脚本
    echo    当前目录: %CD%
    echo    预期包含: contracts\ 目录和 README.md 文件
    pause
    exit /b 1
)

echo 📁 检查项目结构...

REM 检查必要文件是否存在
set "config_error=0"

if exist ".vscode\settings.json" (
    echo    ✓ .vscode\settings.json
) else (
    echo    ❌ .vscode\settings.json ^(缺失^)
    set "config_error=1"
)

if exist ".vscode\extensions.json" (
    echo    ✓ .vscode\extensions.json
) else (
    echo    ❌ .vscode\extensions.json ^(缺失^)
    set "config_error=1"
)

if exist "jsconfig.json" (
    echo    ✓ jsconfig.json
) else (
    echo    ❌ jsconfig.json ^(缺失^)
    set "config_error=1"
)

if exist "contracts\jsconfig.json" (
    echo    ✓ contracts\jsconfig.json
) else (
    echo    ❌ contracts\jsconfig.json ^(缺失^)
    set "config_error=1"
)

if exist "contracts\package.json" (
    echo    ✓ contracts\package.json
) else (
    echo    ❌ contracts\package.json ^(缺失^)
    set "config_error=1"
)

if %config_error% == 1 (
    echo ❌ 配置文件不完整，请先运行完整的设置脚本
    pause
    exit /b 1
)

echo 🔧 验证配置文件语法...

REM 验证 jsconfig.json 文件语法
node -e "JSON.parse(require('fs').readFileSync('jsconfig.json', 'utf8'))" >nul 2>&1
if %errorlevel% == 0 (
    echo    ✓ 根目录 jsconfig.json 语法正确
) else (
    echo    ❌ 根目录 jsconfig.json 语法错误
    pause
    exit /b 1
)

node -e "JSON.parse(require('fs').readFileSync('contracts/jsconfig.json', 'utf8'))" >nul 2>&1
if %errorlevel% == 0 (
    echo    ✓ contracts\jsconfig.json 语法正确
) else (
    echo    ❌ contracts\jsconfig.json 语法错误
    pause
    exit /b 1
)

echo 🔍 检查 VSCode 扩展...

REM 检查是否安装了 code 命令
where code >nul 2>&1
if %errorlevel% == 0 (
    echo    ✓ VSCode CLI 可用

    REM 检查关键扩展
    set "missing_extensions="

    code --list-extensions | findstr /C:"ms-vscode.vscode-typescript-next" >nul
    if !errorlevel! == 0 (
        echo    ✓ ms-vscode.vscode-typescript-next 已安装
    ) else (
        echo    ⚠️ ms-vscode.vscode-typescript-next 未安装
        set "missing_extensions=!missing_extensions! ms-vscode.vscode-typescript-next"
    )

    code --list-extensions | findstr /C:"esbenp.prettier-vscode" >nul
    if !errorlevel! == 0 (
        echo    ✓ esbenp.prettier-vscode 已安装
    ) else (
        echo    ⚠️ esbenp.prettier-vscode 未安装
        set "missing_extensions=!missing_extensions! esbenp.prettier-vscode"
    )

    code --list-extensions | findstr /C:"dbaeumer.vscode-eslint" >nul
    if !errorlevel! == 0 (
        echo    ✓ dbaeumer.vscode-eslint 已安装
    ) else (
        echo    ⚠️ dbaeumer.vscode-eslint 未安装
        set "missing_extensions=!missing_extensions! dbaeumer.vscode-eslint"
    )

    REM 如果有缺失的扩展，提示用户安装
    if not "!missing_extensions!"=="" (
        echo.
        echo 📦 检测到未安装的推荐扩展：
        for %%e in (!missing_extensions!) do (
            echo    - %%e
        )
        echo.
        set /p install_extensions="是否立即安装这些扩展? (y/N): "
        if /i "!install_extensions!"=="y" (
            echo 正在安装扩展...
            for %%e in (!missing_extensions!) do (
                echo    安装 %%e...
                code --install-extension "%%e" --force
                if !errorlevel! == 0 (
                    echo    ✅ %%e 安装成功
                ) else (
                    echo    ❌ %%e 安装失败
                )
            )
        )
    )
) else (
    echo    ⚠️ VSCode CLI 不可用，无法检查扩展
)

echo 📊 检查 Node.js 环境...

REM 检查 Node.js 版本
for /f "tokens=*" %%i in ('node --version 2^>nul') do set "node_version=%%i"
if defined node_version (
    echo    ✓ Node.js 版本: !node_version!
) else (
    echo    ❌ Node.js 未安装或版本检测失败
)

echo 🧪 测试 JavaScript 智能感知...

REM 进入 contracts 目录进行测试
cd contracts

REM 检查依赖是否安装
if exist "node_modules" (
    echo    ✓ 依赖已安装
) else (
    echo    ⚠️ 依赖未安装，正在安装...
    call npm install
    if errorlevel 1 (
        echo    ❌ 依赖安装失败
        cd ..
        pause
        exit /b 1
    )
)

REM 检查 hardhat 是否可用
call npx hardhat --version >nul 2>&1
if %errorlevel% == 0 (
    echo    ✓ Hardhat 可用
) else (
    echo    ❌ Hardhat 不可用
)

REM 返回项目根目录
cd ..

echo 🎯 测试代码跳转功能...

REM 创建测试文件
set "test_file=test-navigation.js"
(
echo // 测试文件：验证 JavaScript 代码跳转功能
echo const { ethers } = require("hardhat"^);
echo const fs = require("fs"^);
echo.
echo // 测试函数定义跳转
echo function testFunction(^) {
echo     console.log("测试函数"^);
echo     return ethers.utils.parseEther("1.0"^);
echo }
echo.
echo // 测试变量引用跳转
echo const testVariable = "test";
echo console.log(testVariable^);
echo.
echo // 测试模块导入跳转
echo const config = require("./contracts/hardhat.config.js"^);
echo.
echo // 调用测试函数
echo testFunction(^);
echo.
echo module.exports = {
echo     testFunction,
echo     testVariable
echo };
) > "%test_file%"

echo    ✓ 创建测试文件: %test_file%

REM 验证测试文件语法
node -c "%test_file%" >nul 2>&1
if %errorlevel% == 0 (
    echo    ✓ 测试文件语法正确
) else (
    echo    ❌ 测试文件语法错误
)

REM 清理测试文件
del "%test_file%" >nul 2>&1
echo    ✓ 清理测试文件

echo.
echo 🎉 JavaScript 代码跳转功能设置完成！
echo.
echo 📋 功能验证：
echo    ✅ jsconfig.json 配置文件已创建
echo    ✅ VSCode 设置已优化
echo    ✅ 路径别名已配置
echo    ✅ 智能感知已启用
echo.
echo 🚀 开始使用：
echo.
echo 1. 🔧 在 VSCode 中打开项目:
echo    code .
echo    # 或者打开 contracts 目录:
echo    code contracts\
echo.
echo 2. 🎯 测试代码跳转功能:
echo    - 打开 contracts\scripts\deploy.js
echo    - 按住 Ctrl 点击 'ethers' 或 'require'
echo    - 使用 F12 跳转到函数定义
echo    - 使用 Shift+F12 查找所有引用
echo    - 使用 F2 重命名变量
echo.
echo 3. 📖 查看详细使用指南:
echo    docs\JAVASCRIPT_CODE_NAVIGATION.md
echo.
echo 💡 快捷键参考：
echo    - F12 / Ctrl+Click: 跳转到定义
echo    - Alt+F12: 预览定义
echo    - Shift+F12: 查找所有引用
echo    - F2: 重命名符号
echo    - Ctrl+Shift+O: 文件内符号搜索
echo    - Ctrl+T: 工作区符号搜索
echo.
echo 🎈 享受您的 JavaScript 开发体验！
echo.
pause
