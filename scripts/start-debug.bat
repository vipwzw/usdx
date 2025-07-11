@echo off
setlocal enabledelayedexpansion

REM JavaScript调试快速启动脚本 (Windows版本)
REM 使用方法: scripts\start-debug.bat

echo.
echo 🔧 JavaScript调试环境启动器
echo ================================

REM 检查Node.js版本
for /f "tokens=*" %%i in ('node -v 2^>nul') do set NODE_VERSION=%%i
if "%NODE_VERSION%"=="" (
    echo ❌ Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)
echo ✅ Node.js版本: %NODE_VERSION%

REM 检查VSCode是否安装
where code >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ VSCode未安装，请先安装VSCode
    pause
    exit /b 1
)
echo ✅ VSCode已安装

REM 进入contracts目录
cd contracts

REM 检查依赖
if not exist "node_modules" (
    echo 📦 安装依赖...
    npm install
)

:menu
echo.
echo 🎯 请选择调试模式:
echo 1) 调试测试文件
echo 2) 调试部署脚本
echo 3) 调试Gas报告
echo 4) 启动本地网络 + 调试
echo 5) 打开VSCode调试面板
echo 6) 查看调试配置
echo 7) 退出
echo.

set /p choice="请选择 (1-7): "

if "%choice%"=="1" goto debug_test
if "%choice%"=="2" goto debug_deploy
if "%choice%"=="3" goto debug_gas_report
if "%choice%"=="4" goto start_network
if "%choice%"=="5" goto open_vscode
if "%choice%"=="6" goto show_config
if "%choice%"=="7" goto exit
echo ❌ 无效选择，请输入1-7
goto menu

:debug_test
echo.
echo 🧪 调试测试文件
echo.
echo 📁 可用的测试文件:
dir /b test\*.js
echo.
set /p test_file="输入测试文件名 (如: USDXToken.test.js): "
if exist "test\%test_file%" (
    echo 🔍 调试文件: test\%test_file%
    code -g "test\%test_file%:1"
    echo 💡 请在VSCode中设置断点，然后按F5开始调试
    echo 💡 选择调试配置: 'Hardhat Test Debug'
) else (
    echo ❌ 文件不存在: test\%test_file%
)
goto continue

:debug_deploy
echo.
echo 🚀 调试部署脚本
echo.

REM 检查本地网络
curl -s -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}" http://localhost:8545 >nul 2>nul
if %errorlevel% neq 0 (
    echo 🌐 本地网络未运行，请先启动本地网络 (选项4)
    goto continue
)

echo 📁 可用的脚本文件:
dir /b scripts\*.js
echo.
set /p script_file="输入脚本文件名 (如: deploy.js): "
if exist "scripts\%script_file%" (
    echo 🔍 调试文件: scripts\%script_file%
    code -g "scripts\%script_file%:1"
    echo 💡 请在VSCode中设置断点，然后按F5开始调试
    echo 💡 选择调试配置: 'Deploy Script Debug'
) else (
    echo ❌ 文件不存在: scripts\%script_file%
)
goto continue

:debug_gas_report
echo.
echo ⛽ 调试Gas报告生成
code -g "scripts\generate-gas-report.js:1"
echo 💡 请在VSCode中设置断点，然后按F5开始调试
echo 💡 选择调试配置: 'Debug Gas Report'
goto continue

:start_network
echo.
echo 🌐 启动本地Hardhat网络...

REM 检查端口8545是否被占用
netstat -an | findstr :8545 >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口8545已被占用，请手动停止相关进程
    goto continue
)

REM 启动Hardhat网络
start "Hardhat Node" /min cmd /c "npx hardhat node > hardhat-node.log 2>&1"
timeout /t 3 /nobreak >nul

REM 验证网络是否正常运行
curl -s -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}" http://localhost:8545 >nul
if %errorlevel% equ 0 (
    echo ✅ 本地网络已启动并运行正常
    echo 📄 日志文件: contracts\hardhat-node.log
) else (
    echo ❌ 网络启动失败
)
goto continue

:open_vscode
echo.
echo 🎯 打开VSCode调试面板
code --command "workbench.view.debug"
echo 💡 调试面板已打开，您可以:
echo    1. 选择调试配置
echo    2. 设置断点
echo    3. 按F5开始调试
goto continue

:show_config
echo.
echo ⚙️  可用的调试配置:
echo.
echo 1. Hardhat Test Debug - 调试测试文件
echo 2. Deploy Script Debug - 调试部署脚本
echo 3. Debug Gas Report - 调试Gas报告
echo 4. Debug Specific Test - 调试特定测试
echo 5. Current Node.js File - 调试当前文件
echo.
echo 📖 详细使用方法请查看: docs\JAVASCRIPT_DEBUG_GUIDE.md
goto continue

:continue
echo.
pause
goto menu

:exit
echo 👋 再见!
pause
exit /b 0
