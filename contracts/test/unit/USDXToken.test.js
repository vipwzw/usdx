const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("USDXToken", () => {
  let usdxToken;
  let owner;
  let addr1;
  let addr2;
  let _addr3;
  let _addrs;

  beforeEach(async () => {
    [owner, addr1, addr2, _addr3, ..._addrs] = await ethers.getSigners();

    const USDXToken = await ethers.getContractFactory("USDXToken");
    usdxToken = await upgrades.deployProxy(
      USDXToken,
      ["USDX Stablecoin", "USDX", ethers.parseUnits("1000000", 6), owner.address],
      { initializer: "initialize", kind: "uups" },
    );
  });

  describe("Deployment", () => {
    it("Should set the right name and symbol", async () => {
      expect(await usdxToken.name()).to.equal("USDX Stablecoin");
      expect(await usdxToken.symbol()).to.equal("USDX");
    });

    it("Should have 6 decimals", async () => {
      expect(await usdxToken.decimals()).to.equal(6);
    });

    it("Should grant roles to deployer", async () => {
      const DEFAULT_ADMIN_ROLE = await usdxToken.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await usdxToken.MINTER_ROLE();
      const BURNER_ROLE = await usdxToken.BURNER_ROLE();

      expect(await usdxToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await usdxToken.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await usdxToken.hasRole(BURNER_ROLE, owner.address)).to.be.true;
    });

    it("Should mint initial supply to owner", async () => {
      const initialSupply = ethers.parseUnits("1000000", 6);
      expect(await usdxToken.totalSupply()).to.equal(initialSupply);
      expect(await usdxToken.balanceOf(owner.address)).to.equal(initialSupply);
    });
  });

  describe("ERC-1404 Compliance", () => {
    it("Should detect no restriction for normal transfer", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(0);
    });

    it("Should detect blacklisted sender", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setBlacklisted(owner.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(2);
    });

    it("Should detect blacklisted receiver", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setBlacklisted(addr1.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(3);
    });

    it("Should detect insufficient balance", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setKYCVerified(addr2.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        addr1.address,
        addr2.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(4);
    });

    it("Should detect paused contract", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.pause();

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(5);
    });

    it("Should detect invalid KYC sender", async () => {
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setKYCVerified(owner.address, false); // Remove owner's KYC verification

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(6);
    });

    it("Should detect invalid KYC receiver", async () => {
      await usdxToken.setKYCVerified(owner.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(7);
    });

    it("Should return proper restriction messages", async () => {
      const message0 = await usdxToken.messageForTransferRestriction(0);
      const message1 = await usdxToken.messageForTransferRestriction(1);
      const message2 = await usdxToken.messageForTransferRestriction(2);
      const message3 = await usdxToken.messageForTransferRestriction(3);
      const message4 = await usdxToken.messageForTransferRestriction(4);
      const message5 = await usdxToken.messageForTransferRestriction(5);
      const message6 = await usdxToken.messageForTransferRestriction(6);
      const message7 = await usdxToken.messageForTransferRestriction(7);
      const message8 = await usdxToken.messageForTransferRestriction(8);
      const message9 = await usdxToken.messageForTransferRestriction(9);
      const message10 = await usdxToken.messageForTransferRestriction(10);
      const message11 = await usdxToken.messageForTransferRestriction(11);
      const message12 = await usdxToken.messageForTransferRestriction(12);
      const message13 = await usdxToken.messageForTransferRestriction(13);
      const message14 = await usdxToken.messageForTransferRestriction(14);
      const message15 = await usdxToken.messageForTransferRestriction(15);

      expect(message0).to.equal("Transfer allowed");
      expect(message1).to.equal("Transfer failed");
      expect(message2).to.equal("Sender address is blacklisted");
      expect(message3).to.equal("Receiver address is blacklisted");
      expect(message4).to.equal("Insufficient balance");
      expect(message5).to.equal("Contract is paused");
      expect(message6).to.equal("Sender KYC not verified");
      expect(message7).to.equal("Receiver KYC not verified");
      expect(message8).to.equal("Amount exceeds limit");
      expect(message9).to.equal("Address sanctioned");
      expect(message10).to.equal("Transfer unauthorized");
      expect(message11).to.equal("Invalid recipient");
      expect(message12).to.equal("Transfer locked");
      expect(message13).to.equal("Compliance violation");
      expect(message14).to.equal("Exceeds holder limit");
      expect(message15).to.equal("Region restricted");
    });

    it("Should detect amount exceeds maximum limit", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // First, mint enough tokens to owner to avoid balance check
      const mintAmount = ethers.parseUnits("1100000", 6); // 1.1M tokens
      await usdxToken.mint(owner.address, mintAmount);

      // Try to transfer more than maximum limit (1M tokens)
      const maxAmount = ethers.parseUnits("1000001", 6);
      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        maxAmount,
      );
      expect(restrictionCode).to.equal(8); // AMOUNT_EXCEEDS_LIMIT
    });

    it("Should detect amount below minimum limit", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Try to transfer less than minimum limit (1 token)
      const minAmount = ethers.parseUnits("0.5", 6);
      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        minAmount,
      );
      expect(restrictionCode).to.equal(8); // AMOUNT_EXCEEDS_LIMIT
    });

    it("Should detect sanctioned address", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setSanctioned(addr1.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(9); // SANCTIONED_ADDRESS
    });

    it("Should detect holder limit exceeded", async () => {
      // First, set a very low holder limit
      await usdxToken.setMaxHolderCount(1); // Current holder count is already 1 (owner)

      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Try to transfer to a new holder (addr1 has 0 balance)
      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(14); // EXCEEDS_HOLDER_LIMIT
    });

    it("Should detect region restriction", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Enable region restrictions
      await usdxToken.setRegionRestrictionsEnabled(true);
      // Set restricted region code for addr1
      await usdxToken.setRegionCode(addr1.address, 999);
      // Don't set region 999 as allowed (only allow region 1)
      await usdxToken.setAllowedRegion(1, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(15); // REGION_RESTRICTION
    });

    it("Should allow transfers between allowed regions", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Enable region restrictions
      await usdxToken.setRegionRestrictionsEnabled(true);
      // Set both users to allowed regions
      await usdxToken.setRegionCode(owner.address, 1); // US
      await usdxToken.setRegionCode(addr1.address, 44); // UK
      // Allow both regions
      await usdxToken.setAllowedRegion(1, true);
      await usdxToken.setAllowedRegion(44, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(0); // SUCCESS
    });

    it("Should detect daily limit exceeded", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setKYCVerified(addr2.address, true);

      // Set a daily limit of 500 tokens for owner
      await usdxToken.setDailyTransferLimit(owner.address, ethers.parseUnits("500", 6));

      // First, make a transfer to consume part of the daily limit
      await usdxToken.transfer(addr2.address, ethers.parseUnits("200", 6));

      // Now try to transfer 400 more tokens (200 + 400 = 600 > 500 limit)
      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("400", 6),
      );
      expect(restrictionCode).to.equal(8); // AMOUNT_EXCEEDS_LIMIT
    });

    it("Should detect unauthorized transfer", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Enable transfer authorization requirement
      await usdxToken.setTransferAuthorizationRequired(true);
      // Don't authorize the owner as sender

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(10); // UNAUTHORIZED_TRANSFER
    });

    it("Should detect invalid recipient", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Enable recipient validation requirement
      await usdxToken.setRecipientValidationRequired(true);
      // Don't set addr1 as valid recipient

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(11); // INVALID_RECIPIENT
    });

    it("Should detect transfer locked", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Lock transfers for addr1
      await usdxToken.setTransferLocked(addr1.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(12); // TRANSFER_LOCKED
    });

    it("Should detect compliance violation", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true); // Set KYC verification

      // This should trigger compliance violation: very large transfer (>75% of max) to new account
      // Even with KYC verification, this is considered suspicious activity
      const veryLargeAmount = ethers.parseUnits("800000", 6); // 80% of max transfer (1M * 0.8)
      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        veryLargeAmount,
      );
      expect(restrictionCode).to.equal(13); // COMPLIANCE_VIOLATION
    });

    it("Should allow authorized transfers when authorization required", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Enable authorization requirement and authorize owner
      await usdxToken.setTransferAuthorizationRequired(true);
      await usdxToken.setAuthorizedSender(owner.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(0); // SUCCESS
    });

    it("Should allow transfers to valid recipients when validation required", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Enable recipient validation and set addr1 as valid
      await usdxToken.setRecipientValidationRequired(true);
      await usdxToken.setValidRecipient(addr1.address, true);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(0); // SUCCESS
    });

    it("Should allow transfers when not locked", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      // Set and then unset transfer lock
      await usdxToken.setTransferLocked(addr1.address, true);
      await usdxToken.setTransferLocked(addr1.address, false);

      const restrictionCode = await usdxToken.detectTransferRestriction(
        owner.address,
        addr1.address,
        ethers.parseUnits("100", 6),
      );
      expect(restrictionCode).to.equal(0); // SUCCESS
    });
  });

  describe("Minting", () => {
    it("Should allow minting by minter role", async () => {
      const mintAmount = ethers.parseUnits("1000", 6);
      await usdxToken.setKYCVerified(addr1.address, true);

      await usdxToken.mint(addr1.address, mintAmount);
      expect(await usdxToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not allow minting by non-minter", async () => {
      const mintAmount = ethers.parseUnits("1000", 6);
      await usdxToken.setKYCVerified(addr1.address, true);

      await expect(usdxToken.connect(addr1).mint(addr1.address, mintAmount)).to.be.reverted;
    });

    it("Should not allow minting to blacklisted address", async () => {
      const mintAmount = ethers.parseUnits("1000", 6);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setBlacklisted(addr1.address, true);

      await expect(usdxToken.mint(addr1.address, mintAmount)).to.be.reverted;
    });

    it("Should not allow minting to zero address", async () => {
      const mintAmount = ethers.parseUnits("1000", 6);

      await expect(usdxToken.mint(ethers.ZeroAddress, mintAmount)).to.be.reverted;
    });
  });

  describe("Burning", () => {
    beforeEach(async () => {
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.mint(addr1.address, ethers.parseUnits("1000", 6));
    });

    it("Should allow burning by token holder", async () => {
      const burnAmount = ethers.parseUnits("500", 6);

      await usdxToken.connect(addr1).burn(burnAmount);
      expect(await usdxToken.balanceOf(addr1.address)).to.equal(ethers.parseUnits("500", 6));
    });

    it("Should not allow burning more than balance", async () => {
      const burnAmount = ethers.parseUnits("1500", 6);

      await expect(usdxToken.connect(addr1).burn(burnAmount)).to.be.reverted;
    });

    it("Should allow burning by burner role", async () => {
      const burnAmount = ethers.parseUnits("500", 6);

      await usdxToken.burnFrom(addr1.address, burnAmount);
      expect(await usdxToken.balanceOf(addr1.address)).to.equal(ethers.parseUnits("500", 6));
    });

    it("Should not allow burning by non-burner", async () => {
      const burnAmount = ethers.parseUnits("500", 6);

      await expect(usdxToken.connect(addr2).burnFrom(addr1.address, burnAmount)).to.be.reverted;
    });
  });

  describe("Blacklisting", () => {
    it("Should allow blacklisting by blacklister role", async () => {
      await usdxToken.setBlacklisted(addr1.address, true);
      expect(await usdxToken.isBlacklisted(addr1.address)).to.be.true;
    });

    it("Should not allow blacklisting by non-blacklister", async () => {
      await expect(usdxToken.connect(addr1).setBlacklisted(addr2.address, true)).to.be.reverted;
    });

    it("Should prevent transfers from blacklisted address", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setBlacklisted(owner.address, true);

      await expect(usdxToken.transfer(addr1.address, ethers.parseUnits("100", 6))).to.be.reverted;
    });

    it("Should prevent transfers to blacklisted address", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setBlacklisted(addr1.address, true);

      await expect(usdxToken.transfer(addr1.address, ethers.parseUnits("100", 6))).to.be.reverted;
    });

    it("Should remove blacklist status", async () => {
      await usdxToken.setBlacklisted(addr1.address, true);
      expect(await usdxToken.isBlacklisted(addr1.address)).to.be.true;

      await usdxToken.setBlacklisted(addr1.address, false);
      expect(await usdxToken.isBlacklisted(addr1.address)).to.be.false;
    });
  });

  describe("KYC Verification", () => {
    it("Should allow KYC verification by compliance role", async () => {
      await usdxToken.setKYCVerified(addr1.address, true);
      expect(await usdxToken.isKYCVerified(addr1.address)).to.be.true;
    });

    it("Should not allow KYC verification by non-compliance role", async () => {
      await expect(usdxToken.connect(addr1).setKYCVerified(addr2.address, true)).to.be.reverted;
    });

    it("Should prevent transfers without KYC verification", async () => {
      await usdxToken.setKYCVerified(owner.address, true);

      await expect(usdxToken.transfer(addr1.address, ethers.parseUnits("100", 6))).to.be.reverted;
    });

    it("Should allow transfers with KYC verification", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);

      await usdxToken.transfer(addr1.address, ethers.parseUnits("100", 6));
      expect(await usdxToken.balanceOf(addr1.address)).to.equal(ethers.parseUnits("100", 6));
    });
  });

  describe("Daily Transfer Limits", () => {
    beforeEach(async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setDailyTransferLimit(owner.address, ethers.parseUnits("500", 6));
    });

    it("Should allow transfers within daily limit", async () => {
      await usdxToken.transfer(addr1.address, ethers.parseUnits("300", 6));
      expect(await usdxToken.balanceOf(addr1.address)).to.equal(ethers.parseUnits("300", 6));
    });

    it("Should prevent transfers exceeding daily limit", async () => {
      await usdxToken.transfer(addr1.address, ethers.parseUnits("300", 6));

      await expect(usdxToken.transfer(addr1.address, ethers.parseUnits("300", 6))).to.be.reverted;
    });

    it("Should allow multiple transfers within limit", async () => {
      await usdxToken.transfer(addr1.address, ethers.parseUnits("200", 6));
      await usdxToken.transfer(addr1.address, ethers.parseUnits("200", 6));

      expect(await usdxToken.balanceOf(addr1.address)).to.equal(ethers.parseUnits("400", 6));
    });

    it("Should track daily transfer amounts", async () => {
      await usdxToken.transfer(addr1.address, ethers.parseUnits("300", 6));

      const dailyAmount = await usdxToken.getDailyTransferAmount(owner.address);
      expect(dailyAmount).to.equal(ethers.parseUnits("300", 6));
    });
  });

  describe("Pausing", () => {
    it("Should allow pausing by pauser role", async () => {
      await usdxToken.pause();
      expect(await usdxToken.paused()).to.be.true;
    });

    it("Should not allow pausing by non-pauser", async () => {
      await expect(usdxToken.connect(addr1).pause()).to.be.reverted;
    });

    it("Should prevent transfers when paused", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.pause();

      await expect(usdxToken.transfer(addr1.address, ethers.parseUnits("100", 6))).to.be.reverted;
    });

    it("Should allow unpausing", async () => {
      await usdxToken.pause();
      await usdxToken.unpause();
      expect(await usdxToken.paused()).to.be.false;
    });
  });

  describe("Sanctions", () => {
    it("Should allow sanctioning by compliance role", async () => {
      await usdxToken.setSanctioned(addr1.address, true);
      expect(await usdxToken.isSanctioned(addr1.address)).to.be.true;
    });

    it("Should not allow sanctioning by non-compliance role", async () => {
      await expect(usdxToken.connect(addr1).setSanctioned(addr2.address, true)).to.be.reverted;
    });

    it("Should prevent transfers involving sanctioned addresses", async () => {
      await usdxToken.setKYCVerified(owner.address, true);
      await usdxToken.setKYCVerified(addr1.address, true);
      await usdxToken.setSanctioned(addr1.address, true);

      await expect(usdxToken.transfer(addr1.address, ethers.parseUnits("100", 6))).to.be.reverted;
    });
  });

  describe("View Functions", () => {
    it("Should return correct transfer limits", async () => {
      expect(await usdxToken.getMaxTransferAmount()).to.equal(ethers.parseUnits("1000000", 6));
      expect(await usdxToken.getMinTransferAmount()).to.equal(ethers.parseUnits("1", 6));
    });

    it("Should return correct holder limits", async () => {
      expect(await usdxToken.getMaxHolderCount()).to.equal(2000);
      expect(await usdxToken.getCurrentHolderCount()).to.equal(1);
    });

    it("Should return correct KYC requirements", async () => {
      expect(await usdxToken.isKYCRequired()).to.be.true;
      expect(await usdxToken.isWhitelistEnabled()).to.be.true;
      expect(await usdxToken.isRegionRestrictionsEnabled()).to.be.false;
    });

    it("Should return correct region information", async () => {
      // Test default region code (should be 0)
      expect(await usdxToken.getRegionCode(addr1.address)).to.equal(0);

      // Test setting and getting region code
      await usdxToken.setRegionCode(addr1.address, 1);
      expect(await usdxToken.getRegionCode(addr1.address)).to.equal(1);

      // Test allowed regions (should be false by default)
      expect(await usdxToken.isRegionAllowed(1)).to.be.false;
      expect(await usdxToken.isRegionAllowed(0)).to.be.false;

      // Test setting allowed region
      await usdxToken.setAllowedRegion(1, true);
      expect(await usdxToken.isRegionAllowed(1)).to.be.true;
      expect(await usdxToken.isRegionAllowed(0)).to.be.false;
    });

    it("Should return correct compliance status information", async () => {
      // Test new query functions for authorization and validation
      expect(await usdxToken.isTransferAuthorizationRequired()).to.be.false;
      expect(await usdxToken.isRecipientValidationRequired()).to.be.false;
      expect(await usdxToken.isAuthorizedSender(addr1.address)).to.be.false;
      expect(await usdxToken.isValidRecipient(addr1.address)).to.be.false;

      // Test setting authorization requirement
      await usdxToken.setTransferAuthorizationRequired(true);
      expect(await usdxToken.isTransferAuthorizationRequired()).to.be.true;

      // Test setting recipient validation requirement
      await usdxToken.setRecipientValidationRequired(true);
      expect(await usdxToken.isRecipientValidationRequired()).to.be.true;

      // Test setting authorized sender
      await usdxToken.setAuthorizedSender(addr1.address, true);
      expect(await usdxToken.isAuthorizedSender(addr1.address)).to.be.true;

      // Test setting valid recipient
      await usdxToken.setValidRecipient(addr1.address, true);
      expect(await usdxToken.isValidRecipient(addr1.address)).to.be.true;
    });
  });
});
