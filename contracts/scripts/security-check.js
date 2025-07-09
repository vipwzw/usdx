const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Security Check Tool for USDT Stablecoin Contracts
 * 
 * This tool performs various security checks on deployed contracts:
 * - Role assignments verification
 * - Configuration validation
 * - Access control verification
 * - Emergency functions testing
 * - Compliance settings verification
 */

class SecurityChecker {
  constructor(tokenAddress, governanceAddress) {
    this.tokenAddress = tokenAddress;
    this.governanceAddress = governanceAddress;
    this.token = null;
    this.governance = null;
    this.checks = [];
  }

  async initialize() {
    console.log("🔍 Initializing Security Checker...");
    
    // Connect to contracts
    this.token = await ethers.getContractAt("USDTToken", this.tokenAddress);
    this.governance = await ethers.getContractAt("USDTGovernance", this.governanceAddress);
    
    console.log(`✅ Connected to Token: ${this.tokenAddress}`);
    console.log(`✅ Connected to Governance: ${this.governanceAddress}`);
  }

  async runAllChecks() {
    console.log("\n🔐 Running Security Checks...\n");
    
    await this.checkRoleAssignments();
    await this.checkAccessControls();
    await this.checkEmergencyFunctions();
    await this.checkComplianceSettings();
    await this.checkGovernanceConfiguration();
    await this.checkUpgradeability();
    await this.checkTokenConfiguration();
    await this.checkEventEmissions();
    
    this.generateSecurityReport();
    return this.checks;
  }

  async checkRoleAssignments() {
    console.log("👥 Checking Role Assignments...");
    
    const roles = [
      { name: "DEFAULT_ADMIN_ROLE", key: await this.token.DEFAULT_ADMIN_ROLE() },
      { name: "MINTER_ROLE", key: await this.token.MINTER_ROLE() },
      { name: "BURNER_ROLE", key: await this.token.BURNER_ROLE() },
      { name: "BLACKLISTER_ROLE", key: await this.token.BLACKLISTER_ROLE() },
      { name: "PAUSER_ROLE", key: await this.token.PAUSER_ROLE() },
      { name: "COMPLIANCE_ROLE", key: await this.token.COMPLIANCE_ROLE() },
      { name: "UPGRADER_ROLE", key: await this.token.UPGRADER_ROLE() }
    ];

    for (const role of roles) {
      try {
        const adminRole = await this.token.getRoleAdmin(role.key);
        const memberCount = await this.token.getRoleMemberCount(role.key);
        
        const members = [];
        for (let i = 0; i < memberCount; i++) {
          const member = await this.token.getRoleMember(role.key, i);
          members.push(member);
        }

        this.addCheck({
          category: "Role Assignments",
          name: `${role.name} Configuration`,
          status: "PASS",
          details: {
            adminRole: adminRole,
            memberCount: memberCount.toString(),
            members: members
          },
          recommendations: memberCount.eq(0) ? [`No members assigned to ${role.name}`] : []
        });

        console.log(`  ✅ ${role.name}: ${memberCount} members`);
      } catch (error) {
        this.addCheck({
          category: "Role Assignments",
          name: `${role.name} Configuration`,
          status: "ERROR",
          details: { error: error.message },
          recommendations: [`Failed to check ${role.name}`]
        });
        console.log(`  ❌ ${role.name}: Error - ${error.message}`);
      }
    }
  }

  async checkAccessControls() {
    console.log("\n🔒 Checking Access Controls...");
    
    try {
      // Check if governance has necessary roles
      const MINTER_ROLE = await this.token.MINTER_ROLE();
      const PAUSER_ROLE = await this.token.PAUSER_ROLE();
      const UPGRADER_ROLE = await this.token.UPGRADER_ROLE();
      
      const governanceHasMinterRole = await this.token.hasRole(MINTER_ROLE, this.governanceAddress);
      const governanceHasPauserRole = await this.token.hasRole(PAUSER_ROLE, this.governanceAddress);
      const governanceHasUpgraderRole = await this.token.hasRole(UPGRADER_ROLE, this.governanceAddress);
      
      this.addCheck({
        category: "Access Control",
        name: "Governance Role Assignment",
        status: (governanceHasMinterRole && governanceHasPauserRole && governanceHasUpgraderRole) ? "PASS" : "WARN",
        details: {
          minterRole: governanceHasMinterRole,
          pauserRole: governanceHasPauserRole,
          upgraderRole: governanceHasUpgraderRole
        },
        recommendations: !governanceHasMinterRole ? ["Consider granting MINTER_ROLE to governance"] : []
      });

      console.log(`  ✅ Governance has MINTER_ROLE: ${governanceHasMinterRole}`);
      console.log(`  ✅ Governance has PAUSER_ROLE: ${governanceHasPauserRole}`);
      console.log(`  ✅ Governance has UPGRADER_ROLE: ${governanceHasUpgraderRole}`);
    } catch (error) {
      this.addCheck({
        category: "Access Control",
        name: "Governance Role Assignment",
        status: "ERROR",
        details: { error: error.message },
        recommendations: ["Failed to check governance roles"]
      });
    }
  }

  async checkEmergencyFunctions() {
    console.log("\n🚨 Checking Emergency Functions...");
    
    try {
      // Check pause status
      const isPaused = await this.token.paused();
      
      this.addCheck({
        category: "Emergency Functions",
        name: "Pause Functionality",
        status: "PASS",
        details: {
          currentlyPaused: isPaused,
          pauseFunctionExists: true
        },
        recommendations: isPaused ? ["Contract is currently paused"] : []
      });

      console.log(`  ✅ Contract pause status: ${isPaused}`);
      
      // Check if emergency roles are properly assigned
      const PAUSER_ROLE = await this.token.PAUSER_ROLE();
      const pauserCount = await this.token.getRoleMemberCount(PAUSER_ROLE);
      
      this.addCheck({
        category: "Emergency Functions",
        name: "Emergency Role Assignment",
        status: pauserCount.gt(0) ? "PASS" : "FAIL",
        details: {
          pauserCount: pauserCount.toString()
        },
        recommendations: pauserCount.eq(0) ? ["No pausers assigned - emergency response may be compromised"] : []
      });

      console.log(`  ✅ Number of pausers: ${pauserCount}`);
    } catch (error) {
      this.addCheck({
        category: "Emergency Functions",
        name: "Emergency Function Check",
        status: "ERROR",
        details: { error: error.message },
        recommendations: ["Failed to check emergency functions"]
      });
    }
  }

  async checkComplianceSettings() {
    console.log("\n📋 Checking Compliance Settings...");
    
    try {
      const kycRequired = await this.token.isKYCRequired();
      const whitelistEnabled = await this.token.isWhitelistEnabled();
      const regionRestrictionsEnabled = await this.token.isRegionRestrictionsEnabled();
      const maxHolderCount = await this.token.getMaxHolderCount();
      const currentHolderCount = await this.token.getCurrentHolderCount();
      const maxTransferAmount = await this.token.getMaxTransferAmount();
      const minTransferAmount = await this.token.getMinTransferAmount();
      
      this.addCheck({
        category: "Compliance Settings",
        name: "KYC and Whitelist Configuration",
        status: "PASS",
        details: {
          kycRequired,
          whitelistEnabled,
          regionRestrictionsEnabled,
          maxHolderCount: maxHolderCount.toString(),
          currentHolderCount: currentHolderCount.toString(),
          maxTransferAmount: ethers.utils.formatUnits(maxTransferAmount, 6),
          minTransferAmount: ethers.utils.formatUnits(minTransferAmount, 6)
        },
        recommendations: []
      });

      console.log(`  ✅ KYC Required: ${kycRequired}`);
      console.log(`  ✅ Whitelist Enabled: ${whitelistEnabled}`);
      console.log(`  ✅ Region Restrictions: ${regionRestrictionsEnabled}`);
      console.log(`  ✅ Max Holders: ${maxHolderCount}/${currentHolderCount}`);
      console.log(`  ✅ Transfer Limits: ${ethers.utils.formatUnits(minTransferAmount, 6)} - ${ethers.utils.formatUnits(maxTransferAmount, 6)}`);
    } catch (error) {
      this.addCheck({
        category: "Compliance Settings",
        name: "Compliance Configuration",
        status: "ERROR",
        details: { error: error.message },
        recommendations: ["Failed to check compliance settings"]
      });
    }
  }

  async checkGovernanceConfiguration() {
    console.log("\n🏛️ Checking Governance Configuration...");
    
    try {
      const governorCount = await this.governance.getGovernorCount();
      const requiredVotes = await this.governance.requiredVotes();
      const votingPeriod = await this.governance.votingPeriod();
      const executionDelay = await this.governance.executionDelay();
      const proposalCount = await this.governance.proposalCount();
      
      const governanceSecure = governorCount.gte(3) && requiredVotes.gte(2);
      
      this.addCheck({
        category: "Governance Configuration",
        name: "Governance Parameters",
        status: governanceSecure ? "PASS" : "WARN",
        details: {
          governorCount: governorCount.toString(),
          requiredVotes: requiredVotes.toString(),
          votingPeriod: votingPeriod.toString(),
          executionDelay: executionDelay.toString(),
          proposalCount: proposalCount.toString()
        },
        recommendations: !governanceSecure ? ["Consider increasing governor count and required votes for better security"] : []
      });

      console.log(`  ✅ Governor Count: ${governorCount}`);
      console.log(`  ✅ Required Votes: ${requiredVotes}`);
      console.log(`  ✅ Voting Period: ${votingPeriod} seconds`);
      console.log(`  ✅ Execution Delay: ${executionDelay} seconds`);
      console.log(`  ✅ Total Proposals: ${proposalCount}`);
    } catch (error) {
      this.addCheck({
        category: "Governance Configuration",
        name: "Governance Parameters",
        status: "ERROR",
        details: { error: error.message },
        recommendations: ["Failed to check governance configuration"]
      });
    }
  }

  async checkUpgradeability() {
    console.log("\n🔧 Checking Upgradeability...");
    
    try {
      // Check if contracts are upgradeable
      const tokenImplementation = await upgrades.erc1967.getImplementationAddress(this.tokenAddress);
      const governanceImplementation = await upgrades.erc1967.getImplementationAddress(this.governanceAddress);
      
      this.addCheck({
        category: "Upgradeability",
        name: "Proxy Implementation",
        status: "PASS",
        details: {
          tokenImplementation,
          governanceImplementation,
          upgradeablePattern: "UUPS"
        },
        recommendations: []
      });

      console.log(`  ✅ Token Implementation: ${tokenImplementation}`);
      console.log(`  ✅ Governance Implementation: ${governanceImplementation}`);
    } catch (error) {
      this.addCheck({
        category: "Upgradeability",
        name: "Proxy Implementation",
        status: "ERROR",
        details: { error: error.message },
        recommendations: ["Failed to check upgrade configuration"]
      });
    }
  }

  async checkTokenConfiguration() {
    console.log("\n🪙 Checking Token Configuration...");
    
    try {
      const name = await this.token.name();
      const symbol = await this.token.symbol();
      const decimals = await this.token.decimals();
      const totalSupply = await this.token.totalSupply();
      
      this.addCheck({
        category: "Token Configuration",
        name: "Basic Token Properties",
        status: "PASS",
        details: {
          name,
          symbol,
          decimals,
          totalSupply: ethers.utils.formatUnits(totalSupply, decimals)
        },
        recommendations: []
      });

      console.log(`  ✅ Name: ${name}`);
      console.log(`  ✅ Symbol: ${symbol}`);
      console.log(`  ✅ Decimals: ${decimals}`);
      console.log(`  ✅ Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)}`);
    } catch (error) {
      this.addCheck({
        category: "Token Configuration",
        name: "Basic Token Properties",
        status: "ERROR",
        details: { error: error.message },
        recommendations: ["Failed to check token configuration"]
      });
    }
  }

  async checkEventEmissions() {
    console.log("\n📡 Checking Event Emissions (Recent)...");
    
    try {
      // Check recent events (last 1000 blocks)
      const currentBlock = await ethers.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);
      
      const transferEvents = await this.token.queryFilter("Transfer", fromBlock, currentBlock);
      const blacklistEvents = await this.token.queryFilter("BlacklistUpdated", fromBlock, currentBlock);
      const proposalEvents = await this.governance.queryFilter("ProposalCreated", fromBlock, currentBlock);
      
      this.addCheck({
        category: "Event Monitoring",
        name: "Recent Activity",
        status: "PASS",
        details: {
          transferEvents: transferEvents.length,
          blacklistEvents: blacklistEvents.length,
          proposalEvents: proposalEvents.length,
          blockRange: `${fromBlock}-${currentBlock}`
        },
        recommendations: []
      });

      console.log(`  ✅ Transfer Events: ${transferEvents.length}`);
      console.log(`  ✅ Blacklist Events: ${blacklistEvents.length}`);
      console.log(`  ✅ Proposal Events: ${proposalEvents.length}`);
    } catch (error) {
      this.addCheck({
        category: "Event Monitoring",
        name: "Recent Activity",
        status: "ERROR",
        details: { error: error.message },
        recommendations: ["Failed to check recent events"]
      });
    }
  }

  addCheck(check) {
    check.timestamp = new Date().toISOString();
    this.checks.push(check);
  }

  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      contracts: {
        token: this.tokenAddress,
        governance: this.governanceAddress
      },
      summary: {
        total: this.checks.length,
        passed: this.checks.filter(c => c.status === "PASS").length,
        warnings: this.checks.filter(c => c.status === "WARN").length,
        errors: this.checks.filter(c => c.status === "ERROR").length,
        failed: this.checks.filter(c => c.status === "FAIL").length
      },
      checks: this.checks
    };

    const reportFile = `security-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log("\n📊 Security Report Generated:");
    console.log(`  ✅ Passed: ${report.summary.passed}`);
    console.log(`  ⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`  ❌ Errors: ${report.summary.errors}`);
    console.log(`  🚫 Failed: ${report.summary.failed}`);
    console.log(`  📄 Report saved to: ${reportFile}`);
    
    return report;
  }
}

// Helper function to test transfer restrictions
async function testTransferRestrictions(tokenAddress, fromAddress, toAddress, amount) {
  console.log("\n🔍 Testing Transfer Restrictions...");
  
  const token = await ethers.getContractAt("USDTToken", tokenAddress);
  
  try {
    const restrictionCode = await token.detectTransferRestriction(fromAddress, toAddress, amount);
    const restrictionMessage = await token.messageForTransferRestriction(restrictionCode);
    
    console.log(`  Restriction Code: ${restrictionCode}`);
    console.log(`  Restriction Message: ${restrictionMessage}`);
    
    return {
      code: restrictionCode,
      message: restrictionMessage,
      allowed: restrictionCode === 0
    };
  } catch (error) {
    console.error(`  Error testing restrictions: ${error.message}`);
    return { error: error.message };
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: node scripts/security-check.js <token-address> <governance-address>");
    process.exit(1);
  }
  
  const tokenAddress = args[0];
  const governanceAddress = args[1];
  
  const checker = new SecurityChecker(tokenAddress, governanceAddress);
  
  try {
    await checker.initialize();
    await checker.runAllChecks();
  } catch (error) {
    console.error("Security check failed:", error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  SecurityChecker,
  testTransferRestrictions
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
} 