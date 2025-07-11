#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");

/**
 * 生成清洁的Gas使用报告
 * 去除ANSI控制字符和乱码，提取有用的gas信息
 */
async function generateGasReport() {
  try {
    console.log("🔥 开始生成Gas使用报告...");

    // 设置环境变量禁用颜色输出
    process.env.NO_COLOR = "1";
    process.env.FORCE_COLOR = "0";

    // 运行测试并生成gas报告
    console.log("📊 运行测试并收集gas数据...");
    const testOutput = execSync("REPORT_GAS=true npx hardhat test", {
      encoding: "utf8",
      stdio: "pipe",
    });

    // 清理ANSI控制字符
    const cleanOutput = testOutput
      .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "") // ANSI颜色代码
      .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "") // Unicode转义序列
      .replace(
        new RegExp(
          `[${String.fromCharCode(
            0,
            8,
            11,
            12,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            127,
          )}]`,
          "g",
        ),
        "",
      ) // 控制字符
      .replace(/\[\d+m/g, "") // 其他颜色代码
      .replace(/\r/g, ""); // 回车符

    // 提取和格式化gas报告
    const report = extractAndFormatGasReport(cleanOutput);

    // 保存报告
    fs.writeFileSync("gas-report.txt", report);

    console.log("✅ Gas报告已生成: gas-report.txt");
    console.log("📝 报告预览:");
    console.log("─".repeat(80));
    console.log(report.slice(0, 1000) + (report.length > 1000 ? "..." : ""));
    console.log("─".repeat(80));
  } catch (error) {
    console.error("❌ 生成Gas报告时出错:", error.message);

    // 创建错误报告
    const errorReport = `📊 Gas使用报告生成失败

错误信息: ${error.message}

这可能是由于以下原因：
- 测试执行失败
- 合约编译错误
- 环境配置问题

请检查测试是否能够正常运行，然后重新生成报告。`;

    fs.writeFileSync("gas-report.txt", errorReport);

    // 不要让脚本失败，以免影响CI
    process.exit(0);
  }
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
