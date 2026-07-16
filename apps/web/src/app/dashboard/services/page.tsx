"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, asArray, type KGService } from "@/lib/api";

export default function ServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<KGService[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ type: string; title: string; content: string; url: string }>
  >([]);

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
      const data = asArray(await apiFetch<KGService[] | null>(`/v1/orgs/${slug}/intelligence/services`));
      setServices(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function search() {
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug || !query.trim() || searching) return;
    setSearching(true);
    try {
      const results = asArray(
        await apiFetch<Array<{ type: string; title: string; content: string; url: string }> | null>(
          `/v1/orgs/${slug}/intelligence/search?q=${encodeURIComponent(query.trim())}`,
        ),
      );
      setSearchResults(results);
      if (results.length === 0) toast.message("No results found");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-9 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Services" description="Services discovered from repository scans." />

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services, APIs, ADRs…"
          onKeyDown={(e) => e.key === "Enter" && void search()}
        />
        <Button onClick={() => void search()} disabled={searching || !query.trim()}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {searchResults.map((r, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{r.type}</Badge>
                    <span className="font-medium">{r.title}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{r.content}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Connect and scan repositories under GitHub to discover services."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <Link key={s.id} href={`/dashboard/services/${s.id}`} className="block transition-opacity hover:opacity-90">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{s.name}</CardTitle>
                      <CardDescription className="mt-1.5">{s.repository_name}</CardDescription>
                    </div>
                    <span
                      onClick={(e) => e.preventDefault()}
                      className="text-xs text-muted-foreground"
                    >
                      {s.language}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {s.description || "No description"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.language && <Badge variant="outline">{s.language}</Badge>}
                    {s.framework && <Badge variant="outline">{s.framework}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
