"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/api";

export function DashboardHeader() {
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <header className="border-b border-[var(--frond-border)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          Frond
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">Dashboard</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-[var(--frond-border)] px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
