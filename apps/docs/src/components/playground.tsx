"use client";

import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { cn, methodColor } from "@/lib/utils";

interface Env {
  name: string;
  url: string;
}

interface HistoryItem {
  id: string;
  at: number;
  status: number;
  duration: number;
  method: string;
  path: string;
}

interface PlaygroundProps {
  method: string;
  path: string;
  baseUrl: string;
  authType?: string;
  environments?: Env[];
}

export function Playground({ method, path, baseUrl, authType = "bearer", environments }: PlaygroundProps) {
  const envs = useMemo(
    () => environments?.length ? environments : [{ name: "Default", url: baseUrl }],
    [environments, baseUrl],
  );
  const [envName, setEnvName] = useState(envs[0]?.name ?? "Default");
  const [customBase, setCustomBase] = useState(envs[0]?.url ?? baseUrl);
  const [authMode, setAuthMode] = useState<"bearer" | "api-key" | "basic" | "none">(
    authType === "api-key" ? "api-key" : authType === "basic" ? "basic" : "bearer",
  );
  const [token, setToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");
  const [body, setBody] = useState("{}");
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const selected = envs.find((e) => e.name === envName);
    if (selected) setCustomBase(selected.url);
  }, [envName, envs]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("frond_playground_history");
      if (raw) setHistory(JSON.parse(raw) as HistoryItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  function persistHistory(next: HistoryItem[]) {
    setHistory(next);
    localStorage.setItem("frond_playground_history", JSON.stringify(next.slice(0, 20)));
  }

  async function send() {
    setLoading(true);
    setResponse(null);
    const start = performance.now();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (authMode === "bearer" && token) headers.Authorization = `Bearer ${token}`;
      if (authMode === "api-key" && apiKey) headers["X-Api-Key"] = apiKey;
      if (authMode === "basic" && basicUser) {
        headers.Authorization = `Basic ${btoa(`${basicUser}:${basicPass}`)}`;
      }

      const res = await fetch(new URL(path, customBase).toString(), {
        method,
        headers,
        body: ["POST", "PUT", "PATCH"].includes(method) ? body : undefined,
      });
      const text = await res.text();
      const ms = Math.round(performance.now() - start);
      setStatus(res.status);
      setDuration(ms);
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
      persistHistory([
        { id: `${Date.now()}`, at: Date.now(), status: res.status, duration: ms, method, path },
        ...history,
      ].slice(0, 20));
    } catch (err) {
      setResponse((err as Error).message);
      setStatus(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <Play className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-medium">Try it</span>
        <span className={cn("rounded px-2 py-0.5 text-xs font-bold", methodColor(method))}>{method}</span>
        <code className="text-sm text-zinc-400">{path}</code>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500">Environment</label>
            <select
              value={envName}
              onChange={(e) => setEnvName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            >
              {envs.map((e) => (
                <option key={e.name} value={e.name}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Base URL</label>
            <input
              value={customBase}
              onChange={(e) => setCustomBase(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Auth preset</label>
            <select
              value={authMode}
              onChange={(e) => setAuthMode(e.target.value as typeof authMode)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="bearer">Bearer token</option>
              <option value="api-key">API key</option>
              <option value="basic">Basic</option>
              <option value="none">None</option>
            </select>
          </div>
          {authMode === "bearer" && (
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            />
          )}
          {authMode === "api-key" && (
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API key"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            />
          )}
          {authMode === "basic" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={basicUser}
                onChange={(e) => setBasicUser(e.target.value)}
                placeholder="Username"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={basicPass}
                onChange={(e) => setBasicPass(e.target.value)}
                placeholder="Password"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              />
            </div>
          )}
          {["POST", "PUT", "PATCH"].includes(method) && (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm"
            />
          )}
          <button
            onClick={() => void send()}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send Request"}
          </button>
        </div>
        <div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {status !== null && <span>Status: {status}</span>}
            {duration !== null && <span>Time: {duration}ms</span>}
          </div>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
            {response ?? "Response will appear here"}
          </pre>
          {history.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-zinc-500">Recent requests</div>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-zinc-400">
                {history.map((h) => (
                  <li key={h.id}>
                    {h.method} {h.path} · {h.status} · {h.duration}ms
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
