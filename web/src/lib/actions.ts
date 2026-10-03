import type { Address, Hash, WalletClient } from "viem";
import { stakeTokenAbi } from "@/abi/StakeToken";
import { stakingVaultAbi } from "@/abi/StakingVault";
import { publicClient } from "./clients";
import { TOKEN_ADDRESS, VAULT_ADDRESS } from "./config";

const vault = { address: VAULT_ADDRESS as Address, abi: stakingVaultAbi } as const;
const token = { address: TOKEN_ADDRESS as Address, abi: stakeTokenAbi } as const;

// Every action is simulate -> write. Simulation surfaces reverts as readable errors
// before the wallet popup ever opens.

export async function approveVault(wc: WalletClient, account: Address, amount: bigint): Promise<Hash> {
  const { request } = await publicClient.simulateContract({
    ...token,
    account,
    functionName: "approve",
    args: [vault.address, amount], // exact amount, not infinite approval
  });
  return wc.writeContract(request);
}

export async function stake(wc: WalletClient, account: Address, amount: bigint): Promise<Hash> {
  const { request } = await publicClient.simulateContract({
    ...vault,
    account,
    functionName: "stake",
    args: [amount],
  });
  return wc.writeContract(request);
}

export async function withdraw(wc: WalletClient, account: Address, amount: bigint): Promise<Hash> {
  const { request } = await publicClient.simulateContract({
    ...vault,
    account,
    functionName: "withdraw",
    args: [amount],
  });
  return wc.writeContract(request);
}

export async function claimRewards(wc: WalletClient, account: Address): Promise<Hash> {
  const { request } = await publicClient.simulateContract({
    ...vault,
    account,
    functionName: "getReward",
  });
  return wc.writeContract(request);
}

export async function exitVault(wc: WalletClient, account: Address): Promise<Hash> {
  const { request } = await publicClient.simulateContract({
    ...vault,
    account,
    functionName: "exit",
  });
  return wc.writeContract(request);
}

export async function mintFaucet(wc: WalletClient, account: Address): Promise<Hash> {
  const { request } = await publicClient.simulateContract({
    ...token,
    account,
    functionName: "faucet",
  });
  return wc.writeContract(request);
}

// ───────────── Owner actions ─────────────

export async function setWithdrawalPolicy(
  wc: WalletClient,
  account: Address,
  lockSeconds: bigint,
  feeBps: bigint,
): Promise<Hash> {
  const { request } = await publicClient.simulateContract({
    ...vault,
    account,
    functionName: "setWithdrawalPolicy",
    args: [lockSeconds, feeBps],
  });
  return wc.writeContract(request);
}

export async function pauseVault(wc: WalletClient, account: Address): Promise<Hash> {
  const { request } = await publicClient.simulateContract({ ...vault, account, functionName: "pause" });
  return wc.writeContract(request);
}

export async function unpauseVault(wc: WalletClient, account: Address): Promise<Hash> {
  const { request } = await publicClient.simulateContract({ ...vault, account, functionName: "unpause" });
  return wc.writeContract(request);
}
