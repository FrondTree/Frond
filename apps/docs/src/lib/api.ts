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
    version_id: string;
    tags: string[];
    request?: unknown;
    responses?: unknown;
    examples?: unknown;
  }>;
}

export type DocsFetchResult =
  | {
      ok: true;
      data: {
        organization: { slug: string; name: string };
        project: { slug: string; name: string };
        manifest: DocsManifest;
      };
    }
  | { ok: false; status: number; error: string };

export async function fetchPublishedDocs(org: string, project: string): Promise<DocsFetchResult> {
  try {
    const res = await fetch(`${API_URL}/v1/docs/${org}/${project}`, {
      next: { revalidate: 10 },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        data: data as {
          organization: { slug: string; name: string };
          project: { slug: string; name: string };
          manifest: DocsManifest;
        },
      };
    }
    let error = "not_found";
    try {
      const body = (await res.json()) as { error?: string };
      error = body.error ?? error;
    } catch {
      /* ignore */
    }
    return { ok: false, status: res.status, error };
  } catch {
    return { ok: false, status: 503, error: "api_unreachable" };
  }
}

export async function searchDocs(org: string, project: string, q: string) {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("frond_token");
    const apiKey = localStorage.getItem("frond_api_key");
    if (apiKey) headers["X-Frond-Api-Key"] = apiKey;
    else if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(
    `${API_URL}/v1/docs/${org}/${project}/search?q=${encodeURIComponent(q)}`,
    { cache: "no-store", headers },
  );
  if (!res.ok) return [];
  return res.json();
}
