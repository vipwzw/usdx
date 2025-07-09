# 稳定币项目规则文档

## 1. 总体架构规则

### 1.1 系统架构原则
- **微服务架构**: 采用微服务架构设计，确保系统模块化和可扩展性
- **分层设计**: 智能合约层、业务逻辑层、API层、前端展示层分离
- **容器化部署**: 所有服务采用Docker容器化部署
- **云原生设计**: 支持Kubernetes编排和自动扩容

### 1.2 技术栈统一规范
- **智能合约**: Solidity ^0.8.19，使用Hardhat开发框架
- **后端**: Golang 1.21+ + Gin/Echo框架
- **前端**: React 18+ + TypeScript 5+
- **数据库**: PostgreSQL 15+ (主库) + Redis 7+ (缓存)
- **消息队列**: RabbitMQ 3.12+

## 2. 智能合约开发规则

### 2.1 代码规范
```solidity
// 文件命名规范：PascalCase.sol
// 合约命名规范：PascalCase
// 函数命名规范：camelCase
// 变量命名规范：camelCase
// 常量命名规范：UPPER_SNAKE_CASE
// 事件命名规范：PascalCase
```

### 2.2 安全规则
- **重入保护**: 所有外部调用必须使用重入保护修饰器
- **整数溢出**: 使用SafeMath或Solidity 0.8+内置检查
- **访问控制**: 所有敏感函数必须有适当的访问控制
- **输入验证**: 所有用户输入必须进行严格验证
- **Gas限制**: 避免无界循环，设置合理的Gas限制

### 2.3 权限管理规则
```solidity
// 权限层级（从高到低）
// 1. Owner (合约所有者)
// 2. Admin (管理员)
// 3. Minter (铸币者)
// 4. Blacklister (黑名单管理员)
// 5. Pauser (暂停管理员)

// 权限变更规则
// - 关键权限变更需要多重签名确认
// - 权限变更需要时间锁延迟生效
// - 所有权限变更必须记录事件日志
```

### 2.4 升级规则
- **代理模式**: 使用OpenZeppelin的透明代理模式
- **升级治理**: 升级需要多签名钱包确认
- **向后兼容**: 升级不能破坏现有功能
- **测试要求**: 升级前必须通过完整测试套件

### 2.5 测试规则
- **覆盖率要求**: 代码覆盖率必须达到95%以上
- **测试类型**: 单元测试、集成测试、模糊测试
- **边界测试**: 必须测试边界条件和异常情况
- **Gas测试**: 必须进行Gas消耗分析和优化

## 3. 后端开发规则

### 3.1 API设计规范
```typescript
// RESTful API规范
// GET    /api/v1/tokens/{id}          - 获取代币信息
// POST   /api/v1/tokens               - 创建代币（内部使用）
// PUT    /api/v1/tokens/{id}          - 更新代币信息
// DELETE /api/v1/tokens/{id}          - 删除代币（内部使用）

// 响应格式规范
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: number;
  requestId: string;
}
```

### 3.2 数据库设计规则
- **命名规范**: 表名使用snake_case，字段名使用snake_case
- **主键规范**: 所有表必须有主键，建议使用UUID
- **索引规范**: 频繁查询字段必须建立索引
- **外键约束**: 必须定义外键约束保证数据完整性
- **审计字段**: 所有业务表必须包含created_at、updated_at字段

### 3.3 缓存策略规则
```typescript
// Redis Key命名规范
// 格式：{service}:{module}:{identifier}:{version}
// 示例：usdt:user:profile:123:v1

// 缓存过期时间规范
const CACHE_TTL = {
  SHORT: 5 * 60,      // 5分钟 - 实时数据
  MEDIUM: 30 * 60,    // 30分钟 - 半实时数据
  LONG: 24 * 60 * 60, // 24小时 - 静态数据
} as const;
```

### 3.4 错误处理规则
```typescript
// 错误码规范
enum ErrorCode {
  // 系统错误 (10xxx)
  SYSTEM_ERROR = 10001,
  DATABASE_ERROR = 10002,
  
  // 业务错误 (20xxx)
  INSUFFICIENT_BALANCE = 20001,
  INVALID_ADDRESS = 20002,
  BLACKLISTED_ADDRESS = 20003,
  
  // 权限错误 (30xxx)
  UNAUTHORIZED = 30001,
  FORBIDDEN = 30002,
  
  // 参数错误 (40xxx)
  INVALID_PARAMS = 40001,
  MISSING_PARAMS = 40002,
}
```

### 3.5 日志记录规则
```typescript
// 日志级别：ERROR > WARN > INFO > DEBUG
// 日志格式：结构化JSON格式
interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  service: string;
  message: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}
```

## 4. 前端开发规则

### 4.1 组件设计规范
```typescript
// 组件命名：PascalCase
// 文件命名：PascalCase.tsx
// 样式文件：PascalCase.module.css

// 组件接口定义
interface ComponentProps {
  // Props必须有明确的类型定义
  title: string;
  value?: number;
  onChange?: (value: number) => void;
}

// 组件导出规范
export default ComponentName;
export type { ComponentProps };
```

### 4.2 状态管理规则
```typescript
// 使用Redux Toolkit进行状态管理
// Slice命名：camelCase + Slice
// Action命名：动词 + 名词

// 示例：userSlice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.profile = action.payload;
    },
    clearUser: (state) => {
      state.profile = null;
    },
  },
});
```

### 4.3 路由规则
```typescript
// 路由命名规范
const routes = {
  // 一级路由：功能模块
  DASHBOARD: '/dashboard',
  TRANSACTIONS: '/transactions',
  ACCOUNTS: '/accounts',
  
  // 二级路由：具体功能
  TRANSACTION_HISTORY: '/transactions/history',
  TRANSACTION_MINT: '/transactions/mint',
  ACCOUNT_BLACKLIST: '/accounts/blacklist',
} as const;
```

### 4.4 表单验证规则
```typescript
// 使用react-hook-form + yup进行表单验证
const schema = yup.object({
  address: yup
    .string()
    .required('地址不能为空')
    .matches(/^0x[a-fA-F0-9]{40}$/, '无效的以太坊地址'),
  amount: yup
    .number()
    .required('金额不能为空')
    .positive('金额必须为正数')
    .max(1000000, '金额不能超过1,000,000'),
});
```

## 5. 安全规则

### 5.1 网络安全规则
- **HTTPS强制**: 所有通信必须使用HTTPS
- **HSTS配置**: 配置HTTP严格传输安全
- **CORS配置**: 严格配置跨域资源共享
- **Rate Limiting**: 实施请求频率限制
- **DDoS防护**: 部署DDoS攻击防护

### 5.2 身份认证规则
```typescript
// JWT Token规范
interface JWTPayload {
  userId: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

// Token过期时间
const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60,        // 15分钟
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7天
} as const;
```

### 5.3 数据加密规则
- **敏感数据加密**: 使用AES-256加密敏感数据
- **密码哈希**: 使用bcrypt进行密码哈希
- **密钥管理**: 使用HSM或云密钥管理服务
- **传输加密**: 使用TLS 1.3进行数据传输

### 5.4 审计日志规则
```typescript
// 审计事件类型
enum AuditEventType {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  MINT_TOKEN = 'MINT_TOKEN',
  BURN_TOKEN = 'BURN_TOKEN',
  BLACKLIST_ADD = 'BLACKLIST_ADD',
  BLACKLIST_REMOVE = 'BLACKLIST_REMOVE',
  CONTRACT_PAUSE = 'CONTRACT_PAUSE',
  CONTRACT_UNPAUSE = 'CONTRACT_UNPAUSE',
}

// 审计日志格式
interface AuditLog {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  userId: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  result: 'SUCCESS' | 'FAILURE';
  failureReason?: string;
}
```

## 6. 合规规则

### 6.1 KYC/AML规则
- **身份验证**: 所有用户必须完成身份验证
- **风险评估**: 定期进行客户风险评估
- **交易监控**: 实时监控可疑交易活动
- **报告义务**: 及时向监管机构报告可疑活动

### 6.2 数据保护规则
- **数据最小化**: 只收集必要的个人数据
- **数据匿名化**: 对分析数据进行匿名化处理
- **数据保留**: 按照法律要求设置数据保留期限
- **数据删除**: 提供用户数据删除机制

### 6.3 财务合规规则
```typescript
// 交易限额规则
const TRANSACTION_LIMITS = {
  DAILY_MINT_LIMIT: 10_000_000,      // 日铸币限额
  SINGLE_TRANSACTION_LIMIT: 1_000_000, // 单笔交易限额
  MONTHLY_USER_LIMIT: 100_000,       // 用户月限额
} as const;

// 合规检查规则
interface ComplianceCheck {
  isKYCCompleted: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  isBlacklisted: boolean;
  sanctionCheck: boolean;
}
```

## 7. 运维规则

### 7.1 部署规则
- **环境隔离**: 开发、测试、生产环境完全隔离
- **蓝绿部署**: 使用蓝绿部署策略减少停机时间
- **回滚机制**: 必须具备快速回滚能力
- **健康检查**: 所有服务必须提供健康检查接口

### 7.2 监控告警规则
```typescript
// 告警级别
enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
}

// 监控指标
const MONITORING_METRICS = {
  // 系统指标
  CPU_USAGE_THRESHOLD: 80,        // CPU使用率告警阈值
  MEMORY_USAGE_THRESHOLD: 85,     // 内存使用率告警阈值
  DISK_USAGE_THRESHOLD: 90,       // 磁盘使用率告警阈值
  
  // 业务指标
  ERROR_RATE_THRESHOLD: 1,        // 错误率告警阈值 (%)
  RESPONSE_TIME_THRESHOLD: 2000,  // 响应时间告警阈值 (ms)
  TRANSACTION_FAILURE_THRESHOLD: 5, // 交易失败率告警阈值 (%)
} as const;
```

### 7.3 备份规则
- **数据库备份**: 每日全量备份，每小时增量备份
- **代码备份**: 使用Git进行版本控制和备份
- **配置备份**: 配置文件版本化管理
- **恢复测试**: 定期进行备份恢复测试

### 7.4 容灾规则
- **多区域部署**: 在多个云区域部署服务
- **故障切换**: 自动故障检测和切换
- **数据同步**: 跨区域数据实时同步
- **灾难恢复**: 制定详细的灾难恢复计划

## 8. 开发流程规则

### 8.1 Git工作流规则
```bash
# 分支命名规范
feature/USDT-001-add-minting-function
bugfix/USDT-002-fix-balance-calculation
hotfix/USDT-003-security-patch
release/v1.2.0

# 提交信息规范
feat: 添加铸币功能
fix: 修复余额计算错误
docs: 更新API文档
style: 格式化代码
refactor: 重构权限管理模块
test: 添加单元测试
chore: 更新依赖包
```

### 8.2 代码审查规则
- **必要性**: 所有代码变更必须经过代码审查
- **审查人员**: 至少需要2名有经验的开发者审查
- **审查清单**: 使用标准化的代码审查清单
- **审查工具**: 使用GitHub/GitLab的Pull Request功能

### 8.3 质量保证规则
```typescript
// 代码质量指标
const QUALITY_METRICS = {
  CODE_COVERAGE: 95,              // 代码覆盖率 >= 95%
  CYCLOMATIC_COMPLEXITY: 10,      // 圈复杂度 <= 10
  MAINTAINABILITY_INDEX: 70,      // 可维护性指数 >= 70
  TECHNICAL_DEBT_RATIO: 5,        // 技术债务比例 <= 5%
} as const;
```

### 8.4 发布规则
- **版本号规范**: 使用语义化版本控制 (SemVer)
- **发布清单**: 使用标准化的发布前检查清单
- **发布窗口**: 设定固定的发布时间窗口
- **发布通知**: 提前通知所有相关方发布计划

## 9. 测试规则

### 9.1 测试策略
- **测试金字塔**: 70%单元测试 + 20%集成测试 + 10%端到端测试
- **自动化测试**: 所有测试必须自动化执行
- **持续集成**: 每次代码提交都触发自动化测试
- **测试数据**: 使用模拟数据，不使用生产数据

### 9.2 智能合约测试规则
```solidity
// 测试文件命名：合约名 + .test.sol
// 测试函数命名：test + 功能描述
contract USDTTokenTest {
    function testMintTokens() public {
        // 测试铸币功能
    }
    
    function testBurnTokens() public {
        // 测试销毁功能
    }
    
    function testBlacklistFunctionality() public {
        // 测试黑名单功能
    }
}
```

### 9.3 性能测试规则
- **负载测试**: 模拟正常负载下的系统性能
- **压力测试**: 测试系统在高负载下的表现
- **并发测试**: 测试系统的并发处理能力
- **基准测试**: 建立性能基准线并持续监控

## 10. 文档规则

### 10.1 技术文档规范
- **API文档**: 使用OpenAPI 3.0规范编写API文档
- **代码注释**: 关键函数和复杂逻辑必须有详细注释
- **架构文档**: 维护系统架构和设计文档
- **部署文档**: 详细的部署和运维文档

### 10.2 用户文档规范
- **用户手册**: 提供详细的用户操作手册
- **FAQ文档**: 维护常见问题解答文档
- **更新日志**: 记录每个版本的更新内容
- **故障排除**: 提供常见问题的解决方案

## 11. 变更管理规则

### 11.1 变更审批流程
1. **变更申请**: 提交详细的变更申请
2. **风险评估**: 评估变更可能带来的风险
3. **审批流程**: 按级别进行变更审批
4. **实施计划**: 制定详细的实施计划
5. **验证测试**: 在测试环境验证变更
6. **生产实施**: 在生产环境实施变更
7. **变更验证**: 验证变更是否成功
8. **文档更新**: 更新相关文档

### 11.2 紧急变更规则
- **紧急标准**: 明确定义紧急变更的标准
- **快速通道**: 建立紧急变更的快速审批通道
- **事后审查**: 紧急变更后必须进行事后审查
- **经验总结**: 总结紧急变更的经验教训

## 12. 风险管理规则

### 12.1 技术风险控制
- **代码审计**: 定期进行第三方代码审计
- **安全测试**: 定期进行渗透测试和安全评估
- **依赖管理**: 定期检查和更新第三方依赖
- **漏洞扫描**: 自动化的安全漏洞扫描

### 12.2 运营风险控制
- **操作权限**: 严格控制生产环境操作权限
- **双人操作**: 关键操作需要双人确认
- **操作记录**: 记录所有重要操作的详细日志
- **应急预案**: 制定各种场景的应急处理预案

这些规则确保了稳定币项目的安全性、可靠性和合规性。所有团队成员都必须严格遵守这些规则，并定期进行规则的审查和更新。 