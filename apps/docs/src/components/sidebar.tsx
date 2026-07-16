"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn, methodColor } from "@/lib/utils";
import type { DocsManifest } from "@/lib/api";

export function DocsSidebar({
  org,
  project,
  manifest,
  onNavigate,
}: {
  org: string;
  project: string;
  manifest: DocsManifest;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const base = `/${org}/${project}`;
  const activeVersion = search.get("v") || manifest.versions[0]?.id || "v1";
  const endpoints = manifest.endpoints.filter((e) => e.version_id === activeVersion);

  return (
    <aside className="flex h-full max-h-[calc(100vh-4rem)] w-[17.5rem] flex-col lg:max-h-[calc(100vh)] lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
      <div className="space-y-4 border-b border-docs-border p-5">
        <div className="hidden lg:block">
          <div className="text-[11px] font-medium uppercase tracking-wider text-docs-muted">Documentation</div>
          <div className="mt-1 text-base font-semibold tracking-tight text-docs-fg">{manifest.title}</div>
        </div>
        {manifest.versions.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-docs-muted">Version</div>
            <div className="flex flex-wrap gap-1.5">
              {manifest.versions.map((v) => (
                <Link
                  key={v.id}
                  href={`${pathname}?v=${v.id}`}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    activeVersion === v.id
                      ? "bg-docs-accent text-white shadow-docs-sm"
                      : "bg-docs-card text-docs-muted ring-1 ring-docs-border hover:text-docs-fg",
                  )}
                >
                  {v.display_name || v.id}
                  {v.deprecated ? " · deprecated" : ""}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto p-4 pb-10 text-sm">
        <div>
          <div className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-docs-muted">
            Guides
          </div>
          <div className="space-y-0.5">
            {manifest.pages.map((page) => {
              const href = `${base}${page.slug === "/" ? "" : page.slug}?v=${activeVersion}`;
              const active =
                pathname === `${base}${page.slug === "/" ? "" : page.slug}` ||
                (page.slug === "/" && pathname === base);
              return (
                <Link
                  key={page.id}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-lg px-2.5 py-2 transition-colors",
                    active
                      ? "bg-docs-accent-soft font-medium text-docs-accent-fg shadow-docs-sm"
                      : "text-docs-muted hover:bg-docs-card hover:text-docs-fg",
                  )}
                >
                  {page.title}
                </Link>
              );
            })}
          </div>
        </div>

        {endpoints.length > 0 && (
          <div>
            <div className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-docs-muted">
              API reference
            </div>
            <div className="space-y-0.5">
              {endpoints.map((ep) => {
                const href = `${base}/api/${ep.version_id}${ep.path}?v=${activeVersion}`;
                const active = pathname === `${base}/api/${ep.version_id}${ep.path}`;
                return (
                  <Link
                    key={ep.id}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-mono text-[11px] transition-colors",
                      active
                        ? "bg-docs-accent-soft text-docs-accent-fg"
                        : "text-docs-muted hover:bg-docs-card hover:text-docs-fg",
                    )}
                  >
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold", methodColor(ep.method))}>
                      {ep.method}
                    </span>
                    <span className="truncate">{ep.path}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
