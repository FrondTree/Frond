const API_URL = process.env.DOCS_API_URL ?? "http://localhost:8080";

export interface DocsManifest {
  title: string;
  versions: Array<{ id: string; display_name: string; deprecated: boolean }>;
  navigation: unknown;
  theme: Record<string, string>;
  playground?: {
    "base-url": string;
    environments?: Array<{ name: string; url: string }>;
    auth?: { type: string; header?: string };
  };
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    content: string;
    type: string;
  }>;
  endpoints: Array<{
    id: string;
    method: string;
    path: string;
    summary: string;
    description: string;
    versionId: string;
    tags: string[];
    request?: unknown;
    responses?: unknown;
    examples?: unknown;
  }>;
}

export async function fetchPublishedDocs(org: string, project: string) {
  const res = await fetch(`${API_URL}/v1/docs/${org}/${project}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data as {
    organization: { slug: string; name: string };
    project: { slug: string; name: string };
    manifest: DocsManifest;
  };
}

export async function searchDocs(org: string, project: string, q: string) {
  const res = await fetch(
    `${API_URL}/v1/docs/${org}/${project}/search?q=${encodeURIComponent(q)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return res.json();
}
