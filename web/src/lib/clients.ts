import { createPublicClient, http } from "viem";
import { chain, RPC_URL } from "./config";

/** Read-only client. Uses our own RPC, independent of whichever wallet is connected. */
export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
  batch: { multicall: true },
});
