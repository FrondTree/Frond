"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

function Callout({ type = "info", children }: { type?: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    info: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
    warn: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    tip: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
    danger: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
  };
  return (
    <aside className={`my-6 rounded-xl border px-4 py-3.5 text-sm ${styles[type] ?? styles.info}`}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-70">{type}</div>
      <div className="prose prose-docs prose-sm max-w-none">{children}</div>
    </aside>
  );
}

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
    return tabs.map((t) => `\n\n**${t[1]}**\n\n${t[2].trim()}\n`).join("\n");
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
    <a href={href} className="font-medium text-docs-accent underline-offset-4 hover:underline">
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded-md bg-docs-code px-1.5 py-0.5 font-mono text-[0.85em] text-docs-accent-fg" {...props}>
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
    <pre className="overflow-auto rounded-xl border border-docs-border bg-docs-code p-4 font-mono text-[13px] leading-relaxed text-docs-fg">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-auto rounded-xl border border-docs-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-docs-border bg-docs-sidebar px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-docs-muted">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-docs-border px-4 py-2.5 text-docs-fg/90">{children}</td>,
};

export function MdxContent({ source }: { source: string }) {
  const prepared = preprocessMdx(source);
  return (
    <article className="prose prose-docs max-w-3xl prose-headings:tracking-tight prose-h1:text-3xl prose-h1:font-semibold prose-h2:mt-10 prose-h2:text-xl">
      {renderWithCallouts(prepared)}
    </article>
  );
}
