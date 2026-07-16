"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { PageHeader } from "@/components/page-header";
import { apiFetch, type ArchitectureGraph } from "@/lib/api";

export default function ArchitecturePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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
    const data = await apiFetch<ArchitectureGraph | null>(`/v1/orgs/${slug}/intelligence/architecture`);
    setGraph(data ?? { nodes: [], edges: [] });
  }, [router]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [load]);

  const nodes: Node[] = useMemo(() => {
    if (!graph) return [];
    const serviceBg = isDark ? "#1a2e24" : "#e8f2ec";
    const otherBg = isDark ? "#1a1c1b" : "#f4f4f3";
    const border = isDark ? "#3d6b54" : "#2d6a4f";
    const color = isDark ? "#f4f4f3" : "#141816";
    return (graph.nodes ?? []).map((n) => ({
      id: n.id,
      position: n.position ?? { x: 0, y: 0 },
      data: { label: `${n.label} (${n.type})` },
      style: {
        background: n.type === "service" ? serviceBg : otherBg,
        color,
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: 8,
        fontSize: 12,
        minWidth: 120,
      },
    }));
  }, [graph, isDark]);

  const edges: Edge[] = useMemo(() => {
    if (!graph) return [];
    return (graph.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.relationship === "USES",
      style: { stroke: isDark ? "#5a7a68" : "#6b8578" },
    }));
  }, [graph, isDark]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Architecture"
        description="Graph built from connected GitHub repositories."
      />

      <div className="h-[600px] overflow-hidden rounded-lg border bg-card shadow-sm">
        {graph && (graph.nodes?.length ?? 0) > 0 ? (
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background color={isDark ? "#2a2e2c" : "#e5e5e3"} gap={18} />
            <Controls />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {orgSlug
              ? "Connect repos under GitHub and wait for a scan to finish."
              : "Select an organization on Overview first."}
          </div>
        )}
      </div>
    </div>
  );
}
