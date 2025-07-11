/**
 * 部署流程集成测试
 * 测试完整的合约部署、初始化和配置流程
 */

const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { IntegrationTestBase, TestHelpers } = require("./IntegrationTestConfig");

describe("Deployment Integration Tests", () => {
  let deploymentTracker;
  let testBase;

  // 部署跟踪器
  class DeploymentTracker {
    constructor() {
      this.deployments = [];
      this.gasUsed = 0n;
    }

    async trackDeployment(name, deploymentPromise) {
      const startTime = Date.now();
      console.log(`🚀 开始部署: ${name}`);

      const result = await deploymentPromise;
      await result.waitForDeployment();

      const endTime = Date.now();
      const address = await result.getAddress();

      // 获取部署交易信息
      const deployTx = result.deploymentTransaction();
      let gasUsed = 0n;
      if (deployTx) {
        const receipt = await deployTx.wait();
        gasUsed = receipt.gasUsed;
        this.gasUsed += gasUsed;
      }

      const deployment = {
        name,
        address,
        gasUsed: gasUsed.toString(),
        deploymentTime: endTime - startTime,
        blockNumber: deployTx ? (await deployTx.wait()).blockNumber : 0,
      };

      this.deployments.push(deployment);
      console.log(
        `✅ ${name} 部署完成: ${address} (Gas: ${gasUsed.toLocaleString()}, 耗时: ${endTime - startTime}ms)`,
      );

      return result;
    }

    printSummary() {
      console.log("\n📊 === 部署总结 ===");
      console.log(`总部署数量: ${this.deployments.length}`);
      console.log(`总Gas消耗: ${Number(this.gasUsed).toLocaleString()}`);
      console.log("\n详细部署信息:");
      this.deployments.forEach((deployment, index) => {
        console.log(`${index + 1}. ${deployment.name}`);
        console.log(`   地址: ${deployment.address}`);
        console.log(`   Gas: ${Number(deployment.gasUsed).toLocaleString()}`);
        console.log(`   耗时: ${deployment.deploymentTime}ms`);
      });
      console.log("===================\n");
    }

    generateReport() {
      return {
        timestamp: new Date().toISOString(),
        network: "hardhat",
        totalGasUsed: this.gasUsed.toString(),
        deploymentCount: this.deployments.length,
        deployments: this.deployments,
      };
    }
  }

  beforeEach(() => {
    deploymentTracker = new DeploymentTracker();
    testBase = new IntegrationTestBase();
  });

  afterEach(() => {
    deploymentTracker.printSummary();
  });

  describe("完整部署流程测试", () => {
    it("应该完整部署USDX生态系统", async () => {
      console.log("\n🌟 === USDX生态系统完整部署测试 ===");

      const [deployer, governor1, governor2, governor3] = await ethers.getSigners();

      // 阶段1: 部署USDX Token
      console.log("\n📦 阶段1: 部署USDX Token合约");

      const USDXToken = await ethers.getContractFactory("USDXToken");
      const usdxToken = await deploymentTracker.trackDeployment(
        "USDXToken (Proxy)",
        upgrades.deployProxy(
          USDXToken,
          [
            testBase.config.TOKEN.NAME,
            testBase.config.TOKEN.SYMBOL,
            testBase.config.TOKEN.INITIAL_SUPPLY,
            deployer.address,
          ],
          {
            initializer: "initialize",
            kind: "uups",
          },
        ),
      );

      // 验证代币合约部署
      expect(await usdxToken.name()).to.equal(testBase.config.TOKEN.NAME);
      expect(await usdxToken.symbol()).to.equal(testBase.config.TOKEN.SYMBOL);
      expect(await usdxToken.totalSupply()).to.equal(testBase.config.TOKEN.INITIAL_SUPPLY);
      expect(await usdxToken.decimals()).to.equal(testBase.config.TOKEN.DECIMALS);
      console.log("✅ USDX Token合约部署验证通过");

      // 阶段2: 部署治理合约
      console.log("\n🏛️ 阶段2: 部署USDX治理合约");

      const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
      const governance = await deploymentTracker.trackDeployment(
        "USDXGovernance (Proxy)",
        upgrades.deployProxy(
          USDXGovernance,
          [
            await usdxToken.getAddress(),
            [governor1.address, governor2.address, governor3.address],
            testBase.config.GOVERNANCE.REQUIRED_VOTES,
            testBase.config.GOVERNANCE.VOTING_PERIOD,
            testBase.config.GOVERNANCE.EXECUTION_DELAY,
          ],
          { initializer: "initialize", kind: "uups" },
        ),
      );

      // 验证治理合约部署
      expect(await governance.token()).to.equal(await usdxToken.getAddress());
      expect(await governance.requiredVotes()).to.equal(testBase.config.GOVERNANCE.REQUIRED_VOTES);
      expect(await governance.votingPeriod()).to.equal(testBase.config.GOVERNANCE.VOTING_PERIOD);
      expect(await governance.executionDelay()).to.equal(
        testBase.config.GOVERNANCE.EXECUTION_DELAY,
      );
      console.log("✅ USDX治理合约部署验证通过");

      // 阶段3: 配置角色权限
      console.log("\n🔐 阶段3: 配置角色权限");

      const MINTER_ROLE = await usdxToken.MINTER_ROLE();
      const BLACKLISTER_ROLE = await usdxToken.BLACKLISTER_ROLE();
      const PAUSER_ROLE = await usdxToken.PAUSER_ROLE();
      const COMPLIANCE_ROLE = await usdxToken.COMPLIANCE_ROLE();
      const UPGRADER_ROLE = await usdxToken.UPGRADER_ROLE();

      const governanceAddress = await governance.getAddress();

      // 授予治理合约所有关键角色
      await usdxToken.grantRole(MINTER_ROLE, governanceAddress);
      await usdxToken.grantRole(BLACKLISTER_ROLE, governanceAddress);
      await usdxToken.grantRole(PAUSER_ROLE, governanceAddress);
      await usdxToken.grantRole(COMPLIANCE_ROLE, governanceAddress);
      await usdxToken.grantRole(UPGRADER_ROLE, governanceAddress);

      // 验证角色分配
      expect(await usdxToken.hasRole(MINTER_ROLE, governanceAddress)).to.be.true;
      expect(await usdxToken.hasRole(BLACKLISTER_ROLE, governanceAddress)).to.be.true;
      expect(await usdxToken.hasRole(PAUSER_ROLE, governanceAddress)).to.be.true;
      expect(await usdxToken.hasRole(COMPLIANCE_ROLE, governanceAddress)).to.be.true;
      expect(await usdxToken.hasRole(UPGRADER_ROLE, governanceAddress)).to.be.true;
      console.log("✅ 角色权限配置完成");

      // 阶段4: 生成部署报告
      console.log("\n📋 阶段4: 生成部署报告");

      const deploymentReport = {
        ...deploymentTracker.generateReport(),
        deployer: deployer.address,
        contracts: {
          usdxToken: {
            address: await usdxToken.getAddress(),
            name: await usdxToken.name(),
            symbol: await usdxToken.symbol(),
            totalSupply: TestHelpers.formatAmount(await usdxToken.totalSupply()),
            decimals: await usdxToken.decimals(),
          },
          governance: {
            address: await governance.getAddress(),
            requiredVotes: await governance.requiredVotes(),
            votingPeriod: await governance.votingPeriod(),
            executionDelay: await governance.executionDelay(),
            proposalCount: await governance.proposalCount(),
          },
        },
      };

      console.log("📊 部署报告:");
      console.log(`时间戳: ${deploymentReport.timestamp}`);
      console.log(`网络: ${deploymentReport.network}`);
      console.log(`部署者: ${deploymentReport.deployer}`);
      console.log(`USDX Token: ${deploymentReport.contracts.usdxToken.address}`);
      console.log(`治理合约: ${deploymentReport.contracts.governance.address}`);
      console.log(`总Gas消耗: ${Number(deploymentReport.totalGasUsed).toLocaleString()}`);

      return deploymentReport;
    });

    it("应该支持分步骤部署流程", async () => {
      console.log("\n🔄 === 分步骤部署流程测试 ===");

      const [deployer] = await ethers.getSigners();
      const deploymentSteps = [];

      // 步骤1: 部署实现合约
      console.log("\n1️⃣ 步骤1: 部署实现合约");

      const USDXToken = await ethers.getContractFactory("USDXToken");
      const tokenImplementation = await deploymentTracker.trackDeployment(
        "USDXToken (Implementation)",
        USDXToken.deploy(),
      );

      deploymentSteps.push({
        step: 1,
        name: "Token Implementation",
        address: await tokenImplementation.getAddress(),
        completed: true,
      });

      // 步骤2: 部署代理合约
      console.log("\n2️⃣ 步骤2: 部署代理合约");

      const usdxTokenProxy = await deploymentTracker.trackDeployment(
        "USDXToken (Proxy)",
        upgrades.deployProxy(
          USDXToken,
          [
            testBase.config.TOKEN.NAME,
            testBase.config.TOKEN.SYMBOL,
            testBase.config.TOKEN.INITIAL_SUPPLY,
            deployer.address,
          ],
          {
            initializer: "initialize",
            kind: "uups",
            constructorArgs: [],
          },
        ),
      );

      deploymentSteps.push({
        step: 2,
        name: "Token Proxy",
        address: await usdxTokenProxy.getAddress(),
        completed: true,
      });

      // 步骤3: 验证代理指向
      console.log("\n3️⃣ 步骤3: 验证代理配置");

      expect(await usdxTokenProxy.name()).to.equal(testBase.config.TOKEN.NAME);
      expect(await usdxTokenProxy.symbol()).to.equal(testBase.config.TOKEN.SYMBOL);

      deploymentSteps.push({
        step: 3,
        name: "Proxy Verification",
        address: "N/A",
        completed: true,
      });

      // 步骤4: 部署治理实现合约
      console.log("\n4️⃣ 步骤4: 部署治理实现合约");

      const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
      const governanceImplementation = await deploymentTracker.trackDeployment(
        "USDXGovernance (Implementation)",
        USDXGovernance.deploy(),
      );

      deploymentSteps.push({
        step: 4,
        name: "Governance Implementation",
        address: await governanceImplementation.getAddress(),
        completed: true,
      });

      // 步骤5: 部署治理代理合约
      console.log("\n5️⃣ 步骤5: 部署治理代理合约");

      const governors = (await ethers.getSigners()).slice(1, 4);
      const governanceProxy = await deploymentTracker.trackDeployment(
        "USDXGovernance (Proxy)",
        upgrades.deployProxy(
          USDXGovernance,
          [
            await usdxTokenProxy.getAddress(),
            governors.map(g => g.address),
            testBase.config.GOVERNANCE.REQUIRED_VOTES,
            testBase.config.GOVERNANCE.VOTING_PERIOD,
            testBase.config.GOVERNANCE.EXECUTION_DELAY,
          ],
          { initializer: "initialize", kind: "uups" },
        ),
      );

      deploymentSteps.push({
        step: 5,
        name: "Governance Proxy",
        address: await governanceProxy.getAddress(),
        completed: true,
      });

      // 步骤6: 配置权限
      console.log("\n6️⃣ 步骤6: 配置系统权限");

      const UPGRADER_ROLE = await usdxTokenProxy.UPGRADER_ROLE();
      await usdxTokenProxy.grantRole(UPGRADER_ROLE, await governanceProxy.getAddress());

      deploymentSteps.push({
        step: 6,
        name: "Permission Configuration",
        address: "N/A",
        completed: true,
      });

      // 生成部署步骤报告
      console.log("\n📋 部署步骤报告:");
      deploymentSteps.forEach(step => {
        const status = step.completed ? "✅" : "❌";
        console.log(`${status} 步骤${step.step}: ${step.name} - ${step.address}`);
      });

      // 验证所有步骤完成
      const allStepsCompleted = deploymentSteps.every(step => step.completed);
      expect(allStepsCompleted).to.be.true;
      console.log("✅ 所有部署步骤成功完成");
    });
  });

  describe("升级部署测试", () => {
    it("应该支持合约升级部署", async () => {
      console.log("\n🔄 === 合约升级部署测试 ===");

      const [deployer] = await ethers.getSigners();

      // 部署初始版本
      console.log("\n📦 部署USDX Token v1");

      const USDXTokenV1 = await ethers.getContractFactory("USDXToken");
      const tokenV1 = await deploymentTracker.trackDeployment(
        "USDXToken V1 (Proxy)",
        upgrades.deployProxy(
          USDXTokenV1,
          [
            testBase.config.TOKEN.NAME,
            testBase.config.TOKEN.SYMBOL,
            TestHelpers.parseAmount("1000000"),
            deployer.address,
          ],
          { initializer: "initialize", kind: "uups" },
        ),
      );

      const v1Address = await tokenV1.getAddress();
      const v1TotalSupply = await tokenV1.totalSupply();

      console.log(`V1 部署地址: ${v1Address}`);
      console.log(`V1 总供应量: ${TestHelpers.formatAmount(v1TotalSupply)} USDX`);

      // 模拟升级到V2
      console.log("\n🔄 升级到USDX Token v2");

      // 注意：在实际项目中，这里应该是真正的V2合约
      // 为了测试目的，我们使用相同的合约但记录为V2
      const USDXTokenV2 = await ethers.getContractFactory("USDXToken");
      const _tokenV2 = await deploymentTracker.trackDeployment(
        "USDXToken V2 (Implementation)",
        USDXTokenV2.deploy(),
      );

      // 执行升级
      await upgrades.upgradeProxy(v1Address, USDXTokenV2);

      const upgradedToken = USDXTokenV1.attach(v1Address);
      const v2TotalSupply = await upgradedToken.totalSupply();
      const v2Address = await upgradedToken.getAddress();

      console.log(`V2 地址 (应该相同): ${v2Address}`);
      console.log(`V2 总供应量 (应该保持): ${TestHelpers.formatAmount(v2TotalSupply)} USDX`);

      // 验证升级结果
      expect(v2Address).to.equal(v1Address); // 代理地址应该保持不变
      expect(v2TotalSupply).to.equal(v1TotalSupply); // 状态应该保持
      expect(await upgradedToken.name()).to.equal(testBase.config.TOKEN.NAME); // 基本功能正常

      console.log("✅ 合约升级成功，状态保持完整");
    });

    it("应该处理升级失败场景", async () => {
      console.log("\n⚠️ === 升级失败场景测试 ===");

      const [deployer, nonUpgrader] = await ethers.getSigners();

      // 部署初始合约
      const USDXToken = await ethers.getContractFactory("USDXToken");
      const token = await deploymentTracker.trackDeployment(
        "USDXToken (Test Upgrade)",
        upgrades.deployProxy(
          USDXToken,
          ["USDX Test", "USDXT", TestHelpers.parseAmount("1000"), deployer.address],
          { initializer: "initialize", kind: "uups" },
        ),
      );

      // 移除部署者的升级权限
      const UPGRADER_ROLE = await token.UPGRADER_ROLE();
      await token.revokeRole(UPGRADER_ROLE, deployer.address);

      // 尝试无权限升级（应该失败）
      const NewImplementation = await ethers.getContractFactory("USDXToken");
      const newImpl = await NewImplementation.deploy();

      await expect(token.connect(nonUpgrader).upgradeTo(await newImpl.getAddress())).to.be.reverted;

      console.log("✅ 无权限升级被正确拒绝");

      // 恢复权限并成功升级
      await token.grantRole(UPGRADER_ROLE, deployer.address);

      // 这次应该成功
      await expect(token.connect(deployer).upgradeTo(await newImpl.getAddress())).to.not.be
        .reverted;

      console.log("✅ 权限恢复后升级成功");
    });
  });

  describe("网络部署测试", () => {
    it("应该模拟多网络部署场景", async () => {
      console.log("\n🌐 === 多网络部署场景测试 ===");

      // 模拟不同网络的部署配置
      const networkConfigs = {
        mainnet: {
          name: "Ethereum Mainnet",
          chainId: 1,
          gasPrice: "30", // 30 Gwei
          initialSupply: "1000000000", // 10亿
        },
        polygon: {
          name: "Polygon",
          chainId: 137,
          gasPrice: "30", // 30 Gwei
          initialSupply: "500000000", // 5亿
        },
        bsc: {
          name: "BSC",
          chainId: 56,
          gasPrice: "5", // 5 Gwei
          initialSupply: "300000000", // 3亿
        },
      };

      const deployResults = {};

      // 模拟在每个网络上的部署
      for (const [network, config] of Object.entries(networkConfigs)) {
        console.log(`\n🚀 模拟在${config.name}上部署`);

        const [deployer] = await ethers.getSigners();
        const USDXToken = await ethers.getContractFactory("USDXToken");

        const initialSupply = TestHelpers.parseAmount(config.initialSupply);

        const token = await deploymentTracker.trackDeployment(
          `USDXToken (${config.name})`,
          upgrades.deployProxy(
            USDXToken,
            [
              `USDX-${network.toUpperCase()}`,
              `USDX-${network.toUpperCase()}`,
              initialSupply,
              deployer.address,
            ],
            { initializer: "initialize", kind: "uups" },
          ),
        );

        deployResults[network] = {
          address: await token.getAddress(),
          name: await token.name(),
          symbol: await token.symbol(),
          totalSupply: TestHelpers.formatAmount(await token.totalSupply()),
          chainId: config.chainId,
        };

        console.log(`✅ ${config.name} 部署完成: ${deployResults[network].address}`);
      }

      // 生成多网络部署报告
      console.log("\n📊 多网络部署总结:");
      for (const [network, result] of Object.entries(deployResults)) {
        console.log(`${network.toUpperCase()}:`);
        console.log(`  地址: ${result.address}`);
        console.log(`  名称: ${result.name}`);
        console.log(`  供应量: ${result.totalSupply}`);
        console.log(`  链ID: ${result.chainId}`);
      }

      // 验证每个网络的部署
      expect(Object.keys(deployResults)).to.have.lengthOf(3);
      Object.values(deployResults).forEach(result => {
        expect(result.address).to.match(/^0x[a-fA-F0-9]{40}$/);
        expect(result.totalSupply).to.be.a("string");
      });

      console.log("✅ 多网络部署模拟完成");
    });
  });
});
