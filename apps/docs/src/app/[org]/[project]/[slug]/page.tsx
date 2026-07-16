import { DocsUnavailable } from "@/components/docs-unavailable";
import { DocsShell } from "@/components/docs-shell";
import { MdxContent } from "@/components/mdx-content";
import { fetchPublishedDocs } from "@/lib/api";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ org: string; project: string; slug: string }>;
}) {
  const { org, project, slug } = await params;
  const result = await fetchPublishedDocs(org, project);
  if (!result.ok) {
    return <DocsUnavailable org={org} project={project} error={result.error} />;
  }

  const page = result.data.manifest.pages.find((p) => p.slug === `/${slug}`);
  if (!page) notFound();

  return (
    <Suspense fallback={<div className="min-h-screen docs-grid" />}>
      <DocsShell org={org} project={project} manifest={result.data.manifest}>
        <MdxContent source={page.content} />
      </DocsShell>
    </Suspense>
  );
}
