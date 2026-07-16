"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, asArray, type KGService } from "@/lib/api";

interface DepTree {
  service: KGService;
  dependencies: Array<{ name: string; version: string; dep_type: string }>;
}

export default function DependenciesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trees, setTrees] = useState<DepTree[]>([]);

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
      const data = asArray(await apiFetch<DepTree[] | null>(`/v1/orgs/${slug}/intelligence/dependencies`));
      setTrees(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load dependencies");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dependencies"
        description="Package and service dependencies per scanned repo."
      />

      {trees.length === 0 ? (
        <EmptyState title="No dependency data yet" description="Scan repositories to populate dependency trees." />
      ) : (
        <div className="space-y-4">
          {trees.map((t) => {
            const deps = t.dependencies ?? [];
            return (
              <Card key={t.service.id}>
                <CardHeader>
                  <CardTitle>{t.service.name}</CardTitle>
                  <CardDescription>{t.service.repository_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 font-mono text-sm">
                    {deps.map((d) => (
                      <li key={`${d.dep_type}-${d.name}`} className="text-muted-foreground">
                        <span className="text-foreground">{d.dep_type}</span>
                        <span className="mx-1.5 text-border">·</span>
                        {d.name}
                        {d.version && <span className="text-muted-foreground/70">@{d.version}</span>}
                      </li>
                    ))}
                    {deps.length === 0 && (
                      <li className="font-sans text-muted-foreground">No dependencies detected</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
