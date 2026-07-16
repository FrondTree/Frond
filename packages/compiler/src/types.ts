export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, Record<string, OpenAPIOperation>>;
  components?: { schemas?: Record<string, unknown> };
}

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
}

export interface CompiledPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  type: "guide" | "landing";
}

export interface CompiledEndpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  version_id: string;
  tags: string[];
  request?: unknown;
  responses?: unknown;
  examples?: unknown;
}

export interface CompiledManifest {
  title: string;
  versions: Array<{
    id: string;
    display_name: string;
    deprecated: boolean;
  }>;
  navigation: unknown;
  theme: unknown;
  playground?: unknown;
  pages: CompiledPage[];
  endpoints: CompiledEndpoint[];
  search_index: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    url: string;
  }>;
}
