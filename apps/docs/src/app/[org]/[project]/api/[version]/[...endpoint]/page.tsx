import { notFound } from "next/navigation";
import { fetchPublishedDocs } from "@/lib/api";
import { DocsSidebar } from "@/components/sidebar";
import { Playground } from "@/components/playground";
import { cn, methodColor } from "@/lib/utils";

export default async function EndpointPage({
  params,
}: {
  params: Promise<{ org: string; project: string; version: string; endpoint: string[] }>;
}) {
  const { org, project, version, endpoint } = await params;
  const path = "/" + endpoint.join("/");
  const data = await fetchPublishedDocs(org, project);
  if (!data) notFound();

  const ep = data.manifest.endpoints.find(
    (e) => e.versionId === version && e.path === path,
  );
  if (!ep) notFound();

  const baseUrl = data.manifest.playground?.["base-url"] ?? "https://api.example.com";

  return (
    <div className="flex min-h-screen">
      <DocsSidebar org={org} project={project} manifest={data.manifest} />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className={cn("rounded px-2 py-1 text-sm font-bold", methodColor(ep.method))}>
              {ep.method}
            </span>
            <code className="text-lg">{ep.path}</code>
          </div>
          <h1 className="mt-4 text-2xl font-bold">{ep.summary || ep.path}</h1>
          {ep.description && (
            <p className="mt-2 text-zinc-400">{ep.description}</p>
          )}
          {ep.responses != null && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Responses</h2>
              <pre className="mt-2 overflow-auto rounded-lg bg-zinc-900 p-4 text-sm">
                {JSON.stringify(ep.responses, null, 2)}
              </pre>
            </section>
          )}
          <Playground
            method={ep.method}
            path={ep.path}
            baseUrl={baseUrl}
            authType={data.manifest.playground?.auth?.type}
          />
        </div>
      </main>
    </div>
  );
}
