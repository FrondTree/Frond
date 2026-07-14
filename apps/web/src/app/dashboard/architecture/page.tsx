"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { DashboardNav } from "@/components/dashboard-nav";
import { apiFetch, type ArchitectureGraph, type Organization } from "@/lib/api";

export default function ArchitecturePage() {
  const router = useRouter();
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("frond_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const slug = localStorage.getItem("frond_selected_org");
    if (!slug) return;
    setOrgSlug(slug);
    const data = await apiFetch<ArchitectureGraph>(`/v1/orgs/${slug}/intelligence/architecture`);
    setGraph(data);
  }, [router]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [load]);

  const nodes: Node[] = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.map((n) => ({
      id: n.id,
      position: n.position ?? { x: 0, y: 0 },
      data: { label: `${n.label} (${n.type})` },
      style: {
        background: n.type === "service" ? "#312e81" : "#1e293b",
        color: "#fff",
        border: "1px solid #4f46e5",
        borderRadius: 8,
        padding: 8,
        fontSize: 12,
        minWidth: 120,
      },
    }));
  }, [graph]);

  const edges: Edge[] = useMemo(() => {
    if (!graph) return [];
    return graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.relationship === "USES",
    }));
  }, [graph]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--frond-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">Frond</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <DashboardNav />
        <h1 className="mt-8 text-2xl font-bold">Architecture Explorer</h1>
        <p className="mt-2 text-sm text-zinc-400">Auto-generated from connected GitHub repositories.</p>
        <div className="mt-6 h-[600px] rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)]">
          {graph && graph.nodes.length > 0 ? (
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Background />
              <Controls />
            </ReactFlow>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">
              {orgSlug ? "Connect repos in GitHub tab and wait for scan to complete." : "Select an organization first."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
