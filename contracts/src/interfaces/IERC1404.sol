// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @title ERC-1404 Simple Restricted Token Standard
 * @notice Interface for tokens with transfer restrictions
 * @author USDX Stablecoin Team
 * @dev Interface for tokens with transfer restrictions
 */
interface IERC1404 is IERC20Upgradeable {
    /**
     * @notice Detect if a transfer will be reverted and if so returns an appropriate reference code
     * @param from Sending address
     * @param to Receiving address
     * @param value Amount of tokens being transferred
     * @return Code by which to reference the failure reason
     */
    function detectTransferRestriction(
        address from,
        address to,
        uint256 value
    ) external view returns (uint8);

    /**
     * @notice Returns a human-readable message for a restriction code
     * @param restrictionCode Code requiring clarification
     * @return Text showing the restriction's reason
     */
    function messageForTransferRestriction(
        uint8 restrictionCode
    ) external view returns (string memory);
}

/**
 * @title Restriction Codes
 * @notice Provides standard restriction codes for ERC-1404 compliance
 * @author USDX Stablecoin Team
 */
library RestrictionCodes {
    /// @notice Success - no restriction
    uint8 public constant SUCCESS = 0;
    /// @notice General failure
    uint8 public constant FAILURE = 1;
    /// @notice Sender is blacklisted
    uint8 public constant BLACKLISTED_SENDER = 2;
    /// @notice Receiver is blacklisted
    uint8 public constant BLACKLISTED_RECEIVER = 3;
    /// @notice Insufficient balance
    uint8 public constant INSUFFICIENT_BALANCE = 4;
    /// @notice Contract is paused
    uint8 public constant PAUSED = 5;
    /// @notice Sender KYC verification invalid
    uint8 public constant INVALID_KYC_SENDER = 6;
    /// @notice Receiver KYC verification invalid
    uint8 public constant INVALID_KYC_RECEIVER = 7;
    /// @notice Amount exceeds transfer limits
    uint8 public constant AMOUNT_EXCEEDS_LIMIT = 8;
    /// @notice Address is sanctioned
    uint8 public constant SANCTIONED_ADDRESS = 9;
    /// @notice Transfer is unauthorized
    uint8 public constant UNAUTHORIZED_TRANSFER = 10;
    /// @notice Recipient is invalid
    uint8 public constant INVALID_RECIPIENT = 11;
    /// @notice Transfer is locked
    uint8 public constant TRANSFER_LOCKED = 12;
    /// @notice Compliance violation
    uint8 public constant COMPLIANCE_VIOLATION = 13;
    /// @notice Exceeds holder limit
    uint8 public constant EXCEEDS_HOLDER_LIMIT = 14;
    /// @notice Region restriction applies
    uint8 public constant REGION_RESTRICTION = 15;
}

/**
 * @title Restriction Messages
 * @notice Provides human-readable messages for restriction codes
 * @author USDX Stablecoin Team
 */
library RestrictionMessages {
    /**
     * @notice Returns a human-readable message for a restriction code
     * @param restrictionCode The restriction code
     * @return A human-readable message
     */
    function messageForCode(uint8 restrictionCode) internal pure returns (string memory) {
        if (restrictionCode == RestrictionCodes.SUCCESS) return "Success";
        if (restrictionCode == RestrictionCodes.FAILURE) return "Failure";
        if (restrictionCode == RestrictionCodes.BLACKLISTED_SENDER) return "Sender blacklisted";
        if (restrictionCode == RestrictionCodes.BLACKLISTED_RECEIVER) return "Receiver blacklisted";
        if (restrictionCode == RestrictionCodes.INSUFFICIENT_BALANCE) return "Insufficient balance";
        if (restrictionCode == RestrictionCodes.PAUSED) return "Contract paused";
        if (restrictionCode == RestrictionCodes.INVALID_KYC_SENDER) return "Sender KYC invalid";
        if (restrictionCode == RestrictionCodes.INVALID_KYC_RECEIVER) return "Receiver KYC invalid";
        if (restrictionCode == RestrictionCodes.AMOUNT_EXCEEDS_LIMIT) return "Amount exceeds limit";
        if (restrictionCode == RestrictionCodes.SANCTIONED_ADDRESS) return "Address sanctioned";
        if (restrictionCode == RestrictionCodes.UNAUTHORIZED_TRANSFER) return "Transfer unauthorized";
        if (restrictionCode == RestrictionCodes.INVALID_RECIPIENT) return "Invalid recipient";
        if (restrictionCode == RestrictionCodes.TRANSFER_LOCKED) return "Transfer locked";
        if (restrictionCode == RestrictionCodes.COMPLIANCE_VIOLATION) return "Compliance violation";
        if (restrictionCode == RestrictionCodes.EXCEEDS_HOLDER_LIMIT) return "Exceeds holder limit";
        if (restrictionCode == RestrictionCodes.REGION_RESTRICTION) return "Region restricted";

        return "Unknown restriction";
    }
}
