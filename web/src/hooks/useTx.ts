"use client";

import { useCallback, useState } from "react";
import type { Hash } from "viem";
import { publicClient } from "@/lib/clients";
import { parseError } from "@/lib/errors";

export type TxState =
  | { phase: "idle" }
  | { phase: "wallet"; label: string }
  | { phase: "pending"; label: string; hash: Hash }
  | { phase: "success"; label: string; hash: Hash }
  | { phase: "error"; label: string; message: string; hash?: Hash };

/** Runs one transaction through: wallet prompt -> pending -> confirmed/failed. */
export function useTx(onSuccess?: () => void) {
  const [state, setState] = useState<TxState>({ phase: "idle" });

  const run = useCallback(
    async (label: string, send: () => Promise<Hash>): Promise<boolean> => {
      setState({ phase: "wallet", label });
      let hash: Hash | undefined;
      try {
        hash = await send();
        setState({ phase: "pending", label, hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Transaction reverted on-chain.");
        setState({ phase: "success", label, hash });
        onSuccess?.();
        return true;
      } catch (e) {
        setState({ phase: "error", label, message: parseError(e), hash });
        return false;
      }
    },
    [onSuccess],
  );

  const dismiss = useCallback(() => setState({ phase: "idle" }), []);

  return {
    state,
    run,
    dismiss,
    busy: state.phase === "wallet" || state.phase === "pending",
  };
}
