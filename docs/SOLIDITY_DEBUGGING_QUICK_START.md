# Solidity调试快速入门指南

## 🚀 快速回答：可以设置断点吗？

**❌ 不能直接在.sol文件中设置断点**  
**✅ 可以在JavaScript测试中设置断点，间接调试合约**

## 📍 推荐调试方法

### 1. Console.log调试（最简单有效）

```solidity
// 在合约中添加
import "hardhat/console.sol";

function transfer(address to, uint256 amount) public override returns (bool) {
    console.log("=== Transfer Debug ===");
    console.log("From:", msg.sender);
    console.log("To:", to); 
    console.log("Amount:", amount);
    console.log("Balance:", balanceOf(msg.sender));
    
    // 执行转账逻辑...
    
    console.log("Transfer successful");
    return true;
}
```

### 2. VSCode断点调试（在测试文件中）

```javascript
// test/Debug.test.js
describe("Transfer Debug", function() {
    it("should debug transfer", async function() {
        // 🎯 设置断点这里 - 查看初始状态
        const balanceBefore = await token.balanceOf(deployer.address);
        
        // 🎯 设置断点这里 - 执行前
        await token.setKYCVerified(user1.address, true);
        
        // 🎯 设置断点这里 - 转账执行
        const tx = await token.transfer(user1.address, amount);
        
        // 🎯 设置断点这里 - 查看结果
        const balanceAfter = await token.balanceOf(deployer.address);
    });
});
```

### 3. 限制检查调试

```javascript
// 调试ERC-1404限制
const restrictionCode = await token.detectTransferRestriction(from, to, amount);
const message = await token.messageForTransferRestriction(restrictionCode);
console.log(`限制检查: 代码${restrictionCode} - ${message}`);
```

## 🎯 快速开始步骤

### 步骤1：运行演示
```bash
cd contracts
npm test test/SolidityDebugDemo.test.js
```

### 步骤2：在VSCode中设置断点调试
1. 打开 `test/SolidityDebugDemo.test.js`
2. 在有 `🎯` 标记的行设置断点
3. 按F5启动调试
4. 观察变量和调用栈

### 步骤3：查看Console.log输出
```bash
# 运行单个测试，查看详细输出
npm test test/SolidityDebugDemo.test.js --grep "Console.log"
```

## 📊 调试方法对比

| 方法        | 难度 | 效果  | 适用场景             |
| ----------- | ---- | ----- | -------------------- |
| Console.log | ⭐    | ⭐⭐⭐⭐⭐ | 日常开发，逻辑调试   |
| VSCode断点  | ⭐⭐   | ⭐⭐⭐⭐  | 复杂流程，状态检查   |
| 事件日志    | ⭐⭐   | ⭐⭐⭐   | 状态追踪，历史记录   |
| 断言验证    | ⭐    | ⭐⭐⭐   | 自动化测试，回归检查 |
| Remix调试   | ⭐⭐⭐  | ⭐⭐⭐⭐  | 深度分析，字节码调试 |

## 🔥 实用技巧

### 条件调试
```solidity
bool private constant DEBUG = true; // 开发环境true，生产环境false

function debugLog(string memory message, uint256 value) private {
    if (DEBUG) {
        console.log(message, value);
    }
}
```

### 状态快照
```javascript
async function logState(token, accounts) {
    console.log("=== 状态快照 ===");
    for(let account of accounts) {
        const balance = await token.balanceOf(account.address);
        const isKYC = await token.isKYCVerified(account.address);
        console.log(`${account.address}: 余额=${balance}, KYC=${isKYC}`);
    }
}
```

### 交易分析
```javascript
const tx = await token.transfer(to, amount);
const receipt = await tx.wait();
console.log("交易详情:");
console.log("  哈希:", tx.hash);
console.log("  Gas使用:", receipt.gasUsed.toString());
console.log("  Gas价格:", tx.gasPrice?.toString());
```

## 📚 相关文档

- 📖 [完整调试指南](./SOLIDITY_DEBUGGING_METHODS.md)
- 🛠️ [JavaScript调试配置](../docs/JAVASCRIPT_DEBUG_GUIDE.md)
- 🎯 [演示测试文件](../test/SolidityDebugDemo.test.js)

## ❓ 常见问题

**Q: 为什么不能直接在.sol文件设置断点？**  
A: Solidity编译为字节码运行，缺乏源码映射，编辑器无法直接调试。

**Q: Console.log会影响生产环境吗？**  
A: 是的，会增加gas成本，生产部署前需要移除。

**Q: 哪种调试方法最有效？**  
A: Console.log + VSCode测试断点的组合最实用。

**Q: 可以调试合约内部状态吗？**  
A: 可以通过Console.log输出内部变量，或在测试中查询公开函数。 
