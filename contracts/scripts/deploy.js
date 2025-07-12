const { ethers, upgrades } = require("hardhat");
const { parseEther, formatEther } = ethers; // Fixed: ethers v6 syntax

async function main() {
  try {
    // Validate environment variables
    if (!process.env.PRIVATE_KEY && !process.env.MNEMONIC) {
      throw new Error("Please set PRIVATE_KEY or MNEMONIC in your .env file");
    }

    if (!process.env.INFURA_API_KEY && !process.env.ALCHEMY_API_KEY) {
      throw new Error("Please set INFURA_API_KEY or ALCHEMY_API_KEY in your .env file");
    }

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log(
      "Account balance:",
      formatEther(await deployer.provider.getBalance(deployer.address)),
    ); // Fixed: ethers v6 syntax

    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId);

    // Deployment configuration
    const config = {
      // Token configuration
      tokenName: process.env.TOKEN_NAME || "USD Exchange",
      tokenSymbol: process.env.TOKEN_SYMBOL || "USDX",
      initialSupply: process.env.INITIAL_SUPPLY || parseEther("1000000000"), // Fixed: ethers v6 syntax

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

    // Deploy USDX Token
    console.log("\n=== Deploying USDX Token ===");
    const USDXToken = await ethers.getContractFactory("USDXToken");

    const usdxToken = await upgrades.deployProxy(
      USDXToken,
      [config.tokenName, config.tokenSymbol, config.initialSupply, config.initialOwner],
      {
        initializer: "initialize",
        kind: "uups",
      },
    );

    await usdxToken.waitForDeployment(); // Fixed: ethers v6 syntax
    console.log("USDX Token deployed to:", await usdxToken.getAddress()); // Fixed: ethers v6 syntax
    console.log(
      "USDX Token implementation:",
      await upgrades.erc1967.getImplementationAddress(await usdxToken.getAddress()), // Fixed: ethers v6 syntax
    );

    // Deploy Governance Contract
    console.log("\n=== Deploying Governance Contract ===");
    const USDXGovernance = await ethers.getContractFactory("USDXGovernance");

    const governance = await upgrades.deployProxy(
      USDXGovernance,
      [
        await usdxToken.getAddress(), // Fixed: ethers v6 syntax
        config.initialGovernors,
        config.requiredVotes,
        config.votingPeriod,
        config.executionDelay,
      ],
      {
        initializer: "initialize",
        kind: "uups",
      },
    );

    await governance.waitForDeployment(); // Fixed: ethers v6 syntax
    console.log("Governance deployed to:", await governance.getAddress()); // Fixed: ethers v6 syntax
    console.log(
      "Governance implementation:",
      await upgrades.erc1967.getImplementationAddress(await governance.getAddress()), // Fixed: ethers v6 syntax
    );

    // Set up initial roles and permissions
    console.log("\n=== Setting up roles and permissions ===");

    // Grant roles to specified addresses
    const MINTER_ROLE = await usdxToken.MINTER_ROLE();
    const BURNER_ROLE = await usdxToken.BURNER_ROLE();
    const BLACKLISTER_ROLE = await usdxToken.BLACKLISTER_ROLE();
    const PAUSER_ROLE = await usdxToken.PAUSER_ROLE();
    const COMPLIANCE_ROLE = await usdxToken.COMPLIANCE_ROLE();
    const UPGRADER_ROLE = await usdxToken.UPGRADER_ROLE();

    // Grant roles to governance contract
    console.log("Granting roles to governance contract...");
    await usdxToken.grantRole(MINTER_ROLE, await governance.getAddress()); // Fixed: ethers v6 syntax
    await usdxToken.grantRole(BURNER_ROLE, await governance.getAddress()); // Fixed: ethers v6 syntax
    await usdxToken.grantRole(BLACKLISTER_ROLE, await governance.getAddress()); // Fixed: ethers v6 syntax
    await usdxToken.grantRole(PAUSER_ROLE, await governance.getAddress()); // Fixed: ethers v6 syntax
    await usdxToken.grantRole(COMPLIANCE_ROLE, await governance.getAddress()); // Fixed: ethers v6 syntax
    await usdxToken.grantRole(UPGRADER_ROLE, await governance.getAddress()); // Fixed: ethers v6 syntax

    // Grant initial roles to specified addresses
    if (config.initialMinter !== deployer.address) {
      console.log("Granting MINTER_ROLE to:", config.initialMinter);
      await usdxToken.grantRole(MINTER_ROLE, config.initialMinter);
    }

    if (config.initialBlacklister !== deployer.address) {
      console.log("Granting BLACKLISTER_ROLE to:", config.initialBlacklister);
      await usdxToken.grantRole(BLACKLISTER_ROLE, config.initialBlacklister);
    }

    if (config.initialPauser !== deployer.address) {
      console.log("Granting PAUSER_ROLE to:", config.initialPauser);
      await usdxToken.grantRole(PAUSER_ROLE, config.initialPauser);
    }

    // Verify initial setup
    console.log("\n=== Verifying deployment ===");
    const tokenName = await usdxToken.name();
    const tokenSymbol = await usdxToken.symbol();
    const tokenDecimals = await usdxToken.decimals();
    const totalSupply = await usdxToken.totalSupply();
    const ownerBalance = await usdxToken.balanceOf(config.initialOwner);

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
    const testAmount = parseEther("1000"); // Fixed: ethers v6 syntax

    const restrictionCode = await usdxToken.detectTransferRestriction(
      config.initialOwner,
      testAddress,
      testAmount,
    );
    const restrictionMessage = await usdxToken.messageForTransferRestriction(restrictionCode);

    console.log("Transfer restriction code:", restrictionCode);
    console.log("Transfer restriction message:", restrictionMessage);

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(), // Fixed: ethers v6 syntax
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        usdxToken: {
          address: await usdxToken.getAddress(), // Fixed: ethers v6 syntax
          implementation: await upgrades.erc1967.getImplementationAddress(
            await usdxToken.getAddress(),
          ), // Fixed: ethers v6 syntax
          proxyAdmin: await upgrades.erc1967.getAdminAddress(await usdxToken.getAddress()), // Fixed: ethers v6 syntax
        },
        governance: {
          address: await governance.getAddress(), // Fixed: ethers v6 syntax
          implementation: await upgrades.erc1967.getImplementationAddress(
            await governance.getAddress(),
          ), // Fixed: ethers v6 syntax
          proxyAdmin: await upgrades.erc1967.getAdminAddress(await governance.getAddress()), // Fixed: ethers v6 syntax
        },
      },
      configuration: config,
    };

    console.log("\n=== Deployment Summary ===");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Write deployment info to file
    const fs = require("fs");
    const deploymentFile = `deployment-${network.name}-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to:", deploymentFile);

    console.log("\n=== Next Steps ===");
    console.log("1. Verify contracts on Etherscan:");
    console.log(`   npx hardhat verify --network ${network.name} ${await usdxToken.getAddress()}`); // Fixed: ethers v6 syntax
    console.log(`   npx hardhat verify --network ${network.name} ${await governance.getAddress()}`); // Fixed: ethers v6 syntax

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
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);

    // Provide helpful error messages
    if (error.message.includes("insufficient funds")) {
      console.error(
        "\n💡 Make sure your account has enough ETH for deployment and gas fees on Sepolia testnet",
      );
      console.error("   You can get test ETH from: https://sepoliafaucet.com/");
    }

    if (error.message.includes("network")) {
      console.error("\n💡 Check your network configuration in hardhat.config.js");
      console.error("   Make sure INFURA_API_KEY or ALCHEMY_API_KEY is set correctly");
    }

    if (error.message.includes("private key") || error.message.includes("account")) {
      console.error("\n💡 Check your PRIVATE_KEY in the .env file");
      console.error("   Make sure it's a valid private key without '0x' prefix");
    }

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
