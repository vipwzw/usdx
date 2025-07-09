const { ethers, upgrades } = require("hardhat");
const localConfig = require("../local-config");

async function main() {
  console.log("🚀 开始本地测试部署和验证");
  console.log("=" * 50);

  // 获取本地配置
  const config = localConfig;
  
  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 网络信息:`);
  console.log(`   Chain ID: ${network.chainId}`);
  console.log(`   网络名称: ${network.name}`);
  
  // 获取账户信息
  const signers = await ethers.getSigners();
  console.log("\n👥 可用账户:");
  
  for (let i = 0; i < Math.min(signers.length, 5); i++) {
    const balance = await ethers.provider.getBalance(signers[i].address);
    console.log(`   账户 ${i}: ${signers[i].address}`);
    console.log(`   余额: ${ethers.formatEther(balance)} ETH`);
  }

  // 部署合约
  console.log("\n📦 开始部署合约...");
  
  const deployer = signers[0];
  console.log(`部署者: ${deployer.address}`);
  
  // 部署 USDXToken
  console.log("\n🏗️  部署 USDXToken...");
  const USDXToken = await ethers.getContractFactory("USDXToken");
  const usdxToken = await upgrades.deployProxy(USDXToken, [
    config.contracts.token.name,
    config.contracts.token.symbol,
    config.contracts.token.initialSupply,
    config.contracts.token.initialOwner
  ]);
  await usdxToken.waitForDeployment();
  
  const tokenAddress = await usdxToken.getAddress();
  console.log(`✅ USDXToken 部署成功: ${tokenAddress}`);
  
  // 部署 USDXGovernance
  console.log("\n🏗️  部署 USDXGovernance...");
  const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
  const usdxGovernance = await upgrades.deployProxy(USDXGovernance, [
    tokenAddress,
    config.contracts.governance.governors,
    config.contracts.governance.requiredVotes,
    config.contracts.governance.votingPeriod,
    config.contracts.governance.executionDelay
  ]);
  await usdxGovernance.waitForDeployment();
  
  const governanceAddress = await usdxGovernance.getAddress();
  console.log(`✅ USDXGovernance 部署成功: ${governanceAddress}`);
  
  // 基础功能测试
  console.log("\n🧪 开始基础功能测试...");
  
  // 测试代币信息
  const name = await usdxToken.name();
  const symbol = await usdxToken.symbol();
  const decimals = await usdxToken.decimals();
  const totalSupply = await usdxToken.totalSupply();
  
  console.log(`代币名称: ${name}`);
  console.log(`代币符号: ${symbol}`);
  console.log(`代币精度: ${decimals}`);
  console.log(`总供应量: ${ethers.formatUnits(totalSupply, decimals)}`);
  
  // 测试余额
  const deployerBalance = await usdxToken.balanceOf(deployer.address);
  console.log(`部署者余额: ${ethers.formatUnits(deployerBalance, decimals)} ${symbol}`);
  
  // 先进行 KYC 验证
  console.log("\n🔐 进行 KYC 验证...");
  const recipient = signers[1];
  
  // 验证部署者和接收者的 KYC
  console.log("验证部署者 KYC...");
  await usdxToken.connect(deployer).setKYCVerified(deployer.address, true);
  console.log("验证接收者 KYC...");
  await usdxToken.connect(deployer).setKYCVerified(recipient.address, true);
  
  // 测试转账
  console.log("\n💸 测试转账功能...");
  const transferAmount = ethers.parseUnits("1000", decimals);
  
  console.log(`从 ${deployer.address} 转账 1000 ${symbol} 到 ${recipient.address}`);
  const tx = await usdxToken.connect(deployer).transfer(recipient.address, transferAmount);
  await tx.wait();
  
  const recipientBalance = await usdxToken.balanceOf(recipient.address);
  console.log(`✅ 转账成功！接收者余额: ${ethers.formatUnits(recipientBalance, decimals)} ${symbol}`);
  
  // 测试治理合约
  console.log("\n🏛️  测试治理合约...");
  const governorCount = await usdxGovernance.getGovernorCount();
  console.log(`治理者数量: ${governorCount}`);
  
  const requiredVotes = await usdxGovernance.requiredVotes();
  console.log(`所需票数: ${requiredVotes}`);
  
  // 保存部署信息
  const deploymentInfo = {
    network: {
      chainId: network.chainId,
      name: network.name
    },
    contracts: {
      USDXToken: {
        address: tokenAddress,
        deployer: deployer.address
      },
      USDXGovernance: {
        address: governanceAddress,
        deployer: deployer.address
      }
    },
    accounts: config.accounts,
    timestamp: new Date().toISOString()
  };
  
  console.log("\n📋 部署信息:");
  console.log(JSON.stringify(deploymentInfo, (key, value) => {
    return typeof value === 'bigint' ? value.toString() : value;
  }, 2));
  
  // 保存到文件
  const fs = require('fs');
  fs.writeFileSync('./local-deployment.json', JSON.stringify(deploymentInfo, (key, value) => {
    return typeof value === 'bigint' ? value.toString() : value;
  }, 2));
  console.log("\n💾 部署信息已保存到 local-deployment.json");
  
  console.log("\n🎉 本地测试完成！");
  console.log("=" * 50);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }); 