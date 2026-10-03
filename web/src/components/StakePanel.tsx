"use client";

import { useState } from "react";
import type { Hash } from "viem";
import { useLiveEarned } from "@/hooks/useLiveEarned";
import type { VaultData } from "@/hooks/useVault";
import {
  approveVault,
  claimRewards,
  exitVault,
  mintFaucet,
  stake,
  withdraw,
} from "@/lib/actions";
import { chain, TOKEN_SYMBOL } from "@/lib/config";
import { formatDuration, formatToken, parseAmount } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { Card } from "./ui";

type Props = {
  data?: VaultData;
  busy: boolean;
  run: (label: string, send: () => Promise<Hash>) => Promise<boolean>;
};

const btn =
  "rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export function StakePanel({ data, busy, run }: Props) {
  const { account, walletClient, isWrongNetwork, switchToTarget } = useWallet();
  const [tab, setTab] = useState<"stake" | "withdraw">("stake");
  const [input, setInput] = useState("");
  const liveEarned = useLiveEarned(data);

  const user = data?.user;
  const amount = parseAmount(input);
  const max = tab === "stake" ? (user?.walletBalance ?? 0n) : (user?.staked ?? 0n);

  let problem: string | undefined;
  if (input && amount === undefined) problem = "Enter a valid number.";
  else if (amount !== undefined && amount === 0n) problem = "Amount must be greater than zero.";
  else if (amount !== undefined && amount > max) {
    problem = tab === "stake" ? "Amount exceeds your wallet balance." : "Amount exceeds your staked balance.";
  }

  const needsApproval =
    tab === "stake" && !!amount && !!user && user.allowance < amount;

  const locked =
    !!user &&
    !!data &&
    user.staked > 0n &&
    data.feeBps > 0n &&
    BigInt(Math.floor(data.fetchedAt)) < user.unlockTime;
  const fee =
    tab === "withdraw" && locked && !!amount && data ? (amount * data.feeBps) / 10_000n : 0n;

  const ready = !!account && !isWrongNetwork && !!walletClient;
  const stakePaused = tab === "stake" && !!data?.paused;

  const primaryLabel = !account
    ? "Connect wallet to continue"
    : isWrongNetwork
      ? `Switch to ${chain.name}`
      : needsApproval
        ? `Approve ${TOKEN_SYMBOL}`
        : tab === "stake"
          ? "Stake"
          : "Withdraw";

  const primaryDisabled = !account
    ? true
    : isWrongNetwork
      ? busy
      : busy || !amount || !!problem || stakePaused;

  async function onPrimary() {
    if (isWrongNetwork) return switchToTarget();
    if (!ready || !walletClient || !account || !amount || problem) return;
    if (tab === "stake") {
      if (needsApproval) {
        await run(`Approve ${TOKEN_SYMBOL}`, () => approveVault(walletClient, account, amount));
        return;
      }
      if (await run("Stake", () => stake(walletClient, account, amount))) setInput("");
    } else if (await run("Withdraw", () => withdraw(walletClient, account, amount))) {
      setInput("");
    }
  }

  return (
    <Card>
      <div className="grid grid-cols-2 rounded-xl bg-[var(--bg)] p-1 text-sm font-medium">
        {(["stake", "withdraw"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setInput("");
            }}
            className={`rounded-lg py-2 capitalize transition ${
              tab === t ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs text-[var(--muted)]">
          <span>Amount</span>
          <span>
            {tab === "stake" ? "Wallet" : "Staked"}: {formatToken(max)} {TOKEN_SYMBOL}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 focus-within:border-[var(--accent)]">
          <input
            inputMode="decimal"
            placeholder="0.0"
            value={input}
            onChange={(e) => setInput(e.target.value.trim())}
            className="w-full bg-transparent text-lg tabular-nums outline-none"
          />
          <button
            type="button"
            onClick={() => setInput(max > 0n ? formatToken(max, 18, 18).replaceAll(",", "") : "")}
            className="rounded-md bg-[var(--bg)] px-2 py-1 text-xs font-medium text-[var(--accent)]"
          >
            MAX
          </button>
          <span className="text-sm text-[var(--muted)]">{TOKEN_SYMBOL}</span>
        </div>
        {problem && <p className="mt-2 text-xs text-red-500">{problem}</p>}
        {stakePaused && (
          <p className="mt-2 text-xs text-amber-500">Staking is paused. Withdrawals still work.</p>
        )}
        {data && data.feeBps > 0n && data.lockPeriod > 0n && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Withdrawing within {formatDuration(Number(data.lockPeriod))} of your last stake costs{" "}
            {Number(data.feeBps) / 100}%.
            {locked && user
              ? ` Your lock ends in ${formatDuration(Number(user.unlockTime) - Math.floor(data.fetchedAt))}.`
              : ""}
          </p>
        )}
        {fee > 0n && (
          <p className="mt-2 text-xs text-amber-500">
            Early-withdrawal fee: {formatToken(fee, 18, 6)} {TOKEN_SYMBOL}. You receive{" "}
            {formatToken((amount ?? 0n) - fee, 18, 6)} {TOKEN_SYMBOL}.
          </p>
        )}
      </div>

      <button
        onClick={onPrimary}
        disabled={primaryDisabled}
        className={`${btn} mt-5 w-full bg-[var(--accent)] text-white hover:opacity-90`}
      >
        {primaryLabel}
      </button>
      {needsApproval && (
        <p className="mt-2 text-center text-xs text-[var(--muted)]">
          Step 1 of 2: approve the vault to move this amount, then stake.
        </p>
      )}

      <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[var(--muted)]">Pending rewards</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatToken(liveEarned, 18, 6)} {TOKEN_SYMBOL}
            </div>
          </div>
          <button
            disabled={busy || !ready || liveEarned === 0n}
            onClick={() =>
              walletClient && account && run("Claim rewards", () => claimRewards(walletClient, account))
            }
            className={`${btn} border border-[var(--border)] hover:bg-[var(--bg)]`}
          >
            Claim
          </button>
        </div>
        {!!user && user.staked > 0n && (
          <button
            disabled={busy || !ready}
            onClick={() =>
              walletClient && account && run("Exit vault", () => exitVault(walletClient, account))
            }
            className="mt-3 text-xs text-[var(--muted)] underline disabled:opacity-50"
          >
            Withdraw everything and claim rewards
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <span>Need test tokens?</span>
        <button
          disabled={busy || !ready}
          onClick={() =>
            walletClient && account && run("Get test tokens", () => mintFaucet(walletClient, account))
          }
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium text-[var(--fg)] hover:bg-[var(--bg)] disabled:opacity-50"
        >
          Get 1,000 {TOKEN_SYMBOL}
        </button>
      </div>
    </Card>
  );
}
