import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.DOCS_API_URL ?? "http://localhost:8080";
const BASE_DOMAIN = process.env.DOCS_BASE_DOMAIN ?? "localhost";

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  if (!host || host === "localhost" || host.endsWith(BASE_DOMAIN) || host.includes("127.0.0.1")) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${API_URL}/v1/docs/resolve?host=${encodeURIComponent(host)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return NextResponse.next();
    const data = (await res.json()) as { path?: string };
    if (data.path && !req.nextUrl.pathname.startsWith(data.path)) {
      const url = req.nextUrl.clone();
      url.pathname = data.path + (req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname);
      return NextResponse.rewrite(url);
    }
  } catch {
    /* ignore resolve errors */
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
