# Migrate from Fern to Frond

Frond is designed as a Fern-compatible docs workflow: config-as-code, OpenAPI reference, SDK generation, and CI publish. This guide covers moving an existing `fern/` project to Frond.

## 1. Install the CLI

```bash
pnpm add -Dw @frond/cli
# or
npm install -g @frond/cli
```

Authenticate against your Frond API:

```bash
export FROND_API_URL=https://api.frond.dev   # or http://localhost:8080
export FROND_API_KEY=frond_...               # from dashboard → API keys
frond login   # optional interactive JWT flow
```

## 2. Map Fern folders → Frond

| Fern | Frond |
|------|--------|
| `fern/fern.config.json` | `frond.yml` (project root) |
| `fern/docs.yml` | `frond.yml` → `docs:` section |
| `fern/definition/` or OpenAPI | `openapi/` or `apis/*.yaml` |
| `fern/generators.yml` | `frond generate` + `packages/sdk-generator` |
| GitHub Action with Fern CLI | `.github/workflows/publish-docs.example.yml` |

Scaffold a Frond project next to your Fern config:

```bash
frond init
# copies OpenAPI paths and creates docs/ with MDX guides
```

## 3. Convert docs config

Minimal Fern → Frond mapping:

```yaml
# fern/docs.yml (conceptually)
title: Acme API
navigation:
  - section: Guides
    contents:
      - page: Quickstart
        path: ./pages/quickstart.mdx

# frond.yml
name: acme-api
docs:
  title: Acme API
  instances:
    - url: docs.acme.com
      custom-domain: true
  navigation:
    - page: Quickstart
      path: docs/quickstart.mdx
  playground:
    base-url: https://api.acme.com
    environments:
      - name: Production
        url: https://api.acme.com
      - name: Staging
        url: https://staging.api.acme.com
```

Guide pages can stay Markdown/MDX. Frond’s docs renderer supports Markdown plus MDX-ish helpers (`<Callout>`, `<Tabs>`).

## 4. OpenAPI & versions

Point `frond.yml` at your existing OpenAPI (or Fern-generated OpenAPI export):

```yaml
apis:
  - name: api
    path: openapi/openapi.yaml
    version: v1
```

Publish versions with:

```bash
frond docs build
frond docs publish --project-id <uuid>
```

Local preview with hot reload:

```bash
frond docs dev
```

## 5. SDK generation

Replace Fern generators with:

```bash
frond generate --lang typescript --out sdks/ts
frond generate --lang python --out sdks/python
```

The generator parses OpenAPI paths/operations into typed client stubs.

## 6. CI

Copy `.github/workflows/publish-docs.example.yml` and set repository secrets:

- `FROND_API_URL`
- `FROND_API_KEY`
- `FROND_PROJECT_ID`

The CLI reads `FROND_API_KEY` / `FROND_TOKEN` from the environment automatically.

## 7. Private docs & hosting

- Set project visibility to `private` in the dashboard or API.
- Consumers pass `Authorization: Bearer <jwt>` or `X-Frond-Api-Key: frond_...`.
- Published URL is `{DOCS_PUBLIC_URL}/{org}/{project}` (local default `http://localhost:3001/...`).
- Custom domains: Dashboard → Settings → Custom domain, then CNAME to `cname.frond.dev`.

## 8. Checklist

- [ ] `frond.yml` created; Fern `docs.yml` content migrated
- [ ] OpenAPI path wired; `frond validate` passes
- [ ] Guides moved under `docs/` (`.md` / `.mdx`)
- [ ] Playground environments configured
- [ ] CI publish uses `FROND_API_KEY`
- [ ] Custom domain / private auth verified if needed

## Differences vs Fern

| Area | Frond today |
|------|-------------|
| Docs hosting | Local `apps/docs` + publish URL; CDN productization later |
| Generators | TypeScript / Python OpenAPI clients |
| Living docs | Phase 2 GitHub scan + PR drift comments |
| Search | Meilisearch when configured; SQL fallback |
