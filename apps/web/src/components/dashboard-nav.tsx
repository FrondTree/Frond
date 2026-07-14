"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/github", label: "GitHub" },
  { href: "/dashboard/architecture", label: "Architecture" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/dependencies", label: "Dependencies" },
  { href: "/dashboard/health", label: "Doc Health" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-[var(--frond-border)] pb-4">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            pathname === l.href
              ? "bg-indigo-500/20 text-indigo-300"
              : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
