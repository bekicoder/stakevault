import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

const REVERT_MESSAGES: Record<string, string> = {
  ZeroAmount: "Enter an amount greater than zero.",
  InsufficientBalance: "You can't withdraw more than you have staked.",
  EnforcedPause: "Staking is currently paused by the owner.",
  FaucetCooldown: "Faucet cooldown is still active. Try again later.",
  ERC20InsufficientBalance: "Your token balance is too low.",
  ERC20InsufficientAllowance: "Approve the vault to spend your tokens first.",
  OwnableUnauthorizedAccount: "Only the contract owner can do this.",
  FeeTooHigh: "That fee is above the allowed maximum.",
};

/** Turns any viem / wallet error into a message a user can act on. */
export function parseError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return "You rejected the request in your wallet.";
    }
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && REVERT_MESSAGES[name]) return REVERT_MESSAGES[name];
      if (name) return `Transaction would fail: ${name}`;
    }
    return error.shortMessage;
  }
  if ((error as { code?: number } | null)?.code === 4001) {
    return "You rejected the request in your wallet.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
