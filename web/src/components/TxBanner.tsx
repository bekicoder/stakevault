"use client";

import { CheckCircle2, ExternalLink, Loader2, X, XCircle } from "lucide-react";
import type { TxState } from "@/hooks/useTx";
import { EXPLORER_URL } from "@/lib/config";

export function TxBanner({ state, onDismiss }: { state: TxState; onDismiss: () => void }) {
  if (state.phase === "idle") return null;

  const hash = "hash" in state ? state.hash : undefined;
  const view = {
    wallet: { icon: <Loader2 className="animate-spin" size={18} />, text: `Confirm "${state.phase === "wallet" ? state.label : ""}" in your wallet…`, tone: "border-[var(--border)]" },
    pending: { icon: <Loader2 className="animate-spin text-amber-500" size={18} />, text: `${"label" in state ? state.label : ""} pending…`, tone: "border-amber-500/40" },
    success: { icon: <CheckCircle2 className="text-emerald-500" size={18} />, text: `${"label" in state ? state.label : ""} confirmed`, tone: "border-emerald-500/40" },
    error: { icon: <XCircle className="text-red-500" size={18} />, text: state.phase === "error" ? state.message : "", tone: "border-red-500/40" },
  }[state.phase];

  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border bg-[var(--card)] px-4 py-3 text-sm shadow-lg ${view.tone}`}
    >
      {view.icon}
      <span className="flex-1">{view.text}</span>
      {hash && (
        <a href={`${EXPLORER_URL}/tx/${hash}`} target="_blank" rel="noreferrer" aria-label="View transaction">
          <ExternalLink size={16} />
        </a>
      )}
      {state.phase !== "wallet" && state.phase !== "pending" && (
        <button onClick={onDismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
