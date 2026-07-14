"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardNav } from "@/components/dashboard-nav";
import { apiFetch, type KGService } from "@/lib/api";

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<KGService[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ type: string; title: string; content: string; url: string }>>([]);

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug) return;
    const data = await apiFetch<KGService[]>(`/v1/orgs/${slug}/intelligence/services`);
    setServices(data);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function search() {
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug || !query) return;
    const results = await apiFetch<Array<{ type: string; title: string; content: string; url: string }>>(
      `/v1/orgs/${slug}/intelligence/search?q=${encodeURIComponent(query)}`,
    );
    setSearchResults(results);
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <DashboardNav />
        <h1 className="mt-8 text-2xl font-bold">Discovered Services</h1>

        <div className="mt-6 flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services, APIs, ADRs..." className="flex-1 rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] px-4 py-2 text-sm" />
          <button onClick={() => void search()} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm">Search</button>
        </div>

        {searchResults.length > 0 && (
          <ul className="mt-4 space-y-2 rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-4">
            {searchResults.map((r, i) => (
              <li key={i} className="text-sm">
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{r.type}</span>
                <span className="ml-2 font-medium">{r.title}</span>
                <p className="text-zinc-500">{r.content}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <div key={s.id} className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-zinc-500">{s.repository_name}</p>
                </div>
                <a href={s.html_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400">GitHub</a>
              </div>
              <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{s.description || "No description"}</p>
              <div className="mt-3 flex gap-2 text-xs">
                {s.language && <span className="rounded bg-zinc-800 px-2 py-1">{s.language}</span>}
                {s.framework && <span className="rounded bg-zinc-800 px-2 py-1">{s.framework}</span>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
