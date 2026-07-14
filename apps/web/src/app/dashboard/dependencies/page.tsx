"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardNav } from "@/components/dashboard-nav";
import { apiFetch, type KGService } from "@/lib/api";

interface DepTree {
  service: KGService;
  dependencies: Array<{ name: string; version: string; dep_type: string }>;
}

export default function DependenciesPage() {
  const router = useRouter();
  const [trees, setTrees] = useState<DepTree[]>([]);

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug) return;
    const data = await apiFetch<DepTree[]>(`/v1/orgs/${slug}/intelligence/dependencies`);
    setTrees(data);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <DashboardNav />
        <h1 className="mt-8 text-2xl font-bold">Dependency Explorer</h1>
        <div className="mt-8 space-y-6">
          {trees.map((t) => (
            <div key={t.service.id} className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
              <h3 className="font-semibold">{t.service.name}</h3>
              <ul className="mt-4 space-y-1 font-mono text-sm">
                {t.dependencies.map((d) => (
                  <li key={d.name} className="text-zinc-400">
                    <span className="text-indigo-400">{d.dep_type}</span>: {d.name}
                    {d.version && <span className="text-zinc-600">@{d.version}</span>}
                  </li>
                ))}
                {t.dependencies.length === 0 && <li className="text-zinc-600">No dependencies detected</li>}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
