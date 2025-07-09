const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Integration Tests", function () {
  let usdxToken;
  let governance;
  let owner, governor1, governor2, governor3, user1, user2, minter, blacklister, pauser, compliance;

  const TOKEN_NAME = "USDX Stablecoin";
  const TOKEN_SYMBOL = "USDX";
  const INITIAL_SUPPLY = ethers.parseUnits("1000000000", 6); // 1B tokens with 6 decimals
  const VOTING_PERIOD = 86400; // 24 hours
  const EXECUTION_DELAY = 3600; // 1 hour

  beforeEach(async function () {
    [owner, governor1, governor2, governor3, user1, user2, minter, blacklister, pauser, compliance] = await ethers.getSigners();

    // Deploy USDX Token
    const USDXToken = await ethers.getContractFactory("USDXToken");
    usdxToken = await upgrades.deployProxy(
      USDXToken,
      [TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY, owner.address],
      { initializer: "initialize", kind: "uups" }
    );

    // Deploy Governance Contract
    const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
    governance = await upgrades.deployProxy(
      USDXGovernance,
      [
        await usdxToken.getAddress(),
        [governor1.address, governor2.address, governor3.address],
        2, // Required votes
        VOTING_PERIOD,
        EXECUTION_DELAY
      ],
      { initializer: "initialize", kind: "uups" }
    );

    // Set up roles
    const MINTER_ROLE = await usdxToken.MINTER_ROLE();
    const BLACKLISTER_ROLE = await usdxToken.BLACKLISTER_ROLE();
    const PAUSER_ROLE = await usdxToken.PAUSER_ROLE();
    const COMPLIANCE_ROLE = await usdxToken.COMPLIANCE_ROLE();
    const UPGRADER_ROLE = await usdxToken.UPGRADER_ROLE();

    await usdxToken.grantRole(MINTER_ROLE, minter.address);
    await usdxToken.grantRole(BLACKLISTER_ROLE, blacklister.address);
    await usdxToken.grantRole(PAUSER_ROLE, pauser.address);
    await usdxToken.grantRole(COMPLIANCE_ROLE, compliance.address);

    // Grant roles to governance contract
    await usdxToken.grantRole(MINTER_ROLE, await governance.getAddress());
    await usdxToken.grantRole(BLACKLISTER_ROLE, await governance.getAddress());
    await usdxToken.grantRole(PAUSER_ROLE, await governance.getAddress());
    await usdxToken.grantRole(COMPLIANCE_ROLE, await governance.getAddress());
    await usdxToken.grantRole(UPGRADER_ROLE, await governance.getAddress());

    // Set up KYC for all test addresses
    await usdxToken.grantRole(COMPLIANCE_ROLE, owner.address);
    await usdxToken.setKYCVerified(owner.address, true);
    await usdxToken.setKYCVerified(governor1.address, true);
    await usdxToken.setKYCVerified(governor2.address, true);
    await usdxToken.setKYCVerified(governor3.address, true);
    await usdxToken.setKYCVerified(user1.address, true);
    await usdxToken.setKYCVerified(user2.address, true);
    await usdxToken.setKYCVerified(minter.address, true);
    await usdxToken.setKYCVerified(blacklister.address, true);
    await usdxToken.setKYCVerified(pauser.address, true);
    await usdxToken.setKYCVerified(compliance.address, true);
  });

  describe("Governance-Controlled Token Operations", function () {
    it("Should allow governance to mint tokens through proposal", async function () {
      const mintAmount = ethers.parseUnits("1000000", 6); // 1M tokens
      const targetAddress = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("mint", [user1.address, mintAmount]);
      const description = "Mint 1M tokens to user1";

      // Create proposal
      const tx = await governance.connect(governor1).propose(targetAddress, value, data, description);
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args.proposalId;

      // Vote on proposal
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + EXECUTION_DELAY + 1]);
      await ethers.provider.send("evm_mine");

      // Execute proposal
      const balanceBefore = await usdxToken.balanceOf(user1.address);
      await governance.connect(governor1).execute(proposalId);
      const balanceAfter = await usdxToken.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(mintAmount);
    });

    it("Should allow governance to blacklist addresses through proposal", async function () {
      const targetAddress = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("setBlacklisted", [user1.address, true]);
      const description = "Blacklist user1";

      // Create and execute proposal
      const tx = await governance.connect(governor1).propose(targetAddress, value, data, description);
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args.proposalId;

      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + EXECUTION_DELAY + 1]);
      await ethers.provider.send("evm_mine");

      await governance.connect(governor1).execute(proposalId);

      expect(await usdxToken.isBlacklisted(user1.address)).to.be.true;
    });

    it("Should allow governance to pause token contract through proposal", async function () {
      const targetAddress = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause token contract";

      // Create and execute proposal
      const tx = await governance.connect(governor1).propose(targetAddress, value, data, description);
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args.proposalId;

      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + EXECUTION_DELAY + 1]);
      await ethers.provider.send("evm_mine");

      await governance.connect(governor1).execute(proposalId);

      expect(await usdxToken.paused()).to.be.true;
    });
  });

  describe("End-to-End Token Lifecycle", function () {
    it("Should handle complete token lifecycle", async function () {
      const mintAmount = ethers.parseUnits("1000000", 6); // 1M tokens

      // Step 1: Mint tokens
      await usdxToken.connect(minter).mint(user1.address, mintAmount);
      expect(await usdxToken.balanceOf(user1.address)).to.equal(mintAmount);

      // Step 2: Transfer tokens
      const transferAmount = ethers.parseUnits("100000", 6); // 100K tokens
      await usdxToken.connect(user1).transfer(user2.address, transferAmount);
      expect(await usdxToken.balanceOf(user2.address)).to.equal(transferAmount);

      // Step 3: Blacklist user1
      await usdxToken.connect(blacklister).setBlacklisted(user1.address, true);

      // Step 4: Verify transfer restriction
      const restrictionCode = await usdxToken.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount
      );
      expect(restrictionCode).to.equal(2); // BLACKLISTED_SENDER

      // Step 5: Attempt blocked transfer
      await expect(
        usdxToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("Sender address is blacklisted");

      // Step 6: Remove from blacklist
      await usdxToken.connect(blacklister).setBlacklisted(user1.address, false);

      // Step 7: Successful transfer after removal
      await usdxToken.connect(user1).transfer(user2.address, transferAmount);
      expect(await usdxToken.balanceOf(user2.address)).to.equal(transferAmount * 2n);
    });

    it("Should handle emergency pause scenario", async function () {
      const mintAmount = ethers.parseUnits("1000000", 6);

      // Set up initial state
      await usdxToken.connect(minter).mint(user1.address, mintAmount);

      // Emergency pause
      await usdxToken.connect(pauser).pause();

      // Verify all transfers are blocked
      const transferAmount = ethers.parseUnits("100000", 6);
      await expect(
        usdxToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");

      // Verify minting is blocked
      await expect(
        usdxToken.connect(minter).mint(user2.address, transferAmount)
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");

      // Unpause and verify normal operations
      await usdxToken.connect(pauser).unpause();
      await usdxToken.connect(user1).transfer(user2.address, transferAmount);
      expect(await usdxToken.balanceOf(user2.address)).to.equal(transferAmount);
    });
  });

  describe("Governance-Controlled Upgrades", function () {
    it("Should allow governance to upgrade token contract", async function () {
      // Deploy new implementation (same contract, just testing upgrade mechanism)
      const USDXTokenV2 = await ethers.getContractFactory("USDXToken");
      const newImplementation = await USDXTokenV2.deploy();
      await newImplementation.waitForDeployment();

      // Create upgrade proposal using upgradeTo
      const targetAddress = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("upgradeTo", [
        await newImplementation.getAddress()
      ]);
      const description = "Upgrade USDX token contract";

      const tx = await governance.connect(governor1).propose(targetAddress, value, data, description);
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args.proposalId;

      // Vote and execute
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + EXECUTION_DELAY + 1]);
      await ethers.provider.send("evm_mine");

      // Execute upgrade
      await governance.connect(governor1).execute(proposalId);

      // Verify upgrade (contract should still function)
      expect(await usdxToken.name()).to.equal(TOKEN_NAME);
      expect(await usdxToken.symbol()).to.equal(TOKEN_SYMBOL);
    });
  });

  describe("Compliance and Restrictions", function () {
    beforeEach(async function () {
      // Set up tokens 
      const mintAmount = ethers.parseUnits("1000000", 6);
      await usdxToken.connect(minter).mint(user1.address, mintAmount);
      await usdxToken.connect(minter).mint(user2.address, mintAmount);
    });

    it("Should enforce daily transfer limits", async function () {
      const dailyLimit = ethers.parseUnits("50000", 6); // 50K tokens
      const transferAmount = ethers.parseUnits("30000", 6); // 30K tokens

      // Set daily limit
      await usdxToken.connect(compliance).setDailyTransferLimit(user1.address, dailyLimit);

      // First transfer should succeed
      await usdxToken.connect(user1).transfer(user2.address, transferAmount);

      // Second transfer should succeed (total: 60K, exceeds 50K limit)
      await expect(
        usdxToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("Amount exceeds transfer limit");

      // Smaller transfer should succeed (total would be 40K)
      const smallTransferAmount = ethers.parseUnits("10000", 6);
      await usdxToken.connect(user1).transfer(user2.address, smallTransferAmount);
    });

    it("Should reset daily limits after 24 hours", async function () {
      const dailyLimit = ethers.parseUnits("50000", 6);
      const transferAmount = ethers.parseUnits("30000", 6);

      // Set daily limit and make transfer
      await usdxToken.connect(compliance).setDailyTransferLimit(user1.address, dailyLimit);
      await usdxToken.connect(user1).transfer(user2.address, transferAmount);

      // Another user without limits to receive tokens
      const user3 = (await ethers.getSigners())[10];
      await usdxToken.connect(compliance).setKYCVerified(user3.address, true);
      await usdxToken.connect(minter).mint(user3.address, ethers.parseUnits("100000", 6));

      // Fast forward 24 hours
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      // Transfer should succeed after limit reset
      await usdxToken.connect(user1).transfer(user3.address, transferAmount);
      expect(await usdxToken.balanceOf(user3.address)).to.equal(transferAmount + ethers.parseUnits("100000", 6));
    });

    it("Should handle KYC requirements", async function () {
      // Remove KYC verification
      await usdxToken.connect(compliance).setKYCVerified(user2.address, false);

      // Transfer should fail
      const transferAmount = ethers.parseUnits("10000", 6);
      await expect(
        usdxToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("Receiver KYC verification required");
    });

    it("Should handle sanctions", async function () {
      // Sanction user1
      await usdxToken.connect(compliance).setSanctioned(user1.address, true);

      // Transfer should fail
      const transferAmount = ethers.parseUnits("10000", 6);
      await expect(
        usdxToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("Address is sanctioned");
    });
  });

  describe("Security and Edge Cases", function () {
    it("Should handle role-based access control", async function () {
      // Non-minter should not be able to mint
      await expect(
        usdxToken.connect(user1).mint(user2.address, ethers.parseUnits("1000", 6))
      ).to.be.reverted;

      // Non-blacklister should not be able to blacklist
      await expect(
        usdxToken.connect(user1).setBlacklisted(user2.address, true)
      ).to.be.reverted;

      // Non-pauser should not be able to pause
      await expect(
        usdxToken.connect(user1).pause()
      ).to.be.reverted;
    });

    it("Should prevent zero address operations", async function () {
      await expect(
        usdxToken.connect(minter).mint(ethers.ZeroAddress, ethers.parseUnits("1000", 6))
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should handle burn operations correctly", async function () {
      // Mint tokens first
      const mintAmount = ethers.parseUnits("1000000", 6);
      await usdxToken.connect(minter).mint(user1.address, mintAmount);

      // Burn tokens
      const burnAmount = ethers.parseUnits("100000", 6);
      await usdxToken.connect(user1).burn(burnAmount);

      expect(await usdxToken.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
    });
  });

  describe("Events and Monitoring", function () {
    it("Should emit correct events for token operations", async function () {
      const mintAmount = ethers.parseUnits("1000000", 6);

      // Mint should emit Transfer event
      await expect(
        usdxToken.connect(minter).mint(user1.address, mintAmount)
      ).to.emit(usdxToken, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, mintAmount);

      // Blacklist should emit BlacklistUpdated event
      await expect(
        usdxToken.connect(blacklister).setBlacklisted(user1.address, true)
      ).to.emit(usdxToken, "BlacklistUpdated")
        .withArgs(user1.address, true);

      // KYC should emit KYCStatusUpdated event
      await expect(
        usdxToken.connect(compliance).setKYCVerified(user1.address, false)
      ).to.emit(usdxToken, "KYCStatusUpdated")
        .withArgs(user1.address, false);
    });

    it("Should emit correct events for governance operations", async function () {
      const targetAddress = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause token contract";

      // Proposal creation should emit ProposalCreated event
      await expect(
        governance.connect(governor1).propose(targetAddress, value, data, description)
      ).to.emit(governance, "ProposalCreated");

      // Vote should emit VoteCast event
      const tx = await governance.connect(governor1).propose(targetAddress, value, data, description);
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args.proposalId;

      await expect(
        governance.connect(governor1).castVote(proposalId, true)
      ).to.emit(governance, "VoteCast")
        .withArgs(proposalId, governor1.address, true);
    });
  });
}); 