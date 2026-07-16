import { DocsUnavailable } from "@/components/docs-unavailable";
import { DocsSidebar } from "@/components/sidebar";
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
    <div className="flex min-h-screen">
      <Suspense fallback={<aside className="w-72 border-r border-zinc-800" />}>
        <DocsSidebar org={org} project={project} manifest={result.data.manifest} />
      </Suspense>
      <main className="flex-1 overflow-auto p-8">
        <MdxContent source={page.content} />
      </main>
    </div>
  );
}
