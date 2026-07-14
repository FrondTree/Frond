"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { apiFetch, type ConnectedRepo, type Organization } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function GitHubContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [connected, setConnected] = useState(false);
  const [githubLogin, setGithubLogin] = useState("");
  const [available, setAvailable] = useState<Array<{ id: number; full_name: string; language: string; private: boolean }>>([]);
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const orgSlug = typeof window !== "undefined" ? localStorage.getItem("frond_selected_org") : null;

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const orgs = await apiFetch<Organization[]>("/v1/orgs");
    const current = orgs.find((o) => o.slug === orgSlug) ?? orgs[0];
    if (!current) return;
    setOrg(current);
    localStorage.setItem("frond_selected_org", current.slug);

    const status = await apiFetch<{ connected: boolean; login?: string }>(`/v1/orgs/${current.slug}/github/status`);
    setConnected(status.connected);
    setGithubLogin(status.login ?? "");

    const repos = await apiFetch<ConnectedRepo[]>(`/v1/orgs/${current.slug}/github/connected`);
    setConnectedRepos(repos);

    if (status.connected) {
      try {
        const list = await apiFetch<Array<{ id: number; full_name: string; language: string; private: boolean }>>(`/v1/orgs/${current.slug}/github/repos`);
        setAvailable(list);
      } catch {
        /* not connected yet */
      }
    }
  }, [router, orgSlug]);

  useEffect(() => {
    void load();
  }, [load, params.get("github")]);

  function connectGitHub() {
    if (!org) return;
    window.location.href = `${API_URL}/v1/orgs/${org.slug}/github/connect?redirect_uri=${encodeURIComponent(window.location.origin + "/dashboard/github")}`;
  }

  async function connectSelected() {
    if (!org || selected.size === 0) return;
    await apiFetch(`/v1/orgs/${org.slug}/github/repos`, {
      method: "POST",
      body: JSON.stringify({ repo_ids: Array.from(selected) }),
    });
    setSelected(new Set());
    void load();
  }

  async function rescan(repoId: string) {
    if (!org) return;
    await apiFetch(`/v1/orgs/${org.slug}/github/repos/${repoId}/scan`, { method: "POST" });
    void load();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--frond-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">Frond</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <DashboardNav />
        <h1 className="mt-8 text-2xl font-bold">GitHub Integration</h1>

        {!connected ? (
          <div className="mt-8 rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-8 text-center">
            <p className="text-zinc-400">Connect GitHub to automatically scan repositories and build your knowledge graph.</p>
            <button onClick={connectGitHub} className="mt-6 rounded-lg bg-indigo-500 px-6 py-3 font-medium">
              Connect GitHub
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <p className="text-sm text-green-400">Connected as @{githubLogin}</p>

            <section className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
              <h2 className="font-semibold">Connected Repositories</h2>
              <ul className="mt-4 space-y-3">
                {connectedRepos.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg bg-[var(--frond-bg)] p-4">
                    <div>
                      <a href={r.html_url} target="_blank" rel="noreferrer" className="font-medium text-indigo-400 hover:underline">{r.full_name}</a>
                      <div className="text-xs text-zinc-500">{r.language} · scan: {r.scan_status}</div>
                    </div>
                    <button onClick={() => void rescan(r.id)} className="rounded border border-zinc-700 px-3 py-1 text-xs hover:bg-white/5">Rescan</button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Add Repositories</h2>
                <button onClick={() => void connectSelected()} disabled={selected.size === 0} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm disabled:opacity-40">
                  Connect selected ({selected.size})
                </button>
              </div>
              <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                {available.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(r.id); else next.delete(r.id);
                        setSelected(next);
                      }} />
                      <span>{r.full_name}</span>
                      <span className="text-xs text-zinc-500">{r.language}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function GitHubPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <GitHubContent />
    </Suspense>
  );
}
