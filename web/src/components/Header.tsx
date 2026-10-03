"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { chain, EXPLORER_URL } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

export function Header() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    if (!w.account) return;
    try {
      await navigator.clipboard.writeText(w.account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: ignore */
    }
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold">StakeVault</span>
            <span className="ml-2 hidden rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)] sm:inline">
              {chain.name}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Wallet size={16} />
              {w.account ? shortAddress(w.account) : w.connecting ? "Connecting…" : "Connect wallet"}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg">
                {w.account ? (
                  <div className="space-y-1 text-sm">
                    <button
                      onClick={copyAddress}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-[var(--bg)]"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied" : "Copy address"}
                    </button>
                    <a
                      href={`${EXPLORER_URL}/address/${w.account}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[var(--bg)]"
                    >
                      <ExternalLink size={16} /> View on Etherscan
                    </a>
                    <button
                      onClick={() => {
                        w.disconnect();
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-500 hover:bg-[var(--bg)]"
                    >
                      <LogOut size={16} /> Disconnect
                    </button>
                  </div>
                ) : w.wallets.length === 0 ? (
                  <p className="p-3 text-sm text-[var(--muted)]">
                    No browser wallet detected. Install MetaMask or Rabby and refresh.
                  </p>
                ) : (
                  w.wallets.map((wallet) => (
                    <button
                      key={wallet.info.uuid}
                      onClick={async () => {
                        await w.connect(wallet);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--bg)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={wallet.info.icon} alt="" width={24} height={24} />
                      {wallet.info.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {w.isWrongNetwork && (
        <div className="border-b border-amber-500/30 bg-amber-500/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} /> Your wallet is on the wrong network. Switch to {chain.name} to
              continue.
            </span>
            <button
              onClick={w.switchToTarget}
              className="rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-black"
            >
              Switch network
            </button>
          </div>
        </div>
      )}
      {w.error && (
        <div className="mx-auto max-w-6xl px-4 pt-3 text-sm text-red-500 sm:px-6">{w.error}</div>
      )}
    </>
  );
}
