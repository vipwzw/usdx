#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * 生成清洁的Gas使用报告
 * 使用流式处理避免缓冲区溢出
 */
async function generateGasReport() {
  try {
    console.log("🔥 开始生成Gas使用报告...");

    // 设置环境变量禁用颜色输出和减少日志
    const env = {
      ...process.env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      REPORT_GAS: "true",
      NODE_ENV: "test",
      // 减少Hardhat输出
      HARDHAT_VERBOSE: "false",
      // 禁用一些调试输出
      DEBUG: "",
    };

         console.log("📊 运行优化的gas分析测试...");

    // 使用专门的gas测试脚本
    const { runGasTests } = require('./gas-test.js');
    const { stdout: gasOutput } = await runGasTests();

    // 清理输出
    const cleanOutput = cleanTestOutput(gasOutput);

    // 提取和格式化gas报告
    const report = extractAndFormatGasReport(cleanOutput);

    // 保存报告
    const reportPath = path.join(process.cwd(), "gas-report.txt");
    fs.writeFileSync(reportPath, report);

    console.log("✅ Gas报告已生成:", reportPath);
    console.log("📝 报告预览:");
    console.log("─".repeat(80));
    console.log(report.slice(0, 1000) + (report.length > 1000 ? "..." : ""));
    console.log("─".repeat(80));

    return report;
  } catch (error) {
    console.error("❌ 生成Gas报告时出错:", error.message);
    return createErrorReport(error);
  }
}

/**
 * 运行Gas分析，使用流式处理避免缓冲区溢出
 */
async function runGasAnalysis(env) {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";

    // 只运行核心测试，避免集成测试的大量输出
    const testCommand = [
      "npx",
      "hardhat",
      "test",
      "test/USDXToken.test.js",
      "test/USDXGovernance.test.js",
      "--reporter",
      "spec",
    ];

    console.log(`🔧 执行命令: ${testCommand.join(" ")}`);

    const child = spawn(testCommand[0], testCommand.slice(1), {
      env,
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    // 处理标准输出
    child.stdout.on("data", data => {
      const chunk = data.toString();

      // 只保留gas相关的输出，过滤掉大量的网络日志
      if (shouldIncludeOutput(chunk)) {
        output += chunk;
      }

      // 实时显示进度，但限制输出量
      if (chunk.includes("✔") || chunk.includes("passing") || chunk.includes("Gas")) {
        process.stdout.write(".");
      }
    });

    // 处理错误输出
    child.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    // 处理子进程结束
    child.on("close", code => {
      console.log("\n🏁 测试执行完成");

      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`测试失败，退出代码: ${code}\n错误输出: ${errorOutput.slice(-500)}`));
      }
    });

    // 处理错误
    child.on("error", error => {
      reject(new Error(`执行失败: ${error.message}`));
    });

    // 设置超时
    setTimeout(
      () => {
        child.kill("SIGTERM");
        reject(new Error("测试执行超时 (5分钟)"));
      },
      5 * 60 * 1000,
    ); // 5分钟超时
  });
}

/**
 * 判断是否应该包含某个输出块
 */
function shouldIncludeOutput(chunk) {
  const lowerChunk = chunk.toLowerCase();

  // 排除网络调用日志
  const excludePatterns = [
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
  ];

  // 如果包含排除模式，则不包含
  for (const pattern of excludePatterns) {
    if (lowerChunk.includes(pattern)) {
      return false;
    }
  }

  // 包含gas相关信息
  const includePatterns = [
    "gas",
    "solc version",
    "optimizer",
    "contract",
    "method",
    "deployments",
    "passing",
    "✔",
    "❌",
    "error",
  ];

  return includePatterns.some(pattern => lowerChunk.includes(pattern));
}

/**
 * 清理测试输出
 */
function cleanTestOutput(output) {
  return (
    output
      // 移除ANSI控制字符
      .replace(/\x1b\[[0-9;]*m/g, "")
      .replace(/\u001b\[[0-9;]*m/g, "")
      // 移除其他控制字符
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // 移除颜色代码
      .replace(/\[\d+m/g, "")
      // 规范化换行符
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // 移除多余的空行
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * 创建错误报告
 */
function createErrorReport(error) {
  const errorReport = `📊 Gas使用报告

🚫 Gas使用报告生成失败

**错误信息**: ${error.message}

**可能原因**:
- 测试执行失败
- 合约编译错误
- 环境配置问题
- 内存不足或缓冲区溢出

**解决建议**:
1. 检查测试是否能够正常运行
2. 尝试运行单个测试文件: \`npx hardhat test test/USDXToken.test.js\`
3. 检查hardhat.config.js中的gas reporter配置
4. 确保系统内存充足

**快速修复**:
\`\`\`bash
cd contracts
npm run compile
REPORT_GAS=true npx hardhat test test/USDXToken.test.js
\`\`\`

😊 如需帮助，请检查CI日志获取详细信息。`;

  // 保存错误报告
  const reportPath = path.join(process.cwd(), "gas-report.txt");
  fs.writeFileSync(reportPath, errorReport);

  return errorReport;
}

/**
 * 提取和格式化gas报告
 * @param {string} output - 原始输出
 * @returns {string} 格式化后的报告
 */
function extractAndFormatGasReport(output) {
  const lines = output.split("\n");

  // 查找包含实际gas数据的行
  const dataLines = [];
  let inGasSection = false;

  for (const line of lines) {
    // 跳过空行和纯符号行
    if (!line.trim() || line.trim().match(/^[·│|\-\s]+$/)) {
      continue;
    }

    // 检查是否是gas报告相关行
    if (
      line.includes("Solc version") ||
      line.includes("Contract") ||
      line.includes("Method") ||
      line.includes("Deployments")
    ) {
      inGasSection = true;
    }

    if (inGasSection) {
      // 清理行内容
      const cleanLine = line
        .replace(/\s*[·│]\s*/g, " | ") // 替换特殊字符为 |
        .replace(/\s*\|\s*/g, " | ") // 规范化 |
        .replace(/\s{2,}/g, " ") // 多个空格合并
        .trim();

      // 如果行包含有用信息，添加到数据行
      if (
        cleanLine &&
        !cleanLine.match(/^[|\-\s]+$/) && // 不是纯分隔符
        !cleanLine.match(/^[·│|\-\s]+$/)
      ) {
        // 不是特殊字符行
        dataLines.push(cleanLine);
      }
    }
  }

  if (dataLines.length === 0) {
    return createFallbackReport(output);
  }

  // 解析数据行
  const parsedData = parseGasDataLines(dataLines);

  if (parsedData.length === 0) {
    return createFallbackReport(output);
  }

  // 生成格式化的报告
  return formatGasReport(parsedData);
}

/**
 * 解析gas数据行
 * @param {string[]} lines - 数据行
 * @returns {Object[]} 解析后的数据
 */
function parseGasDataLines(lines) {
  const data = [];
  let currentSection = "methods";

  for (const line of lines) {
    // 跳过头部信息行和表头
    if (
      line.includes("Solc version") ||
      line.includes("Optimizer") ||
      line.includes("Block limit") ||
      line.includes("Contract | Method | Min | Max | Avg")
    ) {
      continue;
    }

    // 检查是否是部署信息部分
    if (line.toLowerCase().includes("deployment")) {
      currentSection = "deployments";
      continue;
    }

    // 解析数据行
    const parts = line
      .split("|")
      .map(part => part.trim())
      .filter(part => part);

    if (parts.length >= 4 && parts[0] && parts[0] !== "Contract") {
      const item = {
        type: currentSection,
        contract: parts[0] || "",
        method: parts[1] || "",
        min: parts[2] || "",
        max: parts[3] || "",
        avg: parts[4] || "",
        calls: parts[5] || "",
        usd: parts[6] || "",
      };

      // 只添加有意义的数据行
      if (item.contract && (item.method || item.type === "deployments")) {
        data.push(item);
      }
    }
  }

  return data;
}

/**
 * 格式化gas报告
 * @param {Object[]} data - 解析后的数据
 * @returns {string} 格式化的报告
 */
function formatGasReport(data) {
  const methods = data.filter(item => item.type === "methods" && item.method);
  const deployments = data.filter(item => item.type === "deployments" || !item.method);

  const report = ["📊 Gas使用报告", ""];

  if (methods.length > 0) {
    report.push("## 📋 合约方法调用Gas消耗");
    report.push("");
    report.push("| 合约 | 方法 | 最小值 | 最大值 | 平均值 | 调用次数 |");
    report.push("|------|------|--------|--------|--------|----------|");

    methods.forEach(item => {
      const row = [
        item.contract,
        item.method,
        item.min === "-" ? "-" : item.min,
        item.max === "-" ? "-" : item.max,
        item.avg === "-" ? "-" : item.avg,
        item.calls === "-" ? "-" : item.calls,
      ];
      report.push(`| ${row.join(" | ")} |`);
    });

    report.push("");
  }

  if (deployments.length > 0) {
    report.push("## 🚀 合约部署Gas消耗");
    report.push("");
    report.push("| 合约 | Gas消耗 | 区块限制占比 |");
    report.push("|------|---------|--------------|");

    deployments.forEach(item => {
      const gasUsed = item.avg || item.max || item.min || "-";
      const percentage = item.calls || "-";
      report.push(`| ${item.contract} | ${gasUsed} | ${percentage} |`);
    });

    report.push("");
  }

  report.push("## 📝 说明");
  report.push("- **最小值**: 该方法调用的最低gas消耗");
  report.push("- **最大值**: 该方法调用的最高gas消耗");
  report.push("- **平均值**: 该方法调用的平均gas消耗");
  report.push("- **调用次数**: 测试中该方法的调用次数");
  report.push("- **区块限制占比**: 部署gas占区块gas限制的百分比");

  return report.join("\n");
}

/**
 * 创建备用报告（当无法解析标准报告时）
 * @param {string} output - 原始输出
 * @returns {string} 备用报告
 */
function createFallbackReport(output) {
  const lines = output.split("\n");
  const gasRelatedLines = [];

  // 查找包含gas信息的行
  for (const line of lines) {
    const cleanLine = line
      .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "")
      .trim();

    if (
      cleanLine.includes("gas") ||
      cleanLine.includes("Gas") ||
      cleanLine.includes("wei") ||
      cleanLine.match(/\d+\s*(gwei|wei|eth)/i) ||
      cleanLine.includes("deployment") ||
      cleanLine.includes("transaction")
    ) {
      gasRelatedLines.push(cleanLine);
    }
  }

  if (gasRelatedLines.length > 0) {
    return [
      "📊 Gas使用报告",
      "",
      "⚠️ 无法解析标准gas报告格式，以下是提取的gas相关信息：",
      "",
      ...gasRelatedLines.slice(0, 20), // 限制行数
      "",
      "💡 建议：检查hardhat-gas-reporter配置是否正确",
    ].join("\n");
  }

  return [
    "📊 Gas使用报告",
    "",
    "❌ 未找到gas使用数据",
    "",
    "可能的原因：",
    "- 测试中没有部署合约",
    "- REPORT_GAS环境变量未正确设置",
    "- hardhat-gas-reporter插件未正确配置",
    "- 使用的测试框架不支持gas报告",
    "",
    "💡 建议：",
    "1. 确保在hardhat.config.js中正确配置了gas reporter",
    "2. 检查测试是否包含合约部署和函数调用",
    "3. 确保REPORT_GAS=true环境变量已设置",
  ].join("\n");
}

// 如果直接运行这个脚本
if (require.main === module) {
  generateGasReport();
}

module.exports = { generateGasReport };
