const { ethers } = require("hardhat");

/**
 * UNAUTHORIZED_TRANSFER 管理示例脚本
 * 演示如何设置和管理授权发送方列表
 */
async function main() {
  console.log("🔍 UNAUTHORIZED_TRANSFER 管理示例\n");

  // 获取合约实例
  const [deployer, complianceOfficer, user1, user2, authorizedSender, unauthorizedSender] =
    await ethers.getSigners();
  const USDXToken = await ethers.getContractFactory("USDXToken");
  const token = await USDXToken.attach("YOUR_TOKEN_ADDRESS"); // 替换为实际地址

  console.log("📋 初始状态检查:");
  console.log(`转账授权验证是否启用: ${await token.isTransferAuthorizationRequired()}`);
  console.log(
    `authorizedSender 是否为授权发送方: ${await token.isAuthorizedSender(authorizedSender.address)}`,
  );
  console.log(
    `unauthorizedSender 是否为授权发送方: ${await token.isAuthorizedSender(unauthorizedSender.address)}\n`,
  );

  // 1. 启用转账授权验证功能
  console.log("🔧 启用转账授权验证功能...");
  await token.connect(complianceOfficer).setTransferAuthorizationRequired(true);
  console.log("✅ 转账授权验证功能已启用\n");

  // 2. 设置授权发送方
  console.log("🏢 添加授权发送方...");
  await token.connect(complianceOfficer).setAuthorizedSender(authorizedSender.address, true);
  console.log(`✅ ${authorizedSender.address} 已被设置为授权发送方\n`);

  // 3. 给测试地址一些代币和KYC验证
  console.log("💰 设置测试环境...");
  await token.connect(complianceOfficer).setKYCVerified(authorizedSender.address, true);
  await token.connect(complianceOfficer).setKYCVerified(unauthorizedSender.address, true);
  await token.connect(complianceOfficer).setKYCVerified(user1.address, true);
  await token.connect(complianceOfficer).setKYCVerified(user2.address, true);

  await token.mint(authorizedSender.address, ethers.parseUnits("1000", 6));
  await token.mint(unauthorizedSender.address, ethers.parseUnits("1000", 6));
  console.log("✅ 测试环境设置完成\n");

  // 4. 测试授权发送方转账（应该成功）
  console.log("💸 测试授权发送方转账...");
  const amount = ethers.parseUnits("100", 6);

  // 先检查是否允许转账
  const restrictionCode1 = await token.detectTransferRestriction(
    authorizedSender.address,
    user1.address,
    amount,
  );
  console.log(`转账限制代码: ${restrictionCode1}`);

  if (restrictionCode1 === 0) {
    // 实际执行转账
    await token.connect(authorizedSender).transfer(user1.address, amount);
    console.log("✅ 授权发送方转账成功\n");
  } else {
    const message = await token.messageForTransferRestriction(restrictionCode1);
    console.log(`❌ 转账失败: ${message}\n`);
  }

  // 5. 测试未授权发送方转账（应该失败）
  console.log("🚫 测试未授权发送方转账...");
  const restrictionCode2 = await token.detectTransferRestriction(
    unauthorizedSender.address,
    user2.address,
    amount,
  );
  console.log(`转账限制代码: ${restrictionCode2}`);

  if (restrictionCode2 === 10) {
    // UNAUTHORIZED_TRANSFER
    const message = await token.messageForTransferRestriction(restrictionCode2);
    console.log(`❌ 预期失败: ${message}`);
    console.log("✅ UNAUTHORIZED_TRANSFER 限制正常工作\n");
  }

  // 6. 批量管理授权发送方
  console.log("📊 批量管理示例...");
  const authorizedUsers = [user1.address, user2.address];

  for (const user of authorizedUsers) {
    await token.connect(complianceOfficer).setAuthorizedSender(user, true);
    console.log(`✅ ${user} 已添加到授权发送方列表`);
  }

  // 7. 移除授权发送方
  console.log("\n🗑️  移除授权发送方示例...");
  await token.connect(complianceOfficer).setAuthorizedSender(user1.address, false);
  console.log(`❌ ${user1.address} 已从授权发送方列表移除`);

  // 8. 禁用转账授权验证（紧急情况下）
  console.log("\n🔓 禁用转账授权验证功能...");
  await token.connect(complianceOfficer).setTransferAuthorizationRequired(false);
  console.log("✅ 转账授权验证功能已禁用，所有地址现在都可以发送代币\n");

  console.log("📋 最终状态:");
  console.log(`转账授权验证是否启用: ${await token.isTransferAuthorizationRequired()}`);
  console.log(
    `authorizedSender 是否为授权发送方: ${await token.isAuthorizedSender(authorizedSender.address)}`,
  );
  console.log(`user1 是否为授权发送方: ${await token.isAuthorizedSender(user1.address)}`);
  console.log(`user2 是否为授权发送方: ${await token.isAuthorizedSender(user2.address)}`);
}

/**
 * 检查转账是否会触发 UNAUTHORIZED_TRANSFER
 */
async function checkTransferRestriction(token, from, to, amount) {
  const code = await token.detectTransferRestriction(from, to, amount);
  const message = await token.messageForTransferRestriction(code);

  return {
    code,
    message,
    isValid: code === 0,
    isUnauthorizedTransfer: code === 10,
  };
}

/**
 * 演示不同场景下的转账授权检查
 */
async function demonstrateAuthorizationScenarios(token, complianceOfficer) {
  console.log("\n🎭 转账授权场景演示:");

  const scenarios = [
    {
      name: "普通用户到普通用户（功能禁用）",
      authRequired: false,
      fromAuthorized: false,
      toAddress: "user2",
      expectedResult: "SUCCESS",
    },
    {
      name: "普通用户到普通用户（功能启用，发送方未授权）",
      authRequired: true,
      fromAuthorized: false,
      toAddress: "user2",
      expectedResult: "UNAUTHORIZED_TRANSFER",
    },
    {
      name: "授权用户到普通用户（功能启用）",
      authRequired: true,
      fromAuthorized: true,
      toAddress: "user2",
      expectedResult: "SUCCESS",
    },
    {
      name: "Mint操作（不受授权限制）",
      authRequired: true,
      fromAuthorized: false,
      toAddress: "user2",
      fromAddress: "0x0000000000000000000000000000000000000000", // Zero address for mint
      expectedResult: "SUCCESS",
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\n🔍 场景: ${scenario.name}`);

    // 设置功能状态
    await token.connect(complianceOfficer).setTransferAuthorizationRequired(scenario.authRequired);

    // 设置授权状态（如果需要）
    if (scenario.fromAddress !== "0x0000000000000000000000000000000000000000") {
      const signers = await ethers.getSigners();
      const fromSigner = signers[3]; // 使用固定的测试地址
      await token
        .connect(complianceOfficer)
        .setAuthorizedSender(fromSigner.address, scenario.fromAuthorized);
    }

    console.log(`📊 预期结果: ${scenario.expectedResult}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });
