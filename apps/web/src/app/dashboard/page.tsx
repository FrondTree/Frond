"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Github } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, asArray, type Organization, type Project } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const orgList = asArray(await apiFetch<Organization[] | null>("/v1/orgs"));
      setOrgs(orgList);
      const saved = localStorage.getItem("frond_selected_org");
      const current = orgList.find((o) => o.slug === saved) ?? orgList[0] ?? null;
      setSelectedOrg(current);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedOrg) {
      setProjects([]);
      return;
    }
    localStorage.setItem("frond_selected_org", selectedOrg.slug);
    setProjectsLoading(true);
    void apiFetch<Project[] | null>(`/v1/orgs/${selectedOrg.slug}/projects`)
      .then((data) => setProjects(asArray(data)))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load projects"))
      .finally(() => setProjectsLoading(false));
  }, [selectedOrg]);

  async function createOrg() {
    const name = newOrgName.trim();
    if (!name || creatingOrg) return;
    setCreatingOrg(true);
    try {
      const org = await apiFetch<Organization>("/v1/orgs", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setOrgs((o) => [org, ...o]);
      setSelectedOrg(org);
      setNewOrgName("");
      toast.success(`Created organization ${org.name}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create organization");
    } finally {
      setCreatingOrg(false);
    }
  }

  async function createProject() {
    const name = newProjectName.trim();
    if (!selectedOrg || !name || creatingProject) return;
    setCreatingProject(true);
    try {
      const project = await apiFetch<Project>(`/v1/orgs/${selectedOrg.slug}/projects`, {
        method: "POST",
        body: JSON.stringify({ name, visibility: "public" }),
      });
      setProjects((p) => [project, ...p]);
      setNewProjectName("");
      toast.success(`Created project ${project.name}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  }

  function connectGitHub() {
    if (!selectedOrg) return;
    window.location.href = `${API_URL}/v1/orgs/${selectedOrg.slug}/github/connect?redirect_uri=${encodeURIComponent(window.location.origin + "/dashboard/github")}`;
  }

  function copyPublishCommand(projectId: string) {
    const cmd = `frond docs publish --project-id ${projectId}`;
    void navigator.clipboard.writeText(cmd).then(() => toast.success("Publish command copied"));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Manage organizations and documentation projects."
        actions={
          selectedOrg ? (
            <Button variant="outline" onClick={connectGitHub}>
              <Github />
              Connect GitHub
            </Button>
          ) : undefined
        }
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Select an org to scope projects and intelligence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="New organization"
                disabled={creatingOrg}
                onKeyDown={(e) => e.key === "Enter" && void createOrg()}
              />
              <Button onClick={() => void createOrg()} disabled={creatingOrg || !newOrgName.trim()}>
                {creatingOrg ? "Creating…" : "Create"}
              </Button>
            </div>
            {orgs.length === 0 ? (
              <EmptyState title="No organizations yet" description="Create one to start publishing docs." />
            ) : (
              <ul className="space-y-1">
                {orgs.map((org) => (
                  <li key={org.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrg(org)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selectedOrg?.id === org.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{org.name}</span>
                      <span className="ml-2 text-muted-foreground">/{org.slug}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentation projects</CardTitle>
            <CardDescription>
              {selectedOrg ? `Projects in ${selectedOrg.name}` : "Select an organization first"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedOrg ? (
              <EmptyState title="No organization selected" description="Create or select an organization to continue." />
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New project"
                    disabled={creatingProject}
                    onKeyDown={(e) => e.key === "Enter" && void createProject()}
                  />
                  <Button
                    onClick={() => void createProject()}
                    disabled={creatingProject || !newProjectName.trim()}
                  >
                    {creatingProject ? "Creating…" : "Create"}
                  </Button>
                </div>
                {projectsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                ) : projects.length === 0 ? (
                  <EmptyState
                    title="No projects yet"
                    description="Create a documentation project, then publish with the CLI."
                  />
                ) : (
                  <ul className="space-y-3">
                    {projects.map((p) => (
                      <li key={p.id} className="rounded-md border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <p className="mt-0.5 text-xs text-muted-foreground">/{p.slug}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Copy publish command"
                            onClick={() => copyPublishCommand(p.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <code className="mt-3 block overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-muted-foreground">
                          frond docs publish --project-id {p.id}
                        </code>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
