"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits, type Address, type Hash } from "viem";
import { stakingVaultAbi } from "@/abi/StakingVault";
import { publicClient } from "@/lib/clients";
import { DEPLOY_BLOCK, isConfigured, VAULT_ADDRESS } from "@/lib/config";
import { parseError } from "@/lib/errors";

export type ActivityType = "Staked" | "Withdrawn" | "RewardPaid";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  user?: Address;
  amount: bigint;
  hash: Hash;
  blockNumber: bigint;
  timestamp: number;
};

export type TvlPoint = { timestamp: number; tvl: number };

type RawEntry = Omit<ActivityItem, "timestamp"> & { tvl: bigint };

const MAX_ITEMS = 100;

export function useActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [series, setSeries] = useState<TvlPoint[]>([]);
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!isConfigured || !VAULT_ADDRESS) return;
    try {
      const logs = await publicClient.getContractEvents({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });

      let tvl = 0n;
      const raw: RawEntry[] = [];

      for (const log of logs) {
        if (!log.transactionHash || log.blockNumber === null) continue;
        const base = {
          id: `${log.transactionHash}-${log.logIndex}`,
          hash: log.transactionHash,
          blockNumber: log.blockNumber,
        };
        if (log.eventName === "Staked") {
          const amount = log.args.amount ?? 0n;
          tvl += amount;
          raw.push({ ...base, type: "Staked", user: log.args.user, amount, tvl });
        } else if (log.eventName === "Withdrawn") {
          const amount = log.args.amount ?? 0n;
          tvl -= amount;
          raw.push({ ...base, type: "Withdrawn", user: log.args.user, amount, tvl });
        } else if (log.eventName === "RewardPaid") {
          raw.push({ ...base, type: "RewardPaid", user: log.args.user, amount: log.args.reward ?? 0n, tvl });
        }
      }

      const recent = raw.slice(-MAX_ITEMS);
      const blockNumbers = [...new Set(recent.map((r) => r.blockNumber))];
      const blocks = await Promise.all(blockNumbers.map((n) => publicClient.getBlock({ blockNumber: n })));
      const times = new Map<bigint, number>(blocks.map((b) => [b.number, Number(b.timestamp)]));

      const withTime = recent.map((r) => ({ ...r, timestamp: times.get(r.blockNumber) ?? 0 }));

      setItems(
        withTime
          .map((r) => ({
            id: r.id,
            type: r.type,
            user: r.user,
            amount: r.amount,
            hash: r.hash,
            blockNumber: r.blockNumber,
            timestamp: r.timestamp,
          }))
          .reverse(),
      );
      setSeries(
        withTime
          .filter((r) => r.type !== "RewardPaid")
          .map((r) => ({ timestamp: r.timestamp, tvl: Number(formatUnits(r.tvl, 18)) })),
      );
      setError(undefined);
    } catch (e) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { items, series, loading, error, refresh };
}
