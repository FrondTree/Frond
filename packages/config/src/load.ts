import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  DocsConfigSchema,
  FrondConfigSchema,
  GeneratorsConfigSchema,
  type DocsConfig,
  type FrondConfig,
  type GeneratorsConfig,
} from "./schema.js";

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly file?: string,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

export async function loadFrondConfig(rootDir: string): Promise<FrondConfig> {
  const file = path.join(rootDir, "frond.config.json");
  let raw: string;
  try {
    raw = await readFile(file, "utf-8");
  } catch {
    throw new ConfigError(`Missing frond.config.json at ${file}`, file);
  }

  const parsed = JSON.parse(raw);
  const result = FrondConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(
      `Invalid frond.config.json: ${result.error.message}`,
      file,
    );
  }
  return result.data;
}

export async function loadDocsConfig(rootDir: string): Promise<DocsConfig> {
  const file = path.join(rootDir, "docs", "docs.yml");
  let raw: string;
  try {
    raw = await readFile(file, "utf-8");
  } catch {
    throw new ConfigError(`Missing docs/docs.yml at ${file}`, file);
  }

  const parsed = YAML.parse(raw);
  const result = DocsConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(`Invalid docs.yml: ${result.error.message}`, file);
  }
  return result.data;
}

export async function loadGeneratorsConfig(
  rootDir: string,
): Promise<GeneratorsConfig> {
  const file = path.join(rootDir, "generators.yml");
  let raw: string;
  try {
    raw = await readFile(file, "utf-8");
  } catch {
    throw new ConfigError(`Missing generators.yml at ${file}`, file);
  }

  const parsed = YAML.parse(raw);
  const result = GeneratorsConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(
      `Invalid generators.yml: ${result.error.message}`,
      file,
    );
  }
  return result.data;
}

export async function loadProjectConfig(rootDir: string) {
  const [frond, docs, generators] = await Promise.all([
    loadFrondConfig(rootDir),
    loadDocsConfig(rootDir),
    loadGeneratorsConfig(rootDir),
  ]);
  return { frond, docs, generators };
}

export const DEFAULT_FROND_CONFIG: FrondConfig = {
  organization: "my-org",
  project: "my-api",
  docs: { title: "My API" },
};

export const DEFAULT_DOCS_YML = `title: My API

versions:
  - id: v1
    display-name: v1
    path: ../openapi/v1/openapi.yaml

navigation:
  - section: Getting Started
    contents:
      - page: Welcome
        path: ./pages/index.mdx
      - page: Quickstart
        path: ./pages/quickstart.mdx
  - api: API Reference

theme:
  primary-color: "#6366f1"
  font: Inter

playground:
  base-url: https://api.example.com
  auth:
    type: bearer
    header: Authorization

search: true
`;

export const DEFAULT_GENERATORS_YML = `default-group: local

groups:
  local:
    generators:
      - name: frond/typescript-sdk
        version: latest
        output:
          location: local-file-system
          path: ../sdks/typescript
      - name: frond/python-sdk
        version: latest
        output:
          location: local-file-system
          path: ../sdks/python
`;

export const DEFAULT_OPENAPI = `openapi: 3.1.0
info:
  title: Example API
  version: 1.0.0
  description: Example API for Frond documentation
servers:
  - url: https://api.example.com
paths:
  /health:
    get:
      summary: Health check
      operationId: getHealth
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok
  /users:
    post:
      summary: Create user
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, name]
              properties:
                email:
                  type: string
                  format: email
                name:
                  type: string
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  email:
                    type: string
                  name:
                    type: string
`;

export const DEFAULT_INDEX_MDX = `---
title: Welcome
---

# Welcome to your API docs

Get started with the [Quickstart](/quickstart) guide.

## Overview

This documentation is powered by [Frond](https://frond.dev).
`;

export const DEFAULT_QUICKSTART_MDX = `---
title: Quickstart
---

# Quickstart

\`\`\`bash
curl https://api.example.com/health
\`\`\`
`;
