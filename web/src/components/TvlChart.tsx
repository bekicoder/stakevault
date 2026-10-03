"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TvlPoint } from "@/hooks/useActivity";
import { TOKEN_SYMBOL } from "@/lib/config";
import { Card } from "./ui";

export function TvlChart({ series, loading }: { series: TvlPoint[]; loading: boolean }) {
  const data = series.map((p) => ({
    time: new Date(p.timestamp * 1000).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    tvl: p.tvl,
  }));

  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold">TVL history</h2>
      {loading ? (
        <div className="h-56 animate-pulse rounded-xl bg-[var(--border)]" />
      ) : data.length === 0 ? (
        <div className="grid h-56 place-items-center text-sm text-[var(--muted)]">
          No stakes yet. Stake some {TOKEN_SYMBOL} to start the chart.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tvlFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.2} vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                width={56}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v.toLocaleString("en-US", { notation: "compact" })}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v) => [`${Number(v).toLocaleString("en-US")} ${TOKEN_SYMBOL}`, "TVL"]}
              />
              <Area type="stepAfter" dataKey="tvl" stroke="#818cf8" strokeWidth={2} fill="url(#tvlFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
