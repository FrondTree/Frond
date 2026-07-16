"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Globe, Rocket } from "lucide-react";
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
import { ApiError, apiFetch, asArray, type Organization } from "@/lib/api";

interface HostingProject {
  id: string;
  name: string;
  slug: string;
  url: string;
  local_url: string;
  custom_domain?: string | null;
}

interface HostingInfo {
  docs_subdomain: string;
  hosted_domain: string;
  company_host: string;
  preview_base: string;
  cname_target: string;
  projects: HostingProject[];
}

export default function HostingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [info, setInfo] = useState<HostingInfo | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [customProjectId, setCustomProjectId] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const orgs = asArray(await apiFetch<Organization[] | null>("/v1/orgs"));
      const slug = localStorage.getItem("frond_selected_org");
      const current = orgs.find((o) => o.slug === slug) ?? orgs[0];
      if (!current) {
        setOrg(null);
        return;
      }
      setOrg(current);
      localStorage.setItem("frond_selected_org", current.slug);
      const data = await apiFetch<HostingInfo>(`/v1/orgs/${current.slug}/hosting`);
      setInfo(data);
      setSubdomain(data.docs_subdomain);
      const projects = asArray(data.projects);
      setCustomProjectId((prev) => prev || projects[0]?.id || "");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load hosting");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSubdomain() {
    if (!org || !subdomain.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ company_host: string; message: string }>(
        `/v1/orgs/${org.slug}/hosting/subdomain`,
        { method: "PUT", body: JSON.stringify({ subdomain: subdomain.trim() }) },
      );
      toast.success(res.message || "Company subdomain saved");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save subdomain");
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomDomain() {
    if (!customProjectId || !customDomain.trim() || savingDomain) return;
    setSavingDomain(true);
    try {
      await apiFetch(`/v1/projects/${customProjectId}/custom-domain`, {
        method: "PUT",
        body: JSON.stringify({ domain: customDomain.trim() }),
      });
      toast.success("Custom domain saved — point CNAME to cname.frond.dev");
      setCustomDomain("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to set custom domain");
    } finally {
      setSavingDomain(false);
    }
  }

  function copy(label: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!org || !info) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hosting" description="Company docs subdomain and deployments." />
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

  const projects = asArray(info.projects);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hosting"
        description="Deploy docs under your company name on Frond, or attach a custom domain."
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/docs">
              <Rocket className="h-4 w-4" />
              How to publish
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Company subdomain
          </CardTitle>
          <CardDescription>
            Your docs are published at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              https://{`{company}`}.{info.hosted_domain}/{`{project}`}
            </code>
            . Choose a company name (defaults to your org slug).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center overflow-hidden rounded-md border bg-muted/40">
              <Input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="acme"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <span className="shrink-0 border-l bg-muted px-3 py-2 text-sm text-muted-foreground">
                .{info.hosted_domain}
              </span>
            </div>
            <Button onClick={() => void saveSubdomain()} disabled={saving || !subdomain.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live host</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="text-sm font-medium">{info.company_host}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copy("Host", info.company_host)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Locally, docs still open at{" "}
              <code className="rounded bg-muted px-1">localhost:3001/{org.slug}/…</code>. Production
              DNS should point <code className="rounded bg-muted px-1">*.{info.hosted_domain}</code>{" "}
              at the Frond docs host.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Project deployments</CardTitle>
          <CardDescription>
            After <code className="text-xs">frond docs publish</code>, each project gets a hosted URL
            under your company subdomain.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No projects yet"
                description="Create a project on Overview, then publish with the CLI."
                action={
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">Create project</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Project</TableHead>
                  <TableHead>Hosted URL</TableHead>
                  <TableHead>Local URL</TableHead>
                  <TableHead>Custom domain</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <code className="text-xs text-muted-foreground">/{p.slug}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-[240px] items-center gap-1">
                        <code className="truncate text-xs">{p.url}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => copy("URL", p.url)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">{p.local_url}</code>
                    </TableCell>
                    <TableCell>
                      {p.custom_domain ? (
                        <Badge variant="secondary">{p.custom_domain}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <a href={p.local_url} target="_blank" rel="noreferrer">
                          Docs
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
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
        <CardHeader>
          <CardTitle>Custom domain</CardTitle>
          <CardDescription>
            Optional: map <code className="text-xs">docs.yourcompany.com</code> via CNAME to{" "}
            <code className="text-xs">{info.cname_target}</code>. Requires a published deployment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            value={customProjectId}
            onChange={(e) => setCustomProjectId(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:max-w-xs"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="docs.yourcompany.com"
              className="sm:max-w-md"
            />
            <Button
              onClick={() => void saveCustomDomain()}
              disabled={!customProjectId || !customDomain.trim() || savingDomain}
            >
              {savingDomain ? "Saving…" : "Attach domain"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
