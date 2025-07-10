# Git Hooks 本地CI检查配置

## 概述

本项目已配置了Git hooks来在提交代码前自动运行完整的CI检查，确保代码质量和功能正确性。

## 配置的Git Hooks

### 1. pre-commit Hook

**触发时机**: 每次执行 `git commit` 时

**检查内容**:

- 运行 `lint-staged` 自动修复暂存文件的格式问题
- 运行快速CI检查 (`npm run ci:quick`)
  - 合约编译检查
  - 代码质量检查 (Solhint + ESLint + Prettier)
  - 快速测试运行

**预期时间**: 约 30-60 秒

### 2. pre-push Hook

**触发时机**: 每次执行 `git push` 时

**检查内容**:

- 运行完整的CI检查 (`npm run ci:local`)
  - 环境检查
  - 依赖检查
  - 清理和编译
  - 代码质量检查
  - 单元测试
  - 测试覆盖率
  - 合约大小检查
  - 安全检查
  - Gas 报告

**预期时间**: 约 2-5 分钟

### 3. commit-msg Hook

**触发时机**: 每次提交时检查提交消息格式

**检查内容**: 确保提交消息遵循 Conventional Commits 格式

**支持的提交类型**:

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构代码
- `test`: 添加测试
- `chore`: 更新依赖或构建过程
- `perf`: 性能优化
- `ci`: CI/CD 相关
- `build`: 构建过程更新
- `revert`: 撤销更改

**示例**:

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve token transfer issue"
git commit -m "docs: update API documentation"
```

## 可用的CI命令

### 快速CI检查

```bash
npm run ci:quick
```

用于快速验证代码编译、格式和基本测试。

### 完整CI检查

```bash
npm run ci:local
```

运行和GitHub Actions相同的完整检查流程。

### 直接运行脚本

```bash
# 快速检查
node scripts/ci-local.js quick

# 完整检查
node scripts/ci-local.js full
```

## 跳过Git Hooks

如果需要跳过Git hooks（不推荐），可以使用：

```bash
# 跳过pre-commit hook
git commit --no-verify -m "commit message"

# 跳过pre-push hook
git push --no-verify
```

## 故障排除

### 如果pre-commit检查失败

1. 查看错误信息，修复报告的问题
2. 重新add修改的文件: `git add .`
3. 重新提交: `git commit -m "your message"`

### 如果pre-push检查失败

1. 运行 `npm run ci:local` 查看详细错误
2. 修复所有报告的问题
3. 重新推送: `git push`

### 如果commit消息格式错误

1. 按照提示修改提交消息格式
2. 使用 `git commit --amend -m "new message"` 修改最后一次提交消息

## 配置文件

- `.husky/pre-commit`: pre-commit hook脚本
- `.husky/pre-push`: pre-push hook脚本
- `.husky/commit-msg`: commit消息格式检查脚本
- `scripts/ci-local.js`: 本地CI检查脚本
- `package.json`: lint-staged和脚本配置

## 优势

1. **提早发现问题**: 在本地就能发现和修复问题，避免CI失败
2. **保持代码质量**: 确保所有提交的代码都通过了质量检查
3. **节省时间**: 避免频繁的远程CI失败和重新推送
4. **统一标准**: 确保所有开发者使用相同的代码质量标准

## 注意事项

1. 初次运行可能需要较长时间，因为需要编译合约和运行测试
2. 如果本地环境有问题，可以暂时跳过hooks修复环境
3. 建议在提交前先手动运行 `npm run ci:quick` 检查
4. 大型更改建议先运行 `npm run ci:local` 进行完整检查
