"use client";

import { useEffect, useState } from "react";
import type { VaultData } from "./useVault";

/** Smoothly ticking pending rewards between block refreshes. The chain value stays authoritative. */
export function useLiveEarned(data?: VaultData): bigint {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(id);
  }, []);

  const user = data?.user;
  if (!data || !user) return 0n;
  if (data.totalStaked === 0n || user.staked === 0n || now === 0) return user.earned;

  const end = Math.min(now, Number(data.periodFinish));
  const elapsed = Math.max(0, Math.floor(end - data.fetchedAt));
  const perSecond = (data.rewardRate * user.staked) / data.totalStaked;
  return user.earned + perSecond * BigInt(elapsed);
}
