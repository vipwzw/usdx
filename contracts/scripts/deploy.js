const { ethers, upgrades } = require("hardhat");
const { parseEther, formatEther } = ethers.utils;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.getBalance()));

  // Deployment configuration
  const config = {
    // Token configuration
    tokenName: process.env.TOKEN_NAME || "USD Tether",
    tokenSymbol: process.env.TOKEN_SYMBOL || "USDT",
    initialSupply: process.env.INITIAL_SUPPLY || parseEther("1000000000"), // 1B tokens
    
    // Governance configuration
    initialGovernors: process.env.INITIAL_GOVERNORS 
      ? process.env.INITIAL_GOVERNORS.split(",") 
      : [deployer.address],
    requiredVotes: parseInt(process.env.REQUIRED_VOTES) || 1,
    votingPeriod: parseInt(process.env.VOTING_PERIOD) || 86400, // 24 hours
    executionDelay: parseInt(process.env.EXECUTION_DELAY) || 3600, // 1 hour
    
    // Initial roles
    initialOwner: process.env.INITIAL_OWNER || deployer.address,
    initialAdmin: process.env.INITIAL_ADMIN || deployer.address,
    initialMinter: process.env.INITIAL_MINTER || deployer.address,
    initialBlacklister: process.env.INITIAL_BLACKLISTER || deployer.address,
    initialPauser: process.env.INITIAL_PAUSER || deployer.address,
  };

  console.log("\nDeployment Configuration:");
  console.log("Token Name:", config.tokenName);
  console.log("Token Symbol:", config.tokenSymbol);
  console.log("Initial Supply:", formatEther(config.initialSupply));
  console.log("Initial Governors:", config.initialGovernors);
  console.log("Required Votes:", config.requiredVotes);
  console.log("Voting Period:", config.votingPeriod, "seconds");
  console.log("Execution Delay:", config.executionDelay, "seconds");

  // Deploy USDT Token
  console.log("\n=== Deploying USDT Token ===");
  const USDTToken = await ethers.getContractFactory("USDTToken");
  
  const usdtToken = await upgrades.deployProxy(
    USDTToken,
    [
      config.tokenName,
      config.tokenSymbol,
      config.initialSupply,
      config.initialOwner
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await usdtToken.deployed();
  console.log("USDT Token deployed to:", usdtToken.address);
  console.log("USDT Token implementation:", await upgrades.erc1967.getImplementationAddress(usdtToken.address));

  // Deploy Governance Contract
  console.log("\n=== Deploying Governance Contract ===");
  const USDTGovernance = await ethers.getContractFactory("USDTGovernance");
  
  const governance = await upgrades.deployProxy(
    USDTGovernance,
    [
      usdtToken.address,
      config.initialGovernors,
      config.requiredVotes,
      config.votingPeriod,
      config.executionDelay
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await governance.deployed();
  console.log("Governance deployed to:", governance.address);
  console.log("Governance implementation:", await upgrades.erc1967.getImplementationAddress(governance.address));

  // Set up initial roles and permissions
  console.log("\n=== Setting up roles and permissions ===");
  
  // Grant roles to specified addresses
  const MINTER_ROLE = await usdtToken.MINTER_ROLE();
  const BURNER_ROLE = await usdtToken.BURNER_ROLE();
  const BLACKLISTER_ROLE = await usdtToken.BLACKLISTER_ROLE();
  const PAUSER_ROLE = await usdtToken.PAUSER_ROLE();
  const COMPLIANCE_ROLE = await usdtToken.COMPLIANCE_ROLE();
  const UPGRADER_ROLE = await usdtToken.UPGRADER_ROLE();

  // Grant roles to governance contract
  console.log("Granting roles to governance contract...");
  await usdtToken.grantRole(MINTER_ROLE, governance.address);
  await usdtToken.grantRole(BURNER_ROLE, governance.address);
  await usdtToken.grantRole(BLACKLISTER_ROLE, governance.address);
  await usdtToken.grantRole(PAUSER_ROLE, governance.address);
  await usdtToken.grantRole(COMPLIANCE_ROLE, governance.address);
  await usdtToken.grantRole(UPGRADER_ROLE, governance.address);

  // Grant initial roles to specified addresses
  if (config.initialMinter !== deployer.address) {
    console.log("Granting MINTER_ROLE to:", config.initialMinter);
    await usdtToken.grantRole(MINTER_ROLE, config.initialMinter);
  }

  if (config.initialBlacklister !== deployer.address) {
    console.log("Granting BLACKLISTER_ROLE to:", config.initialBlacklister);
    await usdtToken.grantRole(BLACKLISTER_ROLE, config.initialBlacklister);
  }

  if (config.initialPauser !== deployer.address) {
    console.log("Granting PAUSER_ROLE to:", config.initialPauser);
    await usdtToken.grantRole(PAUSER_ROLE, config.initialPauser);
  }

  // Verify initial setup
  console.log("\n=== Verifying deployment ===");
  const tokenName = await usdtToken.name();
  const tokenSymbol = await usdtToken.symbol();
  const tokenDecimals = await usdtToken.decimals();
  const totalSupply = await usdtToken.totalSupply();
  const ownerBalance = await usdtToken.balanceOf(config.initialOwner);
  
  console.log("Token Name:", tokenName);
  console.log("Token Symbol:", tokenSymbol);
  console.log("Token Decimals:", tokenDecimals);
  console.log("Total Supply:", formatEther(totalSupply));
  console.log("Owner Balance:", formatEther(ownerBalance));
  
  // Verify governance setup
  const governorCount = await governance.getGovernorCount();
  const governors = await governance.getGovernors();
  const requiredVotesCheck = await governance.requiredVotes();
  
  console.log("Governor Count:", governorCount.toString());
  console.log("Governors:", governors);
  console.log("Required Votes:", requiredVotesCheck.toString());

  // Test ERC-1404 functionality
  console.log("\n=== Testing ERC-1404 functionality ===");
  const testAddress = "0x1234567890123456789012345678901234567890";
  const testAmount = parseEther("1000");
  
  const restrictionCode = await usdtToken.detectTransferRestriction(
    config.initialOwner,
    testAddress,
    testAmount
  );
  const restrictionMessage = await usdtToken.messageForTransferRestriction(restrictionCode);
  
  console.log("Transfer restriction code:", restrictionCode);
  console.log("Transfer restriction message:", restrictionMessage);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      usdtToken: {
        address: usdtToken.address,
        implementation: await upgrades.erc1967.getImplementationAddress(usdtToken.address),
        proxyAdmin: await upgrades.erc1967.getAdminAddress(usdtToken.address),
      },
      governance: {
        address: governance.address,
        implementation: await upgrades.erc1967.getImplementationAddress(governance.address),
        proxyAdmin: await upgrades.erc1967.getAdminAddress(governance.address),
      },
    },
    configuration: config,
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Write deployment info to file
  const fs = require("fs");
  const deploymentFile = `deployment-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentFile);

  console.log("\n=== Next Steps ===");
  console.log("1. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${usdtToken.address}`);
  console.log(`   npx hardhat verify --network ${hre.network.name} ${governance.address}`);
  
  console.log("\n2. Update frontend configuration with contract addresses");
  console.log("\n3. Test governance functionality:");
  console.log("   - Create test proposals");
  console.log("   - Vote on proposals");
  console.log("   - Execute proposals");
  
  console.log("\n4. Set up monitoring and alerts for:");
  console.log("   - Large transfers");
  console.log("   - Blacklist events");
  console.log("   - Minting/burning events");
  console.log("   - Governance proposals");

  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 