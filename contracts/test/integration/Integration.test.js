const { expect } = require("chai");
const { IntegrationTestBase, TestHelpers } = require("./IntegrationTestConfig");

describe("Integration Tests", () => {
  let testBase;

  beforeEach(async () => {
    testBase = new IntegrationTestBase();
    await testBase.setupContracts();
  });

  describe("Governance-Controlled Token Operations", () => {
    it("Should allow governance to mint tokens through proposal", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const governor1 = testBase.accounts.governor1;
      const governor2 = testBase.accounts.governor2;

      const mintAmount = testBase.config.AMOUNTS.MINT_AMOUNT;
      const targetAddress = await token.getAddress();
      const value = 0;
      const data = token.interface.encodeFunctionData("mint", [user1.address, mintAmount]);
      const description = "Mint 1M tokens to user1";

      // Create proposal
      const proposalId = await testBase.createGovernanceProposal(
        targetAddress,
        value,
        data,
        description,
        governor1,
      );

      // Vote on proposal
      await testBase.executeGovernanceProposal(proposalId, [governor1, governor2]);

      // Check result
      const balanceAfter = await token.balanceOf(user1.address);
      expect(balanceAfter).to.equal(mintAmount);
    });

    it("Should allow governance to blacklist addresses through proposal", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const governor1 = testBase.accounts.governor1;
      const governor2 = testBase.accounts.governor2;

      const targetAddress = await token.getAddress();
      const value = 0;
      const data = token.interface.encodeFunctionData("setBlacklisted", [user1.address, true]);
      const description = "Blacklist user1";

      // Create and execute proposal
      const proposalId = await testBase.createGovernanceProposal(
        targetAddress,
        value,
        data,
        description,
        governor1,
      );

      await testBase.executeGovernanceProposal(proposalId, [governor1, governor2]);

      expect(await token.isBlacklisted(user1.address)).to.be.true;
    });

    it("Should allow governance to pause token contract through proposal", async () => {
      const token = testBase.contracts.usdxToken;
      const governor1 = testBase.accounts.governor1;
      const governor2 = testBase.accounts.governor2;

      const targetAddress = await token.getAddress();
      const value = 0;
      const data = token.interface.encodeFunctionData("pause", []);
      const description = "Pause token contract";

      // Create and execute proposal
      const proposalId = await testBase.createGovernanceProposal(
        targetAddress,
        value,
        data,
        description,
        governor1,
      );

      await testBase.executeGovernanceProposal(proposalId, [governor1, governor2]);

      expect(await token.paused()).to.be.true;
    });
  });

  describe("End-to-End Token Lifecycle", () => {
    it("Should handle complete token lifecycle", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const user2 = testBase.accounts.user2;
      const minter = testBase.accounts.minter;
      const blacklister = testBase.accounts.blacklister;

      const mintAmount = testBase.config.AMOUNTS.MINT_AMOUNT;

      // Step 1: Mint tokens
      await token.connect(minter).mint(user1.address, mintAmount);
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);

      // Step 2: Transfer tokens
      const transferAmount = testBase.config.AMOUNTS.TRANSFER_AMOUNT;
      await token.connect(user1).transfer(user2.address, transferAmount);
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);

      // Step 3: Blacklist user1
      await token.connect(blacklister).setBlacklisted(user1.address, true);

      // Step 4: Verify transfer restriction
      const restrictionCode = await token.detectTransferRestriction(
        user1.address,
        user2.address,
        transferAmount,
      );
      expect(restrictionCode).to.equal(testBase.config.RESTRICTION_CODES.BLACKLISTED_SENDER);

      // Step 5: Attempt blocked transfer
      await expect(
        token.connect(user1).transfer(user2.address, transferAmount),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");

      // Step 6: Remove from blacklist
      await token.connect(blacklister).setBlacklisted(user1.address, false);

      // Step 7: Successful transfer after removal
      await token.connect(user1).transfer(user2.address, transferAmount);
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount * 2n);
    });

    it("Should handle emergency pause scenario", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const user2 = testBase.accounts.user2;
      const minter = testBase.accounts.minter;
      const pauser = testBase.accounts.pauser;

      const mintAmount = testBase.config.AMOUNTS.MINT_AMOUNT;

      // Set up initial state
      await token.connect(minter).mint(user1.address, mintAmount);

      // Emergency pause
      await token.connect(pauser).pause();

      // Verify all transfers are blocked
      const transferAmount = testBase.config.AMOUNTS.TRANSFER_AMOUNT;
      await expect(token.connect(user1).transfer(user2.address, transferAmount)).to.be.revertedWith(
        "ERC20Pausable: token transfer while paused",
      );

      // Verify minting is blocked
      await expect(token.connect(minter).mint(user2.address, transferAmount)).to.be.revertedWith(
        "ERC20Pausable: token transfer while paused",
      );

      // Unpause and verify normal operations
      await token.connect(pauser).unpause();
      await token.connect(user1).transfer(user2.address, transferAmount);
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
    });
  });

  describe("Compliance and Restrictions", () => {
    beforeEach(async () => {
      // Set up tokens
      const token = testBase.contracts.usdxToken;
      const minter = testBase.accounts.minter;
      const user1 = testBase.accounts.user1;
      const user2 = testBase.accounts.user2;

      const mintAmount = testBase.config.AMOUNTS.MINT_AMOUNT;
      await token.connect(minter).mint(user1.address, mintAmount);
      await token.connect(minter).mint(user2.address, mintAmount);
    });

    it("Should enforce daily transfer limits", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const user2 = testBase.accounts.user2;
      const compliance = testBase.accounts.compliance;

      const dailyLimit = testBase.config.AMOUNTS.DAILY_LIMIT;
      const transferAmount = TestHelpers.parseAmount("30000"); // 30K tokens

      // Set daily limit
      await token.connect(compliance).setDailyTransferLimit(user1.address, dailyLimit);

      // First transfer should succeed
      await token.connect(user1).transfer(user2.address, transferAmount);

      // Second transfer should fail (total: 60K, exceeds 50K limit)
      await expect(
        token.connect(user1).transfer(user2.address, transferAmount),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");

      // Smaller transfer should succeed (total would be 40K)
      const smallTransferAmount = TestHelpers.parseAmount("10000");
      await token.connect(user1).transfer(user2.address, smallTransferAmount);
    });

    it("Should reset daily limits after 24 hours", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const minter = testBase.accounts.minter;
      const compliance = testBase.accounts.compliance;

      const { ethers } = require("hardhat");
      const signers = await ethers.getSigners();
      const user3 = signers[10];

      // Set up user3
      await token.connect(compliance).setKYCVerified(user3.address, true);
      await token.connect(minter).mint(user3.address, TestHelpers.parseAmount("100000"));

      const dailyLimit = testBase.config.AMOUNTS.DAILY_LIMIT;
      const transferAmount = TestHelpers.parseAmount("30000");

      // Set daily limit and make transfer
      await token.connect(compliance).setDailyTransferLimit(user1.address, dailyLimit);
      await token.connect(user1).transfer(user3.address, transferAmount);

      // Fast forward 24 hours
      await testBase.fastForwardTime(testBase.config.TIME.ONE_DAY);

      // Transfer should succeed after limit reset
      await token.connect(user1).transfer(user3.address, transferAmount);
      expect(await token.balanceOf(user3.address)).to.equal(
        transferAmount * 2n + TestHelpers.parseAmount("100000"),
      );
    });

    it("Should handle KYC requirements", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const user2 = testBase.accounts.user2;
      const compliance = testBase.accounts.compliance;

      // Remove KYC verification
      await token.connect(compliance).setKYCVerified(user2.address, false);

      // Transfer should fail
      const transferAmount = testBase.config.AMOUNTS.BURN_AMOUNT;
      await expect(
        token.connect(user1).transfer(user2.address, transferAmount),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");
    });

    it("Should handle sanctions", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const user2 = testBase.accounts.user2;
      const compliance = testBase.accounts.compliance;

      // Sanction user1
      await token.connect(compliance).setSanctioned(user1.address, true);

      // Transfer should fail
      const transferAmount = testBase.config.AMOUNTS.BURN_AMOUNT;
      await expect(
        token.connect(user1).transfer(user2.address, transferAmount),
      ).to.be.revertedWithCustomError(token, "TransferRestricted");
    });
  });

  describe("Security and Edge Cases", () => {
    it("Should handle role-based access control", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const user2 = testBase.accounts.user2;

      // Non-minter should not be able to mint
      await expect(token.connect(user1).mint(user2.address, TestHelpers.parseAmount("1000"))).to.be
        .reverted;

      // Non-blacklister should not be able to blacklist
      await expect(token.connect(user1).setBlacklisted(user2.address, true)).to.be.reverted;

      // Non-pauser should not be able to pause
      await expect(token.connect(user1).pause()).to.be.reverted;
    });

    it("Should prevent zero address operations", async () => {
      const token = testBase.contracts.usdxToken;
      const minter = testBase.accounts.minter;

      const { ethers } = require("hardhat");
      await expect(
        token.connect(minter).mint(ethers.ZeroAddress, TestHelpers.parseAmount("1000")),
      ).to.be.revertedWithCustomError(token, "CannotMintToZeroAddress");
    });

    it("Should handle burn operations correctly", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const minter = testBase.accounts.minter;

      // Mint tokens first
      const mintAmount = testBase.config.AMOUNTS.MINT_AMOUNT;
      await token.connect(minter).mint(user1.address, mintAmount);

      // Burn tokens
      const burnAmount = testBase.config.AMOUNTS.BURN_AMOUNT;
      await token.connect(user1).burn(burnAmount);

      expect(await token.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
    });
  });

  describe("Events and Monitoring", () => {
    it("Should emit correct events for token operations", async () => {
      const token = testBase.contracts.usdxToken;
      const user1 = testBase.accounts.user1;
      const minter = testBase.accounts.minter;
      const blacklister = testBase.accounts.blacklister;
      const compliance = testBase.accounts.compliance;

      const { ethers } = require("hardhat");
      const mintAmount = testBase.config.AMOUNTS.MINT_AMOUNT;

      // Mint should emit Transfer event
      await expect(token.connect(minter).mint(user1.address, mintAmount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, mintAmount);

      // Blacklist should emit BlacklistUpdated event
      await expect(token.connect(blacklister).setBlacklisted(user1.address, true))
        .to.emit(token, "BlacklistUpdated")
        .withArgs(user1.address, true);

      // KYC should emit KYCStatusUpdated event
      await expect(token.connect(compliance).setKYCVerified(user1.address, false))
        .to.emit(token, "KYCStatusUpdated")
        .withArgs(user1.address, false);
    });

    it("Should emit correct events for governance operations", async () => {
      const token = testBase.contracts.usdxToken;
      const governance = testBase.contracts.governance;
      const governor1 = testBase.accounts.governor1;

      const targetAddress = await token.getAddress();
      const value = 0;
      const data = token.interface.encodeFunctionData("pause", []);
      const description = "Pause token contract";

      // Proposal creation should emit ProposalCreated event
      await expect(
        governance.connect(governor1).propose(targetAddress, value, data, description),
      ).to.emit(governance, "ProposalCreated");

      // Vote should emit VoteCast event
      const proposalId = await testBase.createGovernanceProposal(
        targetAddress,
        value,
        data,
        description,
        governor1,
      );

      await expect(governance.connect(governor1).castVote(proposalId, true))
        .to.emit(governance, "VoteCast")
        .withArgs(proposalId, governor1.address, true);
    });
  });
});
