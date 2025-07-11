/**
 * Solidity调试演示脚本
 * 这个脚本演示如何调试Solidity合约
 * 使用方法：
 * 1. 启动本地网络: npm run start
 * 2. 运行此脚本: node scripts/debug-solidity-demo.js
 * 3. 使用生成的交易哈希进行调试: npx hardhat debug <transaction_hash>
 */

const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  console.log("🔍 Solidity调试演示");
  console.log("==================");

  try {
    // 获取签名者
    const [deployer, addr1, addr2] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);

    // 1. 部署合约（使用代理模式）
    console.log("\n📦 部署USDXToken合约...");
    const USDXToken = await ethers.getContractFactory("USDXToken");

    // 部署参数
    const name = "USDX Debug Token";
    const symbol = "USDX-DEBUG";
    const decimals = 6;
    const initialSupply = ethers.parseUnits("1000000", decimals); // 100万代币

    // ✅ 使用正确的代理部署方式
    const usdxToken = await hre.upgrades.deployProxy(
      USDXToken,
      [name, symbol, initialSupply, deployer.address],
      { initializer: "initialize" },
    );
    await usdxToken.waitForDeployment();

    const tokenAddress = await usdxToken.getAddress();
    console.log("✅ 合约部署和初始化完成:", tokenAddress);

    // 2. 设置KYC验证 - 这个交易可以用于调试
    console.log("\n🔐 设置KYC验证...");
    const kycTx = await usdxToken.setKYCVerified(addr1.address, true);
    await kycTx.wait();
    console.log("KYC交易哈希:", kycTx.hash);
    console.log("📝 调试命令: npx hardhat debug", kycTx.hash);

    // 3. 执行转账 - 成功的转账
    console.log("\n💸 执行成功转账...");
    await usdxToken.setKYCVerified(deployer.address, true);
    const amount = ethers.parseUnits("1000", decimals);
    const transferTx = await usdxToken.transfer(addr1.address, amount);
    await transferTx.wait();
    console.log("成功转账交易哈希:", transferTx.hash);
    console.log("📝 调试命令: npx hardhat debug", transferTx.hash);

    // 4. 触发限制条件 - 失败的转账（黑名单）
    console.log("\n🚫 测试黑名单限制...");
    await usdxToken.setBlacklisted(addr2.address, true);

    try {
      const failTx = await usdxToken.transfer(addr2.address, amount);
      await failTx.wait();
      console.log("意外成功的转账:", failTx.hash);
    } catch (error) {
      console.log("✅ 预期的转账失败 - 黑名单限制生效");
      console.log("错误信息:", error.message.split("\n")[0]);
    }

    // 5. 测试ERC-1404限制检查
    console.log("\n📊 测试ERC-1404限制检查...");
    const restrictionCode = await usdxToken.detectTransferRestriction(
      deployer.address,
      addr2.address,
      amount,
    );
    console.log("限制代码:", restrictionCode.toString());

    const restrictionMessage = await usdxToken.messageForTransferRestriction(restrictionCode);
    console.log("限制消息:", restrictionMessage);

    // 6. 测试铸币功能
    console.log("\n🏭 测试铸币功能...");
    const mintAmount = ethers.parseUnits("5000", decimals);
    const mintTx = await usdxToken.mint(addr1.address, mintAmount);
    await mintTx.wait();
    console.log("铸币交易哈希:", mintTx.hash);
    console.log("📝 调试命令: npx hardhat debug", mintTx.hash);

    // 7. 检查余额
    console.log("\n💰 检查余额...");
    const balance1 = await usdxToken.balanceOf(addr1.address);
    const balance2 = await usdxToken.balanceOf(addr2.address);
    console.log("addr1余额:", ethers.formatUnits(balance1, decimals), symbol);
    console.log("addr2余额:", ethers.formatUnits(balance2, decimals), symbol);

    // 8. 获取合约状态信息用于调试
    console.log("\n📋 合约状态信息:");
    console.log("合约名称:", await usdxToken.name());
    console.log("合约符号:", await usdxToken.symbol());
    console.log("小数位数:", await usdxToken.decimals());
    console.log("总供应量:", ethers.formatUnits(await usdxToken.totalSupply(), decimals));
    console.log("是否暂停:", await usdxToken.paused());

    // 9. 生成调试指南
    console.log("\n📖 Solidity调试指南:");
    console.log("==================");
    console.log("");
    console.log("🔧 Hardhat内置调试器:");
    console.log("1. 复制上面显示的任一交易哈希");
    console.log("2. 运行调试命令: npx hardhat debug <transaction_hash>");
    console.log("3. 使用调试器命令:");
    console.log("   - n (下一步)");
    console.log("   - s (进入函数)");
    console.log("   - o (跳出函数)");
    console.log("   - c (继续执行)");
    console.log("   - p <变量名> (打印变量)");
    console.log("   - st (显示堆栈跟踪)");
    console.log("   - q (退出调试器)");
    console.log("");
    console.log("🏠 本地网络调试:");
    console.log("1. 启动本地网络: npm run start");
    console.log("2. 在另一个终端运行此脚本获取交易哈希");
    console.log("3. 使用交易哈希进行调试");
    console.log("");
    console.log("📝 Console.log调试:");
    console.log('1. 在Solidity代码中添加: import "hardhat/console.sol";');
    console.log('2. 使用: console.log("Debug info:", variable);');
    console.log("3. 重新编译和部署");
    console.log("");
    console.log("🎯 VSCode调试:");
    console.log("1. 设置断点在测试文件中");
    console.log("2. 使用VSCode调试配置运行测试");
    console.log("3. 单步调试JavaScript测试代码");

    console.log("\n✅ 调试演示完成！");
    console.log("现在您可以使用上面的交易哈希进行Solidity调试了。");
  } catch (error) {
    console.error("❌ 调试演示失败:", error);
    console.error("请确保:");
    console.error("1. 合约已正确编译");
    console.error("2. 本地网络正在运行");
    console.error("3. 账户有足够的ETH进行交易");
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
