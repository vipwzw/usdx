# Solidity单步调试指南

## 概述

本指南详细介绍如何在USDX项目中进行Solidity智能合约的单步调试，包括多种调试方法和工具的使用。

## 🔧 调试方法概览

### 1. Hardhat内置调试器 (推荐)
- **优点**: 功能强大，支持单步调试、变量检查、堆栈跟踪
- **适用**: 交易执行后的调试分析
- **使用**: 通过交易哈希进行调试
********
### 2. Console.log调试
- **优点**: 简单直观，实时输出
- **适用**: 开发阶段的快速调试
- **使用**: 在Solidity代码中添加console.log语句

### 3. VSCode集成调试
- **优点**: 图形化界面，与开发环境集成
- **适用**: JavaScript测试代码的调试
- **使用**: 通过VSCode调试面板

### 4. Remix IDE调试
- **优点**: 在线调试，无需本地环境
- **适用**: 快速测试和调试
- **使用**: 在Remix IDE中部署和调试

## 📖 Hardhat内置调试器详解

### 启动调试会话

1. **获取交易哈希**
   ```bash
   # 运行调试演示脚本获取交易哈希
   cd contracts
   node scripts/debug-solidity-demo.js
   ```

2. **启动调试器**
   ```bash
   # 使用交易哈希启动调试
   npx hardhat debug <transaction_hash>
   ```

### 调试器命令详解

| 命令               | 功能     | 说明                           |
| ------------------ | -------- | ------------------------------ |
| `n` (next)         | 下一步   | 执行下一行代码，不进入函数内部 |
| `s` (step)         | 进入函数 | 进入函数内部进行调试           |
| `o` (step out)     | 跳出函数 | 执行完当前函数并返回调用点     |
| `c` (continue)     | 继续执行 | 继续执行直到下一个断点或结束   |
| `p <variable>`     | 打印变量 | 显示变量的当前值               |
| `st` (stack trace) | 堆栈跟踪 | 显示当前的函数调用堆栈         |
| `l` (list)         | 显示代码 | 显示当前执行位置的代码         |
| `h` (help)         | 帮助     | 显示所有可用命令               |
| `q` (quit)         | 退出     | 退出调试会话                   |

### 调试会话示例

```bash
# 启动调试会话
$ npx hardhat debug 0x1234...

# 调试器输出
Hardhat Debugger (v2.17.2)

Transaction: 0x1234...
Block: 1
Gas used: 89,234

> Debugging USDXToken.transfer(address,uint256) (contracts/src/USDXToken.sol:150)

  148:     function transfer(address to, uint256 amount) public override returns (bool) {
  149:         address owner = _msgSender();
> 150:         _transfer(owner, to, amount);
  151:         return true;
  152:     }

# 调试命令示例
debug(main)> p to
0x70997970C51812dc3A010C7d01b50e0d17dc79C8

debug(main)> p amount
1000000000

debug(main)> s  # 进入_transfer函数
> 200:     function _transfer(address from, address to, uint256 amount) internal {

debug(main)> n  # 下一步
> 201:         require(from != address(0), "ERC20: transfer from the zero address");

debug(main)> c  # 继续执行
Transaction completed successfully.
```

## 📝 Console.log调试

### 在Solidity中使用Console.log

1. **导入console库**
   ```solidity
   import "hardhat/console.sol";
   ```

2. **添加调试输出**
   ```solidity
   function transfer(address to, uint256 amount) public override returns (bool) {
       console.log("=== Transfer Debug ===");
       console.log("From:", msg.sender);
       console.log("To:", to);
       console.log("Amount:", amount);
       console.log("Sender Balance:", balanceOf(msg.sender));
       
       // 执行转账逻辑
       bool result = super.transfer(to, amount);
       
       console.log("Transfer Result:", result);
       console.log("=== Transfer End ===");
       
       return result;
   }
   ```

3. **运行带有console输出的测试**
   ```bash
   # 运行测试查看console输出
   npm test
   
   # 或者运行特定测试文件
   npx hardhat test test/USDXToken.test.js
   ```

### Console.log最佳实践

- **使用有意义的标识符**
  ```solidity
  console.log("=== Function Name ===");
  console.log("Parameter:", value);
  console.log("=== Function End ===");
  ```

- **记录关键状态变化**
  ```solidity
  console.log("Before operation - Balance:", balanceOf(account));
  // 执行操作
  console.log("After operation - Balance:", balanceOf(account));
  ```

- **条件调试输出**
  ```solidity
  if (DEBUG_MODE) {
      console.log("Debug info:", value);
  }
  ```

## 🎯 VSCode集成调试

### 调试配置说明

项目已预配置以下VSCode调试选项：

1. **Debug Solidity Demo** - 调试Solidity演示脚本
2. **Debug Test with Console Output** - 带详细输出的测试调试
3. **Hardhat Test Debug** - 基本测试调试

### 使用VSCode调试

1. **设置断点**
   - 在JavaScript测试文件中点击行号左侧设置断点
   - 在合约交互代码处设置断点

2. **启动调试**
   - 按 `F5` 或点击调试面板的开始按钮
   - 选择适当的调试配置

3. **调试操作**
   - `F10` - 单步执行
   - `F11` - 进入函数
   - `Shift+F11` - 跳出函数
   - `F5` - 继续执行

### 调试示例

```javascript
// test/debug-example.test.js
describe("Debug Example", () => {
    it("Should debug token transfer", async () => {
        // 在这里设置断点
        const [owner, addr1] = await ethers.getSigners();
        
        // 部署合约
        const Token = await ethers.getContractFactory("USDXToken");
        const token = await Token.deploy();
        
        // 设置断点检查合约状态
        console.log("Token address:", await token.getAddress());
        
        // 执行交易 - 设置断点调试
        const tx = await token.transfer(addr1.address, 1000);
        await tx.wait();
        
        // 检查结果 - 设置断点
        const balance = await token.balanceOf(addr1.address);
        expect(balance).to.equal(1000);
    });
});
```

## 🌐 Remix IDE调试

### 使用Remix进行调试

1. **打开Remix IDE**
   - 访问 https://remix.ethereum.org

2. **上传合约代码**
   - 创建新文件并复制合约代码
   - 或使用GitHub插件导入

3. **编译合约**
   - 选择正确的Solidity版本 (0.8.22)
   - 编译合约

4. **部署和调试**
   - 部署合约到JavaScript VM
   - 执行交易
   - 使用调试器分析交易

### Remix调试功能

- **调试面板**: 显示操作码、堆栈、内存
- **单步执行**: 逐步执行操作码
- **状态检查**: 查看存储状态变化
- **Gas分析**: 分析Gas使用情况

## 🛠️ 调试工具和脚本

### 1. 调试演示脚本

```bash
# 运行Solidity调试演示
cd contracts
node scripts/debug-solidity-demo.js
```

该脚本会：
- 部署合约
- 执行各种交易
- 输出交易哈希用于调试
- 提供调试命令指南

### 2. 调试版本合约

项目包含 `DebugUSDXToken.sol`，带有详细的console.log输出：

```bash
# 使用调试版本合约进行测试
# 在测试中使用 DebugUSDXToken 替代 USDXToken
```

### 3. 快速调试脚本

```bash
# 创建快速调试脚本
cd contracts
cat > quick-debug.js << 'EOF'
const { ethers } = require('hardhat');

async function quickDebug() {
    const [owner, addr1] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('USDXToken');
    const token = await Token.deploy();
    
    // 在这里添加你的调试代码
    console.log('Ready for debugging...');
}

quickDebug().catch(console.error);
EOF

# 运行快速调试
node quick-debug.js
```

## 🔍 高级调试技巧

### 1. 条件断点调试

```solidity
// 使用require作为条件断点
function debugFunction(uint256 value) public {
    if (value > 1000) {
        console.log("High value detected:", value);
        // 在这里可以添加更多调试信息
    }
}
```

### 2. 事件调试

```solidity
event DebugEvent(string message, uint256 value, address addr);

function debugWithEvent(uint256 value) public {
    emit DebugEvent("Function called", value, msg.sender);
    // 函数逻辑
}
```

### 3. 状态快照

```javascript
// 在测试中创建状态快照
const snapshot = await network.provider.send("evm_snapshot");

// 执行操作
await contract.someFunction();

// 恢复状态
await network.provider.send("evm_revert", [snapshot]);
```

### 4. Gas使用分析

```javascript
// 分析Gas使用
const tx = await contract.transfer(addr, amount);
const receipt = await tx.wait();
console.log("Gas used:", receipt.gasUsed.toString());
```

## 📊 调试最佳实践

### 1. 结构化调试信息

```solidity
function debugTransfer(address to, uint256 amount) public {
    console.log("=== TRANSFER START ===");
    console.log("Timestamp:", block.timestamp);
    console.log("Block Number:", block.number);
    console.log("Sender:", msg.sender);
    console.log("Recipient:", to);
    console.log("Amount:", amount);
    console.log("Sender Balance Before:", balanceOf(msg.sender));
    console.log("Recipient Balance Before:", balanceOf(to));
    
    // 执行转账
    _transfer(msg.sender, to, amount);
    
    console.log("Sender Balance After:", balanceOf(msg.sender));
    console.log("Recipient Balance After:", balanceOf(to));
    console.log("=== TRANSFER END ===");
}
```

### 2. 错误追踪

```solidity
function debugWithErrorHandling() public {
    try this.riskyOperation() {
        console.log("Operation succeeded");
    } catch Error(string memory reason) {
        console.log("Error:", reason);
    } catch (bytes memory lowLevelData) {
        console.log("Low level error occurred");
        console.logBytes(lowLevelData);
    }
}
```

### 3. 状态验证

```solidity
modifier debugState() {
    console.log("=== STATE BEFORE ===");
    logCurrentState();
    _;
    console.log("=== STATE AFTER ===");
    logCurrentState();
}

function logCurrentState() private view {
    console.log("Total Supply:", totalSupply());
    console.log("Contract Paused:", paused());
    console.log("Owner:", owner());
}
```

## 🚀 快速开始调试

### 方法1: 使用演示脚本

```bash
# 1. 启动本地网络
npm run start

# 2. 在新终端运行演示脚本
cd contracts
node scripts/debug-solidity-demo.js

# 3. 复制输出的交易哈希
# 4. 使用Hardhat调试器
npx hardhat debug <transaction_hash>
```

### 方法2: 使用VSCode调试

```bash
# 1. 打开VSCode
code .

# 2. 打开测试文件
code contracts/test/USDXToken.test.js

# 3. 设置断点
# 4. 按F5启动调试，选择"Debug Test with Console Output"
```

### 方法3: 快速Console.log调试

```bash
# 1. 在合约中添加console.log
# 2. 重新编译
npm run compile

# 3. 运行测试查看输出
npm test
```

## 📋 调试检查清单

- [ ] 合约编译无错误
- [ ] 本地网络正在运行
- [ ] 测试账户有足够ETH
- [ ] 已设置适当的断点或日志
- [ ] 了解要调试的交易类型
- [ ] 准备好相关的调试命令

## 🔗 相关资源

- [Hardhat调试器文档](https://hardhat.org/tutorial/debugging-with-hardhat-network)
- [Solidity Console.log文档](https://hardhat.org/hardhat-network/reference/#console.log)
- [VSCode调试指南](../JAVASCRIPT_DEBUG_GUIDE.md)
- [Remix IDE](https://remix.ethereum.org)

## 🎯 总结

Solidity调试是智能合约开发的重要技能：

1. **Hardhat调试器** - 最强大的调试工具，支持完整的单步调试
2. **Console.log** - 快速简单的调试方法
3. **VSCode集成** - 友好的图形界面调试
4. **Remix IDE** - 在线调试和测试

选择合适的调试方法根据你的需求：
- **开发阶段** → Console.log
- **深度调试** → Hardhat调试器  
- **测试调试** → VSCode集成
- **快速验证** → Remix IDE

掌握这些调试技巧将大大提升你的Solidity开发效率和代码质量！ 
