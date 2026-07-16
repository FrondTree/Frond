# Frond

**Developer documentation platform** — Fern, but better.

Config-as-code API docs, interactive playgrounds, SDK generation, and hosted documentation sites.

## Monorepo structure

```
frond/
├── apps/
│   ├── cli/          # @frond/cli — npm CLI
│   ├── web/          # Landing page + dashboard (Next.js)
│   └── docs/         # Published docs renderer (Next.js)
├── packages/
│   ├── config/       # frond.config.json, docs.yml parsers
│   ├── compiler/     # OpenAPI → manifest compiler
│   └── sdk-generator/# TypeScript + Python SDK generation
├── services/
│   └── api/          # Go REST API
└── docker-compose.yml
```

## Quick start (local development)

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- Go 1.22+
- Docker (for Postgres + Meilisearch)

### 2. Start infrastructure

```bash
cp .env.example .env
# Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google login

docker compose up -d postgres meilisearch
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Database (Prisma + Postgres)

Local development uses **Prisma** for schema migrations and seeding. The Go API still reads/writes the same Postgres tables via pgx.

```bash
pnpm db:migrate   # apply migrations
pnpm db:seed      # create demo user + org
```

Or in one step:

```bash
make db-setup
```

If you previously used goose migrations, reset the local DB first:

```bash
pnpm db:reset
```

**Demo login** (no Google setup required):

| Field | Value |
|-------|-------|
| Username | `demo` |
| Password | `demo` |

Sign in at http://localhost:3000/login — Google sign-in remains available when OAuth is configured.

### 5. Start Go API

```bash
cd services/api
go run ./cmd/server
# API at http://localhost:8080
```

### 6. Build

```bash
pnpm build
```

### 7. Start web apps

```bash
# Terminal 1 — landing + dashboard
pnpm --filter @frond/web dev

# Terminal 2 — docs renderer
pnpm --filter @frond/docs dev
```

| App | URL |
|-----|-----|
| Landing + Dashboard | http://localhost:3000 |
| Docs renderer | http://localhost:3001/:org/:project |
| Go API | http://localhost:8080 |

> **Note:** Creating an org/project in the dashboard does **not** publish docs. The docs site only shows content after `frond docs publish --project-id <uuid>` (or an equivalent publish API call). Until then, `http://localhost:3001/:org/:project` shows “Docs not published yet”.


## CLI usage

```bash
# Install CLI locally
pnpm --filter @frond/cli build
npm install -g ./apps/cli

# In your API repo
frond init
frond validate
frond doctor
frond docs dev          # local manifest server on :3002
frond login             # Google OAuth (or use demo credentials in dashboard)
frond generate          # SDKs to sdks/
frond docs publish --project-id <uuid>
frond diff --from v1 --to v2
```

## Author workflow

```
my-api/
├── frond/
│   ├── frond.config.json
│   ├── generators.yml
│   ├── openapi/v1/openapi.yaml
│   └── docs/
│       ├── docs.yml
│       └── pages/
└── .github/workflows/   # see publish-docs.example.yml
```

## Authentication

### Demo account (local testing)

| Field | Value |
|-------|-------|
| Username | `demo` |
| Password | `demo` |
| Email | `demo@frond.dev` |

Use **Sign in with demo account** at http://localhost:3000/login. Re-seed anytime with `pnpm db:seed`.

### Google OAuth setup

1. Create a Google Cloud OAuth 2.0 Client ID
2. Add redirect URI: `http://localhost:8080/v1/auth/google/callback`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

## Documentation

| Doc | Description |
|-----|-------------|
| [PRD](./docs/PRD.md) | Product requirements |
| [PHASE.md](./docs/PHASE.md) | Phased product design |
| [ROADMAP.md](./docs/ROADMAP.md) | Full feature roadmap |

## Phase 2 — Repository Intelligence

- GitHub OAuth connect + repo selection
- Background repo scanner (OpenAPI, package.json, go.mod, ADRs, CODEOWNERS, routes)
- Knowledge graph (services, APIs, dependencies, ADRs)
- Architecture explorer (React Flow)
- Dependency explorer
- Documentation health dashboard
- PR drift alerts (GitHub webhook)
- Unified search across services, APIs, ADRs

### GitHub setup

1. Create a GitHub OAuth App at https://github.com/settings/developers
2. Authorization callback URL: `http://localhost:8080/v1/auth/github/callback`
3. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`
4. Optional: configure webhook at `http://localhost:8080/v1/webhooks/github` for push/PR events

### Phase 2 API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /v1/orgs/:slug/github/connect` | Start GitHub OAuth |
| `GET /v1/orgs/:slug/github/repos` | List available repos |
| `POST /v1/orgs/:slug/github/repos` | Connect repos for scanning |
| `GET /v1/orgs/:slug/intelligence/architecture` | Architecture graph |
| `GET /v1/orgs/:slug/intelligence/services` | Discovered services |
| `GET /v1/orgs/:slug/intelligence/dependencies` | Dependency trees |
| `GET /v1/orgs/:slug/intelligence/health` | Doc health score |
| `GET /v1/orgs/:slug/intelligence/search?q=` | Unified search |
| `GET /v1/orgs/:slug/intelligence/drift` | Drift alerts |

## Phase 1 status

- [x] Go API (auth, orgs, projects, publish, search)
- [x] @frond/cli (init, validate, doctor, docs dev, publish, generate, diff, login)
- [x] Config parser + OpenAPI compiler
- [x] SDK generator (TypeScript, Python)
- [x] Next.js landing + dashboard with demo login + Google OAuth
- [x] Next.js docs renderer with playground
- [x] Docker Compose + CI

## Phase 2 status

- [x] GitHub OAuth + repo connect
- [x] Background repo scanner worker
- [x] Knowledge graph (services, APIs, deps, ADRs)
- [x] Architecture explorer (React Flow)
- [x] Dependency explorer
- [x] Documentation health dashboard
- [x] PR drift alerts (webhook)
- [x] Unified search (services, APIs, ADRs)

## License

See [LICENSE](./LICENSE).
