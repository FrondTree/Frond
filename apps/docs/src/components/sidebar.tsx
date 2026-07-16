"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DocsManifest } from "@/lib/api";
import { CmdKSearch } from "@/components/cmdk-search";

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
  const search = useSearchParams();
  const base = `/${org}/${project}`;
  const activeVersion = search.get("v") || manifest.versions[0]?.id || "v1";
  const endpoints = manifest.endpoints.filter((e) => e.version_id === activeVersion);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-800">
      <div className="space-y-3 border-b border-zinc-800 p-4">
        <div>
          <div className="text-xs text-zinc-500">{org}</div>
          <div className="font-semibold">{manifest.title}</div>
        </div>
        <CmdKSearch org={org} project={project} />
        {manifest.versions.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Version</div>
            <div className="flex flex-wrap gap-1">
              {manifest.versions.map((v) => (
                <Link
                  key={v.id}
                  href={`${pathname}?v=${v.id}`}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs",
                    activeVersion === v.id ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  {v.display_name || v.id}
                  {v.deprecated ? " (deprecated)" : ""}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-6 overflow-auto p-4 text-sm">
        <div className="space-y-1">
          {manifest.pages.map((page) => (
            <Link
              key={page.id}
              href={`${base}${page.slug === "/" ? "" : page.slug}?v=${activeVersion}`}
              className={cn(
                "block rounded-lg px-3 py-2 hover:bg-white/5",
                pathname === `${base}${page.slug === "/" ? "" : page.slug}` && "bg-emerald-500/20 text-emerald-300",
              )}
            >
              {page.title}
            </Link>
          ))}
        </div>
        <div>
          <div className="mb-2 px-3 text-xs font-semibold uppercase text-zinc-500">API Reference</div>
          {endpoints.map((ep) => (
            <Link
              key={ep.id}
              href={`${base}/api/${ep.version_id}${ep.path}?v=${activeVersion}`}
              className={cn(
                "block rounded-lg px-3 py-1.5 font-mono text-xs hover:bg-white/5",
                pathname === `${base}/api/${ep.version_id}${ep.path}` && "bg-emerald-500/20 text-emerald-300",
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
