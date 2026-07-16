"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, asArray, type ConnectedRepo, type Organization } from "@/lib/api";

function GitHubContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [connected, setConnected] = useState(false);
  const [githubLogin, setGithubLogin] = useState("");
  const [available, setAvailable] = useState<
    Array<{ id: number; full_name: string; language: string; private: boolean }>
  >([]);
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [connecting, setConnecting] = useState(false);

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

      const status = await apiFetch<{ connected: boolean; login?: string }>(
        `/v1/orgs/${current.slug}/github/status`,
      );
      setConnected(status.connected);
      setGithubLogin(status.login ?? "");

      const repos = asArray(
        await apiFetch<ConnectedRepo[] | null>(`/v1/orgs/${current.slug}/github/connected`),
      );
      setConnectedRepos(repos);

      if (status.connected) {
        try {
          const list = asArray(
            await apiFetch<Array<{ id: number; full_name: string; language: string; private: boolean }> | null>(
              `/v1/orgs/${current.slug}/github/repos`,
            ),
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
  }, [load, params.get("github")]);

  function connectGitHub() {
    if (!org) return;
    void (async () => {
      try {
        const data = await apiFetch<{ url: string }>(
          `/v1/orgs/${org.slug}/github/connect?format=json&redirect_uri=${encodeURIComponent(window.location.origin + "/dashboard/github")}`,
        );
        window.location.href = data.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to start GitHub connect");
      }
    })();
  }

  function installGitHubApp() {
    if (!org) return;
    void (async () => {
      try {
        const data = await apiFetch<{ url: string; mode: string; message?: string }>(
          `/v1/orgs/${org.slug}/github/install?redirect_uri=${encodeURIComponent(window.location.origin + "/dashboard/github")}`,
        );
        if (!data.url) {
          toast.message(data.message ?? "GitHub App not configured — use Connect OAuth");
          return;
        }
        window.location.href = data.url;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to start GitHub App install");
      }
    })();
  }

  async function connectSelected() {
    if (!org || selected.size === 0 || connecting) return;
    setConnecting(true);
    try {
      await apiFetch(`/v1/orgs/${org.slug}/github/repos`, {
        method: "POST",
        body: JSON.stringify({ repo_ids: Array.from(selected) }),
      });
      setSelected(new Set());
      toast.success("Repositories connected");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to connect repositories");
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
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-8">
        <PageHeader title="GitHub" description="Connect repositories for scanning." />
        <EmptyState title="No organization" description="Create an organization on Overview first." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="GitHub"
        description="Connect repositories so Frond can scan and build your knowledge graph."
      />

      {!connected ? (
        <EmptyState
          title="GitHub not connected"
          description={`Authorize Frond for ${org.name} to list and scan repositories.`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button onClick={connectGitHub}>Connect GitHub (OAuth)</Button>
              <Button variant="outline" onClick={installGitHubApp}>
                Install GitHub App
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Connected as <span className="font-medium text-foreground">@{githubLogin}</span>
          </p>

          <Card>
            <CardHeader>
              <CardTitle>Connected repositories</CardTitle>
              <CardDescription>Scan status updates as the worker processes each repo.</CardDescription>
            </CardHeader>
            <CardContent>
              {connectedRepos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No repositories connected yet.</p>
              ) : (
                <ul className="divide-y">
                  {connectedRepos.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <a
                          href={r.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:underline"
                        >
                          {r.full_name}
                        </a>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {r.language && <span>{r.language}</span>}
                          <Badge variant="outline">{r.scan_status}</Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void rescan(r.id)}>
                        Rescan
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Add repositories</CardTitle>
                <CardDescription>Select repos to include in scanning.</CardDescription>
              </div>
              <Button onClick={() => void connectSelected()} disabled={selected.size === 0 || connecting} size="sm">
                {connecting ? "Connecting…" : `Connect (${selected.size})`}
              </Button>
            </CardHeader>
            <CardContent>
              {available.length === 0 ? (
                <p className="text-sm text-muted-foreground">No repositories available.</p>
              ) : (
                <ul className="max-h-96 space-y-1 overflow-y-auto">
                  {available.map((r) => (
                    <li key={r.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted">
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selected);
                            if (checked) next.add(r.id);
                            else next.delete(r.id);
                            setSelected(next);
                          }}
                        />
                        <span className="text-sm">{r.full_name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{r.language}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
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
