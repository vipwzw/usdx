const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("USDXGovernance", () => {
  let usdxToken;
  let governance;
  let owner;
  let governor1;
  let governor2;
  let governor3;
  let addr1;
  let _addr2;
  let _addrs;

  beforeEach(async () => {
    [owner, governor1, governor2, governor3, addr1, _addr2, ..._addrs] = await ethers.getSigners();

    // Deploy USDX token
    const USDXToken = await ethers.getContractFactory("USDXToken");
    usdxToken = await upgrades.deployProxy(
      USDXToken,
      ["USDX Stablecoin", "USDX", ethers.parseUnits("1000000", 6), owner.address],
      { initializer: "initialize", kind: "uups" },
    );

    // Deploy governance contract
    const USDXGovernance = await ethers.getContractFactory("USDXGovernance");
    governance = await upgrades.deployProxy(
      USDXGovernance,
      [
        await usdxToken.getAddress(),
        [governor1.address, governor2.address, governor3.address],
        2, // required votes
        86400, // 1 day voting period
        7200, // 2 hours execution delay
      ],
      { initializer: "initialize", kind: "uups" },
    );

    // Grant necessary roles to governance contract
    const PAUSER_ROLE = await usdxToken.PAUSER_ROLE();
    const MINTER_ROLE = await usdxToken.MINTER_ROLE();
    const UPGRADER_ROLE = await usdxToken.UPGRADER_ROLE();

    await usdxToken.grantRole(PAUSER_ROLE, await governance.getAddress());
    await usdxToken.grantRole(MINTER_ROLE, await governance.getAddress());
    await usdxToken.grantRole(UPGRADER_ROLE, await governance.getAddress());
  });

  describe("Deployment", () => {
    it("Should set correct initial parameters", async () => {
      expect(await governance.token()).to.equal(await usdxToken.getAddress());
      expect(await governance.requiredVotes()).to.equal(2);
      expect(await governance.votingPeriod()).to.equal(86400);
      expect(await governance.executionDelay()).to.equal(7200);
    });

    it("Should add initial governors", async () => {
      expect(await governance.isGovernor(governor1.address)).to.be.true;
      expect(await governance.isGovernor(governor2.address)).to.be.true;
      expect(await governance.isGovernor(governor3.address)).to.be.true;
      expect(await governance.getGovernorCount()).to.equal(3);
    });

    it("Should grant admin role to deployer", async () => {
      const DEFAULT_ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();
      expect(await governance.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should grant governor role to initial governors", async () => {
      const GOVERNOR_ROLE = await governance.GOVERNOR_ROLE();
      expect(await governance.hasRole(GOVERNOR_ROLE, governor1.address)).to.be.true;
      expect(await governance.hasRole(GOVERNOR_ROLE, governor2.address)).to.be.true;
      expect(await governance.hasRole(GOVERNOR_ROLE, governor3.address)).to.be.true;
    });
  });

  describe("Governor Management", () => {
    it("Should allow admin to add governors", async () => {
      await governance.addGovernor(addr1.address);
      expect(await governance.isGovernor(addr1.address)).to.be.true;
      expect(await governance.getGovernorCount()).to.equal(4);
    });

    it("Should not allow non-admin to add governors", async () => {
      await expect(governance.connect(governor1).addGovernor(addr1.address)).to.be.reverted;
    });

    it("Should allow admin to remove governors", async () => {
      await governance.removeGovernor(governor3.address);
      expect(await governance.isGovernor(governor3.address)).to.be.false;
      expect(await governance.getGovernorCount()).to.equal(2);
    });

    it("Should not allow removing last governor", async () => {
      await governance.removeGovernor(governor2.address);
      await governance.removeGovernor(governor3.address);

      await expect(governance.removeGovernor(governor1.address)).to.be.reverted;
    });

    it("Should not allow non-admin to remove governors", async () => {
      await expect(governance.connect(governor1).removeGovernor(governor2.address)).to.be.reverted;
    });

    it("Should emit events on governor changes", async () => {
      await expect(governance.addGovernor(addr1.address))
        .to.emit(governance, "GovernorAdded")
        .withArgs(addr1.address);

      await expect(governance.removeGovernor(addr1.address))
        .to.emit(governance, "GovernorRemoved")
        .withArgs(addr1.address);
    });
  });

  describe("Proposal Creation", () => {
    it("Should allow governors to create proposals", async () => {
      const target = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause the token";

      await expect(governance.connect(governor1).propose(target, value, data, description)).to.emit(
        governance,
        "ProposalCreated",
      );

      expect(await governance.proposalCount()).to.equal(1);
    });

    it("Should not allow non-governors to create proposals", async () => {
      const target = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause the token";

      await expect(governance.connect(addr1).propose(target, value, data, description)).to.be
        .reverted;
    });

    it("Should not allow proposals with zero address target", async () => {
      const target = ethers.ZeroAddress;
      const value = 0;
      const data = "0x";
      const description = "Invalid proposal";

      await expect(governance.connect(governor1).propose(target, value, data, description)).to.be
        .reverted;
    });

    it("Should not allow proposals with empty description", async () => {
      const target = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "";

      await expect(governance.connect(governor1).propose(target, value, data, description)).to.be
        .reverted;
    });

    it("Should set correct proposal parameters", async () => {
      const target = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause the token";

      await governance.connect(governor1).propose(target, value, data, description);

      const proposal = await governance.getProposal(0);
      expect(proposal.proposer).to.equal(governor1.address);
      expect(proposal.target).to.equal(target);
      expect(proposal.value).to.equal(value);
      expect(proposal.data).to.equal(data);
      expect(proposal.description).to.equal(description);
      expect(proposal.executed).to.be.false;
      expect(proposal.cancelled).to.be.false;
    });
  });

  describe("Voting", () => {
    let proposalId;

    beforeEach(async () => {
      const target = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause the token";

      await governance.connect(governor1).propose(target, value, data, description);
      proposalId = 0;
    });

    it("Should allow governors to vote", async () => {
      await expect(governance.connect(governor1).castVote(proposalId, true))
        .to.emit(governance, "VoteCast")
        .withArgs(proposalId, governor1.address, true);

      expect(await governance.hasVoted(proposalId, governor1.address)).to.be.true;
      expect(await governance.getVoteChoice(proposalId, governor1.address)).to.be.true;
    });

    it("Should not allow non-governors to vote", async () => {
      await expect(governance.connect(addr1).castVote(proposalId, true)).to.be.reverted;
    });

    it("Should not allow voting twice", async () => {
      await governance.connect(governor1).castVote(proposalId, true);

      await expect(governance.connect(governor1).castVote(proposalId, false)).to.be.reverted;
    });

    it("Should not allow voting after deadline", async () => {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await expect(governance.connect(governor1).castVote(proposalId, true)).to.be.reverted;
    });

    it("Should not allow voting on cancelled proposals", async () => {
      await governance.connect(governor1).cancel(proposalId);

      await expect(governance.connect(governor2).castVote(proposalId, true)).to.be.reverted;
    });

    it("Should track vote counts correctly", async () => {
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, false);
      await governance.connect(governor3).castVote(proposalId, true);

      const proposal = await governance.getProposal(proposalId);
      expect(proposal.forVotes).to.equal(2);
      expect(proposal.againstVotes).to.equal(1);
    });
  });

  describe("Proposal Execution", () => {
    let proposalId;

    beforeEach(async () => {
      const target = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause the token";

      await governance.connect(governor1).propose(target, value, data, description);
      proposalId = 0;
    });

    it("Should execute proposal with sufficient votes", async () => {
      // Vote
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      // Fast forward past voting deadline
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      // Fast forward past execution delay
      await ethers.provider.send("evm_increaseTime", [7201]);
      await ethers.provider.send("evm_mine");

      // Execute
      await expect(governance.connect(governor1).execute(proposalId))
        .to.emit(governance, "ProposalExecuted")
        .withArgs(proposalId);

      // Verify the proposal was executed
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.executed).to.be.true;
    });

    it("Should not execute proposal with insufficient votes", async () => {
      // Vote (only 1 vote, need 2)
      await governance.connect(governor1).castVote(proposalId, true);

      // Fast forward past voting deadline and execution delay
      await ethers.provider.send("evm_increaseTime", [86401 + 7201]);
      await ethers.provider.send("evm_mine");

      await expect(governance.connect(governor1).execute(proposalId)).to.be.reverted;
    });

    it("Should not execute proposal during voting period", async () => {
      // Vote
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      // Try to execute without waiting for voting deadline
      await expect(governance.connect(governor1).execute(proposalId)).to.be.reverted;
    });

    it("Should not execute proposal during execution delay", async () => {
      // Vote
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      // Fast forward past voting deadline but not execution delay
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await expect(governance.connect(governor1).execute(proposalId)).to.be.reverted;
    });

    it("Should not execute cancelled proposals", async () => {
      // Cancel proposal
      await governance.connect(governor1).cancel(proposalId);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401 + 7201]);
      await ethers.provider.send("evm_mine");

      await expect(governance.connect(governor1).execute(proposalId)).to.be.reverted;
    });

    it("Should not execute already executed proposals", async () => {
      // Vote and execute
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [86401 + 7201]);
      await ethers.provider.send("evm_mine");

      await governance.connect(governor1).execute(proposalId);

      // Try to execute again
      await expect(governance.connect(governor1).execute(proposalId)).to.be.reverted;
    });
  });

  describe("Proposal Cancellation", () => {
    let proposalId;

    beforeEach(async () => {
      const target = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause the token";

      await governance.connect(governor1).propose(target, value, data, description);
      proposalId = 0;
    });

    it("Should allow proposer to cancel proposal", async () => {
      await expect(governance.connect(governor1).cancel(proposalId))
        .to.emit(governance, "ProposalCancelled")
        .withArgs(proposalId);

      const proposal = await governance.getProposal(proposalId);
      expect(proposal.cancelled).to.be.true;
    });

    it("Should allow admin to cancel proposal", async () => {
      await expect(governance.connect(owner).cancel(proposalId))
        .to.emit(governance, "ProposalCancelled")
        .withArgs(proposalId);

      const proposal = await governance.getProposal(proposalId);
      expect(proposal.cancelled).to.be.true;
    });

    it("Should not allow others to cancel proposal", async () => {
      await expect(governance.connect(governor2).cancel(proposalId)).to.be.reverted;
    });

    it("Should not cancel executed proposals", async () => {
      // Vote and execute
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [86401 + 7201]);
      await ethers.provider.send("evm_mine");

      await governance.connect(governor1).execute(proposalId);

      // Try to cancel
      await expect(governance.connect(governor1).cancel(proposalId)).to.be.reverted;
    });

    it("Should not cancel already cancelled proposals", async () => {
      await governance.connect(governor1).cancel(proposalId);

      await expect(governance.connect(governor1).cancel(proposalId)).to.be.reverted;
    });
  });

  describe("Configuration", () => {
    it("Should allow admin to change required votes", async () => {
      await expect(governance.setRequiredVotes(3))
        .to.emit(governance, "RequiredVotesChanged")
        .withArgs(2, 3);

      expect(await governance.requiredVotes()).to.equal(3);
    });

    it("Should not allow setting required votes to zero", async () => {
      await expect(governance.setRequiredVotes(0)).to.be.reverted;
    });

    it("Should not allow setting required votes above governor count", async () => {
      await expect(governance.setRequiredVotes(4)).to.be.reverted;
    });

    it("Should allow admin to change voting period", async () => {
      await expect(governance.setVotingPeriod(172800))
        .to.emit(governance, "VotingPeriodChanged")
        .withArgs(86400, 172800);

      expect(await governance.votingPeriod()).to.equal(172800);
    });

    it("Should not allow setting voting period to zero", async () => {
      await expect(governance.setVotingPeriod(0)).to.be.reverted;
    });

    it("Should allow admin to change execution delay", async () => {
      await expect(governance.setExecutionDelay(14400))
        .to.emit(governance, "ExecutionDelayChanged")
        .withArgs(7200, 14400);

      expect(await governance.executionDelay()).to.equal(14400);
    });

    it("Should not allow non-admin to change configuration", async () => {
      await expect(governance.connect(governor1).setRequiredVotes(3)).to.be.reverted;
      await expect(governance.connect(governor1).setVotingPeriod(172800)).to.be.reverted;
      await expect(governance.connect(governor1).setExecutionDelay(14400)).to.be.reverted;
    });
  });

  describe("Proposal States", () => {
    let proposalId;

    beforeEach(async () => {
      const target = await usdxToken.getAddress();
      const value = 0;
      const data = usdxToken.interface.encodeFunctionData("pause", []);
      const description = "Pause the token";

      await governance.connect(governor1).propose(target, value, data, description);
      proposalId = 0;
    });

    it("Should return 'Active' during voting period", async () => {
      expect(await governance.getProposalState(proposalId)).to.equal("Active");
    });

    it("Should return 'Cancelled' for cancelled proposals", async () => {
      await governance.connect(governor1).cancel(proposalId);
      expect(await governance.getProposalState(proposalId)).to.equal("Cancelled");
    });

    it("Should return 'Executed' for executed proposals", async () => {
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [86401 + 7201]);
      await ethers.provider.send("evm_mine");

      await governance.connect(governor1).execute(proposalId);
      expect(await governance.getProposalState(proposalId)).to.equal("Executed");
    });

    it("Should return 'Failed' for proposals with insufficient votes", async () => {
      await governance.connect(governor1).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      expect(await governance.getProposalState(proposalId)).to.equal("Failed");
    });

    it("Should return 'Defeated' for proposals with more against votes", async () => {
      await governance.connect(governor1).castVote(proposalId, false);
      await governance.connect(governor2).castVote(proposalId, false);
      await governance.connect(governor3).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      expect(await governance.getProposalState(proposalId)).to.equal("Defeated");
    });

    it("Should return 'Queued' for proposals in execution delay", async () => {
      await governance.connect(governor1).castVote(proposalId, true);
      await governance.connect(governor2).castVote(proposalId, true);

      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      expect(await governance.getProposalState(proposalId)).to.equal("Queued");
    });
  });

  describe("View Functions", () => {
    it("Should return governor list", async () => {
      const governors = await governance.getGovernors();
      expect(governors).to.have.length(3);
      expect(governors).to.include(governor1.address);
      expect(governors).to.include(governor2.address);
      expect(governors).to.include(governor3.address);
    });

    it("Should return correct governor count", async () => {
      expect(await governance.getGovernorCount()).to.equal(3);
    });

    it("Should check if address is governor", async () => {
      expect(await governance.isGovernor(governor1.address)).to.be.true;
      expect(await governance.isGovernor(addr1.address)).to.be.false;
    });
  });
});
