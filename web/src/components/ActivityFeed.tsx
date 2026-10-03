"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ActivityItem } from "@/hooks/useActivity";
import { EXPLORER_URL, TOKEN_SYMBOL } from "@/lib/config";
import { formatToken, shortAddress, timeAgo } from "@/lib/format";
import { Card } from "./ui";

const LABEL = { Staked: "Stake", Withdrawn: "Withdraw", RewardPaid: "Claim" } as const;
const TONE = {
  Staked: "bg-emerald-500/15 text-emerald-500",
  Withdrawn: "bg-amber-500/15 text-amber-500",
  RewardPaid: "bg-indigo-500/15 text-indigo-400",
} as const;

export function ActivityFeed({
  items,
  loading,
  error,
}: {
  items: ActivityItem[];
  loading: boolean;
  error?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 8);

  return (
    <Card>
      <h2 className="mb-2 text-base font-semibold">Recent activity</h2>
      {error && <p className="mb-2 text-xs text-red-500">Couldn&apos;t load activity: {error}</p>}
      {loading ? (
        <div className="space-y-3 py-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--border)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--muted)]">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {visible.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[item.type]}`}>
                  {LABEL[item.type]}
                </span>
                <span className="text-[var(--muted)]">{item.user ? shortAddress(item.user) : "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium tabular-nums">
                  {formatToken(item.amount)} {TOKEN_SYMBOL}
                </span>
                <span className="w-16 text-right text-xs text-[var(--muted)]">
                  {item.timestamp ? timeAgo(item.timestamp) : ""}
                </span>
                <a
                  href={`${EXPLORER_URL}/tx/${item.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="View transaction"
                  className="text-[var(--muted)] hover:text-[var(--accent)]"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > 8 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs text-[var(--accent)] hover:underline"
        >
          {expanded ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </Card>
  );
}
