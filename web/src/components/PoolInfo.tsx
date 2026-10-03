"use client";

import { ExternalLink } from "lucide-react";
import type { VaultData } from "@/hooks/useVault";
import { EXPLORER_URL, TOKEN_ADDRESS, TOKEN_SYMBOL, VAULT_ADDRESS } from "@/lib/config";
import { formatDuration, formatToken, shortAddress } from "@/lib/format";
import { Card } from "./ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-3 text-sm last:border-0">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium tabular-nums">{children}</span>
    </div>
  );
}

function AddressLink({ address }: { address?: string }) {
  if (!address) return <>—</>;
  return (
    <a
      href={`${EXPLORER_URL}/address/${address}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
    >
      {shortAddress(address)} <ExternalLink size={12} />
    </a>
  );
}

export function PoolInfo({ data }: { data?: VaultData }) {
  const ended = data ? data.fetchedAt >= Number(data.periodFinish) : false;
  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">Pool details</h2>
      <Row label="Rewards per day">
        {data ? `${formatToken(data.rewardRate * 86_400n)} ${TOKEN_SYMBOL}` : "—"}
      </Row>
      <Row label="Reward period">
        {data
          ? data.periodFinish === 0n
            ? "Not started"
            : ended
              ? "Ended"
              : `Ends ${new Date(Number(data.periodFinish) * 1000).toLocaleString()}`
          : "—"}
      </Row>
      <Row label="Lock period">
        {data ? (data.lockPeriod === 0n ? "None" : formatDuration(Number(data.lockPeriod))) : "—"}
      </Row>
      <Row label="Early-withdrawal fee">{data ? `${Number(data.feeBps) / 100}%` : "—"}</Row>
      <Row label="Status">
        {data ? (
          <span className={data.paused ? "text-amber-500" : "text-emerald-500"}>
            {data.paused ? "Staking paused" : "Active"}
          </span>
        ) : (
          "—"
        )}
      </Row>
      <Row label="Vault contract">
        <AddressLink address={VAULT_ADDRESS} />
      </Row>
      <Row label={`${TOKEN_SYMBOL} token`}>
        <AddressLink address={TOKEN_ADDRESS} />
      </Row>
    </Card>
  );
}
