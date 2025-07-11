/**
 * Solidity调试演示 - 展示不同的调试方法
 *
 * 调试方法：
 * 1. 在此文件中设置断点（JavaScript层调试）
 * 2. 合约中使用console.log（Solidity层调试）
 * 3. 事件日志调试
 * 4. Assert断言调试
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");

describe("Solidity调试方法演示", function () {
  let token;
  let deployer, user1, user2;
  const decimals = 6;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // 🎯 断点位置1: 可以在这里设置断点查看账户信息
    console.log("\n🔍 调试信息 - 账户设置:");
    console.log("  部署者:", deployer.address);
    console.log("  用户1:", user1.address);
    console.log("  用户2:", user2.address);

    const USDXToken = await ethers.getContractFactory("USDXToken");
    const initialSupply = ethers.parseUnits("1000000", decimals);

    // 🎯 断点位置2: 可以在这里设置断点查看部署参数
    console.log("\n📦 部署参数:");
    console.log("  初始供应量:", ethers.formatUnits(initialSupply, decimals));

    token = await hre.upgrades.deployProxy(
      USDXToken,
      ["USDX Debug Token", "USDX-DBG", initialSupply, deployer.address],
      { initializer: "initialize" },
    );

    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // 🎯 断点位置3: 可以在这里设置断点查看合约地址
    console.log("  合约地址:", tokenAddress);
  });

  describe("📍 方法1: JavaScript断点调试", function () {
    it("演示VSCode断点调试", async function () {
      const amount = ethers.parseUnits("1000", decimals);

      // 🎯 断点位置A: 设置断点，查看执行前状态
      console.log("\n🔍 [断点A] 转账前状态检查");
      const balanceBefore = await token.balanceOf(deployer.address);
      console.log("  部署者余额:", ethers.formatUnits(balanceBefore, decimals));

      // 设置KYC
      await token.setKYCVerified(user1.address, true);

      // 🎯 断点位置B: 设置断点，查看KYC设置后状态
      console.log("\n🔍 [断点B] KYC设置完成");
      const isKYCVerified = await token.isKYCVerified(user1.address);
      console.log("  用户1 KYC状态:", isKYCVerified);

      // 执行转账
      const tx = await token.transfer(user1.address, amount);
      const receipt = await tx.wait();

      // 🎯 断点位置C: 设置断点，查看交易执行结果
      console.log("\n🔍 [断点C] 转账执行完成");
      console.log("  交易哈希:", tx.hash);
      console.log("  Gas使用:", receipt.gasUsed.toString());

      const balanceAfter = await token.balanceOf(deployer.address);
      const user1Balance = await token.balanceOf(user1.address);

      // 🎯 断点位置D: 设置断点，验证最终结果
      console.log("\n🔍 [断点D] 最终状态验证");
      console.log("  部署者新余额:", ethers.formatUnits(balanceAfter, decimals));
      console.log("  用户1新余额:", ethers.formatUnits(user1Balance, decimals));

      // 断言验证
      expect(user1Balance).to.equal(amount);
      expect(balanceAfter).to.equal(balanceBefore - amount);
    });
  });

  describe("📍 方法2: Console.log调试（在合约中）", function () {
    it("演示合约内console.log输出", async function () {
      console.log("\n🔍 开始console.log调试演示");
      console.log("注意：以下输出来自合约内部的console.log");

      const amount = ethers.parseUnits("500", decimals);

      // 设置KYC
      await token.setKYCVerified(user1.address, true);

      // 执行转账 - 这里会触发合约中的console.log
      console.log("\n⚡ 执行转账，观察合约调试输出:");
      await token.transfer(user1.address, amount);

      console.log("✅ 转账完成，检查合约是否有调试输出");
    });
  });

  describe("📍 方法3: 事件日志调试", function () {
    it("演示通过事件进行调试", async function () {
      console.log("\n🔍 事件日志调试演示");

      // 监听事件
      let events = [];

      token.on("BlacklistUpdated", (account, blacklisted, event) => {
        events.push({
          type: "BlacklistUpdated",
          account,
          blacklisted,
          blockNumber: event.blockNumber,
        });
        console.log("📡 事件捕获: BlacklistUpdated", {
          account,
          blacklisted,
          block: event.blockNumber,
        });
      });

      token.on("KYCStatusUpdated", (account, verified, event) => {
        events.push({
          type: "KYCStatusUpdated",
          account,
          verified,
          blockNumber: event.blockNumber,
        });
        console.log("📡 事件捕获: KYCStatusUpdated", {
          account,
          verified,
          block: event.blockNumber,
        });
      });

      // 执行操作触发事件
      console.log("\n⚡ 执行操作，观察事件输出:");
      await token.setKYCVerified(user1.address, true);
      await token.setBlacklisted(user2.address, true);

      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("\n📊 事件汇总:");
      events.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.type} - 区块 ${event.blockNumber}`);
      });

      expect(events.length).to.be.greaterThan(0);
    });
  });

  describe("📍 方法4: 限制检查调试", function () {
    it("演示ERC-1404限制检查调试", async function () {
      console.log("\n🔍 限制检查调试演示");

      const amount = ethers.parseUnits("300", decimals);

      // 测试不同的限制场景
      console.log("\n🧪 测试场景1: 接收者未通过KYC");
      let restrictionCode = await token.detectTransferRestriction(
        deployer.address,
        user1.address,
        amount,
      );
      let restrictionMessage = await token.messageForTransferRestriction(restrictionCode);

      console.log("  限制代码:", restrictionCode.toString());
      console.log("  限制消息:", restrictionMessage);
      expect(restrictionCode).to.equal(7); // INVALID_KYC_RECEIVER

      // 设置KYC后重新测试
      console.log("\n🧪 测试场景2: 设置KYC后");
      await token.setKYCVerified(user1.address, true);

      restrictionCode = await token.detectTransferRestriction(
        deployer.address,
        user1.address,
        amount,
      );
      restrictionMessage = await token.messageForTransferRestriction(restrictionCode);

      console.log("  限制代码:", restrictionCode.toString());
      console.log("  限制消息:", restrictionMessage);
      expect(restrictionCode).to.equal(0); // SUCCESS

      // 测试黑名单限制
      console.log("\n🧪 测试场景3: 接收者被加入黑名单");
      await token.setBlacklisted(user1.address, true);

      restrictionCode = await token.detectTransferRestriction(
        deployer.address,
        user1.address,
        amount,
      );
      restrictionMessage = await token.messageForTransferRestriction(restrictionCode);

      console.log("  限制代码:", restrictionCode.toString());
      console.log("  限制消息:", restrictionMessage);
      expect(restrictionCode).to.equal(3); // BLACKLISTED_RECEIVER
    });
  });

  describe("📍 方法5: 断言调试", function () {
    it("演示Assert断言调试", async function () {
      console.log("\n🔍 断言调试演示");

      const amount = ethers.parseUnits("200", decimals);

      // 设置KYC
      await token.setKYCVerified(user1.address, true);

      // 记录转账前状态
      const totalSupplyBefore = await token.totalSupply();
      const balanceBefore = await token.balanceOf(deployer.address);
      const user1BalanceBefore = await token.balanceOf(user1.address);

      console.log("📊 转账前断言检查:");
      console.log("  总供应量:", ethers.formatUnits(totalSupplyBefore, decimals));
      console.log("  部署者余额:", ethers.formatUnits(balanceBefore, decimals));
      console.log("  用户1余额:", ethers.formatUnits(user1BalanceBefore, decimals));

      // 执行转账
      await token.transfer(user1.address, amount);

      // 转账后验证
      const totalSupplyAfter = await token.totalSupply();
      const balanceAfter = await token.balanceOf(deployer.address);
      const user1BalanceAfter = await token.balanceOf(user1.address);

      console.log("\n📊 转账后断言检查:");
      console.log("  总供应量:", ethers.formatUnits(totalSupplyAfter, decimals));
      console.log("  部署者余额:", ethers.formatUnits(balanceAfter, decimals));
      console.log("  用户1余额:", ethers.formatUnits(user1BalanceAfter, decimals));

      // 关键断言 - 这些将帮助发现问题
      console.log("\n✅ 执行断言验证:");

      // 1. 总供应量不应改变
      expect(totalSupplyAfter).to.equal(totalSupplyBefore);
      console.log("  ✓ 总供应量保持不变");

      // 2. 发送者余额应该减少
      expect(balanceAfter).to.equal(balanceBefore - amount);
      console.log("  ✓ 发送者余额正确减少");

      // 3. 接收者余额应该增加
      expect(user1BalanceAfter).to.equal(user1BalanceBefore + amount);
      console.log("  ✓ 接收者余额正确增加");

      // 4. 总余额守恒
      const totalBalances = balanceAfter + user1BalanceAfter;
      expect(totalBalances).to.equal(balanceBefore + user1BalanceBefore);
      console.log("  ✓ 总余额守恒验证通过");
    });
  });

  describe("📍 综合调试演示", function () {
    it("结合多种调试方法", async function () {
      console.log("\n🎯 综合调试演示 - 结合多种方法");

      const amount = ethers.parseUnits("100", decimals);

      // 🎯 断点 + Console.log + 事件
      console.log("\n1️⃣ 准备阶段 (可设置断点)");
      await token.setKYCVerified(user1.address, true);

      console.log("\n2️⃣ 执行阶段 (观察console.log输出)");
      const tx = await token.transfer(user1.address, amount);
      const receipt = await tx.wait();

      console.log("\n3️⃣ 验证阶段 (断言 + 事件日志)");

      // 获取转账事件
      const transferEvents = await token.queryFilter(
        token.filters.Transfer(),
        receipt.blockNumber,
        receipt.blockNumber,
      );

      console.log("📡 Transfer事件详情:");
      transferEvents.forEach((event, index) => {
        console.log(`  事件 ${index + 1}:`, {
          from: event.args.from,
          to: event.args.to,
          value: ethers.formatUnits(event.args.value, decimals),
        });
      });

      // 最终验证
      const finalBalance = await token.balanceOf(user1.address);
      expect(finalBalance).to.equal(amount);

      console.log("✅ 综合调试完成，所有验证通过");
    });
  });
});
