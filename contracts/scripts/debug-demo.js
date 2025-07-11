/**
 * JavaScript调试演示脚本
 * 这个脚本演示了如何在VSCode中调试JavaScript代码
 * 使用方法：
 * 1. 在此文件中设置断点
 * 2. 按F5开始调试
 * 3. 选择 "Current Node.js File" 调试配置
 */

const { ethers } = require("hardhat");

// 异步函数演示
async function deployContractDemo() {
  console.log("🚀 开始合约部署演示...");

  // 断点1: 在这里设置断点查看部署过程
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  try {
    // 断点2: 在这里设置断点查看工厂创建
    const _USDXToken = await ethers.getContractFactory("USDXToken");
    console.log("✅ 合约工厂创建成功");

    // 模拟部署参数
    const deployParams = {
      name: "USDX Stablecoin Debug",
      symbol: "USDX-DEBUG",
      decimals: 18,
      initialSupply: ethers.parseEther("1000000"), // 100万代币
    };

    // 断点3: 在这里设置断点查看部署参数
    console.log("部署参数:", deployParams);

    // 注意: 这里不会真正部署，只是演示调试
    console.log("📝 注意: 这是调试演示，不会实际部署合约");

    return {
      success: true,
      message: "调试演示完成",
      params: deployParams,
    };
  } catch (error) {
    // 断点4: 在这里设置断点查看错误信息
    console.error("❌ 部署失败:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 数据处理演示
function processDataDemo() {
  console.log("📊 开始数据处理演示...");

  // 断点5: 在这里设置断点查看原始数据
  const rawData = [
    { address: "0x1234...", balance: "1000", symbol: "USDX" },
    { address: "0x5678...", balance: "2000", symbol: "USDX" },
    { address: "0x9abc...", balance: "500", symbol: "USDX" },
  ];

  console.log("原始数据:", rawData);

  // 断点6: 在这里设置断点查看处理过程
  const processedData = rawData.map((item, index) => {
    const balanceInEther = ethers.formatEther(ethers.parseEther(item.balance));

    return {
      id: index + 1,
      address: item.address,
      balance: balanceInEther,
      symbol: item.symbol,
      balanceFormatted: `${balanceInEther} ${item.symbol}`,
    };
  });

  // 断点7: 在这里设置断点查看处理结果
  console.log("处理后数据:", processedData);

  return processedData;
}

// 错误处理演示
async function errorHandlingDemo() {
  console.log("🚨 开始错误处理演示...");

  try {
    // 断点8: 在这里设置断点
    console.log("尝试执行可能出错的操作...");

    // 模拟一个会出错的操作
    const riskyOperation = () => {
      const randomNumber = Math.random();
      console.log("随机数:", randomNumber);

      if (randomNumber < 0.5) {
        throw new Error("随机错误: 数字太小了!");
      }

      return { success: true, value: randomNumber };
    };

    // 断点9: 在这里设置断点查看操作结果
    const result = riskyOperation();
    console.log("✅ 操作成功:", result);
  } catch (error) {
    // 断点10: 在这里设置断点分析错误
    console.error("❌ 捕获到错误:", error.message);
    console.error("错误堆栈:", error.stack);

    // 错误恢复逻辑
    console.log("🔄 执行错误恢复逻辑...");
    return { recovered: true, originalError: error.message };
  }
}

// 性能监控演示
function performanceDemo() {
  console.log("⚡ 开始性能监控演示...");

  // 断点11: 在这里设置断点
  console.time("数组处理性能");

  const largeArray = Array.from({ length: 100000 }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    timestamp: Date.now(),
  }));

  // 断点12: 在这里设置断点查看内存使用
  const memoryBefore = process.memoryUsage();
  console.log("处理前内存使用:", {
    rss: `${Math.round((memoryBefore.rss / 1024 / 1024) * 100) / 100} MB`,
    heapUsed: `${Math.round((memoryBefore.heapUsed / 1024 / 1024) * 100) / 100} MB`,
  });

  // 模拟数据处理
  const processedArray = largeArray
    .filter(item => item.value > 500)
    .map(item => ({
      ...item,
      category: item.value > 750 ? "high" : "medium",
    }))
    .sort((a, b) => b.value - a.value);

  // 断点13: 在这里设置断点查看处理结果和内存使用
  const memoryAfter = process.memoryUsage();
  console.log("处理后内存使用:", {
    rss: `${Math.round((memoryAfter.rss / 1024 / 1024) * 100) / 100} MB`,
    heapUsed: `${Math.round((memoryAfter.heapUsed / 1024 / 1024) * 100) / 100} MB`,
  });

  console.timeEnd("数组处理性能");
  console.log("处理结果数量:", processedArray.length);

  return processedArray.slice(0, 5); // 返回前5个结果
}

// 主函数
async function main() {
  console.log("🎯 JavaScript调试演示开始");
  console.log("==============================");

  try {
    // 断点14: 在这里设置断点开始调试会话
    console.log("1. 合约部署演示");
    const deployResult = await deployContractDemo();
    console.log("部署结果:", deployResult);

    console.log("\n2. 数据处理演示");
    const _dataResult = processDataDemo();
    console.log("数据处理完成");

    console.log("\n3. 错误处理演示");
    const errorResult = await errorHandlingDemo();
    console.log("错误处理结果:", errorResult);

    console.log("\n4. 性能监控演示");
    const perfResult = performanceDemo();
    console.log("性能测试完成，示例结果:", perfResult);

    // 断点15: 在这里设置断点查看最终结果
    console.log("\n✅ 所有演示完成！");
    console.log("🎉 调试功能验证成功");
  } catch (error) {
    // 断点16: 在这里设置断点处理未捕获的错误
    console.error("💥 演示过程中发生错误:", error);
  }
}

// 条件断点演示
function conditionalBreakpointDemo() {
  console.log("🔍 条件断点演示");

  for (let i = 0; i < 10; i++) {
    // 在这里设置条件断点: i > 5
    // 这样只有当 i 大于 5 时才会暂停
    console.log(`计数器: ${i}`);

    if (i === 7) {
      // 在这里设置另一个断点
      console.log("特殊值到达!");
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🔍 现在尝试条件断点演示");
      conditionalBreakpointDemo();
      console.log("\n🎯 调试演示全部完成！");
    })
    .catch(console.error);
}

module.exports = {
  deployContractDemo,
  processDataDemo,
  errorHandlingDemo,
  performanceDemo,
  conditionalBreakpointDemo,
};
