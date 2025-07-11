#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// 常量定义
const CONSTANTS = {
  TIMEOUT_MS: 10 * 60 * 1000, // 10分钟
  HIGH_GAS_THRESHOLD: 100000,
  MAX_FALLBACK_LINES: 20,
  PREVIEW_LENGTH: 1000,
  ERROR_OUTPUT_SLICE: 500,
};

const TEST_FILES = ["test/USDXToken.test.js", "test/USDXGovernance.test.js"];

const EXCLUDE_PATTERNS = [
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

const INCLUDE_PATTERNS = [
  "gas",
  "solc version",
  "optimizer",
  "contract",
  "method",
  "deployments",
  "passing",
  "failing",
  "✔",
  "❌",
  "error",
];

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
// eslint-disable-next-line no-control-regex
const UNICODE_ANSI_REGEX = /\u001b\[[0-9;]*m/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const COLOR_CODE_REGEX = /\[\d+m/g;

/**
 * 清理ANSI控制字符
 */
function cleanAnsiChars(text) {
  return text
    .replace(ANSI_REGEX, "")
    .replace(UNICODE_ANSI_REGEX, "")
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(COLOR_CODE_REGEX, "")
    .trim();
}

/**
 * 生成清洁的Gas使用报告
 */
async function generateGasReport() {
  try {
    console.log("🔥 开始生成Gas使用报告...");

    const env = createOptimizedEnv();
    console.log("📊 运行Gas分析测试...");

    const gasOutput = await runOptimizedGasTests(env);
    const cleanOutput = cleanTestOutput(gasOutput);
    const report = extractAndFormatGasReport(cleanOutput);

    saveReport(report);
    displayReportPreview(report);

    return report;
  } catch (error) {
    console.error("❌ 生成Gas报告时出错:", error.message);
    return createErrorReport(error);
  }
}

/**
 * 创建优化的环境变量
 */
function createOptimizedEnv() {
  return {
    ...process.env,
    REPORT_GAS: "true",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    NODE_ENV: "test",
    HARDHAT_VERBOSE: "false",
    DEBUG: "",
    ...(process.env.CI === "true" && {
      NODE_OPTIONS: "--max-old-space-size=4096",
    }),
  };
}

/**
 * 保存报告到文件
 */
function saveReport(report) {
  const reportPath = path.join(process.cwd(), "gas-report.txt");
  fs.writeFileSync(reportPath, report);
  console.log("✅ Gas报告已生成:", reportPath);
}

/**
 * 显示报告预览
 */
function displayReportPreview(report) {
  console.log("📝 报告预览:");
  console.log("─".repeat(80));
  console.log(
    report.slice(0, CONSTANTS.PREVIEW_LENGTH) +
      (report.length > CONSTANTS.PREVIEW_LENGTH ? "..." : ""),
  );
  console.log("─".repeat(80));
}

/**
 * 运行优化的Gas测试
 */
async function runOptimizedGasTests(env) {
  return new Promise((resolve, reject) => {
    const command = ["npx", "hardhat", "test", ...TEST_FILES];

    console.log(`🔧 执行命令: ${command.join(" ")}`);
    console.log(`📋 测试文件: ${TEST_FILES.join(", ")}`);

    const child = spawn(command[0], command.slice(1), {
      env,
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", data => {
      const chunk = data.toString();
      if (shouldIncludeOutput(chunk)) {
        output += chunk;
      }
      showProgress(chunk);
    });

    child.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    child.on("close", code => {
      console.log("\n🏁 测试执行完成");
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new Error(
            `测试失败，退出代码: ${code}\n错误输出: ${errorOutput.slice(-CONSTANTS.ERROR_OUTPUT_SLICE)}`,
          ),
        );
      }
    });

    child.on("error", error => {
      reject(new Error(`执行失败: ${error.message}`));
    });

    setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("测试执行超时 (10分钟)"));
    }, CONSTANTS.TIMEOUT_MS);
  });
}

/**
 * 显示测试进度
 */
function showProgress(chunk) {
  if (chunk.includes("✔") || chunk.includes("passing") || chunk.includes("Gas")) {
    process.stdout.write(".");
  }
}

/**
 * 判断是否应该包含某个输出块
 */
function shouldIncludeOutput(chunk) {
  const lowerChunk = chunk.toLowerCase();

  // 检查排除模式
  if (EXCLUDE_PATTERNS.some(pattern => lowerChunk.includes(pattern))) {
    return false;
  }

  // 检查包含模式
  return INCLUDE_PATTERNS.some(pattern => lowerChunk.includes(pattern));
}

/**
 * 清理测试输出
 */
function cleanTestOutput(output) {
  return output
    .replace(ANSI_REGEX, "")
    .replace(UNICODE_ANSI_REGEX, "")
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(COLOR_CODE_REGEX, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 提取和格式化gas报告
 */
function extractAndFormatGasReport(output) {
  const dataLines = extractDataLines(output);
  if (dataLines.length === 0) {
    return createFallbackReport(output);
  }

  const parsedData = parseGasDataLines(dataLines);
  if (parsedData.length === 0) {
    return createFallbackReport(output);
  }

  return formatGasReport(parsedData);
}

/**
 * 提取数据行
 */
function extractDataLines(output) {
  const lines = output.split("\n");
  const dataLines = [];
  let inGasSection = false;

  for (const line of lines) {
    if (!line.trim() || line.trim().match(/^[·│|\-\s]+$/)) {
      continue;
    }

    if (isGasReportLine(line)) {
      inGasSection = true;
    }

    if (inGasSection) {
      const cleanLine = cleanDataLine(line);
      if (isValidDataLine(cleanLine)) {
        dataLines.push(cleanLine);
      }
    }
  }

  return dataLines;
}

/**
 * 检查是否是gas报告相关行
 */
function isGasReportLine(line) {
  return ["Solc version", "Contract", "Method", "Deployments"].some(keyword =>
    line.includes(keyword),
  );
}

/**
 * 清理数据行
 */
function cleanDataLine(line) {
  return line
    .replace(/\s*[·│]\s*/g, " | ")
    .replace(/\s*\|\s*/g, " | ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * 检查是否是有效的数据行
 */
function isValidDataLine(cleanLine) {
  return cleanLine && !cleanLine.match(/^[|\-\s]+$/) && !cleanLine.match(/^[·│|\-\s]+$/);
}

/**
 * 解析gas数据行
 */
function parseGasDataLines(lines) {
  const data = [];
  let currentSection = "methods";

  for (const line of lines) {
    if (isHeaderLine(line)) {
      continue;
    }

    if (line.toLowerCase().includes("deployment")) {
      currentSection = "deployments";
      continue;
    }

    const item = parseDataLine(line, currentSection);
    if (item && isValidDataItem(item)) {
      data.push(item);
    }
  }

  return data;
}

/**
 * 检查是否是头部信息行
 */
function isHeaderLine(line) {
  return ["Solc version", "Optimizer", "Block limit", "Contract | Method | Min | Max | Avg"].some(
    header => line.includes(header),
  );
}

/**
 * 解析单个数据行
 */
function parseDataLine(line, currentSection) {
  const parts = line
    .split("|")
    .map(part => part.trim())
    .filter(part => part);

  if (parts.length >= 4 && parts[0] && parts[0] !== "Contract") {
    return {
      type: currentSection,
      contract: parts[0] || "",
      method: parts[1] || "",
      min: parts[2] || "",
      max: parts[3] || "",
      avg: parts[4] || "",
      calls: parts[5] || "",
      usd: parts[6] || "",
    };
  }
  return null;
}

/**
 * 检查数据项是否有效
 */
function isValidDataItem(item) {
  return item.contract && (item.method || item.type === "deployments");
}

/**
 * 格式化gas报告
 */
function formatGasReport(data) {
  const methods = data.filter(item => item.type === "methods" && item.method);
  const deployments = data.filter(item => item.type === "deployments" || !item.method);

  const report = ["📊 Gas使用报告", ""];

  if (methods.length > 0) {
    report.push(...formatMethodsTable(methods));
  }

  if (deployments.length > 0) {
    report.push(...formatDeploymentsTable(deployments));
  }

  if (methods.length > 0) {
    const optimizationSuggestions = generateOptimizationSuggestions(methods);
    if (optimizationSuggestions.length > 0) {
      report.push(...optimizationSuggestions);
    }
  }

  report.push(...generateReportDescription());
  return report.join("\n");
}

/**
 * 格式化方法表格
 */
function formatMethodsTable(methods) {
  const table = [
    "## 📋 合约方法调用Gas消耗",
    "",
    "| 合约 | 方法 | 最小值 | 最大值 | 平均值 | 调用次数 |",
    "|------|------|--------|--------|--------|----------|",
  ];

  methods.forEach(item => {
    const row = [
      item.contract,
      item.method,
      item.min === "-" ? "-" : item.min,
      item.max === "-" ? "-" : item.max,
      item.avg === "-" ? "-" : item.avg,
      item.calls === "-" ? "-" : item.calls,
    ];
    table.push(`| ${row.join(" | ")} |`);
  });

  table.push("");
  return table;
}

/**
 * 格式化部署表格
 */
function formatDeploymentsTable(deployments) {
  const table = [
    "## 🚀 合约部署Gas消耗",
    "",
    "| 合约 | Gas消耗 | 区块限制占比 |",
    "|------|---------|--------------|",
  ];

  deployments.forEach(item => {
    const gasUsed = item.avg || item.max || item.min || "-";
    const percentage = item.calls || "-";
    table.push(`| ${item.contract} | ${gasUsed} | ${percentage} |`);
  });

  table.push("");
  return table;
}

/**
 * 生成优化建议
 */
function generateOptimizationSuggestions(methods) {
  const highGasMethods = methods.filter(item => {
    const avg = parseInt(item.avg.replace(/,/g, "")) || 0;
    return avg > CONSTANTS.HIGH_GAS_THRESHOLD;
  });

  if (highGasMethods.length === 0) {
    return [];
  }

  const suggestions = ["## ⚠️ Gas优化建议", "", "以下方法Gas消耗较高，建议优化:"];

  highGasMethods.forEach(item => {
    suggestions.push(`- **${item.contract}.${item.method}**: 平均 ${item.avg} gas`);
  });

  suggestions.push("");
  return suggestions;
}

/**
 * 生成报告说明
 */
function generateReportDescription() {
  return [
    "## 📝 说明",
    "- **最小值**: 该方法调用的最低gas消耗",
    "- **最大值**: 该方法调用的最高gas消耗",
    "- **平均值**: 该方法调用的平均gas消耗",
    "- **调用次数**: 测试中该方法的调用次数",
    "- **区块限制占比**: 部署gas占区块gas限制的百分比",
  ];
}

/**
 * 创建备用报告
 */
function createFallbackReport(output) {
  const lines = output.split("\n");
  const gasRelatedLines = extractGasRelatedLines(lines);

  if (gasRelatedLines.length > 0) {
    return [
      "📊 Gas使用报告",
      "",
      "⚠️ 无法解析标准gas报告格式，以下是提取的gas相关信息：",
      "",
      ...gasRelatedLines.slice(0, CONSTANTS.MAX_FALLBACK_LINES),
      "",
      "💡 建议：检查hardhat-gas-reporter配置是否正确",
    ].join("\n");
  }

  return createNoDataReport();
}

/**
 * 提取gas相关行
 */
function extractGasRelatedLines(lines) {
  const gasRelatedLines = [];

  for (const line of lines) {
    const cleanLine = cleanAnsiChars(line);
    if (isGasRelatedLine(cleanLine)) {
      gasRelatedLines.push(cleanLine);
    }
  }

  return gasRelatedLines;
}

/**
 * 检查是否是gas相关行
 */
function isGasRelatedLine(cleanLine) {
  return (
    cleanLine.includes("gas") ||
    cleanLine.includes("Gas") ||
    cleanLine.includes("wei") ||
    cleanLine.match(/\d+\s*(gwei|wei|eth)/i) ||
    cleanLine.includes("deployment") ||
    cleanLine.includes("transaction")
  );
}

/**
 * 创建无数据报告
 */
function createNoDataReport() {
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

  saveReport(errorReport);
  return errorReport;
}

// 如果直接运行这个脚本
if (require.main === module) {
  (async () => {
    try {
      await generateGasReport();
      console.log("🎉 Gas报告生成完成！");
      process.exit(0);
    } catch (error) {
      console.error("❌ 脚本执行失败:", error.message);
      process.exit(1);
    }
  })();
}

module.exports = { generateGasReport };
