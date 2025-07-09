@echo off
chcp 65001 > nul

REM 本地测试启动脚本 - Windows 版本
REM 启动 Hardhat 本地节点并运行测试

echo 🚀 USDX 本地测试环境启动脚本
echo =================================

REM 检查是否在 contracts 目录
if not exist "hardhat.config.js" (
    echo ❌ 请在 contracts 目录下运行此脚本
    pause
    exit /b 1
)

REM 检查依赖
where npx > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 请先安装 Node.js 和 npm
    pause
    exit /b 1
)

REM 检查 node_modules
if not exist "node_modules" (
    echo 📦 安装依赖...
    call npm install
)

REM 启动本地节点
echo 🌐 启动 Hardhat 本地节点...
echo    节点地址: http://127.0.0.1:8545
echo    Chain ID: 31337
echo.

REM 显示可用账户
echo 👥 可用测试账户:
echo    账户 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (部署者)
echo    私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo    余额: 10000 ETH
echo.
echo    账户 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (治理者1)
echo    私钥: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
echo    余额: 10000 ETH
echo.
echo    账户 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (治理者2)
echo    私钥: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
echo    余额: 10000 ETH
echo.

echo ⚠️  注意：这些私钥仅用于本地测试，切勿在生产环境使用！
echo.

REM 检查端口占用
netstat -an | findstr :8545 > nul
if %errorlevel% equ 0 (
    echo ⚠️  端口 8545 已被占用，请手动终止相关进程
    echo    使用命令: netstat -ano | findstr :8545
    echo    然后使用: taskkill /PID ^<PID^> /F
    pause
)

REM 启动节点（后台运行）
echo 🔄 启动本地节点...
start /b npx hardhat node > hardhat-node.log 2>&1

REM 等待节点启动
echo ⏳ 等待节点启动...
timeout /t 5 /nobreak > nul

REM 检查节点是否启动成功
curl -s http://127.0.0.1:8545 > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 本地节点启动失败！请检查 hardhat-node.log 文件
    pause
    exit /b 1
)

echo ✅ 本地节点启动成功！
echo.

REM 提供使用选项
echo 🛠️  可用操作:
echo    1. 运行完整测试套件: npm test
echo    2. 运行本地部署测试: npx hardhat run scripts/local-test.js --network localhost
echo    3. 编译合约: npx hardhat compile
echo    4. 运行覆盖率测试: npm run test:coverage
echo    5. 运行燃气报告: npm run test:gas
echo.

echo 📋 快速测试命令:
echo    # 在另一个命令提示符窗口运行:
echo    cd contracts
echo    npx hardhat run scripts/local-test.js --network localhost
echo.

echo 🔧 管理命令:
echo    # 查看节点日志:
echo    type hardhat-node.log
echo.
echo    # 停止节点:
echo    taskkill /f /im node.exe
echo.

echo 💡 提示：
echo    - 本地节点会在后台运行
echo    - 使用 Ctrl+C 停止此脚本不会停止节点
echo    - 手动停止节点请使用: taskkill /f /im node.exe
echo.

REM 等待用户输入
echo 按任意键运行本地部署测试，或按 Ctrl+C 退出...
pause > nul

echo 🚀 运行本地部署测试...
npx hardhat run scripts/local-test.js --network localhost

echo.
echo 🎉 测试完成！本地节点仍在后台运行
echo 要停止节点请运行: taskkill /f /im node.exe
pause 