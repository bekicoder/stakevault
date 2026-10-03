"use client";

import { Gift, Landmark, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { useLiveEarned } from "@/hooks/useLiveEarned";
import type { VaultData } from "@/hooks/useVault";
import { TOKEN_SYMBOL } from "@/lib/config";
import { formatToken } from "@/lib/format";
import { Card } from "./ui";

function apr(data?: VaultData): string {
  if (!data || data.totalStaked === 0n) return "—";
  if (data.fetchedAt >= Number(data.periodFinish)) return "0%";
  const bps = (data.rewardRate * 31_536_000n * 10_000n) / data.totalStaked;
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

function Stat(props: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
}) {
  const Icon = props.icon;
  return (
    <Card>
      <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span>{props.label}</span>
        <Icon size={18} />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">
        {props.loading ? (
          <div className="h-8 w-28 animate-pulse rounded bg-[var(--border)]" />
        ) : (
          props.value
        )}
      </div>
      {props.sub && <div className="mt-1 text-xs text-[var(--muted)]">{props.sub}</div>}
    </Card>
  );
}

export function StatCards({ data, loading }: { data?: VaultData; loading: boolean }) {
  const liveEarned = useLiveEarned(data);
  const user = data?.user;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        icon={Landmark}
        label="Total value locked"
        value={data ? `${formatToken(data.totalStaked)} ${TOKEN_SYMBOL}` : "—"}
        sub="Across all stakers"
        loading={loading}
      />
      <Stat
        icon={Wallet}
        label="Your stake"
        value={user ? `${formatToken(user.staked)} ${TOKEN_SYMBOL}` : "—"}
        sub={user ? `Wallet: ${formatToken(user.walletBalance)} ${TOKEN_SYMBOL}` : "Connect a wallet"}
        loading={loading}
      />
      <Stat
        icon={Gift}
        label="Pending rewards"
        value={user ? `${formatToken(liveEarned, 18, 6)} ${TOKEN_SYMBOL}` : "—"}
        sub="Updates every second"
        loading={loading}
      />
      <Stat
        icon={TrendingUp}
        label="Current APR"
        value={apr(data)}
        sub="Based on the active reward period"
        loading={loading}
      />
    </div>
  );
}
