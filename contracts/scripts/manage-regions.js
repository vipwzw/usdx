const { ethers } = require("hardhat");

/**
 * Region Restrictions 管理示例脚本
 * 演示如何设置和管理地区限制功能
 */
async function main() {
  console.log("🌍 Region Restrictions 管理示例\n");

  // 获取合约实例
  const [_deployer, complianceOfficer, user1, _user2, usUser, ukUser, cnUser, restrictedUser] =
    await ethers.getSigners();
  const USDXToken = await ethers.getContractFactory("USDXToken");
  const token = await USDXToken.attach("YOUR_TOKEN_ADDRESS"); // 替换为实际地址

  console.log("📋 初始状态检查:");
  console.log(`地区限制是否启用: ${await token.isRegionRestrictionsEnabled()}`);
  console.log(`美国地区(1)是否允许: ${await token.isRegionAllowed(1)}`);
  console.log(`英国地区(44)是否允许: ${await token.isRegionAllowed(44)}`);
  console.log(`中国地区(86)是否允许: ${await token.isRegionAllowed(86)}`);
  console.log(`user1 地区代码: ${await token.getRegionCode(user1.address)}\n`);

  // 1. 设置用户地区代码
  console.log("🏷️  设置用户地区代码...");
  await token.connect(complianceOfficer).setRegionCode(usUser.address, 1); // 美国
  await token.connect(complianceOfficer).setRegionCode(ukUser.address, 44); // 英国
  await token.connect(complianceOfficer).setRegionCode(cnUser.address, 86); // 中国
  await token.connect(complianceOfficer).setRegionCode(restrictedUser.address, 999); // 限制地区

  console.log(`美国用户地区代码: ${await token.getRegionCode(usUser.address)}`);
  console.log(`英国用户地区代码: ${await token.getRegionCode(ukUser.address)}`);
  console.log(`中国用户地区代码: ${await token.getRegionCode(cnUser.address)}`);
  console.log(`限制地区用户代码: ${await token.getRegionCode(restrictedUser.address)}\n`);

  // 2. 设置允许的地区
  console.log("✅ 设置允许的地区...");
  await token.connect(complianceOfficer).setAllowedRegion(1, true); // 允许美国
  await token.connect(complianceOfficer).setAllowedRegion(44, true); // 允许英国
  await token.connect(complianceOfficer).setAllowedRegion(86, true); // 允许中国
  await token.connect(complianceOfficer).setAllowedRegion(0, true); // 允许默认地区

  console.log(`美国地区是否允许: ${await token.isRegionAllowed(1)}`);
  console.log(`英国地区是否允许: ${await token.isRegionAllowed(44)}`);
  console.log(`中国地区是否允许: ${await token.isRegionAllowed(86)}`);
  console.log(`默认地区是否允许: ${await token.isRegionAllowed(0)}`);
  console.log(`限制地区999是否允许: ${await token.isRegionAllowed(999)}\n`);

  // 3. 启用地区限制功能
  console.log("🔧 启用地区限制功能...");
  await token.connect(complianceOfficer).setRegionRestrictionsEnabled(true);
  console.log("✅ 地区限制功能已启用\n");

  // 4. 给测试用户一些代币和KYC验证
  console.log("💰 设置测试环境...");
  const users = [usUser, ukUser, cnUser, restrictedUser];
  for (const user of users) {
    await token.connect(complianceOfficer).setKYCVerified(user.address, true);
    await token.mint(user.address, ethers.parseUnits("1000", 6));
  }
  console.log("✅ 测试环境设置完成\n");

  // 5. 测试允许地区间的转账
  console.log("💸 测试允许地区间的转账...");
  const amount = ethers.parseUnits("100", 6);

  // 美国到英国转账
  let restrictionCode = await token.detectTransferRestriction(
    usUser.address,
    ukUser.address,
    amount,
  );
  console.log(`美国 → 英国 转账限制代码: ${restrictionCode}`);

  if (restrictionCode === 0) {
    await token.connect(usUser).transfer(ukUser.address, amount);
    console.log("✅ 美国到英国转账成功");
  } else {
    const message = await token.messageForTransferRestriction(restrictionCode);
    console.log(`❌ 转账失败: ${message}`);
  }

  // 英国到中国转账
  restrictionCode = await token.detectTransferRestriction(ukUser.address, cnUser.address, amount);
  console.log(`英国 → 中国 转账限制代码: ${restrictionCode}`);

  if (restrictionCode === 0) {
    await token.connect(ukUser).transfer(cnUser.address, amount);
    console.log("✅ 英国到中国转账成功");
  } else {
    const message = await token.messageForTransferRestriction(restrictionCode);
    console.log(`❌ 转账失败: ${message}`);
  }

  // 6. 测试限制地区转账
  console.log("\n🚫 测试限制地区转账...");
  restrictionCode = await token.detectTransferRestriction(
    restrictedUser.address,
    usUser.address,
    amount,
  );
  console.log(`限制地区 → 美国 转账限制代码: ${restrictionCode}`);

  if (restrictionCode === 15) {
    // REGION_RESTRICTION
    const message = await token.messageForTransferRestriction(restrictionCode);
    console.log(`❌ 预期失败: ${message}`);
    console.log("✅ 地区限制正常工作");
  }

  // 7. 测试默认地区转账
  console.log("\n🌐 测试默认地区转账...");
  restrictionCode = await token.detectTransferRestriction(user1.address, usUser.address, amount);
  console.log(`默认地区 → 美国 转账限制代码: ${restrictionCode}`);

  if (restrictionCode === 0) {
    console.log("✅ 默认地区到允许地区转账成功");
  }

  // 8. 动态调整地区权限
  console.log("\n🔄 动态调整地区权限...");

  // 临时禁止英国
  await token.connect(complianceOfficer).setAllowedRegion(44, false);
  console.log("❌ 已禁止英国地区");

  restrictionCode = await token.detectTransferRestriction(usUser.address, ukUser.address, amount);
  console.log(`美国 → 英国(禁止) 转账限制代码: ${restrictionCode}`);

  if (restrictionCode === 15) {
    console.log("✅ 禁止地区限制正常工作");
  }

  // 重新允许英国
  await token.connect(complianceOfficer).setAllowedRegion(44, true);
  console.log("✅ 已重新允许英国地区");

  restrictionCode = await token.detectTransferRestriction(usUser.address, ukUser.address, amount);
  console.log(`美国 → 英国(重新允许) 转账限制代码: ${restrictionCode}`);

  if (restrictionCode === 0) {
    console.log("✅ 重新允许地区转账成功");
  }

  // 9. 批量管理地区
  console.log("\n📊 批量管理示例...");
  const regionCodes = [1, 44, 86, 124, 49]; // 美国、英国、中国、加拿大、德国
  const regionNames = ["美国", "英国", "中国", "加拿大", "德国"];

  console.log("🌍 批量允许多个地区:");
  for (let i = 0; i < regionCodes.length; i++) {
    await token.connect(complianceOfficer).setAllowedRegion(regionCodes[i], true);
    console.log(`✅ ${regionNames[i]}(${regionCodes[i]}) 已允许`);
  }

  console.log("\n🌍 批量禁止部分地区:");
  const restrictedCodes = [124, 49]; // 加拿大、德国
  const restrictedNames = ["加拿大", "德国"];

  for (let i = 0; i < restrictedCodes.length; i++) {
    await token.connect(complianceOfficer).setAllowedRegion(restrictedCodes[i], false);
    console.log(`❌ ${restrictedNames[i]}(${restrictedCodes[i]}) 已禁止`);
  }

  // 10. 紧急情况：禁用所有地区限制
  console.log("\n🚨 紧急情况：禁用地区限制功能...");
  await token.connect(complianceOfficer).setRegionRestrictionsEnabled(false);
  console.log("✅ 地区限制功能已禁用，所有地区现在都可以转账\n");

  console.log("📋 最终状态:");
  console.log(`地区限制是否启用: ${await token.isRegionRestrictionsEnabled()}`);
  console.log(`美国地区是否允许: ${await token.isRegionAllowed(1)}`);
  console.log(`英国地区是否允许: ${await token.isRegionAllowed(44)}`);
  console.log(`中国地区是否允许: ${await token.isRegionAllowed(86)}`);
  console.log(`限制地区是否允许: ${await token.isRegionAllowed(999)}`);
}

/**
 * 检查转账是否会触发 REGION_RESTRICTION
 */
async function _checkRegionRestriction(token, from, to, amount) {
  const code = await token.detectTransferRestriction(from, to, amount);
  const message = await token.messageForTransferRestriction(code);

  return {
    code,
    message,
    isValid: code === 0,
    isRegionRestricted: code === 15,
  };
}

/**
 * 演示不同地区组合的转账测试
 */
async function _demonstrateRegionScenarios(token, complianceOfficer) {
  console.log("\n🎭 地区限制场景演示:");

  const scenarios = [
    {
      name: "同地区内转账（美国内部）",
      fromRegion: 1,
      toRegion: 1,
      allowedRegions: [1],
      expectedResult: "SUCCESS",
    },
    {
      name: "跨允许地区转账（美国→英国）",
      fromRegion: 1,
      toRegion: 44,
      allowedRegions: [1, 44],
      expectedResult: "SUCCESS",
    },
    {
      name: "发送方禁止地区（限制地区→美国）",
      fromRegion: 999,
      toRegion: 1,
      allowedRegions: [1],
      expectedResult: "REGION_RESTRICTION",
    },
    {
      name: "接收方禁止地区（美国→限制地区）",
      fromRegion: 1,
      toRegion: 999,
      allowedRegions: [1],
      expectedResult: "REGION_RESTRICTION",
    },
    {
      name: "双方都在禁止地区",
      fromRegion: 999,
      toRegion: 888,
      allowedRegions: [1],
      expectedResult: "REGION_RESTRICTION",
    },
    {
      name: "默认地区转账（地区限制禁用）",
      fromRegion: 0,
      toRegion: 0,
      allowedRegions: [],
      regionsEnabled: false,
      expectedResult: "SUCCESS",
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\n🔍 场景: ${scenario.name}`);

    // 设置地区限制状态
    await token
      .connect(complianceOfficer)
      .setRegionRestrictionsEnabled(scenario.regionsEnabled !== false);

    // 设置允许的地区
    if (scenario.allowedRegions) {
      for (const region of scenario.allowedRegions) {
        await token.connect(complianceOfficer).setAllowedRegion(region, true);
      }
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
