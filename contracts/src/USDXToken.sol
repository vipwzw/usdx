// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/IERC1404.sol";


/**
 * @title USDX Stablecoin Token
 * @dev ERC-1404 compliant stablecoin with transfer restrictions
 * @author USDX Stablecoin Team
 */
contract USDXToken is
    Initializable,
    ERC20Upgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IERC1404
{
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // Restriction codes
    uint8 public constant SUCCESS = 0;
    uint8 public constant FAILURE = 1;
    uint8 public constant BLACKLISTED_SENDER = 2;
    uint8 public constant BLACKLISTED_RECEIVER = 3;
    uint8 public constant INSUFFICIENT_BALANCE = 4;
    uint8 public constant PAUSED = 5;
    uint8 public constant INVALID_KYC_SENDER = 6;
    uint8 public constant INVALID_KYC_RECEIVER = 7;
    uint8 public constant AMOUNT_EXCEEDS_LIMIT = 8;
    uint8 public constant SANCTIONED_ADDRESS = 9;
    uint8 public constant EXCEEDS_HOLDER_LIMIT = 10;
    uint8 public constant REGION_RESTRICTION = 11;

    // State variables
    mapping(address => bool) private _blacklisted;
    mapping(address => bool) private _kycVerified;
    mapping(address => bool) private _sanctioned;
    mapping(address => uint256) private _dailyTransferLimit;
    mapping(address => uint256) private _dailyTransferAmount;
    mapping(address => uint256) private _lastTransferDay;
    mapping(address => uint256) private _regionCode;
    
    uint256 private _maxTransferAmount;
    uint256 private _minTransferAmount;
    uint256 private _maxHolderCount;
    uint256 private _currentHolderCount;
    
    bool private _kycRequired;
    bool private _whitelistEnabled;
    bool private _regionRestrictionsEnabled;

    // Events
    event BlacklistUpdated(address indexed account, bool blacklisted);
    event KYCStatusUpdated(address indexed account, bool verified);
    event SanctionStatusUpdated(address indexed account, bool sanctioned);
    event DailyTransferLimitUpdated(address indexed account, uint256 limit);
    event ComplianceConfigUpdated(bool kycRequired, bool whitelistEnabled, bool regionRestricted);
    event TransferLimitsUpdated(uint256 maxAmount, uint256 minAmount);
    event HolderLimitsUpdated(uint256 maxHolders);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the token with basic parameters
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param admin Initial admin address
     */
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address admin
    ) public initializer {
        require(admin != address(0), "Admin cannot be zero address");
        
        __ERC20_init(name, symbol);
        __ERC20Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(BLACKLISTER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, admin);

        // Set default parameters
        _maxTransferAmount = 1000000 * 10**decimals(); // 1M tokens
        _minTransferAmount = 1 * 10**decimals(); // 1 token
        _maxHolderCount = 2000; // Maximum holders
        _kycRequired = true;
        _whitelistEnabled = true;
        _regionRestrictionsEnabled = false;

        // Mint initial supply to admin
        if (initialSupply > 0) {
            _mint(admin, initialSupply);
            _currentHolderCount = 1;
        }
    }

    /**
     * @dev Returns 6 decimals for USDX token
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev ERC-1404 implementation: Detect transfer restriction
     * @param from Sender address
     * @param to Recipient address
     * @param value Transfer amount
     * @return Restriction code (0 = allowed)
     */
    function detectTransferRestriction(
        address from,
        address to,
        uint256 value
    ) public view override returns (uint8) {
        // Check if contract is paused
        if (paused()) {
            return PAUSED;
        }

        // Check blacklisted addresses
        if (_blacklisted[from]) {
            return BLACKLISTED_SENDER;
        }
        if (_blacklisted[to]) {
            return BLACKLISTED_RECEIVER;
        }

        // Check sanctioned addresses
        if (_sanctioned[from] || _sanctioned[to]) {
            return SANCTIONED_ADDRESS;
        }

        // Check KYC requirements (skip for zero address in minting)
        if (_kycRequired) {
            if (from != address(0) && !_kycVerified[from]) {
                return INVALID_KYC_SENDER;
            }
            if (to != address(0) && !_kycVerified[to]) {
                return INVALID_KYC_RECEIVER;
            }
        }

        // Check balance (for non-mint operations)
        if (from != address(0) && balanceOf(from) < value) {
            return INSUFFICIENT_BALANCE;
        }

        // Check transfer limits
        if (value > _maxTransferAmount) {
            return AMOUNT_EXCEEDS_LIMIT;
        }
        if (value < _minTransferAmount) {
            return AMOUNT_EXCEEDS_LIMIT;
        }

        // Check daily transfer limits
        if (_isDailyLimitExceeded(from, value)) {
            return AMOUNT_EXCEEDS_LIMIT;
        }

        // Check holder count limits (for new holders)
        if (to != address(0) && balanceOf(to) == 0 && _currentHolderCount >= _maxHolderCount) {
            return EXCEEDS_HOLDER_LIMIT;
        }

        // Check region restrictions
        if (_regionRestrictionsEnabled && _isRegionRestricted(from, to)) {
            return REGION_RESTRICTION;
        }

        return SUCCESS;
    }

    /**
     * @dev ERC-1404 implementation: Get restriction message
     * @param restrictionCode Restriction code
     * @return Human-readable message
     */
    function messageForTransferRestriction(
        uint8 restrictionCode
    ) public pure override returns (string memory) {
        return RestrictionMessages.messageForCode(restrictionCode);
    }

    /**
     * @dev Override _update to implement ERC-1404 restrictions and handle balance tracking
     * @param from Sender address
     * @param to Recipient address
     * @param value Transfer amount
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        // Check transfer restrictions (skip for minting/burning)
        if (from != address(0) && to != address(0)) {
            uint8 restrictionCode = detectTransferRestriction(from, to, value);
            require(restrictionCode == SUCCESS, 
                    messageForTransferRestriction(restrictionCode));
            
            // Update daily transfer tracking
            _updateDailyTransferAmount(from, value);
        }

        // Call parent _update function
        super._update(from, to, value);

        // Update holder count tracking
        _updateHolderCount(from, to, value);
    }

    /**
     * @dev Mints tokens to specified address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        nonReentrant 
    {
        require(to != address(0), "Cannot mint to zero address");
        
        uint8 restrictionCode = detectTransferRestriction(address(0), to, amount);
        require(restrictionCode == SUCCESS, 
                messageForTransferRestriction(restrictionCode));
        
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens from caller's address
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external nonReentrant {
        require(amount > 0, "Burn amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance to burn");
        
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burns tokens from specified address (requires BURNER_ROLE)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) 
        external 
        onlyRole(BURNER_ROLE) 
        nonReentrant 
    {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Burn amount must be greater than zero");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
    }

    /**
     * @dev Adds/removes address from blacklist
     * @param account Address to update
     * @param blacklisted Whether to blacklist the address
     */
    function setBlacklisted(address account, bool blacklisted) 
        external 
        onlyRole(BLACKLISTER_ROLE) 
    {
        require(account != address(0), "Cannot blacklist zero address");
        _blacklisted[account] = blacklisted;
        emit BlacklistUpdated(account, blacklisted);
    }

    /**
     * @dev Updates KYC verification status
     * @param account Address to update
     * @param verified Whether the address is KYC verified
     */
    function setKYCVerified(address account, bool verified) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        require(account != address(0), "Cannot set KYC for zero address");
        _kycVerified[account] = verified;
        emit KYCStatusUpdated(account, verified);
    }

    /**
     * @dev Sets daily transfer limit for address
     * @param account Address to set limit for
     * @param limit Daily transfer limit
     */
    function setDailyTransferLimit(address account, uint256 limit) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        require(account != address(0), "Cannot set limit for zero address");
        _dailyTransferLimit[account] = limit;
        emit DailyTransferLimitUpdated(account, limit);
    }

    /**
     * @dev Updates sanction status
     * @param account Address to update
     * @param sanctioned Whether the address is sanctioned
     */
    function setSanctioned(address account, bool sanctioned) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        require(account != address(0), "Cannot sanction zero address");
        _sanctioned[account] = sanctioned;
        emit SanctionStatusUpdated(account, sanctioned);
    }

    /**
     * @dev Pauses all token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Checks if daily transfer limit is exceeded
     * @param from Sender address
     * @param amount Transfer amount
     * @return True if limit exceeded
     */
    function _isDailyLimitExceeded(address from, uint256 amount) internal view returns (bool) {
        if (_dailyTransferLimit[from] == 0) {
            return false; // No limit set
        }

        uint256 currentDay = block.timestamp / 86400;
        if (_lastTransferDay[from] != currentDay) {
            return false; // New day, reset counter
        }

        return _dailyTransferAmount[from] + amount > _dailyTransferLimit[from];
    }

    /**
     * @dev Checks if region restriction applies
     * @param from Sender address
     * @param to Recipient address
     * @return True if restricted
     */
    function _isRegionRestricted(address from, address to) internal view returns (bool) {
        // Implementation depends on specific regional requirements
        // For demo, we'll check if addresses have restricted region codes
        return _regionCode[from] == 999 || _regionCode[to] == 999;
    }

    /**
     * @dev Updates daily transfer tracking
     * @param from Sender address
     * @param amount Transfer amount
     */
    function _updateDailyTransferAmount(address from, uint256 amount) internal {
        if (_dailyTransferLimit[from] == 0) {
            return; // No limit set
        }

        uint256 currentDay = block.timestamp / 86400;
        if (_lastTransferDay[from] != currentDay) {
            _dailyTransferAmount[from] = amount;
            _lastTransferDay[from] = currentDay;
        } else {
            _dailyTransferAmount[from] += amount;
        }
    }

    /**
     * @dev Updates holder count when balance changes
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     */
    function _updateHolderCount(address from, address to, uint256 amount) internal {
        // Check if recipient becomes a new holder
        if (to != address(0) && balanceOf(to) == amount && from != address(0)) {
            _currentHolderCount++;
        }

        // Check if sender is no longer a holder
        if (from != address(0) && balanceOf(from) == 0 && to != address(0)) {
            _currentHolderCount--;
        }
    }

    /**
     * @dev Authorize contract upgrades
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}

    // View functions for getting restriction states
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    function isKYCVerified(address account) external view returns (bool) {
        return _kycVerified[account];
    }

    function isSanctioned(address account) external view returns (bool) {
        return _sanctioned[account];
    }

    function getDailyTransferLimit(address account) external view returns (uint256) {
        return _dailyTransferLimit[account];
    }

    function getDailyTransferAmount(address account) external view returns (uint256) {
        return _dailyTransferAmount[account];
    }

    function getMaxTransferAmount() external view returns (uint256) {
        return _maxTransferAmount;
    }

    function getMinTransferAmount() external view returns (uint256) {
        return _minTransferAmount;
    }

    function getMaxHolderCount() external view returns (uint256) {
        return _maxHolderCount;
    }

    function getCurrentHolderCount() external view returns (uint256) {
        return _currentHolderCount;
    }

    function isKYCRequired() external view returns (bool) {
        return _kycRequired;
    }

    function isWhitelistEnabled() external view returns (bool) {
        return _whitelistEnabled;
    }

    function isRegionRestrictionsEnabled() external view returns (bool) {
        return _regionRestrictionsEnabled;
    }
} 