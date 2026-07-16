"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

function Callout({ type = "info", children }: { type?: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    info: "border-sky-500/40 bg-sky-500/10 text-sky-100",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    tip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
    danger: "border-red-500/40 bg-red-500/10 text-red-100",
  };
  return (
    <aside className={`my-4 rounded-lg border px-4 py-3 text-sm ${styles[type] ?? styles.info}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">{type}</div>
      <div className="prose prose-invert prose-sm max-w-none">{children}</div>
    </aside>
  );
}

/** Strip MDX-ish JSX tags into markdown-friendly HTML markers the renderer understands. */
function preprocessMdx(source: string): string {
  let s = source.replace(/^---[\s\S]*?---\n?/, "");
  s = s.replace(
    /<Callout\s+type=["'](\w+)["']\s*>([\s\S]*?)<\/Callout>/gi,
    (_m, type: string, body: string) => `\n\n:::callout{${type}}\n${body.trim()}\n:::\n\n`,
  );
  s = s.replace(/<Callout\s*>([\s\S]*?)<\/Callout>/gi, (_m, body: string) => `\n\n:::callout{info}\n${body.trim()}\n:::\n\n`);
  s = s.replace(/<Tabs>[\s\S]*?<\/Tabs>/gi, (block) => {
    const tabs = [...block.matchAll(/<Tab\s+title=["']([^"']+)["']\s*>([\s\S]*?)<\/Tab>/gi)];
    if (!tabs.length) return block;
    return tabs
      .map((t) => `\n\n**${t[1]}**\n\n${t[2].trim()}\n`)
      .join("\n");
  });
  return s;
}

function renderWithCallouts(content: string) {
  const parts = content.split(/\n:::callout\{(\w+)\}\n([\s\S]*?)\n:::\n/g);
  if (parts.length === 1) {
    return <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>;
  }
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      if (parts[i].trim()) {
        nodes.push(
          <ReactMarkdown key={`md-${i}`} components={mdComponents}>
            {parts[i]}
          </ReactMarkdown>,
        );
      }
    } else if (i % 3 === 1) {
      const type = parts[i];
      const body = parts[i + 1] ?? "";
      nodes.push(
        <Callout key={`c-${i}`} type={type}>
          <ReactMarkdown components={mdComponents}>{body}</ReactMarkdown>
        </Callout>,
      );
      i++;
    }
  }
  return <>{nodes}</>;
}

const mdComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} className="text-emerald-400 underline-offset-2 hover:underline">
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-[0.85em]" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-zinc-700 bg-zinc-900 px-3 py-2 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-zinc-800 px-3 py-2">{children}</td>,
};

export function MdxContent({ source }: { source: string }) {
  const prepared = preprocessMdx(source);
  return <div className="prose prose-invert max-w-3xl prose-headings:font-semibold">{renderWithCallouts(prepared)}</div>;
}
