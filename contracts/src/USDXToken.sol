// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { ERC20PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { IERC1404, RestrictionMessages } from "./interfaces/IERC1404.sol";
import { console } from "hardhat/console.sol";

/**
 * @title USDX Stablecoin Token
 * @notice ERC-1404 compliant stablecoin with transfer restrictions and compliance features
 * @dev This contract implements a stablecoin with built-in compliance, transfer restrictions,
 *      KYC verification, blacklisting, and sanction screening capabilities
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
    // Custom Errors
    error AdminCannotBeZeroAddress();
    error TransferRestricted(uint8 restrictionCode, string message);
    error ReceiverBlacklisted();
    error ReceiverKYCRequired();
    error AddressSanctioned();
    error CannotMintToZeroAddress();
    error BurnAmountMustBeGreaterThanZero();
    error InsufficientBalanceToBurn();
    error CannotBurnFromZeroAddress();
    error CannotBlacklistZeroAddress();
    error CannotSetKYCForZeroAddress();
    error CannotSetLimitForZeroAddress();
    error CannotSanctionZeroAddress();

    // Roles
    /// @notice Role identifier for addresses that can mint tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    /// @notice Role identifier for addresses that can burn tokens
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    /// @notice Role identifier for addresses that can pause/unpause the contract
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    /// @notice Role identifier for addresses that can manage blacklist
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
    /// @notice Role identifier for addresses that can upgrade the contract
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    /// @notice Role identifier for addresses that can manage compliance settings
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // Restriction codes
    /// @notice Success code indicating no transfer restrictions
    uint8 public constant SUCCESS = 0;
    /// @notice General failure code
    uint8 public constant FAILURE = 1;
    /// @notice Restriction code for blacklisted sender
    uint8 public constant BLACKLISTED_SENDER = 2;
    /// @notice Restriction code for blacklisted receiver
    uint8 public constant BLACKLISTED_RECEIVER = 3;
    /// @notice Restriction code for insufficient balance
    uint8 public constant INSUFFICIENT_BALANCE = 4;
    /// @notice Restriction code when contract is paused
    uint8 public constant PAUSED = 5;
    /// @notice Restriction code for invalid KYC sender
    uint8 public constant INVALID_KYC_SENDER = 6;
    /// @notice Restriction code for invalid KYC receiver
    uint8 public constant INVALID_KYC_RECEIVER = 7;
    /// @notice Restriction code when amount exceeds limits
    uint8 public constant AMOUNT_EXCEEDS_LIMIT = 8;
    /// @notice Restriction code for sanctioned address
    uint8 public constant SANCTIONED_ADDRESS = 9;
    /// @notice Restriction code when holder limit exceeded
    uint8 public constant EXCEEDS_HOLDER_LIMIT = 10;
    /// @notice Restriction code for region restrictions
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
    /// @notice Emitted when blacklist status is updated
    /// @param account The address whose blacklist status was updated
    /// @param blacklisted True if the address is blacklisted, false otherwise
    event BlacklistUpdated(address indexed account, bool blacklisted);

    /// @notice Emitted when KYC status is updated
    /// @param account The address whose KYC status was updated
    /// @param verified True if the address is KYC verified, false otherwise
    event KYCStatusUpdated(address indexed account, bool verified);

    /// @notice Emitted when sanction status is updated
    /// @param account The address whose sanction status was updated
    /// @param sanctioned True if the address is sanctioned, false otherwise
    event SanctionStatusUpdated(address indexed account, bool sanctioned);

    /// @notice Emitted when daily transfer limit is updated
    /// @param account The address whose limit was updated
    /// @param limit The new daily transfer limit
    event DailyTransferLimitUpdated(address indexed account, uint256 limit);

    /// @notice Emitted when compliance configuration is updated
    /// @param kycRequired True if KYC is required for transfers
    /// @param whitelistEnabled True if whitelist is enabled
    /// @param regionRestricted True if region restrictions are enabled
    event ComplianceConfigUpdated(bool kycRequired, bool whitelistEnabled, bool regionRestricted);

    /// @notice Emitted when transfer limits are updated
    /// @param maxAmount Maximum transfer amount
    /// @param minAmount Minimum transfer amount
    event TransferLimitsUpdated(uint256 maxAmount, uint256 minAmount);

    /// @notice Emitted when holder limits are updated
    /// @param maxHolders Maximum number of token holders allowed
    event HolderLimitsUpdated(uint256 maxHolders);

    /// @notice Prevents implementation contract from being initialized
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the token with basic parameters
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
        if (admin == address(0)) {
            revert AdminCannotBeZeroAddress();
        }

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
        _maxTransferAmount = 1000000 * 10 ** decimals(); // 1M tokens
        _minTransferAmount = 1 * 10 ** decimals(); // 1 token
        _maxHolderCount = 2000; // Maximum holders
        _kycRequired = true;
        _whitelistEnabled = true;
        _regionRestrictionsEnabled = false;

        // Set admin as KYC verified before minting
        _kycVerified[admin] = true;

        console.log("initialSupply", initialSupply);
        // Mint initial supply to admin
        if (initialSupply > 0) {
            _mint(admin, initialSupply);
            _currentHolderCount = 1;
        }
    }

    /**
     * @notice Returns 6 decimals for USDX token
     * @return The number of decimals (6)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice ERC-1404 implementation: Detect transfer restriction
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
     * @notice ERC-1404 implementation: Get restriction message
     * @param restrictionCode Restriction code
     * @return Human-readable message for the restriction
     */
    function messageForTransferRestriction(
        uint8 restrictionCode
    ) public pure override returns (string memory) {
        return RestrictionMessages.messageForCode(restrictionCode);
    }

    /**
     * @notice Override _beforeTokenTransfer to implement ERC-1404 restrictions and handle balance tracking
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        // Call parent _beforeTokenTransfer function first (includes pause check)
        super._beforeTokenTransfer(from, to, amount);

        // Check ERC-1404 transfer restrictions only for regular transfers (not mint/burn)
        if (from != address(0) && to != address(0)) {
            uint8 restrictionCode = detectTransferRestriction(from, to, amount);
            if (restrictionCode != SUCCESS) {
                revert TransferRestricted(
                    restrictionCode,
                    messageForTransferRestriction(restrictionCode)
                );
            }

            // Update daily transfer tracking
            _updateDailyTransferAmount(from, amount);
        }

        // For minting operations, check ERC-1404 restrictions (excluding pause check)
        if (from == address(0) && to != address(0)) {
            // Skip pause check (already done by super._beforeTokenTransfer)
            // Check other restrictions
            if (_blacklisted[to]) {
                revert ReceiverBlacklisted();
            }
            if (_kycRequired && !_kycVerified[to]) {
                revert ReceiverKYCRequired();
            }
            if (_sanctioned[to]) {
                revert AddressSanctioned();
            }
        }

        // Update holder count tracking
        _updateHolderCount(from, to, amount);
    }

    /**
     * @notice Mints tokens to specified address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) nonReentrant {
        if (to == address(0)) {
            revert CannotMintToZeroAddress();
        }

        // Check pause status first (will be caught by _beforeTokenTransfer)
        _mint(to, amount);
    }

    /**
     * @notice Burns tokens from caller's address
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert BurnAmountMustBeGreaterThanZero();
        }
        if (balanceOf(msg.sender) < amount) {
            revert InsufficientBalanceToBurn();
        }

        _burn(msg.sender, amount);
    }

    /**
     * @notice Burns tokens from specified address (requires BURNER_ROLE)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) external onlyRole(BURNER_ROLE) nonReentrant {
        if (from == address(0)) {
            revert CannotBurnFromZeroAddress();
        }
        if (amount == 0) {
            revert BurnAmountMustBeGreaterThanZero();
        }
        if (balanceOf(from) < amount) {
            revert InsufficientBalanceToBurn();
        }

        _burn(from, amount);
    }

    /**
     * @notice Adds/removes address from blacklist
     * @param account Address to update
     * @param blacklisted Whether to blacklist the address
     */
    function setBlacklisted(address account, bool blacklisted) external onlyRole(BLACKLISTER_ROLE) {
        if (account == address(0)) {
            revert CannotBlacklistZeroAddress();
        }
        _blacklisted[account] = blacklisted;
        emit BlacklistUpdated(account, blacklisted);
    }

    /**
     * @notice Updates KYC verification status
     * @param account Address to update
     * @param verified Whether the address is KYC verified
     */
    function setKYCVerified(address account, bool verified) external onlyRole(COMPLIANCE_ROLE) {
        if (account == address(0)) {
            revert CannotSetKYCForZeroAddress();
        }
        _kycVerified[account] = verified;
        emit KYCStatusUpdated(account, verified);
    }

    /**
     * @notice Sets daily transfer limit for address
     * @param account Address to set limit for
     * @param limit Daily transfer limit
     */
    function setDailyTransferLimit(
        address account,
        uint256 limit
    ) external onlyRole(COMPLIANCE_ROLE) {
        if (account == address(0)) {
            revert CannotSetLimitForZeroAddress();
        }
        _dailyTransferLimit[account] = limit;
        emit DailyTransferLimitUpdated(account, limit);
    }

    /**
     * @notice Updates sanction status
     * @param account Address to update
     * @param sanctioned Whether the address is sanctioned
     */
    function setSanctioned(address account, bool sanctioned) external onlyRole(COMPLIANCE_ROLE) {
        if (account == address(0)) {
            revert CannotSanctionZeroAddress();
        }
        _sanctioned[account] = sanctioned;
        emit SanctionStatusUpdated(account, sanctioned);
    }

    /**
     * @notice Pauses all token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Checks if daily transfer limit is exceeded
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
     * @notice Checks if region restriction applies
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
     * @notice Updates daily transfer tracking
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
     * @notice Updates holder count when balance changes
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
     * @notice Authorize contract upgrades
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    // View functions for getting restriction states

    /**
     * @notice Checks if an address is blacklisted
     * @param account Address to check
     * @return True if the address is blacklisted
     */
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    /**
     * @notice Checks if an address is KYC verified
     * @param account Address to check
     * @return True if the address is KYC verified
     */
    function isKYCVerified(address account) external view returns (bool) {
        return _kycVerified[account];
    }

    /**
     * @notice Checks if an address is sanctioned
     * @param account Address to check
     * @return True if the address is sanctioned
     */
    function isSanctioned(address account) external view returns (bool) {
        return _sanctioned[account];
    }

    /**
     * @notice Gets the daily transfer limit for an address
     * @param account Address to check
     * @return The daily transfer limit for the address
     */
    function getDailyTransferLimit(address account) external view returns (uint256) {
        return _dailyTransferLimit[account];
    }

    /**
     * @notice Gets the daily transfer amount for an address
     * @param account Address to check
     * @return The daily transfer amount for the address
     */
    function getDailyTransferAmount(address account) external view returns (uint256) {
        return _dailyTransferAmount[account];
    }

    /**
     * @notice Gets the maximum transfer amount allowed
     * @return The maximum transfer amount
     */
    function getMaxTransferAmount() external view returns (uint256) {
        return _maxTransferAmount;
    }

    /**
     * @notice Gets the minimum transfer amount required
     * @return The minimum transfer amount
     */
    function getMinTransferAmount() external view returns (uint256) {
        return _minTransferAmount;
    }

    /**
     * @notice Gets the maximum number of token holders allowed
     * @return The maximum holder count
     */
    function getMaxHolderCount() external view returns (uint256) {
        return _maxHolderCount;
    }

    /**
     * @notice Gets the current number of token holders
     * @return The current holder count
     */
    function getCurrentHolderCount() external view returns (uint256) {
        return _currentHolderCount;
    }

    /**
     * @notice Checks if KYC verification is required for transfers
     * @return True if KYC is required
     */
    function isKYCRequired() external view returns (bool) {
        return _kycRequired;
    }

    /**
     * @notice Checks if whitelist is enabled
     * @return True if whitelist is enabled
     */
    function isWhitelistEnabled() external view returns (bool) {
        return _whitelistEnabled;
    }

    /**
     * @notice Checks if region restrictions are enabled
     * @return True if region restrictions are enabled
     */
    function isRegionRestrictionsEnabled() external view returns (bool) {
        return _regionRestrictionsEnabled;
    }
}
