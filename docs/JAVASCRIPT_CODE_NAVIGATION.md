# JavaScript 代码跳转配置指南

## 📋 概述

本指南将帮助您在VSCode中实现完整的JavaScript代码跳转功能，包括函数定义跳转、变量追踪、模块导入跳转等。

## 🚀 功能特性

### 已实现的JavaScript代码跳转功能

- ✅ **函数定义跳转**: `Ctrl+Click` 或 `F12` 跳转到函数定义
- ✅ **变量声明跳转**: 跳转到变量声明位置
- ✅ **模块导入跳转**: 跳转到导入的模块文件
- ✅ **智能提示**: 自动完成和参数提示
- ✅ **查找所有引用**: `Shift+F12` 查找符号的所有使用位置
- ✅ **重命名符号**: `F2` 重命名变量、函数等
- ✅ **路径智能感知**: 自动完成文件路径
- ✅ **参数提示**: 函数调用时显示参数信息

## 📦 配置文件

### 1. jsconfig.json 配置

项目包含两个jsconfig.json文件：

#### 根目录 `jsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@contracts/*": ["contracts/*"],
      "@scripts/*": ["scripts/*"],
      "@docs/*": ["docs/*"]
    }
  }
}
```

#### contracts目录 `contracts/jsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"],
      "@scripts/*": ["./scripts/*"],
      "@test/*": ["./test/*"],
      "@typechain/*": ["./typechain-types/*"],
      "@artifacts/*": ["./artifacts/*"]
    }
  }
}
```

### 2. VSCode设置增强

`.vscode/settings.json` 中包含以下JavaScript增强配置：

```json
{
  "javascript.suggest.autoImports": true,
  "javascript.updateImportsOnFileMove.enabled": "always",
  "javascript.preferences.includePackageJsonAutoImports": "on",
  "javascript.suggest.completeFunctionCalls": true,
  "javascript.suggest.names": true,
  "javascript.suggest.paths": true,
  "javascript.suggest.enabled": true,
  "editor.gotoLocation.multipleReferences": "peek",
  "editor.gotoLocation.multipleDefinitions": "peek"
}
```

## 🎯 使用方法

### 1. 基本导航

#### 跳转到函数定义
```javascript
// 按住 Ctrl 并点击函数名，或按 F12
function deployContract() {
    return deploy(); // Ctrl+Click 跳转到 deploy 函数定义
}
```

#### 跳转到变量声明
```javascript
// 将光标放在变量名上，按 F12
const contractAddress = "0x123...";
console.log(contractAddress); // Ctrl+Click 跳转到变量声明
```

#### 模块导入跳转
```javascript
// Ctrl+Click 跳转到导入的模块文件
const { ethers } = require("hardhat");
const config = require("./config.js"); // 跳转到 config.js
```

### 2. 高级导航

#### 查找所有引用
```javascript
// 将光标放在函数名上，按 Shift+F12
function transfer(to, amount) {
    // 会显示所有调用 transfer 的位置
}
```

#### 重命名符号
```javascript
// 将光标放在变量名上，按 F2
const tokenAddress = "0x123..."; // F2 重命名会更新所有引用
```

#### 路径智能感知
```javascript
// 输入相对路径时会自动提示
const helper = require("./utils/"); // 自动完成文件路径
```

### 3. 智能提示功能

#### 函数参数提示
```javascript
// 调用函数时显示参数信息
ethers.getContract("USDXToken", // 显示参数类型和说明
```

#### 自动导入
```javascript
// 使用未导入的模块时会自动建议导入
hre.ethers.getSigners(); // 自动建议导入 hre
```

## 📁 项目结构映射

### 路径别名配置

| 别名           | 实际路径                      | 用途         |
| -------------- | ----------------------------- | ------------ |
| `@contracts/*` | `contracts/*`                 | 合约相关文件 |
| `@scripts/*`   | `scripts/*`                   | 脚本文件     |
| `@test/*`      | `contracts/test/*`            | 测试文件     |
| `@typechain/*` | `contracts/typechain-types/*` | 类型定义     |
| `@artifacts/*` | `contracts/artifacts/*`       | 编译产物     |

### 使用示例

```javascript
// 使用路径别名
const deployScript = require("@scripts/deploy");
const TestContract = require("@test/helpers/contracts");
const { USDXToken } = require("@typechain/USDXToken");
```

## 🛠️ 故障排除

### 1. 代码跳转不工作

**可能原因和解决方案：**

1. **TypeScript扩展未启用**
   ```bash
   # 确保安装了 TypeScript 扩展
   code --install-extension ms-vscode.vscode-typescript-next
   ```

2. **jsconfig.json 配置错误**
   ```bash
   # 检查 JSON 语法是否正确
   cd contracts
   node -e "console.log(JSON.parse(require('fs').readFileSync('jsconfig.json', 'utf8')))"
   ```

3. **缓存问题**
   ```bash
   # 重新启动 TypeScript 语言服务
   # 在VSCode中按 Ctrl+Shift+P
   # 输入 "TypeScript: Restart TS Server"
   ```

### 2. 智能提示不准确

1. **重新加载窗口**
   ```bash
   # 在VSCode中按 Ctrl+Shift+P
   # 输入 "Developer: Reload Window"
   ```

2. **清除缓存**
   ```bash
   # 删除 VSCode 缓存
   rm -rf .vscode/settings.json.backup
   ```

3. **检查依赖**
   ```bash
   cd contracts
   npm install
   ```

### 3. 路径别名不工作

1. **检查baseUrl设置**
   ```json
   // jsconfig.json
   {
     "compilerOptions": {
       "baseUrl": "./"  // 确保基础路径正确
     }
   }
   ```

2. **检查路径映射**
   ```json
   // 确保路径映射正确
   {
     "paths": {
       "@scripts/*": ["./scripts/*"]  // 注意相对路径
     }
   }
   ```

## 📊 性能优化

### 1. 提高响应速度

```json
// .vscode/settings.json
{
  "typescript.suggest.autoImports": true,
  "javascript.suggest.autoImports": true,
  "editor.quickSuggestions": {
    "strings": true,
    "comments": false,
    "other": true
  }
}
```

### 2. 减少内存使用

```json
// jsconfig.json
{
  "exclude": [
    "node_modules",
    "cache",
    "artifacts",
    "coverage",
    "dist"
  ]
}
```

## 🔍 调试技巧

### 1. 启用详细日志

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true
}
```

### 2. 检查语言服务状态

1. 打开命令面板 (`Ctrl+Shift+P`)
2. 输入 "TypeScript: Open TS Server Log"
3. 查看语言服务日志

### 3. 验证配置

```bash
# 检查 jsconfig.json 语法
cd contracts
node -pe "JSON.parse(require('fs').readFileSync('jsconfig.json', 'utf8'))"

# 检查 Node.js 版本
node --version  # 应该 >= 18.0.0
```

## 📝 最佳实践

### 1. 代码组织

```javascript
// 良好的导入组织有助于跳转
const { ethers } = require("hardhat");
const { expect } = require("chai");

// 本地导入
const { deployContract } = require("./helpers/deploy");
const config = require("./config");
```

### 2. 使用JSDoc注释

```javascript
/**
 * 部署合约到指定网络
 * @param {string} contractName - 合约名称
 * @param {Array} args - 构造函数参数
 * @returns {Promise<Contract>} 部署的合约实例
 */
async function deployContract(contractName, args = []) {
    // 悬停时会显示这些注释
}
```

### 3. 使用有意义的名称

```javascript
// 好的命名有助于代码导航
const tokenContract = await ethers.getContract("USDXToken");
const governanceContract = await ethers.getContract("USDXGovernance");
```

## 🎮 快捷键参考

| 功能           | 快捷键                | 说明                   |
| -------------- | --------------------- | ---------------------- |
| 跳转到定义     | `F12` 或 `Ctrl+Click` | 跳转到符号定义         |
| 查看定义       | `Alt+F12`             | 在弹窗中预览定义       |
| 查找所有引用   | `Shift+F12`           | 查找符号的所有使用位置 |
| 重命名符号     | `F2`                  | 重命名变量、函数等     |
| 格式化文档     | `Shift+Alt+F`         | 格式化当前文档         |
| 快速修复       | `Ctrl+.`              | 显示可用的快速修复     |
| 查看问题       | `Ctrl+Shift+M`        | 显示错误和警告         |
| 符号搜索       | `Ctrl+Shift+O`        | 在当前文件中搜索符号   |
| 工作区符号搜索 | `Ctrl+T`              | 在整个工作区中搜索符号 |

## 🔄 测试和验证

### 1. 基本功能测试

```javascript
// 在 contracts/scripts/deploy.js 中测试
const { ethers } = require("hardhat"); // Ctrl+Click 应该跳转到 hardhat 模块

async function main() {
    const USDXToken = await ethers.getContractFactory("USDXToken"); // 测试智能提示
    console.log("Deploying..."); // F12 应该跳转到 console 定义
}
```

### 2. 路径别名测试

```javascript
// 测试路径别名功能
const helper = require("@scripts/helpers"); // 应该自动解析路径
const testUtil = require("@test/utils"); // 应该自动解析路径
```

### 3. 智能提示测试

```javascript
// 测试参数提示
ethers.getContract(/* 应该显示参数提示 */);
```

## 📞 获取帮助

如果遇到问题，可以：

1. 检查 [VSCode JavaScript文档](https://code.visualstudio.com/docs/languages/javascript)
2. 查看 [TypeScript配置参考](https://www.typescriptlang.org/tsconfig)
3. 在项目Issues中报告问题

---

✅ **配置完成！** 现在您可以享受完整的JavaScript代码跳转功能了。 
