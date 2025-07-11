# Gas报告生成器使用指南

## 概述

本项目包含一个专门的Gas报告生成器，用于生成清洁、可读的智能合约Gas使用报告。该工具解决了传统hardhat gas-reporter输出中的乱码问题，提供了格式化的markdown表格输出。

## 功能特性

### 🔧 核心功能
- **自动清理乱码**: 去除ANSI颜色控制字符和特殊符号
- **智能数据提取**: 从测试输出中准确提取gas使用数据
- **格式化输出**: 生成标准markdown表格格式
- **中文界面**: 友好的中文字段名和说明
- **分类显示**: 分别显示方法调用和部署gas消耗

### 📊 报告内容
- **方法调用Gas消耗**: 每个合约方法的详细gas统计
- **部署Gas消耗**: 合约部署的gas使用情况
- **详细说明**: 各字段含义的说明

## 使用方法

### 1. 本地运行

```bash
# 进入contracts目录
cd contracts

# 生成gas报告
npm run gas:report

# 或者直接运行脚本
node scripts/generate-gas-report.js
```

### 2. CI/CD自动化

Gas报告生成器已经集成到GitHub Actions工作流中，会在每次PR时自动生成并发布gas报告评论。

## 配置要求

### 依赖项
- Node.js >= 18.0.0
- Hardhat
- hardhat-gas-reporter插件

### 环境变量
- `REPORT_GAS=true`: 启用gas报告
- `NO_COLOR=1`: 禁用颜色输出
- `FORCE_COLOR=0`: 强制禁用颜色

## 输出格式

### 示例输出

```markdown
📊 Gas使用报告

## 📋 合约方法调用Gas消耗

| 合约           | 方法                                  | 最小值 | 最大值 | 平均值 | 调用次数 |
| -------------- | ------------------------------------- | ------ | ------ | ------ | -------- |
| USDXToken      | transfer(address,uint256)             | 71029  | 132042 | 100721 | 13       |
| USDXToken      | mint(address,uint256)                 | 72773  | 72785  | 72781  | 19       |
| USDXGovernance | propose(address,uint256,bytes,string) | 176709 | 244587 | 186382 | 38       |

## 🚀 合约部署Gas消耗

| 合约           | Gas消耗 | 区块限制占比 |
| -------------- | ------- | ------------ |
| USDXToken      | 3473876 | 28.9 %       |
| USDXGovernance | 2805836 | 23.4 %       |

## 📝 说明
- **最小值**: 该方法调用的最低gas消耗
- **最大值**: 该方法调用的最高gas消耗
- **平均值**: 该方法调用的平均gas消耗
- **调用次数**: 测试中该方法的调用次数
- **区块限制占比**: 部署gas占区块gas限制的百分比
```

## 脚本结构

### 主要文件
- `contracts/scripts/generate-gas-report.js`: 主脚本文件
- `contracts/package.json`: 包含`gas:report`脚本命令
- `.github/workflows/ci.yml`: CI/CD集成配置

### 核心函数
- `generateGasReport()`: 主生成函数
- `extractAndFormatGasReport()`: 提取和格式化数据
- `parseGasDataLines()`: 解析gas数据行
- `formatGasReport()`: 格式化输出
- `createFallbackReport()`: 生成备用报告

## 故障排除

### 常见问题

**1. 生成的报告为空**
```bash
# 检查测试是否正常运行
npm test

# 检查gas reporter配置
grep -r "gas-reporter" hardhat.config.js
```

**2. 数据格式错误**
```bash
# 检查环境变量
echo $REPORT_GAS

# 手动运行测试查看原始输出
REPORT_GAS=true npx hardhat test
```

**3. 权限问题**
```bash
# 确保脚本有执行权限
chmod +x contracts/scripts/generate-gas-report.js
```

### 调试模式

开发者可以通过以下方式调试脚本：

```bash
# 查看原始测试输出
REPORT_GAS=true npx hardhat test > debug-output.txt

# 查看清理后的输出
node -e "
const fs = require('fs');
const content = fs.readFileSync('debug-output.txt', 'utf8');
const cleaned = content.replace(/\x1b\[[0-9;]*m/g, '');
fs.writeFileSync('debug-cleaned.txt', cleaned);
"
```

## 自定义配置

### 修改输出格式

如需自定义输出格式，可以修改`formatGasReport()`函数中的模板：

```javascript
// 自定义表头
const headers = ['Contract', 'Method', 'Gas Used', 'Calls'];

// 自定义分隔符
const separator = '|---|---|---|---|';
```

### 添加新的数据字段

在`parseGasDataLines()`函数中添加新的字段解析：

```javascript
const item = {
  // ... existing fields
  newField: parts[7] || '',  // 新字段
};
```

## 版本历史

- **v1.0.0**: 初始版本，基本的gas报告生成
- **v1.1.0**: 添加乱码清理功能
- **v1.2.0**: 完全重构，支持markdown表格格式
- **v1.3.0**: 添加中文界面和详细说明

## 贡献指南

如需改进gas报告生成器：

1. Fork项目
2. 创建功能分支
3. 修改`contracts/scripts/generate-gas-report.js`
4. 添加测试用例
5. 提交PR

## 许可证

MIT License - 详见项目根目录LICENSE文件。 
