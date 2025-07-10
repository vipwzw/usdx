#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 颜色定义
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// 打印带颜色的消息
function print(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  print(`✅ ${message}`, "green");
}

function error(message) {
  print(`❌ ${message}`, "red");
}

function info(message) {
  print(`ℹ️  ${message}`, "blue");
}

function warning(message) {
  print(`⚠️  ${message}`, "yellow");
}

// 执行命令
function runCommand(command, description) {
  info(`Running: ${description}`);
  try {
    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    success(`${description} completed successfully`);
    return true;
  } catch (err) {
    error(`${description} failed`);
    return false;
  }
}

// 检查文件是否存在
function checkFileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

// 主要的CI检查函数
function runCIChecks() {
  print("\n🚀 Starting Local CI Checks", "cyan");
  print("=".repeat(50), "cyan");

  let allPassed = true;

  // 1. 环境检查
  print("\n📋 Step 1: Environment Check", "magenta");
  if (!checkFileExists("package.json")) {
    error("package.json not found");
    return false;
  }
  if (!checkFileExists("hardhat.config.js")) {
    error("hardhat.config.js not found");
    return false;
  }
  success("Environment check passed");

  // 2. 依赖检查
  print("\n📦 Step 2: Dependencies Check", "magenta");
  if (!runCommand("npm ls --depth=0", "Check dependencies")) {
    warning("Some dependencies issues found, attempting to fix...");
    if (!runCommand("npm install", "Install dependencies")) {
      allPassed = false;
    }
  }

  // 3. 清理和编译
  print("\n🏗️  Step 3: Clean and Compile", "magenta");
  if (!runCommand("npm run clean", "Clean build artifacts")) {
    allPassed = false;
  }
  if (!runCommand("npm run compile", "Compile contracts")) {
    allPassed = false;
  }

  // 4. 代码质量检查
  print("\n🔍 Step 4: Code Quality Checks", "magenta");
  if (!runCommand("npm run lint", "Run linter")) {
    allPassed = false;
  }

  // 5. 运行测试
  print("\n🧪 Step 5: Run Tests", "magenta");
  if (!runCommand("npm test", "Run unit tests")) {
    allPassed = false;
  }

  // 6. 测试覆盖率
  print("\n📊 Step 6: Test Coverage", "magenta");
  if (!runCommand("npm run coverage", "Generate coverage report")) {
    warning("Coverage report generation failed");
  }

  // 7. 合约大小检查
  print("\n📏 Step 7: Contract Size Check", "magenta");
  if (!runCommand("npm run size", "Check contract sizes")) {
    warning("Contract size check failed");
  }

  // 8. 安全检查
  print("\n🔒 Step 8: Security Checks", "magenta");
  if (!runCommand("npm run security-check", "Run security analysis")) {
    warning("Security check failed");
  }

  // 9. Gas报告
  print("\n⛽ Step 9: Gas Report", "magenta");
  if (!runCommand("npm run test:gas", "Generate gas report")) {
    warning("Gas report generation failed");
  }

  // 总结
  print("\n📋 CI Check Summary", "cyan");
  print("=".repeat(50), "cyan");

  if (allPassed) {
    success("All CI checks passed! 🎉");
    success("Code is ready for commit and push");
    return true;
  } else {
    error("Some CI checks failed!");
    error("Please fix the issues before committing");
    return false;
  }
}

// 快速检查模式（用于pre-commit）
function runQuickChecks() {
  print("\n⚡ Starting Quick CI Checks", "cyan");
  print("=".repeat(40), "cyan");

  let allPassed = true;

  // 1. 编译检查
  print("\n🏗️  Step 1: Compile Check", "magenta");
  if (!runCommand("npm run compile", "Compile contracts")) {
    allPassed = false;
  }

  // 2. 基础lint检查
  print("\n🔍 Step 2: Lint Check", "magenta");
  if (!runCommand("npm run lint", "Run linter")) {
    allPassed = false;
  }

  // 3. 快速测试
  print("\n🧪 Step 3: Quick Tests", "magenta");
  if (!runCommand("npm test", "Run tests")) {
    allPassed = false;
  }

  if (allPassed) {
    success("Quick CI checks passed! ⚡");
    return true;
  } else {
    error("Quick CI checks failed!");
    return false;
  }
}

// 命令行参数处理
function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "full";

  try {
    let result;

    switch (mode) {
      case "quick":
        result = runQuickChecks();
        break;
      case "full":
      default:
        result = runCIChecks();
        break;
    }

    process.exit(result ? 0 : 1);
  } catch (err) {
    error(`CI check failed with error: ${err.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { runCIChecks, runQuickChecks };
