"use client";

import { useEffect, useState } from "react";
import type { Address, Hash } from "viem";
import { stakingVaultAbi } from "@/abi/StakingVault";
import type { VaultData } from "@/hooks/useVault";
import { pauseVault, setWithdrawalPolicy, unpauseVault } from "@/lib/actions";
import { publicClient } from "@/lib/clients";
import { VAULT_ADDRESS } from "@/lib/config";
import { useWallet } from "@/lib/wallet";
import { Card } from "./ui";

type Props = {
  data?: VaultData;
  busy: boolean;
  run: (label: string, send: () => Promise<Hash>) => Promise<boolean>;
};

const input =
  "w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

/** Only rendered for the contract owner. Everyone else never sees it. */
export function AdminPanel({ data, busy, run }: Props) {
  const { account, walletClient, isWrongNetwork } = useWallet();
  const [owner, setOwner] = useState<Address>();
  const [minutes, setMinutes] = useState("");
  const [percent, setPercent] = useState("");

  useEffect(() => {
    if (!VAULT_ADDRESS) return;
    publicClient
      .readContract({ address: VAULT_ADDRESS, abi: stakingVaultAbi, functionName: "owner" })
      .then(setOwner)
      .catch(() => undefined);
  }, []);

  if (!account || !owner || account.toLowerCase() !== owner.toLowerCase()) return null;

  const mins = Number(minutes);
  const pct = Number(percent);
  const valid =
    minutes !== "" &&
    percent !== "" &&
    Number.isFinite(mins) &&
    mins >= 0 &&
    Number.isFinite(pct) &&
    pct >= 0 &&
    pct <= 10;
  const ready = !isWrongNetwork && !!walletClient;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Owner controls</h2>
        <span className="rounded-full bg-[var(--accent)]/15 px-2.5 py-0.5 text-xs text-[var(--accent)]">
          Owner
        </span>
      </div>

      <p className="mb-3 text-xs text-[var(--muted)]">
        Early-withdrawal policy (v2). Fee is capped at 10% by the contract. Current:{" "}
        {data ? `${Number(data.lockPeriod) / 60} min lock, ${Number(data.feeBps) / 100}% fee` : "—"}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--muted)]">
          Lock period (minutes)
          <input
            className={`${input} mt-1`}
            inputMode="decimal"
            placeholder="e.g. 5"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.trim())}
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          Early-withdrawal fee (%)
          <input
            className={`${input} mt-1`}
            inputMode="decimal"
            placeholder="0 – 10"
            value={percent}
            onChange={(e) => setPercent(e.target.value.trim())}
          />
        </label>
      </div>
      {percent !== "" && pct > 10 && <p className="mt-2 text-xs text-red-500">Fee cannot exceed 10%.</p>}
      <button
        disabled={busy || !ready || !valid}
        onClick={() =>
          walletClient &&
          run("Update withdrawal policy", () =>
            setWithdrawalPolicy(
              walletClient,
              account,
              BigInt(Math.round(mins * 60)),
              BigInt(Math.round(pct * 100)),
            ),
          )
        }
        className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Update policy
      </button>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
        <span className="text-[var(--muted)]">Staking is {data?.paused ? "paused" : "active"}</span>
        <button
          disabled={busy || !ready}
          onClick={() =>
            walletClient &&
            run(data?.paused ? "Unpause staking" : "Pause staking", () =>
              data?.paused ? unpauseVault(walletClient, account) : pauseVault(walletClient, account),
            )
          }
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg)] disabled:opacity-50"
        >
          {data?.paused ? "Unpause" : "Pause"}
        </button>
      </div>
    </Card>
  );
}
