/**
 * 简化的Solidity调试演示脚本
 * 专注于调试合约的核心功能，避免初始化问题
 */

const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  console.log("🔍 简化Solidity调试演示");
  console.log("========================");

  try {
    // 获取签名者
    const [deployer, addr1, addr2] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);

    // 1. 部署并使用代理模式正确初始化合约
    console.log("\n📦 部署USDXToken合约...");
    const USDXToken = await ethers.getContractFactory("USDXToken");

    const name = "USDX Debug Token";
    const symbol = "USDX-DEBUG";
    const decimals = 6;
    const initialSupply = ethers.parseUnits("1000000", decimals);

    // 使用 deployProxy 来正确部署升级合约
    const usdxToken = await hre.upgrades.deployProxy(
      USDXToken,
      [name, symbol, initialSupply, deployer.address],
      { initializer: "initialize" },
    );

    await usdxToken.waitForDeployment();
    const tokenAddress = await usdxToken.getAddress();
    console.log("✅ 合约部署成功:", tokenAddress);

    // 2. 设置KYC验证 - 这个交易可以用于调试
    console.log("\n🔐 设置KYC验证...");
    const kycTx = await usdxToken.setKYCVerified(addr1.address, true);
    await kycTx.wait();
    console.log("KYC交易哈希:", kycTx.hash);
    console.log("📝 调试命令: npx hardhat debug", kycTx.hash);

    // 3. 执行转账 - 成功的转账
    console.log("\n💸 执行成功转账...");
    const amount = ethers.parseUnits("1000", decimals);
    const transferTx = await usdxToken.transfer(addr1.address, amount);
    await transferTx.wait();
    console.log("成功转账交易哈希:", transferTx.hash);
    console.log("📝 调试命令: npx hardhat debug", transferTx.hash);

    // 4. 触发限制条件 - 测试黑名单
    console.log("\n🚫 测试黑名单限制...");
    const blacklistTx = await usdxToken.setBlacklisted(addr2.address, true);
    await blacklistTx.wait();
    console.log("黑名单设置交易哈希:", blacklistTx.hash);
    console.log("📝 调试命令: npx hardhat debug", blacklistTx.hash);

    // 5. 尝试向黑名单地址转账（应该失败）
    console.log("\n❌ 测试向黑名单地址转账...");
    try {
      const failTx = await usdxToken.transfer(addr2.address, amount);
      await failTx.wait();
      console.log("意外成功的转账:", failTx.hash);
    } catch (error) {
      console.log("✅ 预期的转账失败 - 黑名单限制生效");
      console.log("错误信息:", error.reason || error.message.split("\n")[0]);
    }

    // 6. 测试ERC-1404限制检查
    console.log("\n📊 测试ERC-1404限制检查...");
    const restrictionCode = await usdxToken.detectTransferRestriction(
      deployer.address,
      addr2.address,
      amount,
    );
    console.log("限制代码:", restrictionCode.toString());

    const restrictionMessage = await usdxToken.messageForTransferRestriction(restrictionCode);
    console.log("限制消息:", restrictionMessage);

    // 7. 测试铸币功能
    console.log("\n🏭 测试铸币功能...");
    const mintAmount = ethers.parseUnits("5000", decimals);
    const mintTx = await usdxToken.mint(addr1.address, mintAmount);
    await mintTx.wait();
    console.log("铸币交易哈希:", mintTx.hash);
    console.log("📝 调试命令: npx hardhat debug", mintTx.hash);

    // 8. 检查余额
    console.log("\n💰 检查最终余额...");
    const balance0 = await usdxToken.balanceOf(deployer.address);
    const balance1 = await usdxToken.balanceOf(addr1.address);
    const balance2 = await usdxToken.balanceOf(addr2.address);
    console.log("部署者余额:", ethers.formatUnits(balance0, decimals), symbol);
    console.log("addr1余额:", ethers.formatUnits(balance1, decimals), symbol);
    console.log("addr2余额:", ethers.formatUnits(balance2, decimals), symbol);

    // 9. 获取合约状态信息
    console.log("\n📋 合约状态信息:");
    console.log("合约名称:", await usdxToken.name());
    console.log("合约符号:", await usdxToken.symbol());
    console.log("小数位数:", await usdxToken.decimals());
    console.log("总供应量:", ethers.formatUnits(await usdxToken.totalSupply(), decimals));
    console.log("是否暂停:", await usdxToken.paused());

    // 生成调试指南
    console.log("\n📖 Solidity调试指南:");
    console.log("==================");
    console.log("");
    console.log("🔧 可用的调试方法:");
    console.log("");
    console.log("1. Console.log调试 (推荐):");
    console.log('   - 在合约中导入: import "hardhat/console.sol";');
    console.log('   - 添加日志: console.log("Debug:", variable);');
    console.log("   - 重新编译并运行脚本");
    console.log("");
    console.log("2. VSCode调试:");
    console.log("   - 在测试文件中设置断点");
    console.log("   - 使用F5启动调试配置");
    console.log("   - 单步调试JavaScript测试代码");
    console.log("");
    console.log("3. Hardhat Console调试:");
    console.log("   - 运行: npx hardhat console --network localhost");
    console.log("   - 与已部署的合约交互");
    console.log("   - 实时查看合约状态");
    console.log("");
    console.log("4. 测试驱动调试:");
    console.log("   - 编写特定的测试用例");
    console.log("   - 使用 npm run debug:test 进行调试");
    console.log("   - 在测试中添加详细的断言和日志");
    console.log("");
    console.log("📝 有用的交易哈希 (可用于分析):");
    console.log("   - KYC设置:", kycTx.hash);
    console.log("   - 成功转账:", transferTx.hash);
    console.log("   - 黑名单设置:", blacklistTx.hash);
    console.log("   - 铸币交易:", mintTx.hash);

    console.log("\n✅ 调试演示完成！");
    console.log("现在您可以使用上面的交易哈希进行Solidity调试了。");
  } catch (error) {
    console.error("❌ 调试演示失败:", error);
    console.error("\n可能的解决方案:");
    console.error("1. 确保本地网络正在运行: npm run start");
    console.error("2. 确保合约已编译: npm run compile");
    console.error("3. 检查是否安装了@openzeppelin/hardhat-upgrades");
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
