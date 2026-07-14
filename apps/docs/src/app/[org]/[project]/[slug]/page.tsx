import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { fetchPublishedDocs } from "@/lib/api";
import { DocsSidebar } from "@/components/sidebar";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ org: string; project: string; slug: string }>;
}) {
  const { org, project, slug } = await params;
  const data = await fetchPublishedDocs(org, project);
  if (!data) notFound();

  const page = data.manifest.pages.find((p) => p.slug === `/${slug}`);
  if (!page) notFound();

  return (
    <div className="flex min-h-screen">
      <DocsSidebar org={org} project={project} manifest={data.manifest} />
      <main className="flex-1 overflow-auto p-8">
        <article className="prose prose-invert max-w-3xl">
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
