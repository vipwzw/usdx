// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/**
 * @title ERC-1404 Simple Restricted Token Standard
 * @dev Interface for tokens with transfer restrictions
 * @author USDT Stablecoin Team
 */
interface IERC1404 is IERC20 {
    /**
     * @dev Detects if a transfer would be restricted and returns the restriction code
     * @param from Address tokens are transferred from
     * @param to Address tokens are transferred to
     * @param value Amount of tokens being transferred
     * @return code Restriction code (0 = no restriction)
     */
    function detectTransferRestriction(
        address from,
        address to,
        uint256 value
    ) external view returns (uint8 code);

    /**
     * @dev Returns a human-readable message for the given restriction code
     * @param restrictionCode The restriction code to get message for
     * @return message Human-readable restriction message
     */
    function messageForTransferRestriction(uint8 restrictionCode)
        external
        view
        returns (string memory message);
}


/**
 * @title ERC-1404 Restriction Codes
 * @dev Library containing standard restriction codes
 */
library RestrictionCodes {
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
    uint8 public constant UNAUTHORIZED_TRANSFER = 10;
    uint8 public constant INVALID_RECIPIENT = 11;
    uint8 public constant TRANSFER_LOCKED = 12;
    uint8 public constant COMPLIANCE_VIOLATION = 13;
    uint8 public constant EXCEEDS_HOLDER_LIMIT = 14;
    uint8 public constant REGION_RESTRICTION = 15;
}


/**
 * @title ERC-1404 Messages
 * @dev Library containing standard restriction messages
 */
library RestrictionMessages {
    /**
     * @dev Returns the message for a given restriction code
     * @param restrictionCode The restriction code
     * @return The corresponding message string
     */
    function messageForCode(uint8 restrictionCode) internal pure returns (string memory) {
        string[16] memory messages = [
            "Transfer allowed",                     // SUCCESS = 0
            "Transfer failed",                      // FAILURE = 1
            "Sender address is blacklisted",        // BLACKLISTED_SENDER = 2
            "Receiver address is blacklisted",      // BLACKLISTED_RECEIVER = 3
            "Insufficient balance",                 // INSUFFICIENT_BALANCE = 4
            "Contract is paused",                   // PAUSED = 5
            "Sender KYC verification required",     // INVALID_KYC_SENDER = 6
            "Receiver KYC verification required",   // INVALID_KYC_RECEIVER = 7
            "Amount exceeds transfer limit",        // AMOUNT_EXCEEDS_LIMIT = 8
            "Address is sanctioned",                // SANCTIONED_ADDRESS = 9
            "Unauthorized transfer",                // UNAUTHORIZED_TRANSFER = 10
            "Invalid recipient address",            // INVALID_RECIPIENT = 11
            "Transfer is locked",                   // TRANSFER_LOCKED = 12
            "Compliance violation",                 // COMPLIANCE_VIOLATION = 13
            "Exceeds maximum holder limit",         // EXCEEDS_HOLDER_LIMIT = 14
            "Regional transfer restriction"         // REGION_RESTRICTION = 15
        ];
        
        if (restrictionCode < messages.length) {
            return messages[restrictionCode];
        }
        return "Unknown restriction";
    }
} 