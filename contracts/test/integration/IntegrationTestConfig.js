/**
 * 集成测试配置文件
 * 提供统一的测试环境设置、常量定义和辅助函数
 */

const { ethers } = require("hardhat");

// 测试常量
const TEST_CONSTANTS = {
  // 代币配置
  TOKEN: {
    NAME: "USDX Stablecoin",
    SYMBOL: "USDX",
    DECIMALS: 6,
    INITIAL_SUPPLY: ethers.parseUnits("1000000000", 6), // 1B tokens
  },

  // 治理配置
  GOVERNANCE: {
    VOTING_PERIOD: 86400, // 24 hours
    EXECUTION_DELAY: 3600, // 1 hour
    REQUIRED_VOTES: 2,
  },

  // 测试金额
  AMOUNTS: {
    MINT_AMOUNT: ethers.parseUnits("1000000", 6), // 1M tokens
    TRANSFER_AMOUNT: ethers.parseUnits("100000", 6), // 100K tokens
    DAILY_LIMIT: ethers.parseUnits("50000", 6), // 50K tokens
    BURN_AMOUNT: ethers.parseUnits("10000", 6), // 10K tokens
  },

  // 时间常量
  TIME: {
    ONE_DAY: 86400,
    ONE_HOUR: 3600,
    ONE_MINUTE: 60,
  },

  // 限制代码
  RESTRICTION_CODES: {
    SUCCESS: 0,
    KYC_REQUIRED: 1,
    BLACKLISTED_SENDER: 2,
    BLACKLISTED_RECEIVER: 3,
    SANCTIONED_SENDER: 4,
    SANCTIONED_RECEIVER: 5,
    DAILY_LIMIT_EXCEEDED: 6,
    TRANSFER_AMOUNT_TOO_HIGH: 7,
    TRANSFER_AMOUNT_TOO_LOW: 8,
    HOLDER_LIMIT_EXCEEDED: 9,
    REGION_RESTRICTED: 10,
  },
};

/**
 * 集成测试基础类
 * 提供通用的设置和清理方法
 */
class IntegrationTestBase {
  constructor() {
    this.contracts = {};
    this.accounts = {};
    this.config = TEST_CONSTANTS;
  }

  /**
   * 部署和初始化所有合约
   */
  async setupContracts() {
    // 获取测试账户
    const signers = await ethers.getSigners();
    [
      this.accounts.owner,
      this.accounts.governor1,
      this.accounts.governor2,
      this.accounts.governor3,
      this.accounts.user1,
      this.accounts.user2,
      this.accounts.user3,
      this.accounts.minter,
      this.accounts.blacklister,
      this.accounts.pauser,
      this.accounts.compliance,
      this.accounts.upgrader,
    ] = signers;

    // 部署USDX Token
    await this.deployUSDXToken();

    // 部署治理合约
    await this.deployGovernance();

    // 设置角色和权限
    await this.setupRoles();

    // 设置KYC状态
    await this.setupKYC();
  }

  /**
   * 部署USDX Token合约
   */
  async deployUSDXToken() {
    const USDXToken = await ethers.getContractFactory("USDXToken");
    this.contracts.usdxToken = await upgrades.deployProxy(
      USDXToken,
      [
        this.config.TOKEN.NAME,
        this.config.TOKEN.SYMBOL,
        this.config.TOKEN.INITIAL_SUPPLY,
        this.accounts.owner.address,
      ],
      { initializer: "initialize", kind: "uups" },
    );
    await this.contracts.usdxToken.waitForDeployment();
  }

  /**
   * 部署治理合约
   */
  async deployGovernance() {
    const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
    this.contracts.governance = await upgrades.deployProxy(
      USDXGovernance,
      [
        await this.contracts.usdxToken.getAddress(),
        [
          this.accounts.governor1.address,
          this.accounts.governor2.address,
          this.accounts.governor3.address,
        ],
        this.config.GOVERNANCE.REQUIRED_VOTES,
        this.config.GOVERNANCE.VOTING_PERIOD,
        this.config.GOVERNANCE.EXECUTION_DELAY,
      ],
      { initializer: "initialize", kind: "uups" },
    );
    await this.contracts.governance.waitForDeployment();
  }

  /**
   * 设置角色权限
   */
  async setupRoles() {
    const token = this.contracts.usdxToken;
    const governance = this.contracts.governance;

    // 获取角色常量
    const MINTER_ROLE = await token.MINTER_ROLE();
    const BLACKLISTER_ROLE = await token.BLACKLISTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();
    const COMPLIANCE_ROLE = await token.COMPLIANCE_ROLE();
    const UPGRADER_ROLE = await token.UPGRADER_ROLE();

    // 授予个人角色
    await token.grantRole(MINTER_ROLE, this.accounts.minter.address);
    await token.grantRole(BLACKLISTER_ROLE, this.accounts.blacklister.address);
    await token.grantRole(PAUSER_ROLE, this.accounts.pauser.address);
    await token.grantRole(COMPLIANCE_ROLE, this.accounts.compliance.address);
    await token.grantRole(UPGRADER_ROLE, this.accounts.upgrader.address);

    // 授予治理合约角色
    const governanceAddress = await governance.getAddress();
    await token.grantRole(MINTER_ROLE, governanceAddress);
    await token.grantRole(BLACKLISTER_ROLE, governanceAddress);
    await token.grantRole(PAUSER_ROLE, governanceAddress);
    await token.grantRole(COMPLIANCE_ROLE, governanceAddress);
    await token.grantRole(UPGRADER_ROLE, governanceAddress);
  }

  /**
   * 设置KYC状态
   */
  async setupKYC() {
    const token = this.contracts.usdxToken;
    const compliance = this.accounts.compliance;

    // 为所有测试账户设置KYC
    const accountsToVerify = [
      this.accounts.owner,
      this.accounts.governor1,
      this.accounts.governor2,
      this.accounts.governor3,
      this.accounts.user1,
      this.accounts.user2,
      this.accounts.user3,
      this.accounts.minter,
      this.accounts.blacklister,
      this.accounts.pauser,
      this.accounts.compliance,
      this.accounts.upgrader,
    ];

    for (const account of accountsToVerify) {
      await token.connect(compliance).setKYCVerified(account.address, true);
    }
  }

  /**
   * 快进时间
   * @param {number} seconds - 要快进的秒数
   */
  async fastForwardTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  /**
   * 创建治理提案
   * @param {string} target - 目标合约地址
   * @param {number} value - ETH值
   * @param {string} data - 调用数据
   * @param {string} description - 提案描述
   * @param {object} proposer - 提案者账户
   * @returns {Promise<number>} 提案ID
   */
  async createGovernanceProposal(target, value, data, description, proposer) {
    const tx = await this.contracts.governance
      .connect(proposer)
      .propose(target, value, data, description);
    const receipt = await tx.wait();
    return receipt.logs[0].args.proposalId;
  }

  /**
   * 执行治理提案
   * @param {number} proposalId - 提案ID
   * @param {Array} voters - 投票者账户数组
   * @param {boolean} support - 支持还是反对
   */
  async executeGovernanceProposal(proposalId, voters, support = true) {
    // 投票
    for (const voter of voters) {
      await this.contracts.governance.connect(voter).castVote(proposalId, support);
    }

    // 快进时间到投票和执行期限
    await this.fastForwardTime(
      this.config.GOVERNANCE.VOTING_PERIOD + this.config.GOVERNANCE.EXECUTION_DELAY + 1,
    );

    // 执行提案
    await this.contracts.governance.connect(voters[0]).execute(proposalId);
  }

  /**
   * 获取合约状态快照
   */
  async getStateSnapshot() {
    const token = this.contracts.usdxToken;
    const governance = this.contracts.governance;

    return {
      token: {
        name: await token.name(),
        symbol: await token.symbol(),
        totalSupply: await token.totalSupply(),
        paused: await token.paused(),
        address: await token.getAddress(),
      },
      governance: {
        proposalCount: await governance.proposalCount(),
        requiredVotes: await governance.requiredVotes(),
        votingPeriod: await governance.votingPeriod(),
        executionDelay: await governance.executionDelay(),
        address: await governance.getAddress(),
      },
      balances: {
        owner: await token.balanceOf(this.accounts.owner.address),
        user1: await token.balanceOf(this.accounts.user1.address),
        user2: await token.balanceOf(this.accounts.user2.address),
        user3: await token.balanceOf(this.accounts.user3.address),
      },
    };
  }

  /**
   * 打印测试摘要
   */
  async printTestSummary(testName) {
    const snapshot = await this.getStateSnapshot();
    console.log(`\n=== ${testName} 测试摘要 ===`);
    console.log(
      `代币总供应量: ${ethers.formatUnits(snapshot.token.totalSupply, 6)} ${snapshot.token.symbol}`,
    );
    console.log(`合约暂停状态: ${snapshot.token.paused}`);
    console.log(`治理提案数量: ${snapshot.governance.proposalCount}`);
    console.log("账户余额:");
    console.log(`  Owner: ${ethers.formatUnits(snapshot.balances.owner, 6)}`);
    console.log(`  User1: ${ethers.formatUnits(snapshot.balances.user1, 6)}`);
    console.log(`  User2: ${ethers.formatUnits(snapshot.balances.user2, 6)}`);
    console.log(`  User3: ${ethers.formatUnits(snapshot.balances.user3, 6)}`);
    console.log("=====================================\n");
  }
}

/**
 * 测试辅助函数
 */
const TestHelpers = {
  /**
   * 生成随机地址
   */
  generateRandomAddress() {
    return ethers.Wallet.createRandom().address;
  },

  /**
   * 等待指定数量的区块
   */
  async waitBlocks(blocks) {
    for (let i = 0; i < blocks; i++) {
      await ethers.provider.send("evm_mine");
    }
  },

  /**
   * 获取当前区块时间
   */
  async getCurrentBlockTime() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  },

  /**
   * 计算Gas成本
   */
  async calculateGasCost(tx) {
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;
    const gasPrice = tx.gasPrice || (await ethers.provider.getGasPrice());
    return gasUsed * gasPrice;
  },

  /**
   * 格式化金额显示
   */
  formatAmount(amount, decimals = 6) {
    return ethers.formatUnits(amount, decimals);
  },

  /**
   * 解析金额
   */
  parseAmount(amount, decimals = 6) {
    return ethers.parseUnits(amount.toString(), decimals);
  },
};

module.exports = {
  TEST_CONSTANTS,
  IntegrationTestBase,
  TestHelpers,
};
