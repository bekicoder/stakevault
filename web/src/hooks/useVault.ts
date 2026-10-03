"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { stakeTokenAbi } from "@/abi/StakeToken";
import { stakingVaultAbi } from "@/abi/StakingVault";
import { publicClient } from "@/lib/clients";
import { isConfigured, TOKEN_ADDRESS, VAULT_ADDRESS } from "@/lib/config";
import { parseError } from "@/lib/errors";
import { useWallet } from "@/lib/wallet";

const vault = { address: VAULT_ADDRESS as Address, abi: stakingVaultAbi } as const;
const token = { address: TOKEN_ADDRESS as Address, abi: stakeTokenAbi } as const;

export type UserData = {
  staked: bigint;
  earned: bigint;
  walletBalance: bigint;
  allowance: bigint;
  unlockTime: bigint;
};

export type VaultData = {
  totalStaked: bigint;
  rewardRate: bigint;
  periodFinish: bigint;
  lockPeriod: bigint;
  feeBps: bigint;
  paused: boolean;
  user?: UserData;
  /** Unix seconds when this snapshot was read. */
  fetchedAt: number;
};

export function useVault() {
  const { account } = useWallet();
  const [data, setData] = useState<VaultData>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(isConfigured);

  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    try {
      const [totalStaked, rewardRate, periodFinish, lockPeriod, feeBps, paused] =
        await publicClient.multicall({
          allowFailure: false,
          contracts: [
            { ...vault, functionName: "totalStaked" },
            { ...vault, functionName: "rewardRate" },
            { ...vault, functionName: "periodFinish" },
            { ...vault, functionName: "lockPeriod" },
            { ...vault, functionName: "earlyWithdrawFeeBps" },
            { ...vault, functionName: "paused" },
          ],
        });

      let user: UserData | undefined;
      if (account) {
        const [staked, earned, walletBalance, allowance, unlockTime] = await publicClient.multicall({
          allowFailure: false,
          contracts: [
            { ...vault, functionName: "balanceOf", args: [account] },
            { ...vault, functionName: "earned", args: [account] },
            { ...token, functionName: "balanceOf", args: [account] },
            { ...token, functionName: "allowance", args: [account, vault.address] },
            { ...vault, functionName: "unlockTime", args: [account] },
          ],
        });
        user = { staked, earned, walletBalance, allowance, unlockTime };
      }

      setData({
        totalStaked,
        rewardRate,
        periodFinish,
        lockPeriod,
        feeBps,
        paused,
        user,
        fetchedAt: Date.now() / 1000,
      });
      setError(undefined);
    } catch (e) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refresh();
    if (!isConfigured) return;
    // Re-read on every new block instead of a blind timer.
    const unwatch = publicClient.watchBlockNumber({
      onBlockNumber: () => {
        refresh();
      },
      poll: true,
      pollingInterval: 12_000,
    });
    return unwatch;
  }, [refresh]);

  return {
    data,
    error: isConfigured ? error : "Contract addresses are not configured. Set them in .env.local.",
    loading,
    refresh,
  };
}
