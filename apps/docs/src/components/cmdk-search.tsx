"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { searchDocs } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CmdKSearch({
  org,
  project,
  className,
}: {
  org: string;
  project: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ type: string; title: string; content: string; url: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !q.trim()) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      setLoading(true);
      void searchDocs(org, project, q.trim())
        .then((r) => setResults(Array.isArray(r) ? r : []))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(t);
  }, [q, open, org, project]);

  const hint = useMemo(
    () => (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl+K"),
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search documentation"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center gap-2 rounded-lg border border-docs-border bg-docs-card text-docs-muted shadow-docs-sm transition-all hover:border-docs-accent/40 hover:text-docs-accent",
          "sm:h-10 sm:w-full sm:max-w-xl sm:justify-start sm:rounded-xl sm:px-3.5 sm:text-sm sm:hover:shadow-docs-glow",
          className,
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden flex-1 truncate text-left sm:inline">Search documentation…</span>
        <kbd className="ml-auto hidden rounded-md border border-docs-border bg-docs-bg px-1.5 py-0.5 font-mono text-[10px] text-docs-muted sm:inline">
          {hint}
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-docs-fg/25 p-4 pt-[10vh] backdrop-blur-sm dark:bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-docs-border bg-docs-card shadow-docs-glow docs-fade-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Search documentation"
          >
            <div className="flex items-center gap-2.5 border-b border-docs-border px-4">
              <Search className="h-4 w-4 text-docs-accent" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search guides, endpoints, and examples…"
                className="w-full bg-transparent py-4 text-sm text-docs-fg outline-none placeholder:text-docs-muted"
              />
              <kbd className="rounded-md border border-docs-border px-1.5 py-0.5 font-mono text-[10px] text-docs-muted">
                esc
              </kbd>
            </div>
            <div className="max-h-[min(24rem,50vh)] overflow-auto p-2">
              {loading && <p className="px-3 py-5 text-xs text-docs-muted">Searching…</p>}
              {!loading && results.length === 0 && q.trim() && (
                <p className="px-3 py-5 text-xs text-docs-muted">No results for “{q.trim()}”</p>
              )}
              {!loading && !q.trim() && (
                <div className="space-y-1 px-3 py-4 text-xs text-docs-muted">
                  <p>Type to search guides and API reference.</p>
                  <p className="pt-1 text-[11px] opacity-80">Press ⌘K anytime to open search.</p>
                </div>
              )}
              {results.map((r, i) => (
                <a
                  key={`${r.url}-${i}`}
                  href={r.url.startsWith("/") ? `/${org}/${project}${r.url}` : r.url}
                  className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-docs-accent-soft"
                  onClick={() => setOpen(false)}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-docs-accent">{r.type}</div>
                  <div className="text-sm font-medium text-docs-fg">{r.title}</div>
                  <div className="line-clamp-1 text-xs text-docs-muted">{r.content}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
