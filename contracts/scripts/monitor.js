const { ethers } = require("hardhat");
const fs = require("fs");
const _path = require("path");

/**
 * USDT Stablecoin Monitoring System
 *
 * This script monitors contract activities and generates alerts:
 * - Transfer monitoring
 * - Governance activity tracking
 * - Compliance violations
 * - Emergency situations
 * - Role changes
 * - Contract upgrades
 */

class ContractMonitor {
  constructor(tokenAddress, governanceAddress) {
    this.tokenAddress = tokenAddress;
    this.governanceAddress = governanceAddress;
    this.token = null;
    this.governance = null;
    this.lastProcessedBlock = null;
    this.alertThresholds = {
      largeTransfer: ethers.utils.parseUnits("1000000", 6), // 1M USDT
      rapidTransfers: 100, // 100 transfers in monitoring period
      holderCountChange: 50, // 50 new holders
      governanceVotes: 5, // 5 votes in period
      blacklistAdditions: 10, // 10 new blacklisted addresses
    };
    this.monitoringResults = {
      transfers: [],
      governance: [],
      compliance: [],
      security: [],
      alerts: [],
    };
  }

  async initialize() {
    console.log("🔍 Initializing Contract Monitor...");

    // Connect to contracts
    this.token = await ethers.getContractAt("USDTToken", this.tokenAddress);
    this.governance = await ethers.getContractAt("USDTGovernance", this.governanceAddress);

    // Get latest block
    this.lastProcessedBlock = await ethers.provider.getBlockNumber();

    console.log(`✅ Connected to Token: ${this.tokenAddress}`);
    console.log(`✅ Connected to Governance: ${this.governanceAddress}`);
    console.log(`📊 Starting from block: ${this.lastProcessedBlock}`);
  }

  async monitorTransfers(fromBlock, toBlock) {
    console.log("💸 Monitoring transfers...");

    const transferEvents = await this.token.queryFilter("Transfer", fromBlock, toBlock);

    for (const event of transferEvents) {
      const { from, to, value } = event.args;
      const blockNumber = event.blockNumber;
      const transactionHash = event.transactionHash;

      const transfer = {
        from,
        to,
        value: value.toString(),
        valueFormatted: ethers.utils.formatUnits(value, 6),
        blockNumber,
        transactionHash,
        timestamp: (await ethers.provider.getBlock(blockNumber)).timestamp,
      };

      this.monitoringResults.transfers.push(transfer);

      // Check for large transfers
      if (value.gte(this.alertThresholds.largeTransfer)) {
        this.addAlert(
          "LARGE_TRANSFER",
          `Large transfer detected: ${transfer.valueFormatted} USDT`,
          transfer,
        );
      }

      // Check for zero address (mint/burn)
      if (from === ethers.constants.AddressZero) {
        this.addAlert(
          "MINT_DETECTED",
          `Mint detected: ${transfer.valueFormatted} USDT to ${to}`,
          transfer,
        );
      }

      if (to === ethers.constants.AddressZero) {
        this.addAlert(
          "BURN_DETECTED",
          `Burn detected: ${transfer.valueFormatted} USDT from ${from}`,
          transfer,
        );
      }
    }

    console.log(`  📊 Processed ${transferEvents.length} transfers`);

    // Check rapid transfers
    if (transferEvents.length > this.alertThresholds.rapidTransfers) {
      this.addAlert(
        "RAPID_TRANSFERS",
        `High transfer activity: ${transferEvents.length} transfers`,
        {
          count: transferEvents.length,
          threshold: this.alertThresholds.rapidTransfers,
        },
      );
    }
  }

  async monitorGovernance(fromBlock, toBlock) {
    console.log("🏛️ Monitoring governance...");

    const events = await Promise.all([
      this.governance.queryFilter("ProposalCreated", fromBlock, toBlock),
      this.governance.queryFilter("VoteCast", fromBlock, toBlock),
      this.governance.queryFilter("ProposalExecuted", fromBlock, toBlock),
      this.governance.queryFilter("ProposalCancelled", fromBlock, toBlock),
    ]);

    const [proposalEvents, voteEvents, executionEvents, _cancelEvents] = events;

    // Process proposals
    for (const event of proposalEvents) {
      const { proposalId, proposer, target, value, data, description } = event.args;

      const proposal = {
        proposalId: proposalId.toString(),
        proposer,
        target,
        value: value.toString(),
        data,
        description,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.governance.push({
        type: "PROPOSAL_CREATED",
        ...proposal,
      });

      this.addAlert("GOVERNANCE_PROPOSAL", `New governance proposal: ${description}`, proposal);
    }

    // Process votes
    for (const event of voteEvents) {
      const { proposalId, voter, support } = event.args;

      const vote = {
        proposalId: proposalId.toString(),
        voter,
        support,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.governance.push({
        type: "VOTE_CAST",
        ...vote,
      });
    }

    // Process executions
    for (const event of executionEvents) {
      const { proposalId } = event.args;

      const execution = {
        proposalId: proposalId.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.governance.push({
        type: "PROPOSAL_EXECUTED",
        ...execution,
      });

      this.addAlert("GOVERNANCE_EXECUTION", `Proposal executed: ${proposalId}`, execution);
    }

    console.log(
      `  📊 Processed ${proposalEvents.length} proposals, ${voteEvents.length} votes, ${executionEvents.length} executions`,
    );

    // Check for high governance activity
    if (voteEvents.length > this.alertThresholds.governanceVotes) {
      this.addAlert(
        "HIGH_GOVERNANCE_ACTIVITY",
        `High governance activity: ${voteEvents.length} votes`,
        {
          count: voteEvents.length,
          threshold: this.alertThresholds.governanceVotes,
        },
      );
    }
  }

  async monitorCompliance(fromBlock, toBlock) {
    console.log("📋 Monitoring compliance...");

    const events = await Promise.all([
      this.token.queryFilter("BlacklistUpdated", fromBlock, toBlock),
      this.token.queryFilter("KYCVerified", fromBlock, toBlock),
      this.token.queryFilter("Sanctioned", fromBlock, toBlock),
      this.token.queryFilter("Whitelisted", fromBlock, toBlock),
    ]);

    const [blacklistEvents, kycEvents, sanctionEvents, _whitelistEvents] = events;

    // Process blacklist updates
    for (const event of blacklistEvents) {
      const { account, blacklisted } = event.args;

      const blacklistUpdate = {
        account,
        blacklisted,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.compliance.push({
        type: "BLACKLIST_UPDATED",
        ...blacklistUpdate,
      });

      if (blacklisted) {
        this.addAlert("BLACKLIST_ADDITION", `Address blacklisted: ${account}`, blacklistUpdate);
      }
    }

    // Process KYC updates
    for (const event of kycEvents) {
      const { account, verified } = event.args;

      const kycUpdate = {
        account,
        verified,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.compliance.push({
        type: "KYC_UPDATED",
        ...kycUpdate,
      });
    }

    // Process sanction updates
    for (const event of sanctionEvents) {
      const { account, sanctioned } = event.args;

      const sanctionUpdate = {
        account,
        sanctioned,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.compliance.push({
        type: "SANCTION_UPDATED",
        ...sanctionUpdate,
      });

      if (sanctioned) {
        this.addAlert("SANCTION_ADDITION", `Address sanctioned: ${account}`, sanctionUpdate);
      }
    }

    console.log(
      `  📊 Processed ${blacklistEvents.length} blacklist, ${kycEvents.length} KYC, ${sanctionEvents.length} sanction updates`,
    );

    // Check for high blacklist activity
    const newBlacklists = blacklistEvents.filter(e => e.args.blacklisted).length;
    if (newBlacklists > this.alertThresholds.blacklistAdditions) {
      this.addAlert(
        "HIGH_BLACKLIST_ACTIVITY",
        `High blacklist activity: ${newBlacklists} additions`,
        {
          count: newBlacklists,
          threshold: this.alertThresholds.blacklistAdditions,
        },
      );
    }
  }

  async monitorSecurity(fromBlock, toBlock) {
    console.log("🔒 Monitoring security...");

    const events = await Promise.all([
      this.token.queryFilter("Paused", fromBlock, toBlock),
      this.token.queryFilter("Unpaused", fromBlock, toBlock),
      this.token.queryFilter("RoleGranted", fromBlock, toBlock),
      this.token.queryFilter("RoleRevoked", fromBlock, toBlock),
      this.token.queryFilter("Upgraded", fromBlock, toBlock),
    ]);

    const [pausedEvents, unpausedEvents, roleGrantedEvents, roleRevokedEvents, upgradeEvents] =
      events;

    // Process pause events
    for (const event of pausedEvents) {
      const pauseInfo = {
        account: event.args.account,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.security.push({
        type: "PAUSED",
        ...pauseInfo,
      });

      this.addAlert("CONTRACT_PAUSED", `Contract paused by ${pauseInfo.account}`, pauseInfo);
    }

    // Process unpause events
    for (const event of unpausedEvents) {
      const unpauseInfo = {
        account: event.args.account,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.security.push({
        type: "UNPAUSED",
        ...unpauseInfo,
      });

      this.addAlert(
        "CONTRACT_UNPAUSED",
        `Contract unpaused by ${unpauseInfo.account}`,
        unpauseInfo,
      );
    }

    // Process role changes
    for (const event of roleGrantedEvents) {
      const { role, account, sender } = event.args;

      const roleGrant = {
        role,
        account,
        sender,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.security.push({
        type: "ROLE_GRANTED",
        ...roleGrant,
      });

      this.addAlert("ROLE_GRANTED", `Role granted to ${account}`, roleGrant);
    }

    for (const event of roleRevokedEvents) {
      const { role, account, sender } = event.args;

      const roleRevoke = {
        role,
        account,
        sender,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.security.push({
        type: "ROLE_REVOKED",
        ...roleRevoke,
      });

      this.addAlert("ROLE_REVOKED", `Role revoked from ${account}`, roleRevoke);
    }

    // Process upgrade events
    for (const event of upgradeEvents) {
      const { implementation } = event.args;

      const upgrade = {
        implementation,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };

      this.monitoringResults.security.push({
        type: "UPGRADED",
        ...upgrade,
      });

      this.addAlert("CONTRACT_UPGRADED", `Contract upgraded to ${implementation}`, upgrade);
    }

    console.log(
      `  📊 Processed security events: ${pausedEvents.length + unpausedEvents.length + roleGrantedEvents.length + roleRevokedEvents.length + upgradeEvents.length}`,
    );
  }

  async checkSystemHealth() {
    console.log("🏥 Checking system health...");

    try {
      // Check token status
      const isPaused = await this.token.paused();
      const totalSupply = await this.token.totalSupply();
      const holderCount = await this.token.getCurrentHolderCount();
      const maxHolders = await this.token.getMaxHolderCount();

      // Check governance status
      const governorCount = await this.governance.getGovernorCount();
      const requiredVotes = await this.governance.requiredVotes();
      const activeProposals = await this.governance.proposalCount();

      const healthStatus = {
        token: {
          paused: isPaused,
          totalSupply: ethers.utils.formatUnits(totalSupply, 6),
          holderCount: holderCount.toString(),
          maxHolders: maxHolders.toString(),
          utilizationRate: `${((holderCount.toNumber() / maxHolders.toNumber()) * 100).toFixed(2)}%`,
        },
        governance: {
          governorCount: governorCount.toString(),
          requiredVotes: requiredVotes.toString(),
          activeProposals: activeProposals.toString(),
        },
        timestamp: new Date().toISOString(),
      };

      // Health checks
      if (isPaused) {
        this.addAlert("CONTRACT_PAUSED_STATUS", "Contract is currently paused", healthStatus);
      }

      if (holderCount > (maxHolders * 90n) / 100n) {
        this.addAlert(
          "HIGH_HOLDER_COUNT",
          `Holder count is ${healthStatus.token.utilizationRate} of maximum`,
          healthStatus,
        );
      }

      if (governorCount.lt(3)) {
        this.addAlert(
          "LOW_GOVERNOR_COUNT",
          `Only ${governorCount} governors configured`,
          healthStatus,
        );
      }

      return healthStatus;
    } catch (error) {
      this.addAlert("HEALTH_CHECK_ERROR", `Health check failed: ${error.message}`, {
        error: error.message,
      });
      return null;
    }
  }

  addAlert(type, message, data) {
    const alert = {
      type,
      message,
      data,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type),
    };

    this.monitoringResults.alerts.push(alert);

    // Console output with color coding
    const severityColors = {
      LOW: "\x1b[32m", // Green
      MEDIUM: "\x1b[33m", // Yellow
      HIGH: "\x1b[31m", // Red
      CRITICAL: "\x1b[35m", // Magenta
    };

    const resetColor = "\x1b[0m";
    const color = severityColors[alert.severity] || "";

    console.log(`  ${color}🚨 [${alert.severity}] ${message}${resetColor}`);
  }

  getAlertSeverity(type) {
    const severityMap = {
      LARGE_TRANSFER: "MEDIUM",
      RAPID_TRANSFERS: "HIGH",
      MINT_DETECTED: "LOW",
      BURN_DETECTED: "LOW",
      GOVERNANCE_PROPOSAL: "MEDIUM",
      GOVERNANCE_EXECUTION: "HIGH",
      HIGH_GOVERNANCE_ACTIVITY: "MEDIUM",
      BLACKLIST_ADDITION: "MEDIUM",
      SANCTION_ADDITION: "HIGH",
      HIGH_BLACKLIST_ACTIVITY: "HIGH",
      CONTRACT_PAUSED: "CRITICAL",
      CONTRACT_UNPAUSED: "HIGH",
      ROLE_GRANTED: "HIGH",
      ROLE_REVOKED: "HIGH",
      CONTRACT_UPGRADED: "CRITICAL",
      CONTRACT_PAUSED_STATUS: "CRITICAL",
      HIGH_HOLDER_COUNT: "MEDIUM",
      LOW_GOVERNOR_COUNT: "HIGH",
      HEALTH_CHECK_ERROR: "HIGH",
    };

    return severityMap[type] || "LOW";
  }

  async runMonitoring(blockRange = 1000) {
    console.log(`\n🔍 Running monitoring for last ${blockRange} blocks...`);

    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - blockRange);
    const toBlock = currentBlock;

    console.log(`📊 Monitoring blocks ${fromBlock} to ${toBlock}`);

    // Reset results
    this.monitoringResults = {
      transfers: [],
      governance: [],
      compliance: [],
      security: [],
      alerts: [],
    };

    // Run all monitoring tasks
    await this.monitorTransfers(fromBlock, toBlock);
    await this.monitorGovernance(fromBlock, toBlock);
    await this.monitorCompliance(fromBlock, toBlock);
    await this.monitorSecurity(fromBlock, toBlock);

    // Check system health
    const healthStatus = await this.checkSystemHealth();

    // Generate report
    const report = this.generateMonitoringReport(healthStatus, fromBlock, toBlock);

    return report;
  }

  generateMonitoringReport(healthStatus, fromBlock, toBlock) {
    const report = {
      timestamp: new Date().toISOString(),
      blockRange: { from: fromBlock, to: toBlock },
      contracts: {
        token: this.tokenAddress,
        governance: this.governanceAddress,
      },
      summary: {
        totalTransfers: this.monitoringResults.transfers.length,
        totalGovernanceEvents: this.monitoringResults.governance.length,
        totalComplianceEvents: this.monitoringResults.compliance.length,
        totalSecurityEvents: this.monitoringResults.security.length,
        totalAlerts: this.monitoringResults.alerts.length,
        alertsBySeverity: {
          LOW: this.monitoringResults.alerts.filter(a => a.severity === "LOW").length,
          MEDIUM: this.monitoringResults.alerts.filter(a => a.severity === "MEDIUM").length,
          HIGH: this.monitoringResults.alerts.filter(a => a.severity === "HIGH").length,
          CRITICAL: this.monitoringResults.alerts.filter(a => a.severity === "CRITICAL").length,
        },
      },
      healthStatus,
      events: this.monitoringResults,
      alerts: this.monitoringResults.alerts,
    };

    // Save report
    const reportFile = `monitoring-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Display summary
    console.log("\n📊 Monitoring Report Summary:");
    console.log(`  📄 Report saved to: ${reportFile}`);
    console.log(`  📊 Transfers: ${report.summary.totalTransfers}`);
    console.log(`  🏛️  Governance Events: ${report.summary.totalGovernanceEvents}`);
    console.log(`  📋 Compliance Events: ${report.summary.totalComplianceEvents}`);
    console.log(`  🔒 Security Events: ${report.summary.totalSecurityEvents}`);
    console.log(`  🚨 Total Alerts: ${report.summary.totalAlerts}`);
    console.log(`    🟢 Low: ${report.summary.alertsBySeverity.LOW}`);
    console.log(`    🟡 Medium: ${report.summary.alertsBySeverity.MEDIUM}`);
    console.log(`    🔴 High: ${report.summary.alertsBySeverity.HIGH}`);
    console.log(`    🟣 Critical: ${report.summary.alertsBySeverity.CRITICAL}`);

    return report;
  }
}

// Real-time monitoring function
async function startRealTimeMonitoring(tokenAddress, governanceAddress, interval = 30000) {
  console.log(`🔄 Starting real-time monitoring (${interval}ms interval)...`);

  const monitor = new ContractMonitor(tokenAddress, governanceAddress);
  await monitor.initialize();

  const runCycle = async () => {
    try {
      await monitor.runMonitoring(100); // Monitor last 100 blocks
      console.log(`⏰ Next check in ${interval / 1000} seconds...`);
    } catch (error) {
      console.error("❌ Monitoring cycle failed:", error);
    }
  };

  // Run initial check
  await runCycle();

  // Set up recurring monitoring
  setInterval(runCycle, interval);
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: node scripts/monitor.js <token-address> <governance-address> [block-range] [--realtime]",
    );
    process.exit(1);
  }

  const tokenAddress = args[0];
  const governanceAddress = args[1];
  const blockRange = args[2] ? parseInt(args[2]) : 1000;
  const realtime = args.includes("--realtime");

  if (realtime) {
    await startRealTimeMonitoring(tokenAddress, governanceAddress);
  } else {
    const monitor = new ContractMonitor(tokenAddress, governanceAddress);
    await monitor.initialize();
    await monitor.runMonitoring(blockRange);
  }
}

// Export for use in other scripts
module.exports = {
  ContractMonitor,
  startRealTimeMonitoring,
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
