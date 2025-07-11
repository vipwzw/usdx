@echo off
setlocal enabledelayedexpansion

REM ========================================
REM Solidity 源代码跳转功能自动设置脚本 (Windows)
REM ========================================

echo 🚀 开始设置 Solidity 源代码跳转功能...

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

REM 检查 contracts\package.json
if not exist "contracts\package.json" (
    echo ❌ 错误: 未找到 contracts\package.json
    pause
    exit /b 1
)

echo 📁 检查项目结构...

REM 进入 contracts 目录
cd contracts

echo 📦 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo 🔧 编译合约...
call npx hardhat clean
call npx hardhat compile
if errorlevel 1 (
    echo ❌ 合约编译失败
    pause
    exit /b 1
)

echo 📝 生成 TypeChain 类型...
call npx hardhat typechain
if errorlevel 1 (
    echo ⚠️ TypeChain 生成失败，但不影响基本功能
)

echo ✅ 验证配置文件...

REM 检查必需的配置文件
set "config_error=0"

if exist "..\\.vscode\\settings.json" (
    echo    ✓ .vscode\settings.json
) else (
    echo    ❌ .vscode\settings.json ^(缺失^)
    set "config_error=1"
)

if exist "..\\.vscode\\extensions.json" (
    echo    ✓ .vscode\extensions.json
) else (
    echo    ❌ .vscode\extensions.json ^(缺失^)
    set "config_error=1"
)

if exist "..\\.vscode\\launch.json" (
    echo    ✓ .vscode\launch.json
) else (
    echo    ❌ .vscode\launch.json ^(缺失^)
    set "config_error=1"
)

if exist "..\\.vscode\\tasks.json" (
    echo    ✓ .vscode\tasks.json
) else (
    echo    ❌ .vscode\tasks.json ^(缺失^)
    set "config_error=1"
)

if exist "tsconfig.json" (
    echo    ✓ tsconfig.json
) else (
    echo    ❌ tsconfig.json ^(缺失^)
    set "config_error=1"
)

if exist "solidity.json" (
    echo    ✓ solidity.json
) else (
    echo    ❌ solidity.json ^(缺失^)
    set "config_error=1"
)

echo 🔍 检查 VSCode 扩展...

REM 检查是否安装了 code 命令
where code >nul 2>&1
if %errorlevel% == 0 (
    echo    ✓ VSCode CLI 可用

    REM 检查关键扩展
    for %%e in (JuanBlanco.solidity esbenp.prettier-vscode dbaeumer.vscode-eslint) do (
        code --list-extensions | findstr /C:"%%e" >nul
        if !errorlevel! == 0 (
            echo    ✓ %%e 已安装
        ) else (
            echo    ⚠️ %%e 未安装 ^(建议安装^)
        )
    )
) else (
    echo    ⚠️ VSCode CLI 不可用，无法检查扩展
)

echo 🧪 运行测试验证...

REM 运行基本测试
call npm test >nul 2>&1
if %errorlevel% == 0 (
    echo    ✓ 合约测试通过
) else (
    echo    ⚠️ 测试失败，但不影响代码跳转功能
)

echo 📊 生成项目报告...

REM 生成合约大小报告
call npx hardhat size-contracts >nul 2>&1
if %errorlevel% == 0 (
    echo    ✓ 合约大小分析完成
) else (
    echo    ⚠️ 合约大小分析跳过
)

REM 返回项目根目录
cd ..

echo.
echo 🎉 设置完成！
echo.
echo 📋 接下来的步骤:
echo.
echo 1. 📖 阅读使用指南:
echo    docs\SOLIDITY_CODE_NAVIGATION.md
echo.
echo 2. 🔧 在 VSCode 中打开项目:
echo    code contracts\
echo.
echo 3. 📱 安装推荐扩展:
echo    VSCode 会自动提示安装推荐扩展
echo.
echo 4. 🎯 开始使用源代码跳转:
echo    - Ctrl+Click: 跳转到定义
echo    - F12: 跳转到定义
echo    - Shift+F12: 查找所有引用
echo    - F2: 重命名符号
echo.

REM 验证功能
echo 🔍 验证源代码跳转功能...

set "verify_error=0"

REM 检查编译产物
if exist "contracts\\artifacts" (
    if exist "contracts\\typechain-types" (
        echo    ✓ 编译产物存在
    ) else (
        echo    ❌ TypeChain 类型缺失
        set "verify_error=1"
    )
) else (
    echo    ❌ 编译产物缺失
    set "verify_error=1"
)

REM 检查主要合约文件
if exist "contracts\\src\\USDXToken.sol" (
    echo    ✓ 主合约文件存在
) else (
    echo    ❌ 主合约文件缺失
    set "verify_error=1"
)

REM 检查接口文件
if exist "contracts\\src\\interfaces\\IERC1404.sol" (
    echo    ✓ 接口文件存在
) else (
    echo    ❌ 接口文件缺失
    set "verify_error=1"
)

if %verify_error% == 0 (
    echo    ✅ 基本验证通过
) else (
    echo    ⚠️ 验证发现问题，请检查上述错误
)

echo.
echo 💡 提示:
echo    - 如果遇到问题，请查看故障排除部分
echo    - 确保在 VSCode 中打开 contracts\ 目录
echo    - 首次使用可能需要等待扩展加载
echo.
echo 🌟 享受您的 Solidity 开发体验！

pause
