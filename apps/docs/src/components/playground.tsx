"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn, methodColor } from "@/lib/utils";

interface PlaygroundProps {
  method: string;
  path: string;
  baseUrl: string;
  authType?: string;
}

export function Playground({ method, path, baseUrl, authType }: PlaygroundProps) {
  const [body, setBody] = useState("{}");
  const [token, setToken] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  async function send() {
    setLoading(true);
    setResponse(null);
    const start = performance.now();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (authType === "bearer" && token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(new URL(path, baseUrl).toString(), {
        method,
        headers,
        body: ["POST", "PUT", "PATCH"].includes(method) ? body : undefined,
      });
      const text = await res.text();
      setStatus(res.status);
      setDuration(Math.round(performance.now() - start));
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err) {
      setResponse((err as Error).message);
      setStatus(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <Play className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-medium">Try it</span>
        <span className={cn("rounded px-2 py-0.5 text-xs font-bold", methodColor(method))}>
          {method}
        </span>
        <code className="text-sm text-zinc-400">{path}</code>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div>
          <label className="text-xs text-zinc-500">Base URL</label>
          <input
            readOnly
            value={baseUrl}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
          />
          {authType === "bearer" && (
            <>
              <label className="mt-3 block text-xs text-zinc-500">Bearer Token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJ..."
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              />
            </>
          )}
          {["POST", "PUT", "PATCH"].includes(method) && (
            <>
              <label className="mt-3 block text-xs text-zinc-500">Request Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm"
              />
            </>
          )}
          <button
            onClick={() => void send()}
            disabled={loading}
            className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Request"}
          </button>
        </div>
        <div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {status !== null && <span>Status: {status}</span>}
            {duration !== null && <span>Time: {duration}ms</span>}
          </div>
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
            {response ?? "Response will appear here"}
          </pre>
        </div>
      </div>
    </div>
  );
}
