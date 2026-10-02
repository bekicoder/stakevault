// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title StakingVault
/// @notice Stake a token and earn the same token as rewards, streamed linearly over a fixed duration.
/// @dev v2 adds an optional lock period with an early-withdrawal fee paid to a treasury.
///      The fee policy is off by default (lockPeriod = 0, fee = 0), so v1 behaviour is unchanged
///      until the owner calls `setWithdrawalPolicy`. Withdrawals stay available while paused.
///      Note: every new stake restarts that user's lock timer (documented trade-off).
contract StakingVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant PRECISION = 1e18;
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_EARLY_WITHDRAW_FEE_BPS = 1_000; // 10%

    IERC20 public immutable token;
    uint256 public immutable rewardsDuration;

    uint256 public periodFinish;
    uint256 public rewardRate; // reward tokens per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    // ───────────── v2 state ─────────────
    uint256 public lockPeriod;
    uint256 public earlyWithdrawFeeBps;
    address public treasury;
    mapping(address => uint256) public lastStakeTime;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward, uint256 newRewardRate, uint256 periodFinish);
    event EarlyWithdrawalFee(address indexed user, uint256 fee);
    event WithdrawalPolicyUpdated(uint256 lockPeriod, uint256 earlyWithdrawFeeBps);
    event TreasuryUpdated(address indexed treasury);

    error ZeroAmount();
    error ZeroAddress();
    error InsufficientBalance(uint256 requested, uint256 available);
    error RewardTooSmall();
    error FeeTooHigh(uint256 maxBps);

    constructor(IERC20 _token, address initialOwner, uint256 _rewardsDuration) Ownable(initialOwner) {
        token = _token;
        rewardsDuration = _rewardsDuration;
        treasury = initialOwner;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // ───────────── Views ─────────────

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        return rewardPerTokenStored
            + ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * PRECISION) / totalStaked;
    }

    function earned(address account) public view returns (uint256) {
        return (balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / PRECISION
            + rewards[account];
    }

    /// @notice Timestamp after which `account` can withdraw without a fee.
    function unlockTime(address account) public view returns (uint256) {
        return lastStakeTime[account] + lockPeriod;
    }

    /// @notice Fee that would be charged if `account` withdrew `amount` right now.
    function earlyWithdrawalFee(address account, uint256 amount) public view returns (uint256) {
        if (earlyWithdrawFeeBps == 0 || block.timestamp >= unlockTime(account)) return 0;
        return (amount * earlyWithdrawFeeBps) / BPS;
    }

    // ───────────── User actions ─────────────

    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();
        totalStaked += amount;
        balanceOf[msg.sender] += amount;
        lastStakeTime[msg.sender] = block.timestamp;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = balanceOf[msg.sender];
        if (amount > bal) revert InsufficientBalance(amount, bal);

        uint256 fee = earlyWithdrawalFee(msg.sender, amount);

        totalStaked -= amount;
        balanceOf[msg.sender] = bal - amount;

        if (fee > 0) {
            token.safeTransfer(treasury, fee);
            emit EarlyWithdrawalFee(msg.sender, fee);
        }
        token.safeTransfer(msg.sender, amount - fee);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            token.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(balanceOf[msg.sender]);
        getReward();
    }

    // ───────────── Admin ─────────────

    /// @notice Fund a new reward period. Pulls `reward` tokens from the owner; leftover rewards roll over.
    function notifyRewardAmount(uint256 reward) external onlyOwner updateReward(address(0)) {
        token.safeTransferFrom(msg.sender, address(this), reward);

        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 leftover = (periodFinish - block.timestamp) * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }
        if (rewardRate == 0) revert RewardTooSmall();

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
        emit RewardAdded(reward, rewardRate, periodFinish);
    }

    /// @notice Configure the lock period (seconds) and early-withdrawal fee (basis points, max 10%).
    function setWithdrawalPolicy(uint256 _lockPeriod, uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_EARLY_WITHDRAW_FEE_BPS) revert FeeTooHigh(MAX_EARLY_WITHDRAW_FEE_BPS);
        lockPeriod = _lockPeriod;
        earlyWithdrawFeeBps = _feeBps;
        emit WithdrawalPolicyUpdated(_lockPeriod, _feeBps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
