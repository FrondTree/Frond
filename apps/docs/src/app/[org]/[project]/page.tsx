import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { fetchPublishedDocs } from "@/lib/api";
import { DocsSidebar } from "@/components/sidebar";

export default async function ProjectHome({
  params,
}: {
  params: Promise<{ org: string; project: string }>;
}) {
  const { org, project } = await params;
  const data = await fetchPublishedDocs(org, project);
  if (!data) notFound();

  const landing = data.manifest.pages.find((p) => p.type === "landing") ?? data.manifest.pages[0];

  return (
    <div className="flex min-h-screen">
      <DocsSidebar org={org} project={project} manifest={data.manifest} />
      <main className="flex-1 overflow-auto p-8">
        <article className="prose prose-invert max-w-3xl prose-headings:font-semibold prose-a:text-indigo-400">
          <ReactMarkdown>{landing?.content ?? "# Documentation"}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
