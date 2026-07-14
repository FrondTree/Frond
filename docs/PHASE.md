# Frond — Phased Product Design

**Strategy:** Ship a better Fern first. Add intelligence second. Add conversations third.  
**Last Updated:** July 14, 2026

| Document | Role |
|----------|------|
| [PRD.md](./PRD.md) | What we're building and why |
| [PHASE.md](./PHASE.md) | **Detailed phase design** — scope, architecture, milestones per phase |
| [ROADMAP.md](./ROADMAP.md) | Full feature catalog and competitive landscape |

---

## Phasing Philosophy

```
Phase 1          Phase 2              Phase 3
────────         ────────             ────────
Better Fern  →   Automatic Intel  →   Conversations
(manual)         (from repos)         (Slack + meetings)
```

| Principle | Explanation |
|-----------|-------------|
| **Docs first** | Users adopt Atlas the same way they adopt Fern — config in repo, CLI, publish. No GitHub scanning required to get value. |
| **Manual → Automatic** | Phase 1 is author-driven. Phase 2 layers automation on top of the same doc model. |
| **Graph grows over time** | Knowledge graph is minimal in Phase 1, expands in Phase 2 (code), Phase 3 (people + decisions). |
| **Each phase is shippable** | Every phase can stand alone as a product teams would pay for. |

### Phase Summary

| Phase | Duration | One-liner | Primary User |
|-------|----------|-----------|--------------|
| **Phase 1** | 3 months | Fern, but better — config-as-code docs platform | API / platform engineers authoring docs |
| **Phase 2** | 3 months | Connect repos — auto-discover services, APIs, architecture | Engineering leads, new hires onboarding |
| **Phase 3** | 3 months | Capture Slack + meetings into the knowledge graph | Whole engineering org |

---

# Phase 1 — Better Fern Documentation Platform

## 1.1 Goal

Build a **developer documentation platform** that matches Fern's authoring workflow but delivers a superior experience in design, DX, playground, search, and flexibility.

**Phase 1 success statement:**

> A team can migrate from Fern to Atlas in an afternoon, publish the same API docs, and immediately notice the product is faster, prettier, and easier to work with.

### What Phase 1 Is

- Config-as-code documentation (files in your repo)
- CLI for local preview and publish
- OpenAPI → beautiful API reference
- Markdown guides and tutorials
- Interactive API playground
- SDK generation
- Versioned docs
- Custom branding / themes

### What Phase 1 Is NOT

- No automatic repo scanning
- No architecture graph auto-generation
- No Slack or meeting integrations
- No knowledge graph (beyond basic doc navigation)
- No AI context engine
- No "living docs" auto-update from PRs

---

## 1.2 How Fern Works Today (Baseline)

Understanding Fern's workflow defines our Phase 1 parity target.

### Fern Author Workflow

```
1. npm install -g fern-api
2. fern init                          → creates fern/ folder
3. Add OpenAPI spec or Fern API Definition
4. Configure docs.yml + fern.config.json
5. fern docs dev                      → local preview
6. fern generate                      → SDKs
7. Push → CI publishes docs site
```

### Fern Project Structure

```
my-api/
├── fern/
│   ├── fern.config.json      # org name, docs domain
│   ├── generators.yml        # SDK targets (TypeScript, Python, etc.)
│   ├── openapi/
│   │   └── api.yaml
│   └── docs/
│       ├── docs.yml          # navigation, layout, branding
│       └── pages/
│           ├── welcome.mdx
│           └── authentication.mdx
└── .github/workflows/
    └── publish-docs.yml
```

### Fern Strengths We Must Match

| Capability | Fern | Atlas Phase 1 Target |
|------------|------|----------------------|
| Config in repo | ✅ | ✅ `atlas/` folder |
| OpenAPI input | ✅ | ✅ + better error messages |
| Local dev server | ✅ `fern docs dev` | ✅ `atlas docs dev` |
| API reference pages | ✅ | ✅ + improved layout |
| SDK generation | ✅ | ✅ TypeScript + Python first |
| Custom pages (MDX) | ✅ | ✅ Markdown + MDX |
| Versioned APIs | ✅ | ✅ |
| Hosted docs site | ✅ | ✅ `*.atlas.dev` or custom domain |
| CI/CD publish | ✅ | ✅ GitHub Action |

### Where We Beat Fern (Phase 1 Differentiators)

| Area | Fern | Atlas (Better) |
|------|------|----------------|
| **Playground** | Basic try-it | Full playground with auth presets, env switching, request history |
| **Search** | Limited | Instant full-text search across all pages + endpoints |
| **Themes** | Few presets | Rich theme editor + dark mode + custom CSS |
| **DX** | Good CLI | Faster CLI, better errors, `atlas doctor` health check |
| **Diff view** | Manual | Built-in API version diff viewer |
| **Guides** | MDX only | MDX + built-in tutorial templates |
| **Performance** | Adequate | Edge-deployed, sub-100ms page loads |
| **Pricing** | Paid | Generous free tier for open source |

---

## 1.3 Phase 1 User Stories

### Author (Primary)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P1-A1 | As an API author, I want to define my API in OpenAPI and get a docs site | Drop `openapi.yaml` in `atlas/`, run `atlas docs dev`, see rendered reference |
| P1-A2 | As an author, I want to add guide pages alongside API reference | Add `.mdx` files, configure nav in `docs.yml`, pages appear in sidebar |
| P1-A3 | As an author, I want to preview locally before publishing | `atlas docs dev` hot-reloads on file change |
| P1-A4 | As an author, I want to publish on every merge to main | GitHub Action runs `atlas docs publish`, site updates in < 2 min |
| P1-A5 | As an author, I want to version my API docs | `atlas/docs.yml` supports `versions: [v1, v2]`, version switcher in UI |
| P1-A6 | As an author, I want SDKs generated from my API | `atlas generate --group ts-sdk` outputs TypeScript client |
| P1-A7 | As an author, I want custom branding | Logo, colors, fonts configurable in `docs.yml` |

### Consumer (Secondary)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P1-C1 | As a developer reading docs, I want to try API endpoints in-browser | Playground sends real requests with configurable base URL + auth |
| P1-C2 | As a developer, I want to search across all documentation | Cmd+K search returns pages and endpoints in < 200ms |
| P1-C3 | As a developer, I want to see request/response examples per endpoint | Auto-generated examples from OpenAPI schemas |
| P1-C4 | As a developer, I want to compare API versions | Version diff page shows added/removed/changed endpoints |

### Admin

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P1-M1 | As a team admin, I want to create an organization | Sign up, create org, invite members |
| P1-M2 | As a team admin, I want custom domain for docs | `docs.mycompany.com` CNAME setup |
| P1-M3 | As a team admin, I want public vs private docs | Private docs require login |

---

## 1.4 Phase 1 Project Structure (Atlas Config)

We mirror Fern's familiarity but use the `atlas/` namespace.

```
my-api/
├── atlas/
│   ├── atlas.config.json         # org, project name, docs URL
│   ├── generators.yml            # SDK generator config
│   ├── openapi/
│   │   ├── v1/
│   │   │   └── openapi.yaml
│   │   └── v2/
│   │       └── openapi.yaml
│   └── docs/
│       ├── docs.yml              # navigation, theme, versions
│       └── pages/
│           ├── index.mdx         # landing page
│           ├── quickstart.mdx
│           └── authentication.mdx
├── .github/
│   └── workflows/
│       └── atlas-docs.yml
└── package.json                  # optional: atlas as devDependency
```

### `atlas.config.json`

```json
{
  "organization": "acme",
  "project": "payments-api",
  "docs": {
    "title": "Payments API",
    "url": "https://payments.docs.acme.com"
  }
}
```

### `docs/docs.yml`

```yaml
instances:
  - url: payments.docs.acme.com
    custom-domain: true

title: Payments API
logo:
  light: ./assets/logo-light.svg
  dark: ./assets/logo-dark.svg

versions:
  - id: v2
    display-name: v2 (latest)
    path: ../openapi/v2/openapi.yaml
  - id: v1
    display-name: v1
    path: ../openapi/v1/openapi.yaml
    deprecated: true

navigation:
  - section: Getting Started
    contents:
      - page: Welcome
        path: ./pages/index.mdx
      - page: Quickstart
        path: ./pages/quickstart.mdx
      - page: Authentication
        path: ./pages/authentication.mdx
  - api: API Reference

theme:
  primary-color: "#6366f1"
  font: "Inter"
  code-theme: "github-dark"

playground:
  base-url: https://api.acme.com
  environments:
    - name: Production
      url: https://api.acme.com
    - name: Sandbox
      url: https://sandbox.api.acme.com
  auth:
    type: bearer
    header: Authorization

search: true
analytics: true
```

### `generators.yml`

```yaml
default-group: local

groups:
  local:
    generators:
      - name: atlasapi/typescript-sdk
        version: latest
        output:
          location: local-file-system
          path: ../sdks/typescript
      - name: atlasapi/python-sdk
        version: latest
        output:
          location: local-file-system
          path: ../sdks/python
```

---

## 1.5 Phase 1 CLI Design

### Commands

| Command | Description | Fern Equivalent |
|---------|-------------|-----------------|
| `atlas init` | Scaffold `atlas/` folder in current repo | `fern init` |
| `atlas docs dev` | Start local docs server with hot reload | `fern docs dev` |
| `atlas docs build` | Build static docs site | `fern docs build` |
| `atlas docs publish` | Publish to Atlas hosting | `fern publish` |
| `atlas generate` | Generate SDKs from OpenAPI | `fern generate` |
| `atlas validate` | Validate config + OpenAPI | `fern check` |
| `atlas doctor` | Diagnose config issues | *(new)* |
| `atlas diff` | Compare two API versions | *(new)* |
| `atlas login` | Authenticate with Atlas cloud | `fern login` |

### CLI UX Principles

```
$ atlas docs dev

  Atlas Docs Dev Server
  ─────────────────────
  ✓ Parsed openapi/v2/openapi.yaml (24 endpoints)
  ✓ Loaded 3 guide pages
  ✓ Theme: Inter / #6366f1

  → Local:   http://localhost:3000
  → Network: http://192.168.1.5:3000

  Watching for changes...
```

```
$ atlas doctor

  Atlas Health Check
  ──────────────────
  ✓ atlas.config.json valid
  ✓ docs/docs.yml valid
  ✗ openapi/v2/openapi.yaml: missing response schema on POST /refunds (line 142)
  ✓ generators.yml valid
  ⚠ docs/pages/quickstart.mdx: broken link to /old-page

  1 error, 1 warning — fix before publishing
```

---

## 1.6 Phase 1 Documentation Site Design

### Information Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Payments API          [v2 ▼]  [Search ⌘K]  [GitHub]   │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  SIDEBAR     │  CONTENT AREA                                    │
│              │                                                  │
│  Getting     │  ┌────────────────────────────────────────────┐  │
│   Started    │  │  POST /checkout                            │  │
│   ├ Welcome  │  │  Create a checkout session                 │  │
│   ├ Quickstart│  ├────────────────────────────────────────────┤  │
│   └ Auth     │  │  [Playground]  [Examples]  [SDK]           │  │
│              │  │                                            │  │
│  API Ref     │  │  Request          │  Response              │  │
│   ├ Checkout │  │  { amount, ... }  │  { session_id, ... }   │  │
│   ├ Refunds  │  │                                            │  │
│   └ Webhooks │  │  ┌─ Try it ─────────────────────────────┐  │  │
│              │  │  │ POST https://api.acme.com/checkout    │  │  │
│              │  │  │ [Send Request]                        │  │  │
│              │  │  └──────────────────────────────────────┘  │  │
│              │  └────────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Page Types

| Page Type | Source | Renderer |
|-----------|--------|----------|
| **Landing** | `pages/index.mdx` | MDX + hero layout |
| **Guide** | `pages/*.mdx` | MDX with code blocks, callouts, tabs |
| **API Endpoint** | OpenAPI paths | Auto-generated from spec |
| **API Schema** | OpenAPI components | Auto-generated model pages |
| **Version Diff** | Two OpenAPI files | Custom diff renderer |
| **Changelog** | `pages/changelog.mdx` or auto | MDX or generated |

### API Reference Page Components

Each endpoint page includes:

1. **Header** — method badge, path, summary, description
2. **Parameters** — path, query, header params with types
3. **Request Body** — schema tree with expandable types
4. **Responses** — per status code with schema
5. **Examples** — auto-generated JSON examples
6. **Code Snippets** — cURL, TypeScript, Python tabs
7. **Playground** — interactive try-it panel
8. **SDK Link** — jump to generated SDK method

### Playground Design

```
┌─ API Playground ──────────────────────────────────────────────┐
│ Environment: [Sandbox ▼]     Auth: [Bearer Token ________]    │
│                                                                │
│ POST  /v2/checkout                                             │
│                                                                │
│ Request Body:                    │ Response:                   │
│ ┌────────────────────────────┐   │ ┌────────────────────────┐ │
│ │ {                          │   │ │ 201 Created            │ │
│ │   "amount": 1000,          │   │ │ {                      │ │
│ │   "currency": "usd"        │   │ │   "session_id": "cs_…" │ │
│ │ }                          │   │ │ }                      │ │
│ └────────────────────────────┘   │ └────────────────────────┘ │
│                                                                │
│ [Send Request]                    Status: 201  Time: 142ms    │
│                                                                │
│ History: POST /checkout (2m ago) · GET /sessions (5m ago)     │
└────────────────────────────────────────────────────────────────┘
```

---

## 1.7 Phase 1 System Architecture

### High-Level

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Developer's│     │  Atlas CLI  │     │ Atlas Cloud │
│  Repo       │────▶│  (local)    │────▶│  (hosted)   │
│  atlas/     │     └─────────────┘     └──────┬──────┘
└─────────────┘                                │
                                               ▼
                                    ┌─────────────────────┐
                                    │  Docs Web App       │
                                    │  (Next.js, edge)    │
                                    └─────────────────────┘
```

### Services (Phase 1 Only)

| Service | Responsibility | Tech |
|---------|----------------|------|
| **Atlas CLI** | Init, validate, dev server, publish, generate | Node.js / Go |
| **Config Parser** | Parse `atlas.config.json`, `docs.yml`, OpenAPI | TypeScript |
| **Docs Compiler** | OpenAPI → page model, MDX → HTML | TypeScript |
| **Docs Renderer** | Web app serving compiled docs | Next.js |
| **SDK Generator** | OpenAPI → TypeScript/Python clients | OpenAPI Generator fork |
| **Hosting Service** | Deploy, CDN, custom domains | Cloudflare / Vercel |
| **Auth Service** | Org, users, API keys, private docs | PostgreSQL + OAuth |
| **Search Indexer** | Index pages + endpoints on publish | Meilisearch |

### Data Model (Phase 1)

```
Organization
  ├── id, name, slug, plan
  │
  ├── Project
  │     ├── id, name, slug
  │     ├── config (atlas.config.json parsed)
  │     │
  │     ├── DocVersion
  │     │     ├── id, label, openapi_hash
  │     │     ├── pages[] (compiled)
  │     │     └── published_at
  │     │
  │     └── Deployment
  │           ├── url, custom_domain, status
  │
  └── Member
        ├── user_id, role (admin, editor, viewer)
```

No knowledge graph yet. Relationships are flat: Org → Project → Version → Pages.

### Publish Pipeline

```
git push main
     │
     ▼
GitHub Action: atlas docs publish
     │
     ├─ 1. Validate config (atlas validate)
     ├─ 2. Parse OpenAPI → endpoint pages
     ├─ 3. Compile MDX guide pages
     ├─ 4. Build static site + SSR routes
     ├─ 5. Index search (Meilisearch)
     ├─ 6. Upload to CDN
     └─ 7. Update deployment record
           │
           ▼
     https://payments.docs.acme.com (live)
```

---

## 1.8 Phase 1 Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| CLI | Node.js (TypeScript) | Same ecosystem as frontend, fast iteration |
| Docs site | Next.js 15 (App Router) | SSR, edge, great DX |
| Styling | Tailwind CSS | Fern-like clean aesthetic |
| MDX | MDX 3 + custom components | `<Callout>`, `<Tabs>`, `<CodeGroup>` |
| OpenAPI parser | `@readme/openapi-parser` or custom | Battle-tested |
| Search | Meilisearch | Fast, simple, self-hostable |
| Database | PostgreSQL | Orgs, projects, deployments |
| Auth | GitHub OAuth + email | Devs already have GitHub |
| Hosting | Cloudflare Pages / Workers | Edge performance |
| SDK gen | openapi-generator + custom templates | Proven output |

---

## 1.9 Phase 1 Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1–2 | **Scaffold** | Monorepo, CLI `atlas init`, config parser |
| 3–4 | **OpenAPI Renderer** | Parse OpenAPI → endpoint pages in dev server |
| 5–6 | **MDX Guides** | Guide pages, navigation, sidebar |
| 7–8 | **Playground** | Interactive try-it with env + auth |
| 9–10 | **Cloud Publish** | Auth, orgs, `atlas docs publish`, hosting |
| 11 | **SDK Generation** | TypeScript + Python SDK output |
| 12 | **Polish + Beta** | Search, version diff, themes, GitHub Action, beta launch |

### Phase 1 Exit Criteria

- [ ] `atlas init` → `atlas docs dev` → working local docs in < 5 minutes
- [ ] OpenAPI spec with 20+ endpoints renders correctly
- [ ] Playground sends real API requests
- [ ] `atlas docs publish` deploys to `*.atlas.dev`
- [ ] Custom domain works
- [ ] Version switcher between v1 and v2
- [ ] `atlas generate` produces TypeScript SDK
- [ ] `atlas diff` shows API changes between versions
- [ ] Cmd+K search works across all content
- [ ] A Fern user can migrate their `fern/` folder to `atlas/` with a migration guide

---

## 1.10 Phase 1 Monetization

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | 1 project, public docs, `*.atlas.dev` domain, community support |
| **Pro** | $20/user/month | Unlimited projects, private docs, custom domain, analytics, version history |
| **Team** | Custom | SSO (later), priority support |

Phase 1 revenue comes from **being a better Fern** — no intelligence features required to sell.

---

# Phase 2 — Repository Intelligence (Automatic)

## 2.1 Goal

Layer **automatic understanding** on top of the Phase 1 docs platform. Connect GitHub repos and let Atlas discover services, APIs, dependencies, and architecture — then link them to existing documentation.

**Phase 2 success statement:**

> Connect your GitHub org and Atlas automatically maps your microservices, links them to API docs, and shows a live architecture diagram — without writing a single config file.

### What Phase 2 Adds

- GitHub / GitLab / Bitbucket integration
- Automatic repo scanning and service discovery
- AST-based code understanding
- Auto-generated architecture graph
- Dependency explorer
- Living documentation (detect API drift from code)
- Knowledge graph (repos, services, APIs, docs)
- ADR detection and linking
- Documentation health dashboard

### What Phase 2 Is NOT

- No Slack integration
- No meeting capture
- No AI context engine for IDEs
- No plugin marketplace

### Dependency on Phase 1

Phase 2 **extends** Phase 1 — it does not replace it.

```
Phase 1 (manual)              Phase 2 (automatic)
────────────────              ────────────────────
Author writes OpenAPI    +    Scanner finds OpenAPI in repo
Author writes guides     +    Scanner finds README, ADRs
Author publishes docs    +    System links docs ↔ code ↔ services
```

Users who only want "better Fern" never need to connect GitHub. Users who connect GitHub get the intelligence layer for free.

---

## 2.2 Phase 2 User Stories

### Engineering Lead

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P2-L1 | As a lead, I want to connect my GitHub org and see all services | OAuth connect → service list within 10 min for < 50 repos |
| P2-L2 | As a lead, I want an architecture diagram of our system | Auto-generated graph from repo analysis, clickable nodes |
| P2-L3 | As a lead, I want to know which APIs have no documentation | Health dashboard shows coverage gaps |
| P2-L4 | As a lead, I want to see who owns each service | OWNER metadata from CODEOWNERS or package.json |

### Developer

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P2-D1 | As a dev, I want Atlas to find OpenAPI specs in my repos | Scanner detects `openapi.yaml`, `swagger.json` etc. |
| P2-D2 | As a dev, I want docs to flag when my API code diverges from docs | PR changes endpoint → Atlas shows "docs outdated" warning |
| P2-D3 | As a dev, I want to explore what a service depends on | Dependency graph shows packages, services, databases |
| P2-D4 | As a dev, I want to search across code and docs together | Unified search returns endpoints, files, and guide pages |

### Onboarding

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P2-O1 | As a new hire, I want to understand the system architecture | Architecture explorer with service descriptions |
| P2-O2 | As a new hire, I want to find ADRs for past decisions | ADRs auto-detected from `docs/adr/` or `adr-*.md` |

---

## 2.3 Phase 2 Architecture

### New Services

```
Phase 1 Services (unchanged)
        │
        ▼
┌───────────────────────────────────────────────────┐
│              Phase 2 Additions                     │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐               │
│  │  Ingestion   │  │   Parser     │               │
│  │  Service     │──│   Engine     │               │
│  │  (Git webhooks│  │ (Tree-sitter)│               │
│  │   + polling) │  └──────┬───────┘               │
│  └──────────────┘         │                        │
│                           ▼                        │
│                  ┌──────────────┐                    │
│                  │  Knowledge   │                    │
│                  │  Graph       │                    │
│                  │  Engine      │                    │
│                  └──────┬───────┘                    │
│                         │                          │
│            ┌────────────┼────────────┐             │
│            ▼            ▼            ▼             │
│     Architecture  Dependency   Health              │
│     Explorer      Explorer     Dashboard           │
└───────────────────────────────────────────────────┘
```

### Ingestion Pipeline

```
GitHub Webhook (push, PR)
        │
        ▼
Ingestion Service
        │
        ├─ Clone / fetch changed files
        ├─ Detect file types (OpenAPI, source, ADR, Dockerfile, etc.)
        │
        ▼
Parser Engine
        │
        ├─ OpenAPI Parser     → API entities
        ├─ Tree-sitter AST    → Service structure, exports, imports
        ├─ Dependency Parser  → package.json, go.mod, Cargo.toml
        ├─ ADR Parser         → Markdown ADR files
        ├─ CODEOWNERS Parser  → ownership mapping
        │
        ▼
Knowledge Graph Engine
        │
        ├─ Create/update entities
        ├─ Create relationships
        ├─ Link to existing Phase 1 docs (if project matched)
        └─ Trigger re-index for search
```

### Knowledge Graph Schema (Phase 2)

**Entities:**

| Entity | Source | Example |
|--------|--------|---------|
| `Repository` | GitHub | `acme/payment-service` |
| `Service` | AST + directory structure | `Payment Service` |
| `API` | OpenAPI | `POST /v2/checkout` |
| `Dependency` | package files | `stripe@12.0.0` |
| `ADR` | Markdown files | `ADR-012: JWT Auth` |
| `Person` | CODEOWNERS, git blame | `Jane Smith` |
| `Document` | Phase 1 docs | `Authentication Guide` |

**Relationships:**

```
(Repository)  -[:CONTAINS]->  (Service)
(Service)     -[:EXPOSES]->    (API)
(Service)     -[:USES]->       (Dependency)
(Service)     -[:OWNS]->       (Person)
(Service)     -[:DOCUMENTED_IN]-> (Document)
(ADR)         -[:RELATES_TO]-> (Service)
(API)         -[:DEFINED_IN]-> (Repository)
```

### Service Discovery Logic

```
Repository: acme/payment-service
        │
        ├─ Has openapi.yaml?        → Extract APIs
        ├─ Has package.json?        → Name, dependencies
        ├─ Has src/ structure?      → Infer service boundaries
        ├─ Has Dockerfile?          → Detect runtime (Node, Go, etc.)
        ├─ Has CODEOWNERS?          → Map owners
        ├─ Has docs/adr/?           → Link ADRs
        │
        ▼
Service Entity:
  name: payment-service
  language: TypeScript
  framework: Express
  apis: [POST /checkout, GET /sessions, ...]
  dependencies: [stripe, redis, pg]
  owners: [@payments-team]
  linked_docs: payments-api (Phase 1 project)
```

---

## 2.4 Phase 2 Feature Designs

### 2.4.1 Architecture Explorer

Interactive graph built from discovered services.

```
                    ┌──────────┐
                    │   User   │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ Frontend │ ← click → repo, owners, APIs
                    └────┬─────┘
                         │
                   ┌─────▼─────┐
                   │ API Gateway│
                   └─────┬─────┘
              ┌──────────┼──────────┐
              │                     │
        ┌─────▼─────┐        ┌─────▼─────┐
        │   Auth    │        │  Payment  │ ← click → full detail panel
        │  Service  │        │  Service  │
        └─────┬─────┘        └─────┬─────┘
              │                     │
        ┌─────▼─────┐        ┌─────▼─────┐
        │ PostgreSQL│        │   Stripe  │
        └───────────┘        └───────────┘
```

**Node detail panel:**

| Field | Source |
|-------|--------|
| Description | README.md or auto-generated |
| Owner | CODEOWNERS |
| Repository | GitHub link |
| APIs | OpenAPI or route scanning |
| Dependencies | package.json / go.mod |
| Docs link | Phase 1 project (if linked) |
| Recent PRs | GitHub API |
| ADRs | Linked ADR entities |

**Tech:** React Flow + auto-layout (dagre)

### 2.4.2 Living Documentation

Detect when code changes but docs don't.

```
Developer opens PR:
  Changed: src/routes/checkout.ts
  Added field: refund_status

Atlas (on PR webhook):
  1. Detect API change in code
  2. Compare with published OpenAPI docs
  3. Post PR comment:

     ⚠ Atlas: Documentation drift detected
     POST /checkout — new field `refund_status` not in OpenAPI spec
     [Update docs →]
```

**Change detection sources:**

| Source | Detects |
|--------|---------|
| OpenAPI file diff | Spec-level changes |
| Route file AST diff | New endpoints, changed params |
| DB migration files | Schema changes |
| Phase 1 docs diff | Manual doc edits |

### 2.4.3 Dependency Explorer

```
payment-service
  ├── npm: stripe@12.0.0
  ├── npm: express@4.18.0
  ├── service: auth-service (internal)
  ├── database: payments-db (PostgreSQL)
  └── cache: redis (internal)
```

**Views:**
- Tree view (default)
- Graph view (force-directed)
- Table view (sortable, filterable)

**Use cases:** onboarding, incident blast radius, security audit

### 2.4.4 Documentation Health Dashboard

```
┌─ Documentation Health ──────────────────────────────────┐
│                                                          │
│  Overall Score: 78%                                      │
│  ████████████████████░░░░░                               │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ Coverage   │  │ Freshness  │  │ Usage      │         │
│  │ 85%        │  │ 3mo ago    │  │ 1.2k views │         │
│  │ 3 APIs     │  │ 5 stale    │  │ /week      │         │
│  │ undocumented│  │ pages      │  │            │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│                                                          │
│  Issues:                                                 │
│  ⚠ payment-service: POST /refund not documented         │
│  ⚠ auth-guide: last updated 6 months ago                │
│  ✗ webhook-docs: example returns 404                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.4.5 Unified Search (Phase 2 Upgrade)

Phase 1 search covers docs only. Phase 2 expands:

| Source | Example Result |
|--------|----------------|
| API docs | `POST /checkout` — Payments API |
| Source code | `src/routes/checkout.ts` |
| ADR | `ADR-012: JWT Authentication` |
| Service | `payment-service` — Payments Team |
| Guide page | `Authentication Guide` |

Search engine: Meilisearch (keyword) + pgvector (semantic, optional in Phase 2)

---

## 2.5 Phase 2 GitHub Integration Design

### Connection Flow

```
1. User clicks "Connect GitHub" in Atlas dashboard
2. GitHub App OAuth → select org/repos
3. Atlas installs GitHub App on selected repos
4. Initial scan queued (background job)
5. Progress shown: "Scanning 23 repos..."
6. Results appear in Architecture Explorer
```

### GitHub App Permissions

| Permission | Reason |
|------------|--------|
| `contents: read` | Read repo files for scanning |
| `metadata: read` | Repo names, descriptions |
| `pull_requests: read` | PR comments for drift detection |
| `members: read` | Team/owner mapping |

### Webhook Events

| Event | Action |
|-------|--------|
| `push` | Re-scan changed files |
| `pull_request.opened` | Drift detection |
| `pull_request.merged` | Update knowledge graph |
| `repository.created` | Add to scan queue |

---

## 2.6 Phase 2 Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 13–14 | **GitHub Connect** | OAuth, GitHub App, repo selection |
| 15–16 | **Repo Scanner** | File detection, OpenAPI extraction, basic service discovery |
| 17–18 | **Knowledge Graph** | Entity storage, relationships, link to Phase 1 docs |
| 19–20 | **Architecture Explorer** | React Flow graph, node detail panels |
| 21–22 | **Living Docs + Health** | PR drift detection, health dashboard |
| 23–24 | **Dependency Explorer + Search** | Dependency graph, unified search, GitLab support |

### Phase 2 Exit Criteria

- [ ] Connect GitHub org with 20+ repos, scan completes in < 15 min
- [ ] Architecture graph shows services with correct relationships
- [ ] Clicking a service shows owner, APIs, deps, linked docs
- [ ] PR changing an API endpoint triggers drift warning
- [ ] Health dashboard shows coverage and freshness scores
- [ ] Search returns results across docs, code, ADRs, and services
- [ ] ADRs auto-detected and linked to relevant services

---

# Phase 3 — Slack & Meeting Knowledge Capture

## 3.1 Goal

Capture **tribal knowledge** from where engineers actually communicate — Slack threads and meetings — and permanently link it to the knowledge graph built in Phase 2.

**Phase 3 success statement:**

> An architecture decision made in a Slack thread or Zoom call is automatically captured, summarized, and linked to the relevant services — searchable forever, never lost.

### What Phase 3 Adds

- Slack bot (`/atlas save`, `/atlas explain`, auto-suggest)
- Google Meet + Zoom meeting capture
- Conversation → knowledge entry pipeline
- Meeting artifact generation (summary, decisions, tasks)
- Full unified knowledge graph (docs + code + conversations)
- People and team entities enriched
- AI-assisted summarization of conversations

### What Phase 3 Is NOT

- No IDE plugins (Phase 4)
- No plugin marketplace (Phase 4)
- No cloud infra integrations (Phase 4)
- No full AI context engine (Phase 4)

### Dependency on Phase 1 + 2

```
Phase 1: Docs exist         → Slack entries link to doc pages
Phase 2: Services discovered → Slack entries link to services
Phase 3: Conversations captured → Graph connects people + decisions
```

---

## 3.2 Phase 3 User Stories

### Slack User

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P3-S1 | As an engineer, I want to save a Slack thread as knowledge | `/atlas save` creates entry with title, summary, participants |
| P3-S2 | As an engineer, I want Atlas to suggest saving important threads | Bot detects decision keywords, posts "Save to Atlas?" |
| P3-S3 | As an engineer, I want to query a service from Slack | `/atlas explain payment-service` returns owner, APIs, deps |
| P3-S4 | As an engineer, I want saved knowledge linked to services | Entry auto-links to services mentioned in thread |

### Meeting Participant

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P3-M1 | As a participant, I want meeting decisions captured automatically | Zoom/Meet transcript → decisions extracted |
| P3-M2 | As a lead, I want architecture review meetings to update the graph | Decisions like "move payments to separate service" create graph edges |
| P3-M3 | As a participant, I want action items from meetings tracked | Tasks extracted with assignees and linked to services |

### Search User

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P3-Q1 | As a developer, I want to search "why JWT" and find the Slack thread where it was decided | Unified search returns Slack threads, ADRs, meetings, docs |
| P3-Q2 | As a developer, I want to see all knowledge about a service | Service page shows docs + code + Slack + meetings + ADRs |

---

## 3.3 Phase 3 Architecture

### New Components

```
Phase 1 + 2 (unchanged)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│              Phase 3 Additions                         │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Slack Bot   │  │  Meeting     │  │  NLP /     │  │
│  │  Service     │  │  Ingestion   │  │  Summary   │  │
│  │              │  │  Service     │  │  Engine    │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                 │        │
│         └─────────────────┼─────────────────┘        │
│                           ▼                          │
│                  ┌──────────────┐                     │
│                  │  Knowledge   │                     │
│                  │  Graph       │ (expanded)          │
│                  │  Engine      │                     │
│                  └──────────────┘                     │
└───────────────────────────────────────────────────────┘
```

### New Graph Entities (Phase 3)

| Entity | Source | Example |
|--------|--------|---------|
| `SlackThread` | Slack API | `#engineering thread Jul 12` |
| `Meeting` | Zoom/Meet API | `Architecture Review — Jul 10` |
| `Decision` | NLP extraction | `Migrate from REST to GraphQL` |
| `Task` | NLP extraction | `Jane: migrate payment DB by Q3` |
| `Conversation` | Generic parent | Wraps thread or meeting |

**New relationships:**

```
(SlackThread)  -[:DISCUSSES]->  (Service)
(SlackThread)  -[:DECIDES]->    (Decision)
(SlackThread)  -[:PARTICIPANT]-> (Person)
(Meeting)      -[:PRODUCES]->   (Decision)
(Meeting)      -[:ASSIGNS]->     (Task)
(Decision)     -[:RELATES_TO]->  (ADR)
(Decision)     -[:AFFECTS]->     (Service)
```

---

## 3.4 Phase 3 Feature Designs

### 3.4.1 Slack Bot

**Commands:**

| Command | Action |
|---------|--------|
| `/atlas save` | Save current thread as knowledge entry |
| `/atlas save [title]` | Save with custom title |
| `/atlas explain <service>` | Show service info card |
| `/atlas search <query>` | Search knowledge graph |
| `/atlas link <service>` | Link current thread to a service |

**Auto-suggest flow:**

```
Slack #engineering:

Alice: We decided to move from REST to GraphQL for the mobile API.
       REST was causing too many round trips on slow connections.
Bob:  Agreed. GraphQL solves the overfetching problem.

         ┌─ Atlas Bot ──────────────────────────────────┐
         │ 💡 This thread contains an architecture     │
         │    decision. Save to Atlas?                   │
         │                                               │
         │    [Save]  [Dismiss]  [Edit before saving]    │
         └───────────────────────────────────────────────┘
```

**Trigger keywords (auto-suggest):**

| Pattern | Category |
|---------|----------|
| `we decided`, `decision:` | Architecture Decision |
| `why did we choose`, `why we went with` | Rationale |
| `incident`, `outage`, `postmortem` | Incident |
| `migration`, `migrating to` | Migration |
| `deprecated`, `sunsetting` | Deprecation |
| `architecture review` | Architecture |

**`/atlas explain` response:**

```
┌─ Atlas ──────────────────────────────────────────────┐
│ Payment Service                                       │
│                                                       │
│ Owner:    Payments Team                               │
│ Repo:     acme/payment-service                        │
│ Purpose:  Handles checkout and refunds                │
│                                                       │
│ APIs:     POST /checkout, GET /sessions, ...          │
│ Deps:     Stripe, Redis, PostgreSQL                   │
│                                                       │
│ Docs:     payments.docs.acme.com                      │
│ ADRs:     ADR-012 (JWT Auth), ADR-021 (Refunds)      │
│                                                       │
│ [View in Atlas →]                                     │
└───────────────────────────────────────────────────────┘
```

### 3.4.2 Knowledge Entry (from Slack)

When a thread is saved:

```yaml
KnowledgeEntry:
  id: ke_abc123
  title: "Why we migrated REST to GraphQL"
  category: Architecture Decision
  source: slack
  source_url: https://acme.slack.com/archives/C.../p...
  created_at: 2026-07-12T14:30:00Z

  summary: |
    Team decided to migrate mobile API from REST to GraphQL.
    REST caused too many round trips on slow connections.
    GraphQL solves overfetching for mobile clients.

  participants:
    - Alice Chen (alice@acme.com)
    - Bob Martinez (bob@acme.com)

  related:
    services: [mobile-api, graphql-gateway]
    adrs: [ADR-021]
    docs: [mobile-api/graphql-guide]

  raw_thread: |
    (full thread text preserved)
```

### 3.4.3 Meeting Capture

**Supported platforms (Phase 3):**

| Platform | Integration Method |
|----------|-------------------|
| Google Meet | Google Calendar + Meet API + transcript |
| Zoom | Zoom webhook + recording transcript |
| Microsoft Teams | Phase 4 |

**Meeting processing pipeline:**

```
Meeting ends
     │
     ├─ 1. Fetch transcript (API or recording)
     ├─ 2. Identify participants
     ├─ 3. NLP: extract decisions, tasks, topics
     ├─ 4. Match mentioned services to knowledge graph
     ├─ 5. Generate meeting artifact
     └─ 6. Notify participants for review
           │
           ▼
     Meeting Artifact (published to Atlas)
```

**Meeting artifact structure:**

```yaml
MeetingArtifact:
  id: mtg_xyz789
  title: "Architecture Review — Q3 Payments"
  date: 2026-07-10
  duration: 45min
  platform: zoom
  participants: [Jane, Bob, Alice]

  summary: |
    Team reviewed payments architecture for Q3.
    Discussed splitting payment processing into a dedicated service.

  decisions:
    - id: d1
      text: "Move payments to separate microservice"
      related_services: [payment-service]
    - id: d2
      text: "Database migration to dedicated payments_db planned for August"
      related_services: [payment-service]
    - id: d3
      text: "API v3 required for new refund endpoints"
      related_services: [payment-service]

  tasks:
    - text: "Create ADR for payment service split"
      assignee: Jane
      due: 2026-07-17
    - text: "Draft API v3 OpenAPI spec"
      assignee: Bob
      due: 2026-07-24

  architecture_updates:
    - "payment-service marked as independent service"
    - "new edge: payment-service → payments_db"

  related_code:
    - acme/payment-service/src/routes/
    - acme/payment-service/openapi.yaml
```

### 3.4.4 Service Detail Page (Full Graph — Phase 3)

After Phase 3, clicking a service shows everything:

```
┌─ Payment Service ─────────────────────────────────────────────────┐
│                                                                    │
│  [Overview] [APIs] [Dependencies] [Docs] [Knowledge] [Activity]   │
│                                                                    │
│  ── Knowledge Tab ──                                              │
│                                                                    │
│  📄 Docs                                                          │
│    • Authentication Guide                                         │
│    • API Reference (v2)                                           │
│                                                                    │
│  📋 ADRs                                                          │
│    • ADR-012: JWT Authentication (Jan 2025)                       │
│    • ADR-021: Refund Architecture (Mar 2025)                      │
│                                                                    │
│  💬 Slack Threads                                                 │
│    • "Why we migrated REST to GraphQL" — Alice, Bob (Jul 2025)   │
│    • "Refund edge case discussion" — Jane, Alice (Jun 2025)        │
│                                                                    │
│  🎥 Meetings                                                      │
│    • Architecture Review Q3 — 3 decisions (Jul 2025)              │
│    • Payment Service Split Review — 2 decisions (May 2025)        │
│                                                                    │
│  👤 People                                                        │
│    • Jane Smith (Owner) · Bob Martinez · Alice Chen               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 3.4.5 Unified Search (Final Form)

Search: **"authentication"**

| Type | Result | Source |
|------|--------|--------|
| 📄 Doc | JWT Authentication Guide | Phase 1 |
| 🔌 API | POST /login | Phase 1 + 2 |
| 📋 ADR | ADR-012: Authentication Strategy | Phase 2 |
| 💻 Code | `src/auth/login.ts` | Phase 2 |
| 💬 Slack | "Why JWT was chosen over sessions" | Phase 3 |
| 🎥 Meeting | Architecture Review 2025 — auth section | Phase 3 |
| 👤 Person | John — Backend Lead | Phase 3 |
| 🏗 Service | auth-service | Phase 2 |

---

## 3.5 Phase 3 Slack App Design

### Installation

```
1. "Add to Slack" button in Atlas dashboard
2. OAuth → select channels Atlas can read
3. Bot joins workspace
4. Configure auto-suggest channels (default: engineering channels)
5. Bot ready — post welcome message
```

### Slack App Scopes

| Scope | Reason |
|-------|--------|
| `channels:history` | Read thread content for capture |
| `channels:read` | List channels |
| `chat:write` | Post suggestions and responses |
| `commands` | Slash commands |
| `users:read` | Map participants to Atlas people |

### Privacy Controls

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-suggest | Off | Must opt-in per channel |
| Channels | None | Admin selects which channels bot monitors |
| Retention | Forever | Saved entries persist in Atlas |
| Raw thread storage | On | Full text preserved for search |
| Participant consent | Notify | Bot announces when a thread is saved |

---

## 3.6 Phase 3 Meeting Integration Design

### Zoom Integration

```
1. Admin connects Zoom account in Atlas
2. Atlas registers for meeting.end webhook
3. When meeting ends:
   a. Fetch cloud recording transcript
   b. Queue for NLP processing
   c. Generate artifact
   d. Email participants: "Review your meeting summary"
4. Participant approves/edits → published to knowledge graph
```

### Google Meet Integration

```
1. Admin connects Google Workspace
2. Atlas reads Calendar for meetings titled "Architecture Review", etc.
3. After meeting:
   a. Fetch Meet transcript (if enabled)
   b. Same NLP pipeline as Zoom
   c. Generate artifact
```

### NLP Summary Engine

| Input | Output |
|-------|--------|
| Raw transcript | Cleaned conversation |
| Cleaned text | Decisions (bullet list) |
| Cleaned text | Tasks (with assignees) |
| Decisions + Tasks | Related services (matched to graph) |
| All outputs | Meeting artifact |

**Model:** LLM (Claude/GPT) with structured output prompt + knowledge graph context for entity linking.

---

## 3.7 Phase 3 Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 25–26 | **Slack Bot MVP** | `/atlas save`, `/atlas explain`, basic entry creation |
| 27–28 | **Auto-suggest + Linking** | Keyword detection, auto-link to services |
| 29–30 | **Zoom Integration** | Meeting transcript → artifact pipeline |
| 31–32 | **Google Meet** | Calendar + transcript integration |
| 33–34 | **Unified Search + Service Page** | Full knowledge tab, cross-source search |
| 35–36 | **Polish + GA** | Privacy controls, review workflow, GA launch |

### Phase 3 Exit Criteria

- [ ] `/atlas save` in Slack creates a knowledge entry linked to services
- [ ] Auto-suggest fires on decision keywords in configured channels
- [ ] `/atlas explain payment-service` returns accurate service card
- [ ] Zoom meeting produces artifact with decisions and tasks
- [ ] Google Meet meeting produces artifact with decisions and tasks
- [ ] Service detail page shows docs + code + Slack + meetings + ADRs
- [ ] Search "authentication" returns results from all sources
- [ ] Participants can review and edit meeting artifacts before publish

---

# Cross-Phase View

## How Phases Build on Each Other

```
┌─────────────────────────────────────────────────────────────────┐
│                        Phase 3                                   │
│              Slack + Meetings → Knowledge Graph                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Phase 2                               │  │
│  │         Repo Intelligence → Architecture + Graph         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                   Phase 1                            │  │  │
│  │  │      Better Fern → Docs Platform + CLI             │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Feature Distribution

| Feature | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|
| Config-as-code docs | ✅ | | |
| OpenAPI → API reference | ✅ | | |
| MDX guides | ✅ | | |
| API playground | ✅ | | |
| SDK generation | ✅ | | |
| Version diff | ✅ | | |
| Search (docs only) | ✅ | | |
| Custom domains + themes | ✅ | | |
| GitHub integration | | ✅ | |
| Repo scanning | | ✅ | |
| Service discovery | | ✅ | |
| Architecture explorer | | ✅ | |
| Dependency explorer | | ✅ | |
| Living docs (drift detection) | | ✅ | |
| Documentation health | | ✅ | |
| ADR detection | | ✅ | |
| Knowledge graph (code) | | ✅ | |
| Unified search (code + docs) | | ✅ | |
| Slack bot | | | ✅ |
| `/atlas save` | | | ✅ |
| `/atlas explain` | | | ✅ |
| Auto-suggest capture | | | ✅ |
| Zoom meeting capture | | | ✅ |
| Google Meet capture | | | ✅ |
| Meeting artifacts | | | ✅ |
| Knowledge graph (full) | | | ✅ |
| Unified search (everything) | | | ✅ |

## Data Model Evolution

```
Phase 1:  Organization → Project → DocVersion → Pages
                              │
Phase 2:  + Repository → Service → API → Dependency → ADR → Person
                              │
Phase 3:  + SlackThread → Decision → Conversation
          + Meeting → Task → MeetingArtifact
```

## Revenue Evolution

| Phase | Value Proposition | Who Pays |
|-------|-------------------|----------|
| Phase 1 | Better docs than Fern | API teams, startups |
| Phase 2 | Auto-understand your codebase | Growing engineering orgs |
| Phase 3 | Never lose tribal knowledge | Mid-size+ engineering orgs |

| Tier | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| Free | Public docs | — | — |
| Pro ($20/user) | Private docs, custom domain | + repo intelligence, health dashboard | + Slack, meeting capture |
| Enterprise | — | + SSO, audit | + Teams, self-hosted, compliance |

---

## What's Next (Phase 4 — Future)

Not in scope for this document, but the natural continuation:

- AI Context Engine (serve context to Cursor, Copilot)
- IDE plugins (VS Code, Cursor, JetBrains)
- Plugin marketplace
- Cloud integrations (AWS, GCP, Azure)
- Component docs (Storybook alternative)
- Microsoft Teams meeting capture
- Self-hosted enterprise deployment

---

*This document is the authoritative phase design. Update when scope or timelines change.*
