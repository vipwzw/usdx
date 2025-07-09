# 稳定币项目 (USDT)

## 📋 项目概述

本项目是一个完整的稳定币系统，参考Circle的USDC设计架构，包含智能合约和管理后台两大核心组件。项目旨在创建一个安全、可靠、合规的稳定币生态系统。

## 🏗️ 项目架构

```
usdt/
├── contracts/              # 智能合约代码
│   ├── src/                # 合约源码
│   ├── test/               # 合约测试
│   ├── scripts/            # 部署脚本
│   └── docs/               # 合约文档
├── backend/                # 后端API服务
│   ├── src/                # 后端源码
│   ├── tests/              # 后端测试
│   ├── config/             # 配置文件
│   └── docs/               # API文档
├── frontend/               # 管理后台前端
│   ├── src/                # 前端源码
│   ├── public/             # 静态资源
│   ├── tests/              # 前端测试
│   └── docs/               # 前端文档
├── infrastructure/         # 基础设施代码
│   ├── docker/             # Docker配置
│   ├── k8s/                # Kubernetes配置
│   └── terraform/          # 基础设施即代码
├── docs/                   # 项目文档
└── scripts/                # 项目脚本
```

## 🚀 核心功能

### 智能合约功能
- ✅ **ERC-20标准**: 完整的代币转账功能
- ✅ **铸币/销毁**: 受控的代币发行和销毁机制
- ✅ **权限管理**: 多层级权限控制系统
- ✅ **黑名单机制**: 地址黑名单管理功能
- ✅ **合约暂停**: 紧急情况下的合约暂停功能
- ✅ **升级机制**: 代理合约模式支持合约升级
- ✅ **合规集成**: KYC/AML合规检查接口

### 管理后台功能
- 🎯 **用户管理**: 多因素认证和角色权限管理
- 🎯 **铸币管理**: 可视化铸币操作和审批流程
- 🎯 **账户管理**: 黑名单管理和账户风险评估
- 🎯 **交易监控**: 实时交易监控和异常检测
- 🎯 **报表系统**: 财务报表和合规报表生成
- 🎯 **系统管理**: 合约控制和系统参数配置

## 📚 重要文档

| 文档 | 描述 |
|------|------|
| [项目需求文档](./PROJECT_REQUIREMENTS.md) | 详细的功能需求和技术需求 |
| [项目规则文档](./PROJECT_RULES.md) | 开发规范和项目规则 |
| [API文档](./docs/api/) | RESTful API接口文档 |
| [合约文档](./docs/contracts/) | 智能合约技术文档 |
| [部署指南](./docs/deployment/) | 部署和运维指南 |

## 🛠️ 技术栈

### 智能合约
- **Solidity** ^0.8.19 - 智能合约开发语言
- **Hardhat** - 开发框架和测试环境
- **OpenZeppelin** - 安全的合约库
- **Slither** - 静态代码分析工具

### 后端
- **Golang** 1.21+ - 高性能编程语言
- **Gin/Echo** - Web框架
- **GORM** - ORM数据库操作
- **PostgreSQL** 15+ - 主数据库
- **Redis** 7+ - 缓存和会话存储
- **RabbitMQ** 3.12+ - 消息队列

### 前端
- **React** 18+ - 用户界面框架
- **TypeScript** 5+ - 类型安全
- **Ant Design** - UI组件库
- **Redux Toolkit** - 状态管理
- **React Query** - 数据获取和缓存

### 基础设施
- **Docker** - 容器化
- **Kubernetes** - 容器编排
- **Terraform** - 基础设施即代码
- **GitHub Actions** - CI/CD
- **Prometheus/Grafana** - 监控告警

## 🔐 安全特性

- **多重签名钱包**: 关键操作需要多重签名确认
- **时间锁机制**: 重要变更有延时生效机制
- **权限分离**: 不同角色有不同的操作权限
- **审计日志**: 所有操作都有完整的审计记录
- **安全审计**: 定期进行第三方安全审计
- **漏洞扫描**: 自动化安全漏洞检测

## 📊 合规特性

- **KYC/AML集成**: 符合反洗钱法规要求
- **交易监控**: 实时监控可疑交易活动
- **监管报告**: 自动生成监管要求的报告
- **数据保护**: 符合GDPR等数据保护法规
- **审计追踪**: 完整的操作审计轨迹

## 🚀 快速开始

### 环境要求
- Golang 1.21+
- Node.js 18+ (用于前端开发)
- Docker & Docker Compose
- Git
- 以太坊钱包 (MetaMask)

### 项目初始化
```bash
# 克隆项目
git clone <repository-url>
cd usdt

# 安装依赖
npm install

# 设置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量

# 启动本地开发环境
docker-compose up -d

# 编译智能合约
cd contracts
npm run compile

# 运行测试
npm run test

# 部署到本地网络
npm run deploy:local
```

### 开发流程
```bash
# 1. 创建功能分支
git checkout -b feature/USDT-001-add-new-feature

# 2. 开发功能
# ... 编写代码 ...

# 3. 运行测试
npm run test

# 4. 提交代码
git add .
git commit -m "feat: add new feature"

# 5. 推送分支
git push origin feature/USDT-001-add-new-feature

# 6. 创建Pull Request
# 在GitHub/GitLab上创建PR并等待代码审查
```

## 📈 项目进度

### 阶段一: 核心功能开发 (4-6周) ⏳
- [ ] 智能合约核心功能开发
- [ ] 基础管理后台开发
- [ ] 单元测试和集成测试

### 阶段二: 高级功能开发 (3-4周) ⏳
- [ ] 高级安全功能实现
- [ ] 完整管理后台功能
- [ ] 性能优化和测试

### 阶段三: 测试和部署 (2-3周) ⏳
- [ ] 全面安全测试
- [ ] 第三方代码审计
- [ ] 主网部署准备

### 阶段四: 运营和维护 (持续) ⏳
- [ ] 系统监控和维护
- [ ] 功能迭代升级
- [ ] 用户支持服务

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

请确保遵循项目的[开发规则](./PROJECT_RULES.md)和代码规范。

## 📞 联系我们

- **项目负责人**: [邮箱地址]
- **技术支持**: [技术支持邮箱]
- **文档问题**: [文档邮箱]

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

本项目仅供学习和研究用途。在生产环境中使用前，请确保：
- 完成充分的安全审计
- 遵守当地法律法规
- 获得必要的监管许可
- 实施适当的风险管理措施

---

**注意**: 这是一个模板项目，实际实施时需要根据具体需求进行调整和定制。 