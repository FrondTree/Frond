import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { OpenAPIOperation, OpenAPISpec } from "./types.js";

export async function parseOpenAPIFile(filePath: string): Promise<OpenAPISpec> {
  const raw = await readFile(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();
  const spec =
    ext === ".json" ? JSON.parse(raw) : (YAML.parse(raw) as OpenAPISpec);

  if (!spec.paths) {
    throw new Error(`OpenAPI spec at ${filePath} has no paths defined`);
  }
  return spec;
}

export function extractEndpoints(
  spec: OpenAPISpec,
  versionId: string,
): Array<{
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
}> {
  const endpoints: ReturnType<typeof extractEndpoints> = [];
  const methods = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
  ] as const;

  for (const [routePath, item] of Object.entries(spec.paths ?? {})) {
    for (const method of methods) {
      const op = item[method] as OpenAPIOperation | undefined;
      if (!op) continue;

      const id = op.operationId ?? `${method}-${routePath}`.replace(/\//g, "-");
      endpoints.push({
        id,
        method: method.toUpperCase(),
        path: routePath,
        summary: op.summary ?? "",
        description: op.description ?? "",
        version_id: versionId,
        tags: op.tags ?? ["default"],
        request: op.requestBody,
        responses: op.responses,
        examples: buildExamples(op, spec),
      });
    }
  }

  return endpoints.sort((a, b) => a.path.localeCompare(b.path));
}

function buildExamples(op: OpenAPIOperation, spec: OpenAPISpec) {
  const examples: Record<string, unknown> = {};
  const responses = op.responses as
    | Record<string, { content?: Record<string, { example?: unknown }> }>
    | undefined;

  if (responses) {
    for (const [code, resp] of Object.entries(responses)) {
      const json = resp.content?.["application/json"];
      if (json?.example) {
        examples[code] = json.example;
      }
    }
  }

  return Object.keys(examples).length ? examples : undefined;
}

export function openapiHash(content: string): string {
  // Simple stable hash for change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
