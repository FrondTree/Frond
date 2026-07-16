"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { DocsManifest } from "@/lib/api";
import { DocsSidebar } from "@/components/sidebar";
import { CmdKSearch } from "@/components/cmdk-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { DocsToc } from "@/components/docs-toc";
import { cn } from "@/lib/utils";

export function DocsShell({
  org,
  project,
  manifest,
  children,
}: {
  org: string;
  project: string;
  manifest: DocsManifest;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen docs-atmosphere">
      <header className="sticky top-0 z-40 border-b border-docs-border/70 docs-header-blur">
        <div className="mx-auto flex h-16 max-w-[96rem] items-center gap-3 px-4 sm:px-6 lg:gap-6">
          <div className="flex min-w-0 shrink-0 items-center gap-3 lg:w-[17.5rem]">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-docs-border bg-docs-card text-docs-fg shadow-docs-sm lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close navigation" : "Open navigation"}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-semibold tracking-tight text-docs-fg">
                  Frond<span className="text-docs-accent">.</span>
                </span>
                <span className="hidden truncate text-sm text-docs-muted xl:inline">{manifest.title}</span>
              </div>
              <div className="truncate font-mono text-[11px] text-docs-muted">
                {org}/{project}
              </div>
            </div>
          </div>

          <div className="mx-auto flex min-w-0 flex-1 justify-end sm:justify-center">
            <CmdKSearch org={org} project={project} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <a
              href={process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}
              className="hidden rounded-lg border border-docs-border bg-docs-card px-3 py-1.5 text-xs font-medium text-docs-muted shadow-docs-sm transition-colors hover:border-docs-accent/35 hover:text-docs-accent md:inline"
            >
              Dashboard
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[96rem]">
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[17.5rem] border-r border-docs-border bg-docs-sidebar pt-16 transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0 lg:pt-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <DocsSidebar org={org} project={project} manifest={manifest} onNavigate={() => setOpen(false)} />
        </div>
        {open && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-docs-fg/20 backdrop-blur-[2px] lg:hidden dark:bg-black/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        )}
        <main className="min-w-0 flex-1 docs-fade-in">
          <div className="flex gap-10 px-4 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-12">
            <div className="min-w-0 flex-1" data-docs-article>
              {children}
            </div>
            <DocsToc />
          </div>
        </main>
      </div>
    </div>
  );
}
