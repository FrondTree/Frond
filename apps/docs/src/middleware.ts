import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.DOCS_API_URL ?? "http://localhost:8080";
const HOSTED_DOMAIN = (process.env.DOCS_HOSTED_DOMAIN ?? process.env.DOCS_BASE_DOMAIN ?? "frond.dev")
  .replace(/^https?:\/\//, "")
  .split(":")[0]
  .toLowerCase();

function isBareLocal(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host.startsWith("127.0.0.1");
}

export async function middleware(req: NextRequest) {
  const hostHeader = req.headers.get("host") ?? "";
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (!host || isBareLocal(host)) {
    return NextResponse.next();
  }

  // company.frond.dev or company.localhost → /{org-slug}/...
  const isCompanyHost =
    host.endsWith(`.${HOSTED_DOMAIN}`) || host.endsWith(".localhost");

  if (!isCompanyHost) {
    // Fully custom domain (docs.acme.com)
    try {
      const res = await fetch(`${API_URL}/v1/docs/resolve?host=${encodeURIComponent(host)}`, {
        next: { revalidate: 30 },
      });
      if (!res.ok) return NextResponse.next();
      const data = (await res.json()) as { path?: string };
      if (data.path) {
        const url = req.nextUrl.clone();
        const suffix = req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname;
        if (!url.pathname.startsWith(data.path)) {
          url.pathname = data.path + suffix;
          return NextResponse.rewrite(url);
        }
      }
    } catch {
      /* ignore */
    }
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${API_URL}/v1/docs/resolve?host=${encodeURIComponent(host)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return NextResponse.next();
    const data = (await res.json()) as { path?: string; organization?: { slug: string } };
    const basePath = data.path ?? (data.organization ? `/${data.organization.slug}` : "");
    if (!basePath) return NextResponse.next();

    const url = req.nextUrl.clone();
    // If user hits company host root, stay at /{org}; if they hit /project, map to /{org}/project
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = basePath;
      return NextResponse.rewrite(url);
    }
    if (!url.pathname.startsWith(basePath + "/") && url.pathname !== basePath) {
      url.pathname = `${basePath}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  } catch {
    /* ignore */
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
