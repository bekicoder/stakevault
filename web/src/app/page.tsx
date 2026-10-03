"use client";

import { useCallback } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AdminPanel } from "@/components/AdminPanel";
import { Header } from "@/components/Header";
import { PoolInfo } from "@/components/PoolInfo";
import { StakePanel } from "@/components/StakePanel";
import { StatCards } from "@/components/StatCards";
import { TvlChart } from "@/components/TvlChart";
import { TxBanner } from "@/components/TxBanner";
import { useActivity } from "@/hooks/useActivity";
import { useTx } from "@/hooks/useTx";
import { useVault } from "@/hooks/useVault";

export default function Page() {
  const vault = useVault();
  const activity = useActivity();

  const { refresh: refreshVault } = vault;
  const { refresh: refreshActivity } = activity;
  const onDone = useCallback(() => {
    refreshVault();
    refreshActivity();
  }, [refreshVault, refreshActivity]);

  const { state, run, dismiss, busy } = useTx(onDone);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {vault.error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {vault.error}
          </div>
        )}
        <StatCards data={vault.data} loading={vault.loading} />
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <StakePanel data={vault.data} busy={busy} run={run} />
            <AdminPanel data={vault.data} busy={busy} run={run} />
          </div>
          <div className="space-y-6 lg:col-span-3">
            <TvlChart series={activity.series} loading={activity.loading} />
            <ActivityFeed items={activity.items} loading={activity.loading} error={activity.error} />
            <PoolInfo data={vault.data} />
          </div>
        </div>
      </main>
      <TxBanner state={state} onDismiss={dismiss} />
    </>
  );
}
