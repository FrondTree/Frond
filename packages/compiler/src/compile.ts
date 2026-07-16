import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { DocsConfig } from "@frond/config";
import {
  extractEndpoints,
  openapiHash,
  parseOpenAPIFile,
} from "./openapi.js";
import type { CompiledManifest, CompiledPage } from "./types.js";

export async function compileGuidePage(
  filePath: string,
  rootDir: string,
): Promise<CompiledPage> {
  const raw = await readFile(filePath, "utf-8");
  const { data, content } = matter(raw);
  const title = (data.title as string) ?? path.basename(filePath, path.extname(filePath));
  const slug = path
    .basename(filePath, path.extname(filePath))
    .replace(/^index$/, "");

  return {
    id: slug || "index",
    title,
    slug: slug ? `/${slug}` : "/",
    content,
    type: slug === "" || slug === "index" ? "landing" : "guide",
  };
}

export async function compileProject(
  rootDir: string,
  docs: DocsConfig,
): Promise<{ manifest: CompiledManifest; openapiHash: string; bundleFiles: Map<string, string> }> {
  const pages: CompiledPage[] = [];
  const endpoints = [];
  let combinedOpenAPI = "";

  for (const item of docs.navigation) {
    if ("section" in item) {
      for (const page of item.contents) {
        const pagePath = path.resolve(rootDir, "docs", page.path);
        pages.push(await compileGuidePage(pagePath, rootDir));
      }
    }
  }

  for (const version of docs.versions) {
    const specPath = path.resolve(rootDir, "docs", version.path);
    const raw = await readFile(specPath, "utf-8");
    combinedOpenAPI += raw;
    const spec = await parseOpenAPIFile(specPath);
    endpoints.push(...extractEndpoints(spec, version.id));
  }

  const searchIndex = [
    ...pages.map((p) => ({
      id: `page-${p.id}`,
      type: "page",
      title: p.title,
      content: p.content.slice(0, 500),
      url: p.slug,
    })),
    ...endpoints.map((e) => ({
      id: `endpoint-${e.id}`,
      type: "endpoint",
      title: `${e.method} ${e.path}`,
      content: `${e.summary} ${e.description}`.trim(),
      url: `/api/${e.version_id}${e.path}`,
    })),
  ];

  const manifest: CompiledManifest = {
    title: docs.title,
    versions: docs.versions.map((v) => ({
      id: v.id,
      display_name: v["display-name"] ?? v.id,
      deprecated: v.deprecated ?? false,
    })),
    navigation: docs.navigation,
    theme: docs.theme ?? {},
    playground: docs.playground,
    pages,
    endpoints,
    search_index: searchIndex,
  };

  const bundleFiles = new Map<string, string>();
  bundleFiles.set("manifest.json", JSON.stringify(manifest, null, 2));

  return {
    manifest,
    openapiHash: openapiHash(combinedOpenAPI),
    bundleFiles,
  };
}
