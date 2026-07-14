"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      localStorage.setItem("frond_token", token);
      router.replace("/dashboard");
    }
  }, [params, router]);

  async function handleDemoLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Login failed");
      }
      const data = (await res.json()) as { token: string };
      localStorage.setItem("frond_token", data.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    const redirectUri = `${window.location.origin}/login`;
    window.location.href = `${API_URL}/v1/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--frond-bg)] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-8">
        <Link href="/" className="text-xl font-bold">
          Frond
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">Use the demo account to explore, or sign in with Google.</p>

        <form onSubmit={(e) => void handleDemoLogin(e)} className="mt-8 space-y-4">
          <div>
            <label className="text-xs text-zinc-500">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] px-3 py-2 text-sm"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--frond-border)] bg-[var(--frond-bg)] px-3 py-2 text-sm"
              autoComplete="current-password"
            />
          </div>

          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">
            Demo: <strong>demo</strong> / <strong>demo</strong>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-medium hover:bg-indigo-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in with demo account"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--frond-border)]" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-[var(--frond-border)]" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full rounded-lg border border-[var(--frond-border)] py-2.5 text-sm hover:bg-white/5"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
