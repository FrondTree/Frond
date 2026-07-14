"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardNav } from "@/components/dashboard-nav";
import { apiFetch, type DriftAlert, type HealthSnapshot } from "@/lib/api";

export default function HealthPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [drift, setDrift] = useState<DriftAlert[]>([]);

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug) return;
    const [h, d] = await Promise.all([
      apiFetch<HealthSnapshot>(`/v1/orgs/${slug}/intelligence/health`),
      apiFetch<DriftAlert[]>(`/v1/orgs/${slug}/intelligence/drift`),
    ]);
    setHealth(h);
    setDrift(d);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function recompute() {
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug) return;
    const h = await apiFetch<HealthSnapshot>(`/v1/orgs/${slug}/intelligence/health/recompute`, { method: "POST" });
    setHealth(h);
  }

  const issues = health?.issues ?? [];

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <DashboardNav />
        <div className="mt-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Documentation Health</h1>
          <button onClick={() => void recompute()} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-white/5">Recompute</button>
        </div>

        {health && (
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <MetricCard label="Overall Score" value={`${health.score}%`} />
            <MetricCard label="API Coverage" value={`${health.coverage_pct}%`} sub={`${health.api_documented}/${health.api_total} documented`} />
            <MetricCard label="Stale Pages" value={String(health.stale_pages)} />
          </div>
        )}

        {health && (
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-indigo-500" style={{ width: `${health.score}%` }} />
          </div>
        )}

        <section className="mt-10">
          <h2 className="font-semibold">Issues</h2>
          <ul className="mt-4 space-y-2">
            {(Array.isArray(issues) ? issues : []).map((issue: { severity: string; message: string }, i: number) => (
              <li key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {issue.message}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-semibold">Documentation Drift Alerts</h2>
          <ul className="mt-4 space-y-3">
            {drift.map((a) => (
              <li key={a.id} className="rounded-lg border border-[var(--frond-border)] bg-[var(--frond-surface)] p-4">
                <div className="font-medium">{a.title}</div>
                <p className="mt-1 text-sm text-zinc-400">{a.message}</p>
                {a.pr_url && <a href={a.pr_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-indigo-400">View PR</a>}
              </li>
            ))}
            {drift.length === 0 && <li className="text-sm text-zinc-500">No open drift alerts</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
