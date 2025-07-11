#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

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
      .replace(/\x1b\[[0-9;]*m/g, "") // ANSI颜色代码
      .replace(/\u001b\[[0-9;]*m/g, "") // Unicode转义序列
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // 控制字符
      .replace(/\[\d+m/g, "") // 其他颜色代码
      .replace(/\r/g, ""); // 回车符

    // 提取gas报告表格
    const lines = cleanOutput.split("\n");
    const gasReportLines = [];
    let inGasReport = false;
    let tableFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 检测gas报告开始
      if (line.includes("Gas Usage Report") || line.includes("·-") || line.includes("│")) {
        inGasReport = true;
        tableFound = true;
      }

      // 如果在gas报告中
      if (inGasReport) {
        // 包含表格字符的行
        if (
          line.includes("·") ||
          line.includes("│") ||
          line.includes("Contract") ||
          line.includes("Method")
        ) {
          gasReportLines.push(line.trim());
        }
        // 空行可能表示表格结束
        else if (line.trim() === "" && gasReportLines.length > 0) {
          // 检查下一行是否还有表格内容
          const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
          if (!nextLine.includes("·") && !nextLine.includes("│")) {
            break;
          }
        }
      }
    }

    // 如果没有找到表格，尝试提取包含gas信息的行
    if (!tableFound) {
      console.log("⚠️  未找到标准gas报告表格，尝试提取gas相关信息...");
      for (const line of lines) {
        if (
          line.toLowerCase().includes("gas") &&
          (line.includes("used") || line.includes("avg") || line.includes("median"))
        ) {
          gasReportLines.push(line.trim());
        }
      }
    }

    // 生成最终报告
    let finalReport = "";
    if (gasReportLines.length > 0) {
      finalReport = gasReportLines.join("\n");

      // 进一步清理
      finalReport = finalReport
        .replace(/\s+/g, " ") // 多个空格合并
        .replace(/\s*\|\s*/g, " | ") // 规范表格分隔符
        .replace(/\s*·\s*/g, " · ") // 规范点分隔符
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n");
    } else {
      finalReport =
        "📊 Gas使用报告\n\n没有找到gas使用数据，可能是因为：\n- 测试中没有部署合约\n- REPORT_GAS环境变量未正确设置\n- 使用的测试框架不支持gas报告";
    }

    // 保存报告
    fs.writeFileSync("gas-report.txt", finalReport);

    console.log("✅ Gas报告已生成: gas-report.txt");
    console.log("📝 报告预览:");
    console.log("─".repeat(50));
    console.log(finalReport.slice(0, 500) + (finalReport.length > 500 ? "..." : ""));
    console.log("─".repeat(50));
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

// 如果直接运行这个脚本
if (require.main === module) {
  generateGasReport();
}

module.exports = { generateGasReport };
