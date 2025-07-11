/**
 * Debug测试 - 演示如何调试USDX合约
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");

describe("USDX Debug Test", function () {
  let usdxToken;
  let deployer, user1, user2;
  const decimals = 6;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    console.log("🔍 调试信息:");
    console.log("  部署者:", deployer.address);
    console.log("  用户1:", user1.address);
    console.log("  用户2:", user2.address);

    // 使用upgrades部署合约
    const USDXToken = await ethers.getContractFactory("USDXToken");
    const initialSupply = ethers.parseUnits("1000000", decimals);

    usdxToken = await hre.upgrades.deployProxy(
      USDXToken,
      ["USDX Debug", "USDX-DBG", initialSupply, deployer.address],
      { initializer: "initialize" },
    );

    await usdxToken.waitForDeployment();
    const tokenAddress = await usdxToken.getAddress();
    console.log("  合约地址:", tokenAddress);
  });

  it("应该能够调试转账流程", async function () {
    const amount = ethers.parseUnits("1000", decimals);

    console.log("\n📊 转账前状态:");
    const balanceBefore = await usdxToken.balanceOf(deployer.address);
    console.log("  部署者余额:", ethers.formatUnits(balanceBefore, decimals));

    // 设置KYC验证
    console.log("\n🔐 设置KYC验证...");
    await usdxToken.setKYCVerified(user1.address, true);
    const isKYCVerified = await usdxToken.isKYCVerified(user1.address);
    console.log("  用户1 KYC状态:", isKYCVerified);

    // 执行转账
    console.log("\n💸 执行转账...");
    const tx = await usdxToken.transfer(user1.address, amount);
    const receipt = await tx.wait();
    console.log("  交易哈希:", tx.hash);
    console.log("  Gas使用:", receipt.gasUsed.toString());

    // 检查转账后状态
    console.log("\n📊 转账后状态:");
    const balanceAfter = await usdxToken.balanceOf(deployer.address);
    const user1Balance = await usdxToken.balanceOf(user1.address);
    console.log("  部署者余额:", ethers.formatUnits(balanceAfter, decimals));
    console.log("  用户1余额:", ethers.formatUnits(user1Balance, decimals));

    // 验证结果
    expect(user1Balance).to.equal(amount);
  });

  it("应该能够调试限制检查", async function () {
    const amount = ethers.parseUnits("500", decimals);

    console.log("\n🚫 测试转账限制...");

    // 设置黑名单
    await usdxToken.setBlacklisted(user2.address, true);
    console.log("  用户2已设置为黑名单");

    // 检查限制
    const restrictionCode = await usdxToken.detectTransferRestriction(
      deployer.address,
      user2.address,
      amount,
    );

    const restrictionMessage = await usdxToken.messageForTransferRestriction(restrictionCode);

    console.log("  限制代码:", restrictionCode.toString());
    console.log("  限制消息:", restrictionMessage);

    // 验证限制代码
    expect(restrictionCode).to.equal(3); // BLACKLISTED_RECEIVER

    // 尝试转账应该失败
    await expect(usdxToken.transfer(user2.address, amount)).to.be.revertedWithCustomError(
      usdxToken,
      "TransferRestricted",
    );

    console.log("  ✅ 转账被正确阻止");
  });

  it("应该能够调试铸币过程", async function () {
    const mintAmount = ethers.parseUnits("10000", decimals);

    console.log("\n🏭 测试铸币功能...");

    // 获取铸币前状态
    const totalSupplyBefore = await usdxToken.totalSupply();
    const balanceBefore = await usdxToken.balanceOf(user1.address);

    console.log("  铸币前总供应:", ethers.formatUnits(totalSupplyBefore, decimals));
    console.log("  铸币前用户1余额:", ethers.formatUnits(balanceBefore, decimals));

    // 设置KYC验证
    await usdxToken.setKYCVerified(user1.address, true);

    // 执行铸币
    const tx = await usdxToken.mint(user1.address, mintAmount);
    const receipt = await tx.wait();

    console.log("  铸币交易哈希:", tx.hash);
    console.log("  Gas使用:", receipt.gasUsed.toString());

    // 检查铸币后状态
    const totalSupplyAfter = await usdxToken.totalSupply();
    const balanceAfter = await usdxToken.balanceOf(user1.address);

    console.log("  铸币后总供应:", ethers.formatUnits(totalSupplyAfter, decimals));
    console.log("  铸币后用户1余额:", ethers.formatUnits(balanceAfter, decimals));

    // 验证结果
    expect(totalSupplyAfter).to.equal(totalSupplyBefore + mintAmount);
    expect(balanceAfter).to.equal(balanceBefore + mintAmount);

    console.log("  ✅ 铸币成功");
  });
});
