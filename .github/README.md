# GitHub Actions & CI/CD

This directory contains GitHub Actions workflows for automated testing, deployment, and monitoring of the USDX stablecoin project.

## 🔄 Workflows

### 1. CI/CD Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**Jobs:**
- ✅ **Test Smart Contracts**: Runs all test suites
- 🔍 **Code Quality**: Solidity and JavaScript linting
- 🔒 **Security Analysis**: Slither security scans
- ⛽ **Gas Usage Report**: Gas consumption analysis
- 📦 **Build Artifacts**: Compilation and artifact archiving

### 2. Deployment Pipeline (`deploy.yml`)

**Triggers:**
- Manual dispatch with network selection

**Supported Networks:**
- **Testnets**: Sepolia, Goerli, Polygon Mumbai, BSC Testnet
- **Mainnets**: Ethereum, Polygon, BSC

**Jobs:**
- 🚀 **Deploy**: Contract deployment with verification
- ✅ **Post-Deployment Checks**: Integration tests and monitoring setup

### 3. Contract Monitoring (`monitoring.yml`)

**Triggers:**
- Scheduled every 6 hours
- Manual dispatch

**Jobs:**
- 🏥 **Health Check**: Contract status monitoring
- ⛽ **Gas Price Monitor**: Network gas price tracking
- 📊 **Performance Metrics**: System performance analysis
- 🔒 **Security Scan**: Periodic security analysis

## 🔧 Setup Instructions

### 1. Repository Secrets

Add the following secrets to your GitHub repository:

#### Network Configuration
```
PRIVATE_KEY=<deployer-private-key>
DEPLOYER_PRIVATE_KEY=<backup-deployer-key>
```

#### API Keys
```
INFURA_API_KEY=<infura-project-id>
ALCHEMY_API_KEY=<alchemy-api-key>
ETHERSCAN_API_KEY=<etherscan-api-key>
POLYGONSCAN_API_KEY=<polygonscan-api-key>
BSCSCAN_API_KEY=<bscscan-api-key>
```

#### Contract Configuration
```
INITIAL_OWNER=<initial-owner-address>
GOVERNORS=<comma-separated-governor-addresses>
REQUIRED_VOTES=2
VOTING_PERIOD=86400
EXECUTION_DELAY=3600
```

#### Optional Integrations
```
SLACK_WEBHOOK_URL=<slack-webhook-for-notifications>
CODECOV_TOKEN=<codecov-upload-token>
```

### 2. Environment Setup

Create environments in your GitHub repository:

#### Staging Environment
- Used for testnet deployments
- Requires approval for deployment actions
- Configure with testnet-specific secrets

#### Production Environment  
- Used for mainnet deployments
- Requires multiple approvals
- Configure with mainnet-specific secrets

### 3. Branch Protection

Configure branch protection rules:

```yaml
main:
  required_status_checks:
    - "Test Smart Contracts"
    - "Code Quality" 
    - "Security Analysis"
  require_pull_request_reviews: true
  required_approving_reviews: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
```

## 🚀 Usage

### Running Tests
Tests run automatically on every push and PR. To run manually:

1. Go to Actions tab
2. Select "CI/CD Pipeline"
3. Click "Run workflow"

### Deploying Contracts

1. Go to Actions tab
2. Select "Deploy Contracts"
3. Click "Run workflow"
4. Choose target network
5. Enable/disable contract verification
6. Click "Run workflow"

### Monitoring

Monitoring runs automatically every 6 hours. To run manually:

1. Go to Actions tab
2. Select "Contract Monitoring"
3. Click "Run workflow"
4. Choose network to monitor
5. Click "Run workflow"

## 📊 Reports and Artifacts

### Test Reports
- Coverage reports uploaded to Codecov
- Gas usage reports commented on PRs
- Test artifacts stored for 30 days

### Deployment Reports
- Deployment artifacts stored for 90 days
- Contract addresses and transaction hashes
- Verification status and links

### Security Reports
- Slither analysis results
- Custom security check outputs
- Vulnerability assessments

## 🔔 Notifications

### GitHub Issues
- Automatic deployment success/failure reports
- Security alert issues for critical findings
- Health check failure notifications

### Slack Integration (Optional)
- Real-time deployment notifications
- Security alert messages
- System health updates

## 🛠️ Customization

### Adding New Networks

1. Update `deploy.yml` workflow:
```yaml
options:
- your-new-network
```

2. Add network configuration to `hardhat.config.js`

3. Add corresponding API keys to secrets

### Custom Security Checks

1. Modify `scripts/security-check.js`
2. Update security thresholds in workflows
3. Add network-specific validations

### Performance Monitoring

1. Customize metrics in `monitoring.yml`
2. Add network-specific thresholds
3. Configure alerting rules

## 🔍 Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check network connectivity
   - Verify API keys and secrets
   - Ensure sufficient gas funds

2. **Test Failures**
   - Review test logs in Actions
   - Check for dependency updates
   - Verify local environment matches CI

3. **Security Scan Issues**
   - Update Slither version
   - Review new vulnerability patterns
   - Adjust security thresholds

### Getting Help

- Create an issue using the bug report template
- Check existing issues for similar problems
- Review workflow logs for detailed error messages

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Slither Security Analysis](https://github.com/crytic/slither) 