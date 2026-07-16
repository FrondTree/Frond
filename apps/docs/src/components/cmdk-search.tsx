"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { searchDocs } from "@/lib/api";

export function CmdKSearch({ org, project }: { org: string; project: string }) {
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

  const hint = useMemo(() => (navigator.platform.includes("Mac") ? "⌘K" : "Ctrl+K"), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd className="rounded border border-zinc-700 px-1">{hint}</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-zinc-800 px-3">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search docs and endpoints…"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
            <div className="max-h-80 overflow-auto p-2">
              {loading && <p className="px-2 py-3 text-xs text-zinc-500">Searching…</p>}
              {!loading && results.length === 0 && q.trim() && (
                <p className="px-2 py-3 text-xs text-zinc-500">No results</p>
              )}
              {results.map((r, i) => (
                <a
                  key={i}
                  href={r.url.startsWith("/") ? `/${org}/${project}${r.url}` : r.url}
                  className="block rounded-lg px-3 py-2 hover:bg-zinc-900"
                  onClick={() => setOpen(false)}
                >
                  <div className="text-xs text-zinc-500">{r.type}</div>
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="line-clamp-1 text-xs text-zinc-500">{r.content}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
