const { ethers } = require("hardhat");

/**
 * INVALID_RECIPIENT 管理示例脚本
 * 演示如何设置和管理有效接收方列表
 */
async function main() {
  console.log("🔍 INVALID_RECIPIENT 管理示例\n");

  // 获取合约实例
  const [deployer, complianceOfficer, user1, user2, validPartner, invalidUser] =
    await ethers.getSigners();
  const USDXToken = await ethers.getContractFactory("USDXToken");
  const token = await USDXToken.attach("YOUR_TOKEN_ADDRESS"); // 替换为实际地址

  console.log("📋 初始状态检查:");
  console.log(`接收方验证是否启用: ${await token.isRecipientValidationRequired()}`);
  console.log(
    `validPartner 是否为有效接收方: ${await token.isValidRecipient(validPartner.address)}`,
  );
  console.log(
    `invalidUser 是否为有效接收方: ${await token.isValidRecipient(invalidUser.address)}\n`,
  );

  // 1. 启用接收方验证功能
  console.log("🔧 启用接收方验证功能...");
  await token.connect(complianceOfficer).setRecipientValidationRequired(true);
  console.log("✅ 接收方验证功能已启用\n");

  // 2. 设置有效接收方
  console.log("🏢 添加有效接收方...");
  await token.connect(complianceOfficer).setValidRecipient(validPartner.address, true);
  console.log(`✅ ${validPartner.address} 已被设置为有效接收方\n`);

  // 3. 尝试向有效接收方转账（应该成功）
  console.log("💸 测试向有效接收方转账...");
  const amount = ethers.parseEther("100");

  // 先检查是否允许转账
  const restrictionCode1 = await token.detectTransferRestriction(
    user1.address,
    validPartner.address,
    amount,
  );
  console.log(`转账限制代码: ${restrictionCode1}`);

  if (restrictionCode1 === 0) {
    // 实际执行转账
    await token.connect(user1).transfer(validPartner.address, amount);
    console.log("✅ 向有效接收方转账成功\n");
  } else {
    const message = await token.messageForTransferRestriction(restrictionCode1);
    console.log(`❌ 转账失败: ${message}\n`);
  }

  // 4. 尝试向无效接收方转账（应该失败）
  console.log("🚫 测试向无效接收方转账...");
  const restrictionCode2 = await token.detectTransferRestriction(
    user1.address,
    invalidUser.address,
    amount,
  );
  console.log(`转账限制代码: ${restrictionCode2}`);

  if (restrictionCode2 === 11) {
    // INVALID_RECIPIENT
    const message = await token.messageForTransferRestriction(restrictionCode2);
    console.log(`❌ 预期失败: ${message}`);
    console.log("✅ INVALID_RECIPIENT 限制正常工作\n");
  }

  // 5. 批量管理有效接收方
  console.log("📊 批量管理示例...");
  const partners = [user2.address, "0x1234567890123456789012345678901234567890"];

  for (const partner of partners) {
    await token.connect(complianceOfficer).setValidRecipient(partner, true);
    console.log(`✅ ${partner} 已添加到有效接收方列表`);
  }

  // 6. 移除有效接收方
  console.log("\n🗑️  移除有效接收方示例...");
  await token.connect(complianceOfficer).setValidRecipient(user2.address, false);
  console.log(`❌ ${user2.address} 已从有效接收方列表移除`);

  // 7. 禁用接收方验证（紧急情况下）
  console.log("\n🔓 禁用接收方验证功能...");
  await token.connect(complianceOfficer).setRecipientValidationRequired(false);
  console.log("✅ 接收方验证功能已禁用，所有地址现在都可以接收代币\n");

  console.log("📋 最终状态:");
  console.log(`接收方验证是否启用: ${await token.isRecipientValidationRequired()}`);
  console.log(
    `validPartner 是否为有效接收方: ${await token.isValidRecipient(validPartner.address)}`,
  );
  console.log(`user2 是否为有效接收方: ${await token.isValidRecipient(user2.address)}`);
}

/**
 * 检查转账是否会触发 INVALID_RECIPIENT
 */
async function checkTransferRestriction(token, from, to, amount) {
  const code = await token.detectTransferRestriction(from, to, amount);
  const message = await token.messageForTransferRestriction(code);

  return {
    code,
    message,
    isValid: code === 0,
    isInvalidRecipient: code === 11,
  };
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });
