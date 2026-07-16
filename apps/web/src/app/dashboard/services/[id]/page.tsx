"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, asArray, type ServiceDetail } from "@/lib/api";

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ServiceDetail | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug || !params.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<ServiceDetail>(`/v1/orgs/${slug}/intelligence/services/${params.id}`);
      setDetail(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load service");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-8">
        <PageHeader title="Service" description="Service detail" />
        <EmptyState title="Service not found" description="Scan repositories to discover services." />
        <Button variant="outline" asChild>
          <Link href="/dashboard/services">Back to services</Link>
        </Button>
      </div>
    );
  }

  const { service, apis, dependencies, adrs } = detail;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={service.name}
          description={service.description || service.repository_name || "Discovered service"}
        />
        <Button variant="outline" asChild>
          <Link href="/dashboard/services">All services</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {service.language && <Badge variant="outline">{service.language}</Badge>}
        {service.framework && <Badge variant="outline">{service.framework}</Badge>}
        {service.html_url && (
          <a href={service.html_url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">
            Open on GitHub
          </a>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>APIs</CardTitle>
            <CardDescription>{asArray(apis).length} endpoints discovered</CardDescription>
          </CardHeader>
          <CardContent>
            {asArray(apis).length === 0 ? (
              <p className="text-sm text-muted-foreground">No APIs yet.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-auto text-sm">
                {asArray(apis).map((a) => (
                  <li key={a.id} className="flex items-center gap-2 font-mono text-xs">
                    <Badge variant="secondary">{a.method}</Badge>
                    <span>{a.path}</span>
                    {a.documented && <Badge variant="outline">docs</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dependencies</CardTitle>
            <CardDescription>{asArray(dependencies).length} packages / services</CardDescription>
          </CardHeader>
          <CardContent>
            {asArray(dependencies).length === 0 ? (
              <p className="text-sm text-muted-foreground">No dependencies yet.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-auto text-sm">
                {asArray(dependencies).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span>{d.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.version} · {d.dep_type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ADRs</CardTitle>
          <CardDescription>Architecture decision records linked to this service</CardDescription>
        </CardHeader>
        <CardContent>
          {asArray(adrs).length === 0 ? (
            <p className="text-sm text-muted-foreground">No ADRs found.</p>
          ) : (
            <ul className="space-y-3">
              {asArray(adrs).map((a) => (
                <li key={a.id}>
                  <div className="font-medium">
                    {a.adr_number ? `${a.adr_number}: ` : ""}
                    {a.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.status} · {a.file_path}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
