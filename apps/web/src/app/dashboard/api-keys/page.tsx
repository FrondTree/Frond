"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CopyCommand } from "@/components/copy-command";
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

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at?: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("CLI / CI");
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

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
      const list = asArray(await apiFetch<ApiKeyRow[] | null>(`/v1/orgs/${current.slug}/api-keys`));
      setKeys(list);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    if (!org || creating) return;
    setCreating(true);
    setNewSecret(null);
    try {
      const res = await apiFetch<{ secret: string; key: ApiKeyRow }>(`/v1/orgs/${org.slug}/api-keys`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim() || "CLI / CI" }),
      });
      setNewSecret(res.secret);
      toast.success("API key created — copy it now, it won’t be shown again");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!org) return;
    try {
      await apiFetch(`/v1/orgs/${org.slug}/api-keys/${id}`, { method: "DELETE" });
      toast.success("API key revoked");
      if (newSecret) setNewSecret(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to revoke key");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title="API keys" description="Authenticate the Frond CLI and CI." />
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
        title="API keys"
        description="Use an API key with the Frond CLI to init, validate, and publish docs — like Fern’s token workflow."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            CLI workflow
          </CardTitle>
          <CardDescription>
            Create a key once, then authenticate the CLI and publish from any repo with a{" "}
            <code className="text-xs">frond/</code> folder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Create an API key below and copy the secret.</li>
            <li>
              Run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                frond login --api-key frond_…
              </code>
            </li>
            <li>
              Put your project UUID in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">frond.config.json</code> as{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">projectId</code> (from Overview).
            </li>
            <li>
              Run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">frond docs publish</code>
            </li>
          </ol>
          <CopyCommand
            command="node apps/cli/dist/index.js login --api-key frond_YOUR_KEY"
            className="w-full justify-between"
          />
          <CopyCommand
            command="node apps/cli/dist/index.js docs publish --project-id <uuid>"
            className="w-full justify-between"
          />
        </CardContent>
      </Card>

      {newSecret && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">New key — copy now</CardTitle>
            <CardDescription>This secret is shown only once.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <code className="flex-1 break-all font-mono text-xs">{newSecret}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  void navigator.clipboard.writeText(newSecret).then(() => toast.success("Copied"))
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <CopyCommand
              command={`node apps/cli/dist/index.js login --api-key ${newSecret}`}
              className="w-full justify-between text-xs"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Keys for {org.name}</CardTitle>
            <CardDescription>Only the prefix is stored after creation. Revoke unused keys.</CardDescription>
          </div>
          <form
            className="flex w-full gap-2 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              void createKey();
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name"
              className="sm:w-40"
            />
            <Button type="submit" disabled={creating}>
              <Plus className="h-4 w-4" />
              {creating ? "Creating…" : "Create key"}
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No API keys"
                description="Create a key to authenticate frond docs publish from your machine or CI."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {k.key_prefix}…
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(k.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => void revoke(k.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
