"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { apiFetch, type Organization, type Project } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function DashboardPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const orgList = await apiFetch<Organization[]>("/v1/orgs");
    setOrgs(orgList);
    if (!selectedOrg && orgList[0]) setSelectedOrg(orgList[0]);
  }, [router, selectedOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedOrg) return;
    void apiFetch<Project[]>(`/v1/orgs/${selectedOrg.slug}/projects`).then(setProjects);
    localStorage.setItem("frond_selected_org", selectedOrg.slug);
  }, [selectedOrg]);

  async function createOrg() {
    if (!newOrgName) return;
    const org = await apiFetch<Organization>("/v1/orgs", {
      method: "POST",
      body: JSON.stringify({ name: newOrgName }),
    });
    setOrgs((o) => [org, ...o]);
    setSelectedOrg(org);
    setNewOrgName("");
  }

  async function createProject() {
    if (!selectedOrg || !newProjectName) return;
    const project = await apiFetch<Project>(`/v1/orgs/${selectedOrg.slug}/projects`, {
      method: "POST",
      body: JSON.stringify({ name: newProjectName, visibility: "public" }),
    });
    setProjects((p) => [project, ...p]);
    setNewProjectName("");
  }

  function connectGitHub() {
    if (!selectedOrg) return;
    const token = localStorage.getItem("frond_token");
    window.location.href = `${API_URL}/v1/orgs/${selectedOrg.slug}/github/connect?redirect_uri=${encodeURIComponent(window.location.origin + "/dashboard/github")}`;
    void token;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--frond-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">Frond</Link>
          <span className="text-sm text-zinc-500">Dashboard</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <DashboardNav />
        <div className="mt-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Overview</h1>
          {selectedOrg && (
            <button onClick={connectGitHub} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">
              Connect GitHub
            </button>
          )}
        </div>
        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <OrgPanel orgs={orgs} selected={selectedOrg} onSelect={setSelectedOrg} newName={newOrgName} onNewName={setNewOrgName} onCreate={() => void createOrg()} />
          <ProjectPanel projects={projects} newName={newProjectName} onNewName={setNewProjectName} onCreate={() => void createProject()} org={selectedOrg} />
        </section>
      </main>
    </div>
  );
}

function OrgPanel({ orgs, selected, onSelect, newName, onNewName, onCreate }: {
  orgs: Organization[]; selected: Organization | null; onSelect: (o: Organization) => void;
  newName: string; onNewName: (s: string) => void; onCreate: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
      <h2 className="font-semibold">Organizations</h2>
      <div className="mt-4 flex gap-2">
        <input value={newName} onChange={(e) => onNewName(e.target.value)} placeholder="New org" className="flex-1 rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] px-3 py-2 text-sm" />
        <button onClick={onCreate} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm">Create</button>
      </div>
      <ul className="mt-4 space-y-2">
        {orgs.map((org) => (
          <li key={org.id}>
            <button onClick={() => onSelect(org)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${selected?.id === org.id ? "bg-indigo-500/20 text-indigo-300" : "hover:bg-white/5"}`}>
              {org.name} <span className="text-zinc-500">/{org.slug}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectPanel({ projects, newName, onNewName, onCreate, org }: {
  projects: Project[]; newName: string; onNewName: (s: string) => void; onCreate: () => void; org: Organization | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6">
      <h2 className="font-semibold">Documentation Projects</h2>
      {org && (
        <>
          <div className="mt-4 flex gap-2">
            <input value={newName} onChange={(e) => onNewName(e.target.value)} placeholder="New project" className="flex-1 rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] px-3 py-2 text-sm" />
            <button onClick={onCreate} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm">Create</button>
          </div>
          <ul className="mt-4 space-y-3">
            {projects.map((p) => (
              <li key={p.id} className="rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] p-4">
                <div className="font-medium">{p.name}</div>
                <code className="mt-2 block text-xs text-zinc-400">frond docs publish --project-id {p.id}</code>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
