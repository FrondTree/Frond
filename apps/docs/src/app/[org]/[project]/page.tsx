import { DocsUnavailable } from "@/components/docs-unavailable";
import { DocsShell } from "@/components/docs-shell";
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
    <Suspense fallback={<div className="min-h-screen docs-grid" />}>
      <DocsShell org={org} project={project} manifest={manifest}>
        <MdxContent source={landing?.content ?? "# Documentation"} />
      </DocsShell>
    </Suspense>
  );
}
