import { DocsUnavailable } from "@/components/docs-unavailable";
import { DocsSidebar } from "@/components/sidebar";
import { MdxContent } from "@/components/mdx-content";
import { fetchPublishedDocs } from "@/lib/api";
import { Suspense } from "react";

export default async function ProjectHome({
  params,
}: {
  params: Promise<{ org: string; project: string }>;
}) {
  const { org, project } = await params;
  const result = await fetchPublishedDocs(org, project);
  if (!result.ok) {
    return <DocsUnavailable org={org} project={project} error={result.error} />;
  }

  const { manifest } = result.data;
  const landing = manifest.pages.find((p) => p.type === "landing") ?? manifest.pages[0];

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<aside className="w-72 border-r border-zinc-800" />}>
        <DocsSidebar org={org} project={project} manifest={manifest} />
      </Suspense>
      <main className="flex-1 overflow-auto p-8">
        <MdxContent source={landing?.content ?? "# Documentation"} />
      </main>
    </div>
  );
}
