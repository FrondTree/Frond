"use client";

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
import { ApiError, apiFetch, asArray, type Organization, type Project } from "@/lib/api";

interface Member {
  user_id: string;
  email: string;
  name: string;
  role: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [domain, setDomain] = useState("");
  const [projectId, setProjectId] = useState("");
  const [inviteToken, setInviteToken] = useState("");

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
      const [m, inv, projs] = await Promise.all([
        apiFetch<Member[] | null>(`/v1/orgs/${current.slug}/members`),
        apiFetch<Invite[] | null>(`/v1/orgs/${current.slug}/invites`).catch(() => []),
        apiFetch<Project[] | null>(`/v1/orgs/${current.slug}/projects`),
      ]);
      setMembers(asArray(m));
      setInvites(asArray(inv));
      const plist = asArray(projs);
      setProjects(plist);
      if (plist[0]) setProjectId(plist[0].id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createInvite() {
    if (!org || !email.trim()) return;
    try {
      const inv = await apiFetch<Invite>(`/v1/orgs/${org.slug}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role }),
      });
      toast.success(`Invite created — share token ${inv.token}`);
      setEmail("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create invite");
    }
  }

  async function acceptInvite() {
    if (!inviteToken.trim()) return;
    try {
      const joined = await apiFetch<Organization>(`/v1/auth/invites/${inviteToken.trim()}/accept`, {
        method: "POST",
      });
      toast.success(`Joined ${joined.name}`);
      localStorage.setItem("frond_selected_org", joined.slug);
      setInviteToken("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to accept invite");
    }
  }

  async function setCustomDomain() {
    if (!projectId || !domain.trim()) return;
    try {
      await apiFetch(`/v1/projects/${projectId}/custom-domain`, {
        method: "PUT",
        body: JSON.stringify({ domain: domain.trim() }),
      });
      toast.success("Custom domain saved — point CNAME to cname.frond.dev");
      setDomain("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to set domain");
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
        <PageHeader title="Settings" description="Organization settings" />
        <EmptyState title="No organization" description="Create an organization on Overview first." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description={`Members, invites, and custom domains for ${org.name}.`} />

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People with access to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{m.name || m.email}</div>
                  <div className="text-muted-foreground">{m.email}</div>
                </div>
                <Badge variant="outline">{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite members</CardTitle>
          <CardDescription>Creates a shareable invite token (email delivery not configured locally).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <Button onClick={() => void createInvite()}>Invite</Button>
          </div>
          {invites.length > 0 && (
            <ul className="space-y-2 text-sm">
              {invites.map((i) => (
                <li key={i.id} className="rounded-md border px-3 py-2 font-mono text-xs">
                  {i.email} · {i.role} · token={i.token}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 pt-2">
            <Input
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="Accept invite token…"
            />
            <Button variant="outline" onClick={() => void acceptInvite()}>
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom domain</CardTitle>
          <CardDescription>Attach a domain to the latest docs deployment for a project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.slug})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="docs.example.com" />
            <Button onClick={() => void setCustomDomain()}>Save</Button>
          </div>
          <p className="text-xs text-muted-foreground">CNAME your domain to cname.frond.dev (local: docs app on :3001).</p>
        </CardContent>
      </Card>
    </div>
  );
}
