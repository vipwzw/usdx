const { ethers } = require("hardhat");

async function checkBalance() {
  try {
    console.log("💰 检查Sepolia测试网余额...\n");

    const [deployer] = await ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);

    console.log(`📍 地址: ${deployer.address}`);
    console.log(`💳 余额: ${balanceInEth} ETH`);

    if (parseFloat(balanceInEth) >= 0.05) {
      console.log("✅ 余额充足，可以开始部署！");
      console.log("🚀 运行命令: npm run deploy:sepolia");
    } else if (parseFloat(balanceInEth) > 0) {
      console.log("⚠️  余额较低，建议获取更多测试ETH");
      console.log("💡 建议至少准备 0.05 ETH 用于部署");
    } else {
      console.log("❌ 余额为零，请先获取测试ETH");
      console.log("🔗 推荐faucet:");
      console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
      console.log("   - https://faucet.quicknode.com/ethereum/sepolia");
    }
  } catch (error) {
    console.error("❌ 检查余额失败:", error.message);
  }
}

checkBalance();
