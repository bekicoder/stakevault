// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title StakeToken
/// @notice Demo ERC-20 used for staking and rewards. Includes a rate-limited faucet for testnet users.
contract StakeToken is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 1_000 ether;
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    mapping(address => uint256) public lastFaucetClaim;

    error FaucetCooldown(uint256 availableAt);

    constructor(address initialOwner) ERC20("Stake Token", "STK") Ownable(initialOwner) {
        _mint(initialOwner, 1_000_000 ether);
    }

    /// @notice Owner-only mint, used for tests and reward funding.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Anyone can claim FAUCET_AMOUNT once per cooldown period.
    function faucet() external {
        uint256 availableAt = lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN;
        if (lastFaucetClaim[msg.sender] != 0 && block.timestamp < availableAt) {
            revert FaucetCooldown(availableAt);
        }
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
