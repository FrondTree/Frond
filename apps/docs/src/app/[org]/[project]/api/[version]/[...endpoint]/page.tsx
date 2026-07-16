import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsUnavailable } from "@/components/docs-unavailable";
import { DocsShell } from "@/components/docs-shell";
import { Playground } from "@/components/playground";
import { fetchPublishedDocs } from "@/lib/api";
import { cn, methodColor } from "@/lib/utils";

export default async function EndpointPage({
  params,
}: {
  params: Promise<{ org: string; project: string; version: string; endpoint: string[] }>;
}) {
  const { org, project, version, endpoint } = await params;
  const path = "/" + endpoint.join("/");
  const result = await fetchPublishedDocs(org, project);
  if (!result.ok) {
    return <DocsUnavailable org={org} project={project} error={result.error} />;
  }

  const { manifest } = result.data;
  const ep = manifest.endpoints.find((e) => e.version_id === version && e.path === path);
  if (!ep) notFound();

  const baseUrl = manifest.playground?.["base-url"] ?? "https://api.example.com";

  return (
    <Suspense fallback={<div className="min-h-screen docs-grid" />}>
      <DocsShell org={org} project={project} manifest={manifest}>
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("rounded-md px-2.5 py-1 text-sm font-bold", methodColor(ep.method))}>
              {ep.method}
            </span>
            <code className="font-mono text-lg text-docs-fg">{ep.path}</code>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-docs-fg">
            {ep.summary || ep.path}
          </h1>
          {ep.description && <p className="mt-3 text-docs-muted leading-relaxed">{ep.description}</p>}
          {ep.request != null && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-docs-fg">Request</h2>
              <pre className="mt-3 overflow-auto rounded-xl border border-docs-border bg-docs-code p-4 font-mono text-sm text-docs-fg">
                {JSON.stringify(ep.request, null, 2)}
              </pre>
            </section>
          )}
          {ep.responses != null && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-docs-fg">Responses</h2>
              <pre className="mt-3 overflow-auto rounded-xl border border-docs-border bg-docs-code p-4 font-mono text-sm text-docs-fg">
                {JSON.stringify(ep.responses, null, 2)}
              </pre>
            </section>
          )}
          {ep.examples != null && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-docs-fg">Examples</h2>
              <pre className="mt-3 overflow-auto rounded-xl border border-docs-border bg-docs-code p-4 font-mono text-sm text-docs-fg">
                {JSON.stringify(ep.examples, null, 2)}
              </pre>
            </section>
          )}
          <Playground
            method={ep.method}
            path={ep.path}
            baseUrl={baseUrl}
            authType={manifest.playground?.auth?.type}
            environments={manifest.playground?.environments}
          />
        </div>
      </DocsShell>
    </Suspense>
  );
}
