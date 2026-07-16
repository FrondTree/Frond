"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Github, Link2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ApiError, apiFetch, asArray, type ConnectedRepo, type Organization } from "@/lib/api";

function GitHubContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [connected, setConnected] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [githubLogin, setGithubLogin] = useState("");
  const [available, setAvailable] = useState<
    Array<{ id: number; full_name: string; language: string; private: boolean }>
  >([]);
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [connecting, setConnecting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const orgs = asArray(await apiFetch<Organization[] | null>("/v1/orgs"));
      const orgSlug = localStorage.getItem("frond_selected_org");
      const current = orgs.find((o) => o.slug === orgSlug) ?? orgs[0];
      if (!current) {
        setOrg(null);
        return;
      }
      setOrg(current);
      localStorage.setItem("frond_selected_org", current.slug);

      const status = await apiFetch<{ connected: boolean; configured?: boolean; login?: string }>(
        `/v1/orgs/${current.slug}/github/status`,
      );
      setConnected(status.connected);
      setConfigured(status.configured !== false);
      setGithubLogin(status.login ?? "");

      const repos = asArray(
        await apiFetch<ConnectedRepo[] | null>(`/v1/orgs/${current.slug}/github/connected`),
      );
      setConnectedRepos(repos);

      if (status.connected) {
        try {
          const list = asArray(
            await apiFetch<
              Array<{ id: number; full_name: string; language: string; private: boolean }> | null
            >(`/v1/orgs/${current.slug}/github/repos`),
          );
          setAvailable(list);
        } catch {
          setAvailable([]);
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load GitHub status");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (params.get("github") === "connected") {
      toast.success("GitHub authorized — select repositories to attach");
      router.replace("/dashboard/github");
    }
  }, [params, router]);

  const filteredAvailable = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return available;
    return available.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [available, filter]);

  const connectedIds = useMemo(() => new Set(connectedRepos.map((r) => r.full_name)), [connectedRepos]);

  function authorizeGitHub() {
    if (!org) return;
    setAuthorizing(true);
    void (async () => {
      try {
        const data = await apiFetch<{ url: string }>(
          `/v1/orgs/${org.slug}/github/connect?format=json&redirect_uri=${encodeURIComponent(window.location.origin + "/dashboard/github")}`,
        );
        window.location.href = data.url;
      } catch (err) {
        setAuthorizing(false);
        toast.error(err instanceof ApiError ? err.message : "Failed to start GitHub authorization");
      }
    })();
  }

  async function attachSelected() {
    if (!org || selected.size === 0 || connecting) return;
    setConnecting(true);
    try {
      await apiFetch(`/v1/orgs/${org.slug}/github/repos`, {
        method: "POST",
        body: JSON.stringify({ repo_ids: Array.from(selected) }),
      });
      setSelected(new Set());
      toast.success("Repositories attached");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to attach repositories");
    } finally {
      setConnecting(false);
    }
  }

  async function rescan(repoId: string) {
    if (!org) return;
    try {
      await apiFetch(`/v1/orgs/${org.slug}/github/repos/${repoId}/scan`, { method: "POST" });
      toast.success("Scan queued");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to queue scan");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title="GitHub" description="Authorize GitHub and attach repositories." />
        <EmptyState
          title="No organization"
          description="Create an organization on Overview first."
          action={
            <Button asChild>
              <Link href="/dashboard">Go to Overview</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GitHub"
        description={`Authorize access for ${org.name}, then attach the repositories Frond should scan.`}
        actions={
          connected ? (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              @{githubLogin}
            </Badge>
          ) : undefined
        }
      />

      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          { n: 1, title: "Authorize", done: connected },
          { n: 2, title: "Attach repos", done: connectedRepos.length > 0 },
          { n: 3, title: "Scan & sync", done: connectedRepos.some((r) => r.scan_status === "completed") },
        ].map((s) => (
          <li key={s.n} className="rounded-lg border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                {s.n}
              </span>
              {s.done ? <Badge variant="secondary">Done</Badge> : <span>Pending</span>}
            </div>
            <p className="mt-2 text-sm font-medium">{s.title}</p>
          </li>
        ))}
      </ol>

      {!connected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Authorize GitHub
            </CardTitle>
            <CardDescription>
              Frond uses GitHub OAuth to list your repositories. You choose which ones to attach —
              nothing is scanned until you confirm.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!configured && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                GitHub OAuth is not configured on the API. Set{" "}
                <code className="rounded bg-background/60 px-1 text-xs">GITHUB_CLIENT_ID</code> and{" "}
                <code className="rounded bg-background/60 px-1 text-xs">GITHUB_CLIENT_SECRET</code>{" "}
                in <code className="rounded bg-background/60 px-1 text-xs">.env</code>, then rebuild
                the API container.
              </div>
            )}
            <Button size="lg" onClick={authorizeGitHub} disabled={!configured || authorizing}>
              <Github className="h-4 w-4" />
              {authorizing ? "Redirecting to GitHub…" : "Authorize with GitHub"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Callback URL for your GitHub OAuth App:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">
                http://localhost:8080/v1/auth/github/callback
              </code>
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 border-b sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Attached repositories</CardTitle>
                <CardDescription>These repos are scanned for services, APIs, and drift.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={authorizeGitHub}>
                Re-authorize
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {connectedRepos.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No repositories attached yet"
                    description="Select repositories below and click Attach."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Repository</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Scan</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connectedRepos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <a
                            href={r.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium hover:underline"
                          >
                            {r.full_name}
                          </a>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.language || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.scan_status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => void rescan(r.id)}>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Rescan
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 border-b sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  Attach repositories
                </CardTitle>
                <CardDescription>Pick repos from your GitHub account to include in Frond.</CardDescription>
              </div>
              <Button onClick={() => void attachSelected()} disabled={selected.size === 0 || connecting}>
                {connecting ? "Attaching…" : `Attach selected (${selected.size})`}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter repositories…"
                  className="pl-9"
                />
              </div>
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-muted-foreground">No repositories match this filter.</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10" />
                        <TableHead>Repository</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Visibility</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAvailable.map((r) => {
                        const already = connectedIds.has(r.full_name);
                        return (
                          <TableRow key={r.id} className={already ? "opacity-60" : undefined}>
                            <TableCell>
                              <Checkbox
                                disabled={already}
                                checked={already || selected.has(r.id)}
                                onCheckedChange={(checked) => {
                                  if (already) return;
                                  const next = new Set(selected);
                                  if (checked) next.add(r.id);
                                  else next.delete(r.id);
                                  setSelected(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{r.full_name}</TableCell>
                            <TableCell className="text-muted-foreground">{r.language || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{r.private ? "Private" : "Public"}</Badge>
                              {already && (
                                <span className="ml-2 text-xs text-muted-foreground">Attached</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function GitHubPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <GitHubContent />
    </Suspense>
  );
}
