import type { Address } from "viem";
import { sepolia } from "viem/chains";

export const chain = sepolia;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || undefined) as
  | Address
  | undefined;
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || undefined) as
  | Address
  | undefined;
export const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK ?? "0");

export const EXPLORER_URL = chain.blockExplorers.default.url;
export const isConfigured = Boolean(VAULT_ADDRESS && TOKEN_ADDRESS);
export const TOKEN_SYMBOL = "STK";
