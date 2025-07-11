#!/usr/bin/env node

/**
 * 专门用于Gas报告的测试脚本
 * 只运行核心合约测试，避免集成测试的大量输出
 */

const { spawn } = require("child_process");
const path = require("path");

async function runGasTests() {
  console.log("🔥 运行Gas使用分析测试...");

  // 设置环境变量
  const env = {
    ...process.env,
    REPORT_GAS: "true",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    NODE_ENV: "test",
    HARDHAT_VERBOSE: "false",
    DEBUG: "",
    CI: process.env.CI || "false",
  };

  // 只运行核心测试文件，避免集成测试
  const testFiles = ["test/USDXToken.test.js", "test/USDXGovernance.test.js"];

  console.log("📋 运行测试文件:");
  testFiles.forEach(file => console.log(`  - ${file}`));

  return new Promise((resolve, reject) => {
    const command = ["npx", "hardhat", "test", ...testFiles];

    console.log(`🔧 执行命令: ${command.join(" ")}`);

    const child = spawn(command[0], command.slice(1), {
      env,
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // 收集输出，但过滤掉网络日志
    child.stdout.on("data", data => {
      const chunk = data.toString();

      // 过滤掉网络相关的日志
      if (!shouldFilterOut(chunk)) {
        stdout += chunk;
        // 显示测试进度
        if (chunk.includes("✔") || chunk.includes("passing")) {
          process.stdout.write(".");
        }
      }
    });

    child.stderr.on("data", data => {
      stderr += data.toString();
    });

    child.on("close", code => {
      console.log("\n");

      if (code === 0) {
        console.log("✅ Gas测试完成");
        resolve({ stdout, stderr });
      } else {
        console.error(`❌ 测试失败，退出代码: ${code}`);
        if (stderr) {
          console.error("错误输出:", stderr.slice(-500));
        }
        reject(new Error(`测试失败: 退出代码 ${code}`));
      }
    });

    child.on("error", error => {
      console.error("❌ 执行失败:", error.message);
      reject(error);
    });

    // 5分钟超时
    setTimeout(
      () => {
        child.kill("SIGTERM");
        reject(new Error("测试执行超时"));
      },
      5 * 60 * 1000,
    );
  });
}

/**
 * 判断是否应该过滤掉某个输出块
 */
function shouldFilterOut(chunk) {
  const lowerChunk = chunk.toLowerCase();

  // 过滤掉这些网络日志
  const filterPatterns = [
    "eth_accounts",
    "eth_chainid",
    "anvil_metadata",
    "hardhat_metadata",
    "eth_blocknumber",
    "eth_sendtransaction",
    "eth_gettransactionbyhash",
    "eth_gettransactionreceipt",
    "eth_call",
    "contract deployment:",
    "contract call:",
    "value: 0 eth",
    "gas used:",
    "block #",
    "evm_increasetime",
    "evm_mine",
  ];

  return filterPatterns.some(pattern => lowerChunk.includes(pattern));
}

// 如果直接运行这个脚本
if (require.main === module) {
  runGasTests()
    .then(() => {
      console.log("🎉 Gas测试完成");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Gas测试失败:", error.message);
      process.exit(1);
    });
}

module.exports = { runGasTests };
