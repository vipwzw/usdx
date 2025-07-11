# JavaScript调试指南

## 概述

本指南详细介绍如何在USDX项目中调试JavaScript代码，包括测试文件、脚本文件和Hardhat任务。

## 调试配置

项目已经预配置了以下调试配置（`.vscode/launch.json`）：

### 1. Hardhat Test Debug - 调试测试文件
```json
{
  "name": "Hardhat Test Debug",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/contracts/node_modules/.bin/hardhat",
  "args": ["test", "test/${fileBasename}"],
  "cwd": "${workspaceFolder}/contracts"
}
```

**用途**: 调试单个测试文件（仅限test目录下的文件）
**使用方法**: 
1. 打开要调试的测试文件（如 `contracts/test/USDXToken.test.js`）
2. 在代码中设置断点（点击行号左侧）
3. 按 `F5` 或点击调试面板的"开始调试"
4. 选择 "Hardhat Test Debug"

**注意**: 此配置专为 `contracts/test/` 目录下的测试文件设计

### 2. Deploy Script Debug - 调试部署脚本
```json
{
  "name": "Deploy Script Debug",
  "type": "node", 
  "request": "launch",
  "program": "${workspaceFolder}/contracts/node_modules/.bin/hardhat",
  "args": ["run", "scripts/${fileBasename}", "--network", "localhost"]
}
```

**用途**: 调试部署和其他Hardhat脚本（仅限scripts目录下的文件）
**使用方法**:
1. 确保本地网络运行: `npm run start`
2. 打开脚本文件（如 `contracts/scripts/deploy.js`）
3. 设置断点
4. 选择 "Deploy Script Debug" 配置调试

**注意**: 此配置专为 `contracts/scripts/` 目录下的脚本文件设计

### 3. Current Node.js File - 调试当前文件
```json
{
  "name": "Current Node.js File",
  "type": "node",
  "request": "launch", 
  "program": "${file}",
  "cwd": "${workspaceFolder}/contracts"
}
```

**用途**: 直接调试当前打开的JavaScript文件
**使用方法**: 适用于独立的JavaScript文件

### 4. Debug Test (Simple) - 手动指定测试文件
**用途**: 手动输入测试文件路径进行调试
**使用方法**: 
1. 按 `F5` 启动调试
2. 选择 "Debug Test (Simple)"
3. 输入测试文件路径（如: `test/USDXToken.test.js`）
4. 可选择性输入测试用例匹配模式

### 5. Hardhat Node - 启动本地节点
**用途**: 启动本地Hardhat网络进行调试

### 6. Hardhat Compile - 编译调试
**用途**: 调试编译过程中的问题

## 调试操作步骤

### 调试测试文件
1. **打开测试文件**
   ```bash
   # 导航到测试文件
   code contracts/test/USDXToken.test.js
   ```

2. **设置断点**
   - 点击行号左侧设置断点
   - 断点会显示为红色圆点

3. **开始调试**
   - 按 `F5` 启动调试
   - 或使用 `Ctrl+Shift+D` 打开调试面板
   - 选择调试配置：
     - **"Hardhat Test Debug"** - 自动调试当前打开的测试文件
     - **"Debug Test (Simple)"** - 手动输入测试文件路径

4. **调试控制**
   - `F10` - 单步执行（Step Over）
   - `F11` - 进入函数（Step Into）
   - `Shift+F11` - 跳出函数（Step Out）
   - `F5` - 继续执行
   - `Shift+F5` - 停止调试

### ⚠️ 重要提示
- **"Hardhat Test Debug"** 仅适用于 `contracts/test/` 目录下的文件
- **"Deploy Script Debug"** 仅适用于 `contracts/scripts/` 目录下的文件  
- 如果文件不在预期目录下，请使用 **"Debug Test (Simple)"** 并手动输入路径

### 调试部署脚本

1. **启动本地网络**
   ```bash
   cd contracts
   npm run start  # 或 npm run node
   ```

2. **打开部署脚本**
   ```bash
   code contracts/scripts/deploy.js
   ```

3. **设置断点并调试**
   - 在关键代码行设置断点
   - 选择 "Deploy Script Debug" 配置
   - 按 `F5` 开始调试

### 调试其他脚本

1. **监控脚本调试**
   ```bash
   code contracts/scripts/monitor.js
   ```

2. **安全检查脚本调试**
   ```bash
   code contracts/scripts/security-check.js
   ```

3. **Gas报告脚本调试**
   ```bash
   code contracts/scripts/generate-gas-report.js
   ```

## 调试技巧

### 1. 条件断点
- 右键点击断点 → "编辑断点"
- 设置条件表达式，如 `i > 5`
- 只有满足条件时才会暂停

### 2. 日志断点
- 右键点击断点 → "编辑断点"
- 选择"日志断点"
- 输出信息到调试控制台而不暂停执行

### 3. 观察变量
- 在调试面板的"监视"部分添加变量
- 实时查看变量值变化

### 4. 调用堆栈
- 查看函数调用链
- 点击堆栈帧跳转到对应代码

### 5. 变量面板
- 查看当前作用域内的所有变量
- 展开对象查看详细属性

## 常用调试场景

### 调试合约交互
```javascript
// 在测试或脚本中设置断点
const tx = await usdxToken.transfer(recipient, amount);
console.log("Transaction:", tx); // 设置断点这里
const receipt = await tx.wait();
console.log("Receipt:", receipt); // 设置断点这里
```

### 调试异步函数
```javascript
// 设置断点调试Promise链
async function deployContract() {
  const factory = await ethers.getContractFactory("USDXToken");
  console.log("Factory created"); // 断点1
  
  const contract = await factory.deploy();
  console.log("Contract deployed"); // 断点2
  
  await contract.deployed();
  console.log("Contract confirmed"); // 断点3
  
  return contract;
}
```

### 调试错误处理
```javascript
try {
  const result = await contract.someFunction();
  console.log("Success:", result); // 断点1
} catch (error) {
  console.error("Error occurred:", error); // 断点2
  // 在这里分析错误原因
}
```

## 调试输出

### 使用console.log
```javascript
console.log("变量值:", variable);
console.log("对象:", JSON.stringify(object, null, 2));
console.table(array); // 表格形式显示数组
```

### 使用debug模块
```javascript
const debug = require('debug')('app:deploy');
debug('部署开始', { contractName, args });
```

## 性能调试

### 测量执行时间
```javascript
console.time('部署合约');
const contract = await deployContract();
console.timeEnd('部署合约');
```

### 内存使用分析
```javascript
const used = process.memoryUsage();
console.log('内存使用:', {
  rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + ' MB',
  heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + ' MB',
  heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + ' MB'
});
```

## 调试环境变量

创建调试专用的环境配置：

```bash
# .env.debug
NODE_ENV=debug
DEBUG=*
HARDHAT_VERBOSE=true
REPORT_GAS=true
```

## 常见问题解决

### 1. 断点不生效
- 确保源映射正确
- 检查文件路径是否正确
- 重新启动调试会话

### 2. 调试会话启动失败
- 检查 `package.json` 中的依赖
- 确保在正确的目录下
- 检查网络配置

### 3. 无法查看变量值
- 确保在正确的作用域内
- 检查变量是否已声明
- 使用 "监视" 面板添加表达式

## 快捷键汇总

| 快捷键          | 功能              |
| --------------- | ----------------- |
| `F5`            | 开始调试/继续执行 |
| `Shift+F5`      | 停止调试          |
| `Ctrl+Shift+F5` | 重启调试          |
| `F9`            | 切换断点          |
| `F10`           | 单步执行（越过）  |
| `F11`           | 单步执行（进入）  |
| `Shift+F11`     | 单步执行（跳出）  |
| `Ctrl+Shift+D`  | 打开调试面板      |

## 高级调试

### 调试配置自定义
如需自定义调试配置，可以修改 `.vscode/launch.json`：

```json
{
  "name": "自定义调试配置",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/contracts/scripts/your-script.js",
  "args": ["--custom-arg"],
  "env": {
    "NODE_ENV": "debug",
    "CUSTOM_VAR": "value"
  },
  "console": "integratedTerminal"
}
```

### 远程调试
如需远程调试，可以配置附加到运行中的进程：

```json
{
  "name": "附加到进程",
  "type": "node",
  "request": "attach",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}/contracts",
  "remoteRoot": "/app"
}
```

## 快速启动脚本

项目提供了方便的启动脚本来简化调试流程：

### Linux/macOS
```bash
# 启动交互式调试环境
./scripts/start-debug.sh
```

### Windows
```cmd
# 启动交互式调试环境
scripts\start-debug.bat
```

### npm脚本命令

在 `contracts` 目录下可以使用以下npm命令：

```bash
# 运行调试演示（直接执行）
npm run debug:demo

# 启动调试演示（等待调试器连接）
npm run debug

# 调试测试（等待调试器连接）
npm run debug:test

# 调试部署脚本（等待调试器连接）
npm run debug:deploy
```

## 调试演示脚本

项目包含一个完整的调试演示脚本 `scripts/debug-demo.js`，展示了各种调试场景：

### 演示内容

1. **合约部署调试** - 演示如何调试合约部署过程
2. **数据处理调试** - 演示数据转换和处理过程
3. **错误处理调试** - 演示try-catch错误处理
4. **性能监控调试** - 演示内存使用和性能分析
5. **条件断点演示** - 演示高级断点技巧

### 使用演示脚本

1. **打开演示文件**
   ```bash
   code contracts/scripts/debug-demo.js
   ```

2. **设置断点**
   - 文件中有16个推荐断点位置
   - 每个断点都有详细注释说明

3. **开始调试**
   - 按 `F5` 启动调试
   - 选择 "Current Node.js File" 配置

4. **体验调试功能**
   - 单步执行查看变量值
   - 使用条件断点
   - 观察调用堆栈
   - 监控内存使用

### 演示脚本功能

```javascript
// 示例: 在这些位置设置断点体验调试
const deployResult = await deployContractDemo(); // 断点1
const dataResult = processDataDemo();            // 断点2
const errorResult = await errorHandlingDemo();   // 断点3
const perfResult = performanceDemo();            // 断点4
```

## 环境配置文件

调试环境使用专用配置文件 `contracts/.env.debug`：

```bash
# 调试环境配置
NODE_ENV=debug
DEBUG=*
HARDHAT_VERBOSE=true
REPORT_GAS=true
ENABLE_PROFILING=true
MEMORY_TRACKING=true
```

这个配置文件会：
- 启用详细日志输出
- 开启性能分析
- 显示Gas使用情况
- 启用内存跟踪

## 总结

通过合理使用VSCode的调试功能，可以大大提高JavaScript开发效率：

1. **预设断点** - 在关键代码位置设置断点
2. **使用调试配置** - 根据调试目标选择合适的配置
3. **观察变量** - 实时监控变量状态
4. **分析调用栈** - 理解代码执行流程
5. **性能分析** - 识别性能瓶颈
6. **使用演示脚本** - 通过实际示例学习调试技巧

### 调试最佳实践

1. **从演示脚本开始** - 先熟悉调试基本操作
2. **合理设置断点** - 不要设置过多断点
3. **使用条件断点** - 避免在循环中反复暂停
4. **监控内存使用** - 及时发现内存泄漏
5. **查看调用堆栈** - 理解代码执行路径
6. **使用快速启动脚本** - 提高调试效率

调试是开发过程中的重要技能，熟练掌握这些技巧将显著提升代码质量和开发体验。 
