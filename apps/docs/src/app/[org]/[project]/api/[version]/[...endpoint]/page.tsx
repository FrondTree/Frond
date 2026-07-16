import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsUnavailable } from "@/components/docs-unavailable";
import { DocsSidebar } from "@/components/sidebar";
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
    <div className="flex min-h-screen">
      <Suspense fallback={<aside className="w-72 border-r border-zinc-800" />}>
        <DocsSidebar org={org} project={project} manifest={manifest} />
      </Suspense>
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className={cn("rounded px-2 py-1 text-sm font-bold", methodColor(ep.method))}>
              {ep.method}
            </span>
            <code className="text-lg">{ep.path}</code>
          </div>
          <h1 className="mt-4 text-2xl font-bold">{ep.summary || ep.path}</h1>
          {ep.description && <p className="mt-2 text-zinc-400">{ep.description}</p>}
          {ep.request != null && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Request</h2>
              <pre className="mt-2 overflow-auto rounded-lg bg-zinc-900 p-4 text-sm">
                {JSON.stringify(ep.request, null, 2)}
              </pre>
            </section>
          )}
          {ep.responses != null && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Responses</h2>
              <pre className="mt-2 overflow-auto rounded-lg bg-zinc-900 p-4 text-sm">
                {JSON.stringify(ep.responses, null, 2)}
              </pre>
            </section>
          )}
          {ep.examples != null && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Examples</h2>
              <pre className="mt-2 overflow-auto rounded-lg bg-zinc-900 p-4 text-sm">
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
      </main>
    </div>
  );
}
