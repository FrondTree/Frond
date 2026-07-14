# Product Requirements Document (PRD)

**Product:** Frond — Developer Knowledge Infrastructure Platform  
**Project:** Frond  
**Version:** 1.0  
**Date:** July 14, 2026

> Phase design: [PHASE.md](./PHASE.md) · Full roadmap: [ROADMAP.md](./ROADMAP.md)

---

## 1. Product Vision

### Problem Statement

Modern companies have knowledge scattered across GitHub repositories, documentation sites, Slack conversations, Google Meet / Zoom discussions, Jira tickets, Notion pages, design documents, API specifications, code comments, architecture decisions, and incident reports.

Developers spend significant time answering:

- "Why was this API designed this way?"
- "Where is authentication handled?"
- "Who owns this service?"
- "What changed between versions?"
- "Why did we choose PostgreSQL over MongoDB?"
- "Has anyone solved this issue before?"

Existing documentation platforms solve publishing documentation, but not capturing, understanding, and maintaining engineering knowledge.

### Product Definition

A **Developer Knowledge Operating System** that automatically understands a company's software ecosystem and creates a living knowledge graph connecting:

**Code | Repository | Architecture | APIs | Components | Infrastructure | Conversations | Decisions | Documentation | People**

**Analog:** GitHub + Fern + Storybook + Backstage + Slack Memory + AI Code Intelligence

---

## 2. Core Product Pillars

Six major systems under one Knowledge Graph:

| Pillar | Sub-capabilities |
|--------|------------------|
| **Docs** | Tutorials, living documentation |
| **Code** | Repository intelligence, AST parsing |
| **APIs** | OpenAPI, AsyncAPI, GraphQL, gRPC |
| **Chat** | Slack knowledge capture |
| **Infra** | Services, dependencies, cloud |
| **Knowledge Graph** | Unified search and relationships |

---

## 3. Features (13 Total)

### Feature 1: Repository Intelligence Engine

- **Inputs:** GitHub, GitLab, Bitbucket
- **Supports:** Monorepo, microservices, frontend, backend, libraries, infra repos
- **Pipeline:** Repository → Parser Engine → Knowledge Graph
- **Output:** Services with owners, files, APIs, dependencies

### Feature 2: Interactive Architecture Explorer

- Clickable live architecture diagrams (replaces static diagrams)
- Node details: owner, repo, APIs, database, dependencies, recent PRs
- **Tech:** React Flow, D3.js, Three.js (optional 3D)

### Feature 3: Living Documentation Engine

- Auto-detect API/code/schema changes from PRs
- Generate diff → update docs → notify owner → update SDK
- **Sources:** Git diff, OpenAPI, DB migrations, AST changes

### Feature 4: Unified Knowledge Graph

- Single search across docs, code, APIs, Slack, meetings, people, ADRs
- Graph traversal for relationship queries

### Feature 5: Slack Knowledge Capture Plugin

- `/atlas save` — manual capture
- Auto-mode watches for decision/architecture/incident keywords
- Links to services, ADRs, participants

### Feature 6: Meeting Knowledge Capture

- **Integrations:** Google Meet, Zoom, Microsoft Teams
- Extracts: summary, decisions, tasks, architecture updates, related code

### Feature 7: Developer Documentation Platform

- Fern replacement layer
- **Inputs:** OpenAPI, AsyncAPI, GraphQL, gRPC
- **Output:** Auth sections, endpoints, request/response, examples, SDK, Try API

### Feature 8: Universal Playground

- Run inside docs: REST, GraphQL, SQL, CLI, WebSocket

### Feature 9: Component Documentation

- Storybook alternative
- Auto-detect props, preview, usage, source
- **Frameworks:** React, Vue, Angular, SwiftUI, Flutter

### Feature 10: Dependency Explorer

- Visual dependency graph for onboarding, debugging, security review

### Feature 11: Documentation Health System

- Score, outdated pages, missing API docs, broken examples, unused services
- Metrics: coverage, freshness, usage

### Feature 12: AI Context Engine

- Universal context layer for Cursor, Claude Code, Kiro, Copilot, ChatGPT
- Returns relevant services, PRs, schemas, ADRs — not entire codebase

### Feature 13: Plugin Ecosystem

- Plugin SDK for Slack, Discord, Teams, Jira, Linear, Asana, AWS, Azure, GCP, Datadog, Grafana, VS Code, Cursor, JetBrains
- Example: `/atlas explain payment-service`

---

## 4. System Architecture

```
Users → Web Application → API Gateway → Knowledge Engine
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              Git Parser              Chat Parser              Meeting Parser
              OpenAPI                 AST Parser               Cloud Parser
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                                      Knowledge Graph
                                              │
                              PostgreSQL | Vector DB | Search Engine
```

---

## 5. Backend Services

| Service | Role | Tech |
|---------|------|------|
| Ingestion Service | Collect Git, Slack, meetings, APIs | Go/Rust |
| Parser Engine | TypeScript, Java, Python, Go, Rust, C# | Tree-sitter, LSP |
| Knowledge Graph Engine | Entities + relationships | Neo4j or PostgreSQL + graph |
| Search Engine | Keyword + semantic hybrid | Meilisearch/Typesense + Qdrant/Weaviate/pgvector |

---

## 6. MVP Phases

> **Detailed design per phase:** [PHASE.md](./PHASE.md)

### Phase 1 (3 months) — Better Fern Documentation Platform

Build a documentation platform users adopt the same way they use Fern — config-as-code, CLI, OpenAPI docs, playground, SDKs. No repo scanning required.

- Config-as-code (`atlas/` folder)
- CLI (`atlas docs dev`, `atlas publish`, `atlas generate`)
- OpenAPI → API reference
- MDX guides, playground, version diff
- SDK generation (TypeScript, Python)
- Search, themes, custom domains

**Target:** API teams migrating from or choosing over Fern

### Phase 2 (3 months) — Repository Intelligence (Automatic)

Connect GitHub and auto-discover services, APIs, architecture, dependencies. Link to Phase 1 docs.

- GitHub / GitLab / Bitbucket integration
- Repo scanning + service discovery
- Architecture explorer
- Dependency graph
- Living docs (drift detection)
- ADR detection, documentation health
- Knowledge graph (code + docs)

**Target:** Engineering orgs wanting automatic system understanding

### Phase 3 (3 months) — Slack & Meeting Knowledge Capture

Capture tribal knowledge from Slack and meetings, link to the knowledge graph.

- Slack bot (`/atlas save`, `/atlas explain`, auto-suggest)
- Zoom + Google Meet meeting capture
- Meeting artifacts (decisions, tasks)
- Full unified search (docs + code + conversations)
- Service pages with all knowledge sources

**Target:** Teams losing decisions in Slack threads and meeting notes

### Phase 4 (Future)

- AI context engine, IDE plugins, plugin marketplace, enterprise self-hosted

---

## 7. Monetization

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | Public repos, basic docs, community plugins |
| **Pro** | $20/user/month | Private repos, analytics, AI search, Slack |
| **Enterprise** | $50k–$500k/year | Self-hosted, SSO, compliance, audit logs, custom plugins |

---

## 8. Success Criteria

**We are building something better than Fern documentation** by combining:

1. Everything Fern does for API docs
2. Plus repository intelligence
3. Plus a living knowledge graph
4. Plus conversation and meeting capture
5. Plus AI context for coding assistants
6. Plus self-maintaining documentation

---

*See [ROADMAP.md](./ROADMAP.md) for detailed milestones, Gantt chart, tech stack, metrics, and competitive analysis.*
