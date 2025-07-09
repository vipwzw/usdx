// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title USDX Governance Contract
 * @dev Multi-signature governance system for USDX token management
 * @author USDX Stablecoin Team
 */
contract USDXGovernance is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // Roles
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        address target;
        uint256 value;
        bytes data;
        string description;
        uint256 votingDeadline;
        bool executed;
        bool cancelled;
        uint256 forVotes;
        uint256 againstVotes;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice;
    }

    // State variables
    address public token;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => bool) public governors;
    address[] public governorList;
    
    uint256 public proposalCount;
    uint256 public requiredVotes;
    uint256 public votingPeriod;
    uint256 public executionDelay;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address target,
        uint256 value,
        bytes data,
        string description,
        uint256 votingDeadline
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    
    event GovernorAdded(address indexed governor);
    event GovernorRemoved(address indexed governor);
    
    event RequiredVotesChanged(uint256 oldRequired, uint256 newRequired);
    event VotingPeriodChanged(uint256 oldPeriod, uint256 newPeriod);
    event ExecutionDelayChanged(uint256 oldDelay, uint256 newDelay);

    // Modifiers
    modifier onlyGovernor() {
        require(governors[msg.sender], "Must be governor");
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposalId < proposalCount, "Proposal does not exist");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the governance contract
     * @param tokenAddress Address of the USDX token contract
     * @param initialGovernors List of initial governor addresses
     * @param requiredVotes_ Number of votes required for proposal execution
     * @param votingPeriod_ Voting period in seconds
     * @param executionDelay_ Execution delay in seconds
     */
    function initialize(
        address tokenAddress,
        address[] memory initialGovernors,
        uint256 requiredVotes_,
        uint256 votingPeriod_,
        uint256 executionDelay_
    ) public initializer {
        require(tokenAddress != address(0), "Invalid token address");
        require(initialGovernors.length > 0, "Must have at least one governor");
        require(requiredVotes_ > 0 && requiredVotes_ <= initialGovernors.length, "Invalid required votes");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Set up admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Initialize parameters
        token = tokenAddress;
        requiredVotes = requiredVotes_;
        votingPeriod = votingPeriod_;
        executionDelay = executionDelay_;

        // Add initial governors
        for (uint256 i = 0; i < initialGovernors.length; i++) {
            _addGovernor(initialGovernors[i]);
        }
    }

    /**
     * @dev Creates a new proposal
     * @param target Contract to call
     * @param value ETH value to send
     * @param data Call data
     * @param description Proposal description
     * @return proposalId New proposal ID
     */
    function propose(
        address target,
        uint256 value,
        bytes memory data,
        string memory description
    ) external onlyGovernor returns (uint256 proposalId) {
        require(target != address(0), "Invalid target address");
        require(bytes(description).length > 0, "Description cannot be empty");

        proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.target = target;
        proposal.value = value;
        proposal.data = data;
        proposal.description = description;
        proposal.votingDeadline = block.timestamp + votingPeriod;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            target,
            value,
            data,
            description,
            proposal.votingDeadline
        );
    }

    /**
     * @dev Casts a vote on a proposal
     * @param proposalId ID of the proposal
     * @param support Whether to support the proposal
     */
    function castVote(uint256 proposalId, bool support) 
        external 
        onlyGovernor 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp <= proposal.votingDeadline, "Voting has ended");
        require(!proposal.cancelled, "Proposal cancelled");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        proposal.hasVoted[msg.sender] = true;
        proposal.voteChoice[msg.sender] = support;

        if (support) {
            proposal.forVotes++;
        } else {
            proposal.againstVotes++;
        }

        emit VoteCast(proposalId, msg.sender, support);
    }

    /**
     * @dev Executes a proposal if conditions are met
     * @param proposalId ID of the proposal to execute
     */
    function execute(uint256 proposalId) 
        external 
        onlyGovernor 
        proposalExists(proposalId) 
        nonReentrant 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp > proposal.votingDeadline, "Voting still active");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(proposal.forVotes >= requiredVotes, "Insufficient votes");
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");
        
        // Check execution delay
        require(
            block.timestamp >= proposal.votingDeadline + executionDelay,
            "Execution delay not met"
        );

        proposal.executed = true;

        // Execute the proposal
        (bool success, bytes memory returnData) = proposal.target.call{value: proposal.value}(
            proposal.data
        );
        
        require(success, string(returnData));

        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Cancels a proposal
     * @param proposalId ID of the proposal to cancel
     */
    function cancel(uint256 proposalId) 
        external 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(!proposal.executed, "Cannot cancel executed proposal");
        require(!proposal.cancelled, "Already cancelled");
        require(
            msg.sender == proposal.proposer || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only proposer or admin can cancel"
        );

        proposal.cancelled = true;

        emit ProposalCancelled(proposalId);
    }

    /**
     * @dev Adds a new governor
     * @param governor Address of the new governor
     */
    function addGovernor(address governor) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _addGovernor(governor);
    }

    /**
     * @dev Removes a governor
     * @param governor Address of the governor to remove
     */
    function removeGovernor(address governor) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(governors[governor], "Not a governor");
        require(governorList.length > 1, "Cannot remove last governor");

        governors[governor] = false;
        _revokeRole(GOVERNOR_ROLE, governor);

        // Remove from governor list
        for (uint256 i = 0; i < governorList.length; i++) {
            if (governorList[i] == governor) {
                governorList[i] = governorList[governorList.length - 1];
                governorList.pop();
                break;
            }
        }

        emit GovernorRemoved(governor);
    }

    /**
     * @dev Changes the required number of votes
     * @param newRequired New required vote count
     */
    function setRequiredVotes(uint256 newRequired) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newRequired > 0 && newRequired <= governorList.length, "Invalid required votes");
        
        uint256 oldRequired = requiredVotes;
        requiredVotes = newRequired;
        
        emit RequiredVotesChanged(oldRequired, newRequired);
    }

    /**
     * @dev Changes the voting period
     * @param newPeriod New voting period in seconds
     */
    function setVotingPeriod(uint256 newPeriod) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newPeriod > 0, "Voting period must be positive");
        
        uint256 oldPeriod = votingPeriod;
        votingPeriod = newPeriod;
        
        emit VotingPeriodChanged(oldPeriod, newPeriod);
    }

    /**
     * @dev Changes the execution delay
     * @param newDelay New execution delay in seconds
     */
    function setExecutionDelay(uint256 newDelay) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        uint256 oldDelay = executionDelay;
        executionDelay = newDelay;
        
        emit ExecutionDelayChanged(oldDelay, newDelay);
    }

    /**
     * @dev Internal function to add a governor
     * @param governor Address of the governor to add
     */
    function _addGovernor(address governor) internal {
        require(governor != address(0), "Invalid governor address");
        require(!governors[governor], "Already a governor");

        governors[governor] = true;
        governorList.push(governor);
        _grantRole(GOVERNOR_ROLE, governor);

        emit GovernorAdded(governor);
    }

    /**
     * @dev Authorizes contract upgrades
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {}

    // View functions
    function getProposal(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (
            uint256 id,
            address proposer,
            address target,
            uint256 value,
            bytes memory data,
            string memory description,
            uint256 votingDeadline,
            bool executed,
            bool cancelled,
            uint256 forVotes,
            uint256 againstVotes
        ) 
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.target,
            proposal.value,
            proposal.data,
            proposal.description,
            proposal.votingDeadline,
            proposal.executed,
            proposal.cancelled,
            proposal.forVotes,
            proposal.againstVotes
        );
    }

    function getProposalState(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (string memory) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.cancelled) {
            return "Cancelled";
        }
        
        if (proposal.executed) {
            return "Executed";
        }
        
        if (block.timestamp <= proposal.votingDeadline) {
            return "Active";
        }
        
        if (proposal.forVotes < requiredVotes) {
            return "Failed";
        }
        
        if (proposal.forVotes <= proposal.againstVotes) {
            return "Defeated";
        }
        
        if (block.timestamp < proposal.votingDeadline + executionDelay) {
            return "Queued";
        }
        
        return "Expired";
    }

    function hasVoted(uint256 proposalId, address voter) 
        external 
        view 
        proposalExists(proposalId) 
        returns (bool) 
    {
        return proposals[proposalId].hasVoted[voter];
    }

    function getVoteChoice(uint256 proposalId, address voter) 
        external 
        view 
        proposalExists(proposalId) 
        returns (bool) 
    {
        require(proposals[proposalId].hasVoted[voter], "Voter has not voted");
        return proposals[proposalId].voteChoice[voter];
    }

    function getGovernors() external view returns (address[] memory) {
        return governorList;
    }

    function getGovernorCount() external view returns (uint256) {
        return governorList.length;
    }

    function isGovernor(address account) external view returns (bool) {
        return governors[account];
    }
} 