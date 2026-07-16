"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string; level: number };

export function DocsToc() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const root = document.querySelector("[data-docs-article]");
    if (!root) {
      setHeadings([]);
      return;
    }
    const nodes = [...root.querySelectorAll("h2, h3")] as HTMLElement[];
    const list = nodes.map((el) => {
      if (!el.id) {
        el.id = el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "section";
      }
      return { id: el.id, text: el.textContent || "", level: el.tagName === "H3" ? 3 : 2 };
    });
    setHeadings(list);
    setActive(list[0]?.id ?? "");

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pathname]);

  if (headings.length < 2) return null;

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 w-52 pl-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-docs-muted">On this page</div>
        <nav className="mt-3 space-y-1 border-l border-docs-border">
          {headings.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={cn(
                "block border-l-2 border-transparent py-1 text-xs transition-colors",
                h.level === 3 ? "pl-5" : "pl-3",
                active === h.id
                  ? "border-docs-accent font-medium text-docs-accent"
                  : "text-docs-muted hover:text-docs-fg",
              )}
            >
              {h.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
