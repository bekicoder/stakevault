import { formatUnits, parseUnits } from "viem";

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Rounds to maxFraction places, then trims zeros: 9999.99999 -> "10,000". */
export function formatToken(value: bigint, decimals = 18, maxFraction = 4): string {
  const shift = decimals > maxFraction ? decimals - maxFraction : 0;
  const unit = 10n ** BigInt(shift);
  const rounded = ((value + unit / 2n) / unit) * unit;
  const [whole, fraction = ""] = formatUnits(rounded, decimals).split(".");
  const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, "");
  const wholeFormatted = BigInt(whole).toLocaleString("en-US");
  return trimmed ? `${wholeFormatted}.${trimmed}` : wholeFormatted;
}

/** Safe parse of a user-typed amount. Returns undefined for empty or invalid input. */
export function parseAmount(input: string, decimals = 18): bigint | undefined {
  if (!/^\d*\.?\d*$/.test(input) || input === "" || input === ".") return undefined;
  try {
    return parseUnits(input, decimals);
  } catch {
    return undefined;
  }
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(m, 1)}m`;
}

export function timeAgo(timestamp: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
