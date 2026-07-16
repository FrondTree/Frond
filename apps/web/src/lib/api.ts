const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("frond_token");
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("frond_token");
  localStorage.removeItem("frond_selected_org");
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let code = "request_failed";
    let message = res.statusText || "Request failed";
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      code = body.error ?? code;
      message = body.message || message;
    } catch {
      /* ignore non-json */
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
}

export interface ConnectedRepo {
  id: string;
  full_name: string;
  name: string;
  scan_status: string;
  language: string;
  html_url: string;
  linked_project_id?: string;
}

export interface KGService {
  id: string;
  name: string;
  slug: string;
  description: string;
  language: string;
  framework: string;
  repository_name: string;
  html_url: string;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  label?: string;
}

export interface ArchitectureGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface HealthSnapshot {
  score: number;
  coverage_pct: number;
  api_total: number;
  api_documented: number;
  stale_pages: number;
  issues: Array<{ severity: string; message: string }>;
}

export interface DriftAlert {
  id: string;
  title: string;
  message: string;
  severity: string;
  pr_url: string;
  created_at: string;
}
