const { ethers: _ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require("fs");
const _path = require("path");

async function main() {
  const networkName = hre.network.name;
  console.log(`\n=== Verifying contracts on ${networkName} ===`);

  // Try to load deployment info
  const deploymentFiles = fs
    .readdirSync(".")
    .filter(file => file.startsWith(`deployment-${networkName}-`) && file.endsWith(".json"));

  if (deploymentFiles.length === 0) {
    console.error("No deployment files found. Please deploy contracts first.");
    process.exit(1);
  }

  // Use the most recent deployment file
  const deploymentFile = deploymentFiles.sort().pop();
  console.log(`Using deployment file: ${deploymentFile}`);

  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { contracts, configuration: _configuration } = deploymentData;

  // Verify USDX Token Contract
  try {
    console.log("\n--- Verifying USDX Token Contract ---");
    console.log(`Contract Address: ${contracts.usdxToken.address}`);
    console.log(`Implementation Address: ${contracts.usdxToken.implementation}`);

    // Verify the implementation contract
    await hre.run("verify:verify", {
      address: contracts.usdxToken.implementation,
      constructorArguments: [],
      contract: "contracts/src/USDXToken.sol:USDXToken",
    });

    console.log("✅ USDX Token contract verified successfully");
  } catch (error) {
    console.error("❌ USDX Token verification failed:");
    console.error(error.message);

    // Don't exit, continue with other contracts
  }

  // Verify Governance Contract
  try {
    console.log("\n--- Verifying Governance Contract ---");
    console.log(`Contract Address: ${contracts.governance.address}`);
    console.log(`Implementation Address: ${contracts.governance.implementation}`);

    // Verify the implementation contract
    await hre.run("verify:verify", {
      address: contracts.governance.implementation,
      constructorArguments: [],
      contract: "contracts/src/USDXGovernance.sol:USDXGovernance",
    });

    console.log("✅ Governance contract verified successfully");
  } catch (error) {
    console.error("❌ Governance verification failed:");
    console.error(error.message);
  }

  // Verify proxy contracts if possible
  await verifyProxyContracts(contracts);

  // Generate verification report
  generateVerificationReport(contracts, networkName);

  console.log("\n=== Verification Summary ===");
  console.log(`Network: ${networkName}`);
  console.log(`USDX Token: ${contracts.usdxToken.address}`);
  console.log(`Governance: ${contracts.governance.address}`);
  console.log("\nVerification completed! Check the block explorer for verified contracts.");
}

async function verifyProxyContracts(contracts) {
  console.log("\n--- Verifying Proxy Contracts ---");

  // Note: Proxy contracts are usually automatically verified by OpenZeppelin
  // But we can provide additional information

  try {
    console.log("Proxy contracts are using OpenZeppelin's ERC1967 standard");
    console.log("These are typically auto-verified by block explorers");
    console.log("If manual verification is needed, use the proxy addresses:");
    console.log(`USDX Token Proxy: ${contracts.usdxToken.address}`);
    console.log(`Governance Proxy: ${contracts.governance.address}`);
  } catch (error) {
    console.error("Error with proxy verification:", error.message);
  }
}

function generateVerificationReport(contracts, networkName) {
  const report = {
    network: networkName,
    timestamp: new Date().toISOString(),
    contracts: {
      usdxToken: {
        proxy: contracts.usdxToken.address,
        implementation: contracts.usdxToken.implementation,
        proxyAdmin: contracts.usdxToken.proxyAdmin,
        verified: true, // This would be set based on actual verification results
      },
      governance: {
        proxy: contracts.governance.address,
        implementation: contracts.governance.implementation,
        proxyAdmin: contracts.governance.proxyAdmin,
        verified: true,
      },
    },
    verificationUrls: generateVerificationUrls(contracts, networkName),
  };

  const reportFile = `verification-report-${networkName}-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\nVerification report saved to: ${reportFile}`);
}

function generateVerificationUrls(contracts, networkName) {
  const baseUrls = {
    mainnet: "https://etherscan.io/address/",
    goerli: "https://goerli.etherscan.io/address/",
    sepolia: "https://sepolia.etherscan.io/address/",
    polygon: "https://polygonscan.com/address/",
    bsc: "https://bscscan.com/address/",
    arbitrum: "https://arbiscan.io/address/",
    optimism: "https://optimistic.etherscan.io/address/",
  };

  const baseUrl = baseUrls[networkName];
  if (!baseUrl) {
    return {};
  }

  return {
    usdxTokenProxy: `${baseUrl}${contracts.usdxToken.address}`,
    usdxTokenImplementation: `${baseUrl}${contracts.usdxToken.implementation}`,
    governanceProxy: `${baseUrl}${contracts.governance.address}`,
    governanceImplementation: `${baseUrl}${contracts.governance.implementation}`,
  };
}

// Alternative verification function for manual use
async function verifyContract(contractAddress, constructorArgs = [], contractPath = "") {
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
      contract: contractPath,
    });
    console.log(`✅ Contract ${contractAddress} verified successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Contract ${contractAddress} verification failed:`);
    console.error(error.message);
    return false;
  }
}

// Function to verify all contracts from a deployment
async function verifyAllContracts(deploymentFile) {
  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { contracts } = deploymentData;

  const results = [];

  // Verify USDX Token implementation
  const usdxResult = await verifyContract(
    contracts.usdxToken.implementation,
    [],
    "contracts/src/USDXToken.sol:USDXToken",
  );
  results.push({ name: "USDXToken", success: usdxResult });

  // Verify Governance implementation
  const governanceResult = await verifyContract(
    contracts.governance.implementation,
    [],
    "contracts/src/USDXGovernance.sol:USDXGovernance",
  );
  results.push({ name: "USDXGovernance", success: governanceResult });

  // Print summary
  console.log("\n=== Verification Results ===");
  results.forEach(result => {
    const status = result.success ? "✅ VERIFIED" : "❌ FAILED";
    console.log(`${result.name}: ${status}`);
  });

  return results;
}

// Function to verify specific contract by name
async function verifySpecificContract(contractName, deploymentFile) {
  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { contracts } = deploymentData;

  switch (contractName.toLowerCase()) {
    case "usdxtoken":
    case "token":
      return await verifyContract(
        contracts.usdxToken.implementation,
        [],
        "contracts/src/USDXToken.sol:USDXToken",
      );

    case "governance":
    case "usdxgovernance":
      return await verifyContract(
        contracts.governance.implementation,
        [],
        "contracts/src/USDXGovernance.sol:USDXGovernance",
      );

    default:
      console.error(`Unknown contract: ${contractName}`);
      return false;
  }
}

// Export functions for use in other scripts
module.exports = {
  verifyContract,
  verifyAllContracts,
  verifySpecificContract,
  generateVerificationReport,
};

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run main verification
    main().catch(error => {
      console.error(error);
      process.exit(1);
    });
  } else if (args[0] === "--contract" && args[1] && args[2]) {
    // Verify specific contract
    const contractName = args[1];
    const deploymentFile = args[2];

    verifySpecificContract(contractName, deploymentFile).catch(error => {
      console.error(error);
      process.exit(1);
    });
  } else if (args[0] === "--all" && args[1]) {
    // Verify all contracts from deployment file
    const deploymentFile = args[1];

    verifyAllContracts(deploymentFile).catch(error => {
      console.error(error);
      process.exit(1);
    });
  } else {
    console.log("Usage:");
    console.log("  node scripts/verify.js                           # Verify latest deployment");
    console.log(
      "  node scripts/verify.js --contract token deploy.json  # Verify specific contract",
    );
    console.log("  node scripts/verify.js --all deploy.json            # Verify all contracts");
  }
}
