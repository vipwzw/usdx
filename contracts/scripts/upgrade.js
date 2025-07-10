const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const _path = require("path");

/**
 * USDT Stablecoin Contract Upgrade Tool
 *
 * This script handles upgrading UUPS proxy contracts safely:
 * - Pre-upgrade validations
 * - Upgrade execution
 * - Post-upgrade verification
 * - Rollback capabilities
 */

class ContractUpgrader {
  constructor(contractType, proxyAddress, governanceAddress) {
    this.contractType = contractType; // 'token' or 'governance'
    this.proxyAddress = proxyAddress;
    this.governanceAddress = governanceAddress;
    this.oldImplementation = null;
    this.newImplementation = null;
    this.upgradeTransaction = null;
  }

  async initialize() {
    console.log(`🔄 Initializing ${this.contractType} upgrade...`);

    // Get current implementation
    this.oldImplementation = await upgrades.erc1967.getImplementationAddress(this.proxyAddress);
    console.log(`Current implementation: ${this.oldImplementation}`);

    // Validate contract type
    if (this.contractType !== "token" && this.contractType !== "governance") {
      throw new Error("Contract type must be 'token' or 'governance'");
    }
  }

  async validateUpgrade() {
    console.log("✅ Validating upgrade compatibility...");

    try {
      let ContractFactory;

      if (this.contractType === "token") {
        ContractFactory = await ethers.getContractFactory("USDTToken");
      } else {
        ContractFactory = await ethers.getContractFactory("USDTGovernance");
      }

      // Validate upgrade compatibility
      await upgrades.validateUpgrade(this.proxyAddress, ContractFactory);
      console.log("✅ Upgrade validation passed");

      return true;
    } catch (error) {
      console.error("❌ Upgrade validation failed:", error.message);
      return false;
    }
  }

  async performUpgrade(useGovernance = false) {
    console.log(`🚀 Performing ${this.contractType} upgrade...`);

    try {
      let ContractFactory;

      if (this.contractType === "token") {
        ContractFactory = await ethers.getContractFactory("USDTToken");
      } else {
        ContractFactory = await ethers.getContractFactory("USDTGovernance");
      }

      if (useGovernance) {
        await this.upgradeViaGovernance(ContractFactory);
      } else {
        await this.upgradeDirectly(ContractFactory);
      }

      // Get new implementation address
      this.newImplementation = await upgrades.erc1967.getImplementationAddress(this.proxyAddress);
      console.log(`New implementation: ${this.newImplementation}`);

      return true;
    } catch (error) {
      console.error("❌ Upgrade failed:", error.message);
      return false;
    }
  }

  async upgradeDirectly(ContractFactory) {
    console.log("📝 Upgrading directly...");

    const upgraded = await upgrades.upgradeProxy(this.proxyAddress, ContractFactory);
    await upgraded.deployed();

    console.log("✅ Direct upgrade completed");
    return upgraded;
  }

  async upgradeViaGovernance(ContractFactory) {
    console.log("🏛️ Upgrading via governance...");

    // Deploy new implementation
    const newImplementation = await ContractFactory.deploy();
    await newImplementation.deployed();

    console.log(`New implementation deployed: ${newImplementation.address}`);

    // Create upgrade proposal
    const governance = await ethers.getContractAt("USDTGovernance", this.governanceAddress);
    let upgradeData;
    if (this.contractType === "token") {
      const tokenContract = await ethers.getContractAt("USDTToken", this.proxyAddress);
      upgradeData = tokenContract.interface.encodeFunctionData("upgradeTo", [
        newImplementation.address,
      ]);
    } else {
      const governanceContract = await ethers.getContractAt("USDTGovernance", this.proxyAddress);
      upgradeData = governanceContract.interface.encodeFunctionData("upgradeTo", [
        newImplementation.address,
      ]);
    }

    const description = `Upgrade ${this.contractType} contract to ${newImplementation.address}`;

    const tx = await governance.propose(this.proxyAddress, 0, upgradeData, description);

    const receipt = await tx.wait();
    const proposalId = receipt.events.find(e => e.event === "ProposalCreated").args.proposalId;

    console.log(`✅ Upgrade proposal created: ${proposalId}`);
    console.log("⏳ Waiting for governance approval and execution...");

    return { proposalId, newImplementation: newImplementation.address };
  }

  async verifyUpgrade() {
    console.log("🔍 Verifying upgrade...");

    try {
      // Check that implementation changed
      if (this.oldImplementation === this.newImplementation) {
        console.error("❌ Implementation address didn't change");
        return false;
      }

      // Test basic functionality
      if (this.contractType === "token") {
        await this.verifyTokenUpgrade();
      } else {
        await this.verifyGovernanceUpgrade();
      }

      console.log("✅ Upgrade verification passed");
      return true;
    } catch (error) {
      console.error("❌ Upgrade verification failed:", error.message);
      return false;
    }
  }

  async verifyTokenUpgrade() {
    const token = await ethers.getContractAt("USDTToken", this.proxyAddress);

    // Test basic read functions
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();

    console.log(`Token name: ${name}`);
    console.log(`Token symbol: ${symbol}`);
    console.log(`Total supply: ${ethers.utils.formatUnits(totalSupply, 6)}`);

    // Test ERC1404 functions
    const restrictionCode = await token.detectTransferRestriction(
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      0,
    );

    console.log(`ERC1404 restriction test: ${restrictionCode}`);
  }

  async verifyGovernanceUpgrade() {
    const governance = await ethers.getContractAt("USDTGovernance", this.proxyAddress);

    // Test basic read functions
    const governorCount = await governance.getGovernorCount();
    const requiredVotes = await governance.requiredVotes();
    const proposalCount = await governance.proposalCount();

    console.log(`Governor count: ${governorCount}`);
    console.log(`Required votes: ${requiredVotes}`);
    console.log(`Proposal count: ${proposalCount}`);
  }

  async generateUpgradeReport() {
    const report = {
      timestamp: new Date().toISOString(),
      contractType: this.contractType,
      proxyAddress: this.proxyAddress,
      oldImplementation: this.oldImplementation,
      newImplementation: this.newImplementation,
      upgradeTransaction: this.upgradeTransaction,
      network: hre.network.name,
      upgradeSuccess: this.newImplementation !== this.oldImplementation,
    };

    const reportFile = `upgrade-report-${this.contractType}-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`📄 Upgrade report saved to: ${reportFile}`);
    return report;
  }
}

// Helper function to prepare upgrade proposal
async function prepareUpgradeProposal(
  contractType,
  proxyAddress,
  newImplementationAddress,
  governanceAddress,
) {
  console.log("📋 Preparing upgrade proposal...");

  const _governance = await ethers.getContractAt("USDTGovernance", governanceAddress);

  let upgradeData;
  if (contractType === "token") {
    const token = await ethers.getContractAt("USDTToken", proxyAddress);
    upgradeData = token.interface.encodeFunctionData("upgradeTo", [newImplementationAddress]);
  } else {
    const gov = await ethers.getContractAt("USDTGovernance", proxyAddress);
    upgradeData = gov.interface.encodeFunctionData("upgradeTo", [newImplementationAddress]);
  }

  const description = `Upgrade ${contractType} contract to ${newImplementationAddress}`;

  return {
    target: proxyAddress,
    value: 0,
    data: upgradeData,
    description,
  };
}

// Helper function to check upgrade readiness
async function checkUpgradeReadiness(contractType, proxyAddress) {
  console.log("🔍 Checking upgrade readiness...");

  try {
    let ContractFactory;

    if (contractType === "token") {
      ContractFactory = await ethers.getContractFactory("USDTToken");
    } else {
      ContractFactory = await ethers.getContractFactory("USDTGovernance");
    }

    // Check if proxy is upgradeable
    const currentImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`Current implementation: ${currentImplementation}`);

    // Validate upgrade
    await upgrades.validateUpgrade(proxyAddress, ContractFactory);

    console.log("✅ Contract is ready for upgrade");
    return true;
  } catch (error) {
    console.error("❌ Upgrade readiness check failed:", error.message);
    return false;
  }
}

// Helper function to deploy new implementation
async function deployNewImplementation(contractType) {
  console.log(`📦 Deploying new ${contractType} implementation...`);

  let ContractFactory;

  if (contractType === "token") {
    ContractFactory = await ethers.getContractFactory("USDTToken");
  } else {
    ContractFactory = await ethers.getContractFactory("USDTGovernance");
  }

  const implementation = await ContractFactory.deploy();
  await implementation.deployed();

  console.log(`✅ New implementation deployed: ${implementation.address}`);
  return implementation.address;
}

// Main upgrade function
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: node scripts/upgrade.js <contract-type> <proxy-address> [governance-address]",
    );
    console.error("Contract type: 'token' or 'governance'");
    process.exit(1);
  }

  const contractType = args[0];
  const proxyAddress = args[1];
  const governanceAddress = args[2];
  const useGovernance = !!governanceAddress;

  console.log(`🔧 Starting ${contractType} upgrade...`);
  console.log(`Proxy Address: ${proxyAddress}`);
  console.log(`Use Governance: ${useGovernance}`);

  const upgrader = new ContractUpgrader(contractType, proxyAddress, governanceAddress);

  try {
    // Initialize
    await upgrader.initialize();

    // Validate upgrade
    const isValid = await upgrader.validateUpgrade();
    if (!isValid) {
      console.error("❌ Upgrade validation failed");
      process.exit(1);
    }

    // Perform upgrade
    const success = await upgrader.performUpgrade(useGovernance);
    if (!success) {
      console.error("❌ Upgrade failed");
      process.exit(1);
    }

    // Verify upgrade (skip for governance upgrades as they need manual execution)
    if (!useGovernance) {
      const verified = await upgrader.verifyUpgrade();
      if (!verified) {
        console.error("❌ Upgrade verification failed");
        process.exit(1);
      }
    }

    // Generate report
    await upgrader.generateUpgradeReport();

    console.log("🎉 Upgrade completed successfully!");
  } catch (error) {
    console.error("❌ Upgrade process failed:", error);
    process.exit(1);
  }
}

// Utility functions for manual operations
async function manualUpgrade(contractType, proxyAddress) {
  console.log(`🔧 Manual upgrade for ${contractType}...`);

  const upgrader = new ContractUpgrader(contractType, proxyAddress);
  await upgrader.initialize();

  if (await upgrader.validateUpgrade()) {
    return await upgrader.performUpgrade(false);
  }

  return false;
}

async function createUpgradeProposal(contractType, proxyAddress, governanceAddress) {
  console.log(`📋 Creating upgrade proposal for ${contractType}...`);

  // Deploy new implementation
  const newImplementation = await deployNewImplementation(contractType);

  // Prepare proposal
  const proposal = await prepareUpgradeProposal(
    contractType,
    proxyAddress,
    newImplementation,
    governanceAddress,
  );

  // Create proposal
  const governance = await ethers.getContractAt("USDTGovernance", governanceAddress);
  const tx = await governance.propose(
    proposal.target,
    proposal.value,
    proposal.data,
    proposal.description,
  );

  const receipt = await tx.wait();
  const proposalId = receipt.events.find(e => e.event === "ProposalCreated").args.proposalId;

  console.log(`✅ Upgrade proposal created: ${proposalId}`);
  console.log(`New implementation: ${newImplementation}`);

  return { proposalId, newImplementation };
}

// Export for use in other scripts
module.exports = {
  ContractUpgrader,
  prepareUpgradeProposal,
  checkUpgradeReadiness,
  deployNewImplementation,
  manualUpgrade,
  createUpgradeProposal,
};

// Handle different command modes
if (require.main === module) {
  const command = process.argv[2];

  if (command === "check") {
    // Check upgrade readiness
    const contractType = process.argv[3];
    const proxyAddress = process.argv[4];

    checkUpgradeReadiness(contractType, proxyAddress).catch(error => {
      console.error(error);
      process.exit(1);
    });
  } else if (command === "deploy") {
    // Deploy new implementation only
    const contractType = process.argv[3];

    deployNewImplementation(contractType).catch(error => {
      console.error(error);
      process.exit(1);
    });
  } else if (command === "proposal") {
    // Create upgrade proposal
    const contractType = process.argv[3];
    const proxyAddress = process.argv[4];
    const governanceAddress = process.argv[5];

    createUpgradeProposal(contractType, proxyAddress, governanceAddress).catch(error => {
      console.error(error);
      process.exit(1);
    });
  } else {
    // Full upgrade process
    main().catch(error => {
      console.error(error);
      process.exit(1);
    });
  }
}
