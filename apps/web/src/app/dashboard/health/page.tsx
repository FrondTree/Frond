"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, asArray, type DriftAlert, type HealthSnapshot } from "@/lib/api";

export default function HealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [drift, setDrift] = useState<DriftAlert[]>([]);

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug) {
      setLoading(false);
      return;
    }
    try {
      const [h, d] = await Promise.all([
        apiFetch<HealthSnapshot>(`/v1/orgs/${slug}/intelligence/health`),
        apiFetch<DriftAlert[] | null>(`/v1/orgs/${slug}/intelligence/drift`),
      ]);
      setHealth(h);
      setDrift(asArray(d));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load health");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function recompute() {
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug || recomputing) return;
    setRecomputing(true);
    try {
      const h = await apiFetch<HealthSnapshot>(`/v1/orgs/${slug}/intelligence/health/recompute`, {
        method: "POST",
      });
      setHealth(h);
      toast.success("Health recomputed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to recompute");
    } finally {
      setRecomputing(false);
    }
  }

  const issues = health?.issues ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Doc health"
        description="Coverage, stale pages, and drift alerts."
        actions={
          <Button variant="outline" onClick={() => void recompute()} disabled={recomputing}>
            {recomputing ? "Recomputing…" : "Recompute"}
          </Button>
        }
      />

      {!health ? (
        <EmptyState title="No health data" description="Select an organization and scan repos first." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Overall score" value={`${health.score}%`} />
            <MetricCard
              label="API coverage"
              value={`${health.coverage_pct}%`}
              sub={`${health.api_documented}/${health.api_total} documented`}
            />
            <MetricCard label="Stale pages" value={String(health.stale_pages)} />
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, health.score))}%` }}
            />
          </div>
        </>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Issues</h2>
        {(Array.isArray(issues) ? issues : []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No issues reported.</p>
        ) : (
          <ul className="space-y-2">
            {(Array.isArray(issues) ? issues : []).map((issue: { severity: string; message: string }, i: number) => (
              <li key={i} className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                <Badge variant="warning" className="mr-2">
                  {issue.severity || "info"}
                </Badge>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Drift alerts</h2>
        {drift.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open drift alerts.</p>
        ) : (
          <ul className="space-y-3">
            {drift.map((a) => (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <CardDescription>{a.message}</CardDescription>
                </CardHeader>
                {a.pr_url && (
                  <CardContent>
                    <a
                      href={a.pr_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      View pull request
                    </a>
                  </CardContent>
                )}
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tracking-tight">{value}</CardTitle>
      </CardHeader>
      {sub && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      )}
    </Card>
  );
}
