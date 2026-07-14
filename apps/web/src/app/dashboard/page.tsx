"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  visibility: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("frond_token") : null;

  const fetchJSON = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
      });
      if (res.status === 401) {
        router.push("/login");
        throw new Error("unauthorized");
      }
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<T>;
    },
    [token, router],
  );

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    void (async () => {
      const me = await fetchJSON<User>("/v1/auth/me");
      setUser(me);
      const orgList = await fetchJSON<Organization[]>("/v1/orgs");
      setOrgs(orgList);
      if (orgList[0]) setSelectedOrg(orgList[0]);
    })();
  }, [token, router, fetchJSON]);

  useEffect(() => {
    if (!selectedOrg) return;
    void fetchJSON<Project[]>(`/v1/orgs/${selectedOrg.slug}/projects`).then(setProjects);
  }, [selectedOrg, fetchJSON]);

  async function createOrg() {
    if (!newOrgName) return;
    const org = await fetchJSON<Organization>("/v1/orgs", {
      method: "POST",
      body: JSON.stringify({ name: newOrgName }),
    });
    setOrgs((o) => [org, ...o]);
    setSelectedOrg(org);
    setNewOrgName("");
  }

  async function createProject() {
    if (!selectedOrg || !newProjectName) return;
    const project = await fetchJSON<Project>(`/v1/orgs/${selectedOrg.slug}/projects`, {
      method: "POST",
      body: JSON.stringify({ name: newProjectName, visibility: "public" }),
    });
    setProjects((p) => [project, ...p]);
    setNewProjectName("");
  }

  async function createAPIKey() {
    if (!selectedOrg) return;
    const res = await fetchJSON<{ secret: string }>("/v1/auth/api-keys", {
      method: "POST",
      body: JSON.stringify({ organization_id: selectedOrg.id, name: "cli" }),
    });
    setApiKey(res.secret);
  }

  function logout() {
    localStorage.removeItem("frond_token");
    router.push("/");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--frond-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Frond
          </Link>
          <div className="flex items-center gap-4">
            {user.avatar_url && (
              <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full" />
            )}
            <span className="text-sm text-zinc-400">{user.email}</span>
            <button onClick={logout} className="text-sm text-zinc-500 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
            <h2 className="font-semibold">Organizations</h2>
            <div className="mt-4 flex gap-2">
              <input
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="New org name"
                className="flex-1 rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] px-3 py-2 text-sm"
              />
              <button
                onClick={() => void createOrg()}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium"
              >
                Create
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {orgs.map((org) => (
                <li key={org.id}>
                  <button
                    onClick={() => setSelectedOrg(org)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedOrg?.id === org.id
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {org.name} <span className="text-zinc-500">/{org.slug}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
            <h2 className="font-semibold">Projects</h2>
            {selectedOrg && (
              <>
                <div className="mt-4 flex gap-2">
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New project name"
                    className="flex-1 rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => void createProject()}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium"
                  >
                    Create
                  </button>
                </div>
                <ul className="mt-4 space-y-3">
                  {projects.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] p-4"
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">ID: {p.id}</div>
                      <div className="mt-1 text-xs text-indigo-400">
                        https://{p.slug}.{selectedOrg.slug}.frond.dev
                      </div>
                      <code className="mt-2 block rounded bg-black/40 p-2 text-xs text-zinc-400">
                        frond docs publish --project-id {p.id}
                      </code>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
          <h2 className="font-semibold">CLI API Key</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Generate an API key for CI/CD publishing without browser login.
          </p>
          <button
            onClick={() => void createAPIKey()}
            className="mt-4 rounded-lg border border-[var(--frond-border)] px-4 py-2 text-sm hover:bg-white/5"
          >
            Generate API Key
          </button>
          {apiKey && (
            <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-green-400">
              {apiKey}
            </pre>
          )}
        </section>
      </main>
    </div>
  );
}
