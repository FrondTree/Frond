"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DocsManifest } from "@/lib/api";

export function DocsSidebar({
  org,
  project,
  manifest,
}: {
  org: string;
  project: string;
  manifest: DocsManifest;
}) {
  const pathname = usePathname();
  const base = `/${org}/${project}`;

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-800 p-4">
      <div className="mb-6">
        <div className="text-xs text-zinc-500">{org}</div>
        <div className="font-semibold">{manifest.title}</div>
      </div>
      <nav className="space-y-6 text-sm">
        {manifest.pages.map((page) => (
          <Link
            key={page.id}
            href={`${base}${page.slug === "/" ? "" : page.slug}`}
            className={cn(
              "block rounded-lg px-3 py-2 hover:bg-white/5",
              pathname === `${base}${page.slug === "/" ? "" : page.slug}` &&
                "bg-indigo-500/20 text-indigo-300",
            )}
          >
            {page.title}
          </Link>
        ))}
        <div>
          <div className="mb-2 px-3 text-xs font-semibold uppercase text-zinc-500">
            API Reference
          </div>
          {manifest.endpoints.map((ep) => (
            <Link
              key={ep.id}
              href={`${base}/api/${ep.versionId}${ep.path}`}
              className={cn(
                "block rounded-lg px-3 py-1.5 font-mono text-xs hover:bg-white/5",
                pathname === `${base}/api/${ep.versionId}${ep.path}` &&
                  "bg-indigo-500/20 text-indigo-300",
              )}
            >
              <span className="text-zinc-500">{ep.method}</span> {ep.path}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
