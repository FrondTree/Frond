"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Github,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiFetch, asArray, type Organization, type Project } from "@/lib/api";
import { cn } from "@/lib/utils";

function CopyIconButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      aria-label={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          toast.success(`${label} copied`);
          window.setTimeout(() => setCopied(false), 1400);
        });
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

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
      toast.success(`Created ${org.name}`);
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
      toast.success(`Created ${project.name}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Manage organizations and documentation projects for this workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/docs">
                <BookOpen className="h-4 w-4" />
                Setup guide
              </Link>
            </Button>
            <Button variant="outline" asChild disabled={!selectedOrg}>
              <Link href="/dashboard/github">
                <Github className="h-4 w-4" />
                Connect GitHub
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Organizations" value={orgs.length} hint="Workspaces you belong to" />
        <StatCard
          label="Projects"
          value={selectedOrg ? projects.length : "—"}
          hint={selectedOrg ? `In /${selectedOrg.slug}` : "Select an organization"}
        />
        <StatCard
          label="Active organization"
          value={selectedOrg?.name ?? "None"}
          hint={selectedOrg ? `Role: ${selectedOrg.role ?? "member"}` : "Create one below"}
        />
      </div>

      <Card id="orgs">
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Select a row to scope projects and intelligence.</CardDescription>
          </div>
          <form
            className="flex w-full gap-2 sm:w-auto sm:max-w-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void createOrg();
            }}
          >
            <Input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization name"
              disabled={creatingOrg}
              className="sm:w-52"
            />
            <Button type="submit" disabled={creatingOrg || !newOrgName.trim()}>
              <Plus className="h-4 w-4" />
              {creatingOrg ? "Creating…" : "Create"}
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {orgs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No organizations"
                description="Create an organization to start adding documentation projects."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => {
                  const active = selectedOrg?.id === org.id;
                  return (
                    <TableRow
                      key={org.id}
                      data-state={active ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedOrg(org)}
                    >
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            active ? "bg-primary" : "bg-muted-foreground/30",
                          )}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">/{org.slug}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{org.role ?? "member"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {active ? (
                          <Badge>Active</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Click to select</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card id="projects">
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Documentation projects</CardTitle>
            <CardDescription>
              {selectedOrg
                ? `Projects in ${selectedOrg.name}. Use the project ID with frond docs publish.`
                : "Select an organization to view projects."}
            </CardDescription>
          </div>
          {selectedOrg && (
            <form
              className="flex w-full gap-2 sm:w-auto sm:max-w-sm"
              onSubmit={(e) => {
                e.preventDefault();
                void createProject();
              }}
            >
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                disabled={creatingProject}
                className="sm:w-52"
              />
              <Button type="submit" disabled={creatingProject || !newProjectName.trim()}>
                <Plus className="h-4 w-4" />
                {creatingProject ? "Creating…" : "Create"}
              </Button>
            </form>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!selectedOrg ? (
            <div className="p-6">
              <EmptyState
                title="No organization selected"
                description="Select an organization in the table above."
              />
            </div>
          ) : projectsLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : projects.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No projects yet"
                description="Create a project, then publish docs with the CLI."
                action={
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/docs">Open setup guide</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Project ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => {
                  const docsUrl = `http://localhost:3001/${selectedOrg.slug}/${p.slug}`;
                  const publishCmd = `frond docs publish --project-id ${p.id}`;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">/{p.slug}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[220px] items-center gap-1">
                          <code className="truncate font-mono text-xs text-muted-foreground">{p.id}</code>
                          <CopyIconButton label="Project ID" value={p.id} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <CopyIconButton label="Publish command" value={publishCmd} />
                          <Button variant="ghost" size="sm" asChild>
                            <a href={docsUrl} target="_blank" rel="noreferrer">
                              Docs
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/docs">Publish help</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
