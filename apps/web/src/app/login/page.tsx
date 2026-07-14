"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      localStorage.setItem("frond_token", token);
      router.replace("/dashboard");
      return;
    }

    const redirectUri = `${window.location.origin}/login`;
    window.location.href = `${API_URL}/v1/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-zinc-400">Redirecting to Google sign-in...</p>
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
