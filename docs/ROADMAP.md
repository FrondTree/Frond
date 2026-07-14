# Frond — Developer Knowledge Infrastructure Platform

**Project:** Frond  
**Last Updated:** July 14, 2026  
**Goal:** Build something better than Fern documentation — a living Developer Knowledge Operating System.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Core Product Pillars](#2-core-product-pillars)
3. [Feature Catalog](#3-feature-catalog)
4. [System Architecture](#4-system-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Development Roadmap](#7-development-roadmap)
8. [Monetization](#8-monetization)
9. [Success Metrics](#9-success-metrics)
10. [Competitive Positioning](#10-competitive-positioning)

---

## 1. Product Vision

### 1.1 Problem Statement

Modern companies have knowledge scattered across:

| Source | Examples |
|--------|----------|
| **Code & Repos** | GitHub repositories, code comments |
| **Documentation** | Documentation sites, Notion pages, design documents |
| **Communication** | Slack conversations, Google Meet / Zoom discussions |
| **Project Management** | Jira tickets |
| **Architecture** | Architecture decisions, API specifications, incident reports |

**Today, developers spend significant time answering:**

- "Why was this API designed this way?"
- "Where is authentication handled?"
- "Who owns this service?"
- "What changed between versions?"
- "Why did we choose PostgreSQL over MongoDB?"
- "Has anyone solved this issue before?"

**Gap:** Existing documentation platforms solve *publishing* documentation — not *capturing*, *understanding*, and *maintaining* engineering knowledge.

### 1.2 Product Definition

**What are we building?**

A **Developer Knowledge Operating System** that automatically understands a company's software ecosystem and creates a **living knowledge graph** connecting:

```
Code ─ Repository ─ Architecture ─ APIs ─ Components ─ Infrastructure
  │                                                      │
  └──────── Conversations ─ Decisions ─ Documentation ─ People
```

**Think:**

> GitHub + Fern + Storybook + Backstage + Slack Memory + AI Code Intelligence

### 1.3 North Star

| Fern Does | Atlas Does |
|-----------|------------|
| Static API docs from OpenAPI | Living docs that auto-update from PRs |
| Manual SDK generation | Auto-synced SDKs on API change |
| Isolated documentation site | Unified knowledge graph across code, chat, meetings |
| No repo intelligence | Full repository + architecture understanding |
| No conversation capture | Slack, meetings → permanent knowledge |
| No AI context layer | Universal context engine for coding assistants |

---

## 2. Core Product Pillars

```
                    Atlas
                      │
              ┌───────┴───────┐
              │ Knowledge Graph│
              └───────┬───────┘
                      │
    ┌────────┬────────┼────────┬────────┐
    │        │        │        │        │
   Docs    Code     APIs     Chat     Infra
    │        │        │        │        │
Tutorials Components Meetings Services
```

| Pillar | Purpose |
|--------|---------|
| **Knowledge Graph** | Central nervous system — connects all entities and relationships |
| **Docs** | Living documentation engine (Fern replacement++) |
| **Code** | Repository intelligence and AST understanding |
| **APIs** | OpenAPI, AsyncAPI, GraphQL, gRPC documentation + playground |
| **Chat** | Slack/Teams knowledge capture |
| **Infra** | Services, dependencies, cloud resources |

---

## 3. Feature Catalog

### Feature 1: Repository Intelligence Engine

**Definition:** Automatically analyze a company's codebase and generate structured knowledge.

#### Inputs

| Provider | Support |
|----------|---------|
| GitHub | ✅ |
| GitLab | ✅ |
| Bitbucket | ✅ |

**Repository types:** Monorepo, microservices, frontend apps, backend services, libraries, infrastructure repos.

#### Processing Pipeline

```
Repository → Parser Engine → Knowledge Graph
```

#### Example Output

Given codebase structure:

```
src/
 ├── auth/
 │    ├── login.ts
 │    └── jwt.ts
 ├── payments/
 │    └── stripe.ts
```

**Creates entity: Auth Service**

| Field | Value |
|-------|-------|
| Owner | Backend Team |
| Files | `login.ts`, `jwt.ts` |
| APIs | `POST /login` |
| Dependencies | Redis, PostgreSQL, JWT |

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 1 | GitHub integration, basic repo scanning |
| Phase 2 | Multi-provider, dependency graph |
| Phase 3 | Deep AST analysis, cross-repo linking |

---

### Feature 2: Interactive Architecture Explorer

**Definition:** Replace static architecture diagrams with a live, clickable system map.

#### Example Topology

```
                 User
                  │
                  ▼
             Frontend
                  │
          ────────┴────────
                  │
             API Gateway
                  │
    ┌─────────────┴─────────────┐
    │                           │
Auth Service            Payment Service
    │                           │
PostgreSQL                   Stripe
```

#### Node Detail (click Payment Service)

| Section | Content |
|---------|---------|
| Description | Handles checkout and refunds |
| Owner | Payments Team |
| Repository | `payment-service` |
| APIs | `POST /checkout` |
| Database | `payments_db` |
| Dependencies | Stripe SDK, Redis |
| Recent Changes | PR #431 — Added refunds |

#### Technology

| Layer | Stack |
|-------|-------|
| Graph UI | React Flow |
| Visualization | D3.js |
| 3D (optional) | Three.js |

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 1 | Basic architecture graph from repo analysis |
| Phase 2 | Dependency explorer integration |
| Phase 3 | Real-time updates from deployments |

---

### Feature 3: Living Documentation Engine

**Definition:** Documentation automatically updates based on engineering changes.

#### Current State (Broken)

```
Developer changes API → Manually updates docs → Usually forgotten
```

#### Atlas Flow

```
Developer PR
  │
  ├─ Changed: POST /payment
  └─ Added: refund_status field
        │
        ▼
  System detects API change
        │
        ├─ Generate diff
        ├─ Update documentation
        ├─ Notify owner
        └─ Update SDK
```

#### Change Detection Sources

| Source | Detects |
|--------|---------|
| Git diff | File-level changes |
| OpenAPI changes | API contract drift |
| Database migrations | Schema changes |
| Code AST changes | Structural refactors |

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 1 | OpenAPI + Markdown docs, version diff |
| Phase 2 | Auto-update on PR merge |
| Phase 3 | SDK auto-generation, notification system |

---

### Feature 4: Unified Knowledge Graph

**Definition:** Everything becomes connected — one search across all knowledge types.

#### Search Example: "Authentication"

| Type | Result |
|------|--------|
| Documentation | "JWT Authentication" |
| Code | `auth/login.ts` |
| API | `POST /login` |
| Slack Discussion | "Why JWT was chosen" |
| Meeting | Architecture Review 2025 |
| Person | John — Backend Lead |
| ADR | ADR-012 Authentication Strategy |

#### Entity Types

```
Service, Repository, API, Component, Person, Team,
ADR, Meeting, SlackThread, Document, Dependency,
Infrastructure, Incident, Task
```

#### Relationship Types

```
OWNS, USES, DEPENDS_ON, IMPLEMENTS, DOCUMENTS,
DISCUSSED_IN, DECIDED_IN, AUTHORED_BY, RELATED_TO
```

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 1 | Core graph (repos, APIs, docs) + search |
| Phase 2 | Slack, ADRs, people |
| Phase 3 | Meetings, cloud, incidents |

---

### Feature 5: Slack Knowledge Capture Plugin

**Definition:** Turn conversations into permanent company knowledge.

#### Manual Capture

```
User: /atlas save

Conversation:
  Alice: Why did we move from REST to GraphQL?
  Bob:   REST caused too many mobile requests.
         GraphQL solved overfetching.

→ Creates Knowledge Entry:
  Title:        Why we migrated REST to GraphQL
  Category:     Architecture Decision
  Related:      GraphQL Gateway, Mobile API, ADR-021
  Participants: Alice, Bob
```

#### Automatic Mode

Bot watches for trigger patterns:

- `Decision:`
- `Why did we choose`
- `Architecture`
- `Migration`
- `Incident`

**Suggests:** "This conversation contains valuable knowledge. Save to Atlas?"

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 2 | `/atlas save`, manual capture |
| Phase 2 | Auto-suggestion mode |
| Phase 3 | `/atlas explain <service>` command |

---

### Feature 6: Meeting Knowledge Capture

**Definition:** Extract decisions, tasks, and architecture updates from meetings.

#### Integrations

| Platform | Status |
|----------|--------|
| Google Meet | Phase 3 |
| Zoom | Phase 3 |
| Microsoft Teams | Phase 3 |

#### Example: Architecture Review Meeting

**Participants:** Backend Team

**Transcript → Extracted:**

| Type | Content |
|------|---------|
| Decision 1 | Moved payments to separate service |
| Decision 2 | Database migration planned |
| Decision 3 | API version 3 required |

**Creates Meeting Artifact:**

- Summary
- Decisions
- Tasks
- Architecture updates
- Related code links

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 3 | Google Meet + Zoom integration |
| Phase 4 | Teams, calendar sync, action item tracking |

---

### Feature 7: Developer Documentation Platform

**Definition:** Fern replacement layer — beautiful, interactive API documentation.

#### Input Formats

| Format | Support |
|--------|---------|
| OpenAPI | ✅ Phase 1 |
| AsyncAPI | Phase 2 |
| GraphQL Schema | Phase 2 |
| gRPC | Phase 3 |

#### Output Per Endpoint

```
Authentication
  POST /login
    ├── Request
    ├── Response
    ├── Examples
    ├── SDK
    └── Try API
```

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 1 | OpenAPI docs, Markdown, version diff |
| Phase 2 | AsyncAPI, GraphQL |
| Phase 3 | gRPC, multi-language SDKs |

---

### Feature 8: Universal Playground

**Definition:** Run everything inside documentation — no context switching.

| Protocol | Example |
|----------|---------|
| REST | `POST /users` |
| GraphQL | `query Users { ... }` |
| SQL | `SELECT * FROM users` |
| CLI | `atlas deploy` |
| WebSocket | `connect()` |

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 1 | REST Try API |
| Phase 2 | GraphQL playground |
| Phase 3 | SQL, CLI, WebSocket |

---

### Feature 9: Component Documentation

**Definition:** Storybook alternative — auto-generated UI component docs.

#### Example: React `Button.tsx`

```
Button Component
  ├── Preview (live)
  ├── Props: size, variant, disabled
  ├── Usage: <Button size="large"/>
  └── Source: Button.tsx
```

#### Supported Frameworks

| Framework | Phase |
|-----------|-------|
| React | Phase 2 |
| Vue | Phase 3 |
| Angular | Phase 3 |
| SwiftUI | Phase 4 |
| Flutter | Phase 4 |

---

### Feature 10: Dependency Explorer

**Definition:** Visual dependency graph for onboarding, debugging, and security review.

```
Payment Service
      │
      ├── uses → Stripe SDK
      │              └── Webhook
      ├── uses → Database
      └── uses → Redis
```

#### Use Cases

- Onboarding new engineers
- Debugging cascading failures
- Security review and blast radius analysis
- License compliance auditing

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 2 | Package + service dependency graph |
| Phase 3 | Runtime dependency tracing |

---

### Feature 11: Documentation Health System

**Definition:** Dashboard measuring documentation quality and freshness.

#### Example Dashboard

```
Documentation Score: 82%

Problems:
  • 15 outdated pages
  • 7 missing API docs
  • 4 broken examples
  • 3 unused services
```

#### Metrics

| Metric | Example |
|--------|---------|
| Coverage | API documented: 90% |
| Freshness | Last updated: 3 months ago |
| Usage | Most viewed docs ranking |
| Broken links | 4 examples fail validation |

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 2 | Basic health score + stale page detection |
| Phase 3 | Analytics, usage tracking, broken example detection |

---

### Feature 12: AI Context Engine

**Definition:** Universal context layer for AI coding assistants.

#### Architecture

```
Repository → Atlas Index → Context Engine → Cursor / Claude Code / Kiro / Copilot / ChatGPT
```

#### Example

**Developer asks:** "Fix payment bug"

**Instead of:** 10 million lines of code context

**Atlas provides:**

- Payment Service codebase
- Stripe integration docs
- Recent PR #431 (refunds)
- Database schema
- ADR: Payment architecture decisions

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 3 | Context API for Cursor + Claude |
| Phase 4 | IDE plugins, custom context policies |

---

### Feature 13: Plugin Ecosystem

**Definition:** Become the knowledge layer for companies — extensible via plugins.

#### Plugin SDK

Developers create **Atlas Plugins** for:

| Category | Integrations |
|----------|--------------|
| Communication | Slack, Discord, Teams |
| Project Management | Jira, Linear, Asana |
| Cloud | AWS, Azure, GCP |
| Monitoring | Datadog, Grafana |
| IDE | VS Code, Cursor, JetBrains |

#### Plugin Example: Slack

```
/atlas explain payment-service

→ Payment Service
  Owner:   Payments Team
  Purpose: Handles checkout
  Repo:    github.com/company/payment
  APIs:    POST /checkout
  Deps:    Stripe, Redis, Postgres
```

#### Roadmap Placement

| Phase | Scope |
|-------|-------|
| Phase 2 | Slack plugin (built-in) |
| Phase 3 | IDE plugins |
| Phase 4 | Plugin Store / Marketplace |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
                    Users
                      │
                      ▼
              Web Application
                      │
                      ▼
               API Gateway
                      │
                      ▼
             Knowledge Engine
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
Git Parser    Chat Parser      Meeting Parser
OpenAPI         AST Parser       Cloud Parser
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
                      ▼
              Knowledge Graph
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   PostgreSQL    Vector DB    Search Engine
```

### 4.2 Data Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Source  │───▶│ Ingestion│───▶│  Parser  │───▶│  Graph   │
│ (Git,    │    │ Service  │    │  Engine  │    │  Engine  │
│  Slack,  │    └──────────┘    └──────────┘    └────┬─────┘
│  Meet)   │                                         │
└──────────┘                                         ▼
                                              ┌──────────┐
                                              │  Search  │
                                              │  + API   │
                                              └──────────┘
```

---

## 5. Backend Architecture

### 5.1 Services

| # | Service | Responsibility | Tech |
|---|---------|----------------|------|
| 1 | **Ingestion Service** | Collect Git, Slack, meetings, APIs | Go / Rust |
| 2 | **Parser Engine** | Understand code across languages | Tree-sitter, Language servers |
| 3 | **Knowledge Graph Engine** | Store entities and relationships | Neo4j or PostgreSQL + graph extension |
| 4 | **Search Engine** | Hybrid keyword + semantic search | Meilisearch / Typesense + Vector DB |
| 5 | **Documentation Service** | Render docs, playgrounds, SDKs | — |
| 6 | **Notification Service** | Alert owners on doc drift | — |
| 7 | **AI Context Service** | Serve relevant context to assistants | — |

### 5.2 Parser Engine — Language Support

| Language | Parser |
|----------|--------|
| TypeScript | Tree-sitter |
| Java | Tree-sitter |
| Python | Tree-sitter |
| Go | Tree-sitter |
| Rust | Tree-sitter |
| C# | Tree-sitter |

### 5.3 Knowledge Graph Schema

**Entity example:**

```
PaymentService {
  id, name, description, owner, repository,
  apis[], dependencies[], created_at, updated_at
}
```

**Relationship example:**

```
(PaymentService) -[:USES]-> (Stripe)
(PaymentService) -[:OWNS]-> (BackendTeam)
(PaymentService) -[:DOCUMENTED_IN]-> (DocPage)
(PaymentService) -[:DISCUSSED_IN]-> (SlackThread)
```

### 5.4 Search Architecture

| Type | Engine | Use Case |
|------|--------|----------|
| Keyword | Meilisearch / Typesense | Exact term, API paths, file names |
| Semantic | Qdrant / Weaviate / pgvector | Natural language queries |
| Graph | Knowledge Graph traversal | "What depends on X?" |

---

## 6. Technology Stack

### 6.1 Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React, React Flow, D3.js | Rich interactive docs + architecture explorer |
| **API** | Go or Rust | High-performance ingestion and parsing |
| **Graph DB** | PostgreSQL + pgvector (MVP) → Neo4j (scale) | Start simple, migrate when needed |
| **Search** | Meilisearch + pgvector | Fast keyword + semantic hybrid |
| **Queue** | Redis / NATS | Async ingestion pipeline |
| **Auth** | OAuth + SSO (Enterprise) | GitHub OAuth for Phase 1 |
| **Hosting** | Cloud (AWS/GCP) + Self-hosted (Enterprise) | Tiered offering |

### 6.2 MVP Stack (Phase 1)

```
Frontend:     Next.js + React Flow
Backend:      Go
Database:     PostgreSQL + pgvector
Search:       Meilisearch
Git:          GitHub App
Docs:         Custom renderer (Fern-inspired)
Deploy:       Docker + Kubernetes
```

---

## 7. Development Roadmap

### Overview

```
Phase 1 (Month 1–3)   Fern + Repository Intelligence
Phase 2 (Month 4–6)   Knowledge Capture + Graph Expansion
Phase 3 (Month 7–12)  AI + Meetings + IDE
Phase 4 (Month 12+)   Platform + Marketplace
```

---

### Phase 1 — Foundation (Months 1–3)

**Goal:** "Fern + Repository Intelligence"  
**Target:** Small engineering teams (5–50 developers)

#### Deliverables

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | GitHub integration (OAuth + App) | P0 | 🔲 Planned |
| 2 | Repository scanner + parser | P0 | 🔲 Planned |
| 3 | OpenAPI documentation renderer | P0 | 🔲 Planned |
| 4 | Markdown documentation support | P0 | 🔲 Planned |
| 5 | Interactive architecture graph | P0 | 🔲 Planned |
| 6 | Hybrid search (keyword) | P0 | 🔲 Planned |
| 7 | Version diff for APIs | P1 | 🔲 Planned |
| 8 | REST API playground (Try API) | P1 | 🔲 Planned |
| 9 | Basic knowledge graph (repos, APIs, docs) | P0 | 🔲 Planned |
| 10 | User auth + team workspaces | P0 | 🔲 Planned |

#### Phase 1 Milestones

| Week | Milestone |
|------|-----------|
| 1–2 | Project scaffolding, GitHub App, auth |
| 3–4 | Repo scanner MVP (TypeScript + Python) |
| 5–6 | OpenAPI parser + doc renderer |
| 7–8 | Architecture graph (React Flow) |
| 9–10 | Search (Meilisearch) + knowledge graph schema |
| 11–12 | Version diff, playground, polish, beta launch |

#### Phase 1 Exit Criteria

- [ ] Connect GitHub repo and see auto-generated service map
- [ ] Upload/generate OpenAPI docs with Try API
- [ ] Search across code, APIs, and docs
- [ ] View architecture graph with clickable nodes
- [ ] See API version diffs between releases

---

### Phase 2 — Knowledge Capture (Months 4–6)

**Goal:** Capture tribal knowledge and expand the graph  
**Target:** Growing teams (50–200 developers)

#### Deliverables

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | Slack plugin (`/atlas save`) | P0 | 🔲 Planned |
| 2 | Auto-suggest knowledge capture in Slack | P1 | 🔲 Planned |
| 3 | ADR (Architecture Decision Record) system | P0 | 🔲 Planned |
| 4 | Dependency explorer (visual graph) | P0 | 🔲 Planned |
| 5 | Component documentation (React) | P1 | 🔲 Planned |
| 6 | Living docs — auto-update on PR merge | P0 | 🔲 Planned |
| 7 | Documentation health dashboard | P1 | 🔲 Planned |
| 8 | Semantic search (vector embeddings) | P1 | 🔲 Planned |
| 9 | GitLab + Bitbucket support | P2 | 🔲 Planned |
| 10 | AsyncAPI + GraphQL schema docs | P1 | 🔲 Planned |

#### Phase 2 Milestones

| Week | Milestone |
|------|-----------|
| 13–14 | Slack bot + `/atlas save` |
| 15–16 | ADR system + linking to graph |
| 17–18 | Dependency explorer |
| 19–20 | Living docs pipeline (PR → doc update) |
| 21–22 | React component docs |
| 23–24 | Health dashboard + semantic search |

#### Phase 2 Exit Criteria

- [ ] Save Slack conversation as knowledge entry
- [ ] Create and link ADRs to services
- [ ] Visualize service dependencies
- [ ] Docs auto-update when API changes in PR
- [ ] Documentation health score visible

---

### Phase 3 — Intelligence (Months 7–12)

**Goal:** AI-powered context and meeting intelligence  
**Target:** Mid-size to large teams (200–1000 developers)

#### Deliverables

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | AI Context Engine API | P0 | 🔲 Planned |
| 2 | Cursor IDE plugin | P0 | 🔲 Planned |
| 3 | VS Code extension | P1 | 🔲 Planned |
| 4 | Meeting capture (Google Meet) | P0 | 🔲 Planned |
| 5 | Meeting capture (Zoom) | P1 | 🔲 Planned |
| 6 | Cloud integrations (AWS) | P1 | 🔲 Planned |
| 7 | gRPC documentation | P2 | 🔲 Planned |
| 8 | GraphQL playground | P1 | 🔲 Planned |
| 9 | Multi-language SDK auto-generation | P1 | 🔲 Planned |
| 10 | Analytics + usage tracking | P1 | 🔲 Planned |
| 11 | `/atlas explain` Slack command | P1 | 🔲 Planned |
| 12 | Incident report linking | P2 | 🔲 Planned |

#### Phase 3 Milestones

| Month | Milestone |
|-------|-----------|
| 7 | AI Context Engine MVP |
| 8 | Cursor + VS Code plugins |
| 9 | Google Meet integration |
| 10 | Zoom + Teams meeting capture |
| 11 | AWS integration + SDK generation |
| 12 | Analytics, polish, GA launch |

#### Phase 3 Exit Criteria

- [ ] AI assistant receives relevant Atlas context automatically
- [ ] Meeting decisions appear in knowledge graph
- [ ] IDE plugin shows service info inline
- [ ] SDKs auto-generated on API change
- [ ] Cloud resources linked to services

---

### Phase 4 — Platform (Month 12+)

**Goal:** Ecosystem and enterprise scale  
**Target:** Enterprise teams (1000+ developers)

#### Deliverables

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | Atlas Plugin Store / Marketplace | P0 | 🔲 Planned |
| 2 | Plugin SDK + developer docs | P0 | 🔲 Planned |
| 3 | Self-hosted deployment | P0 | 🔲 Planned |
| 4 | SSO (SAML, OIDC) | P0 | 🔲 Planned |
| 5 | Audit logs + compliance | P0 | 🔲 Planned |
| 6 | Custom plugin development | P1 | 🔲 Planned |
| 7 | Jira + Linear integrations | P1 | 🔲 Planned |
| 8 | Datadog + Grafana integrations | P2 | 🔲 Planned |
| 9 | Vue + Angular component docs | P2 | 🔲 Planned |
| 10 | SwiftUI + Flutter component docs | P3 | 🔲 Planned |
| 11 | SQL + CLI + WebSocket playgrounds | P2 | 🔲 Planned |
| 12 | Multi-region deployment | P2 | 🔲 Planned |

#### Phase 4 Exit Criteria

- [ ] Third-party plugins available in marketplace
- [ ] Enterprise self-hosted deployment
- [ ] SSO and audit compliance
- [ ] Full plugin SDK documentation

---

### Roadmap Gantt (Visual)

```
Feature                          M1  M2  M3  M4  M5  M6  M7  M8  M9  M10 M11 M12+
─────────────────────────────────────────────────────────────────────────────────
GitHub Integration               ███████████
OpenAPI Docs                     ███████████
Architecture Graph               ███████████
Search                           ███████████
Version Diff                         ███████
Slack Plugin                                     ███████████
ADR System                                       ███████████
Dependency Graph                                 ███████████
Living Docs                                      ███████████
Component Docs                                       ███████
AI Context Engine                                            ███████████
IDE Plugins                                                  ███████████
Meeting Capture                                              ███████████
Cloud Integrations                                                   ███████████
Plugin Marketplace                                                           ████
Enterprise (SSO, Self-hosted)                                                ████
```

---

## 8. Monetization

### 8.1 Pricing Tiers

| Tier | Price | Target | Includes |
|------|-------|--------|----------|
| **Free** | $0 | Open source projects | Public repos, basic docs, community plugins |
| **Pro** | $20/user/month | Small–mid teams | Private repos, analytics, AI search, Slack integration |
| **Enterprise** | $50k–$500k/year | Large orgs | Self-hosted, SSO, compliance, audit logs, custom plugins |

### 8.2 Feature Gating

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Public repo docs | ✅ | ✅ | ✅ |
| Private repos | ❌ | ✅ | ✅ |
| Architecture graph | Basic | Full | Full |
| Search | Keyword | AI semantic | AI semantic |
| Slack integration | ❌ | ✅ | ✅ |
| Meeting capture | ❌ | ❌ | ✅ |
| AI Context Engine | ❌ | ✅ | ✅ |
| IDE plugins | ❌ | ✅ | ✅ |
| Self-hosted | ❌ | ❌ | ✅ |
| SSO | ❌ | ❌ | ✅ |
| Audit logs | ❌ | ❌ | ✅ |
| Custom plugins | ❌ | ❌ | ✅ |
| Plugin marketplace | Community | Community | Private + Community |

### 8.3 Revenue Projections (Illustrative)

| Milestone | Users | MRR |
|-----------|-------|-----|
| Phase 1 beta | 100 free, 20 pro | $400 |
| Phase 2 launch | 500 free, 100 pro | $2,000 |
| Phase 3 GA | 2,000 free, 500 pro, 2 enterprise | $10,000+ |
| Phase 4 scale | 10,000 free, 2,000 pro, 10 enterprise | $40,000+ |

---

## 9. Success Metrics

### 9.1 Product Metrics

| Metric | Phase 1 Target | Phase 3 Target |
|--------|----------------|----------------|
| Repos connected | 50 | 5,000 |
| Docs auto-generated | 200 | 50,000 |
| Knowledge graph entities | 1,000 | 500,000 |
| Search queries/day | 100 | 10,000 |
| Slack captures/week | — | 500 |
| AI context requests/day | — | 5,000 |

### 9.2 Quality Metrics

| Metric | Target |
|--------|--------|
| Doc freshness (updated < 30 days) | > 80% |
| API coverage (documented endpoints) | > 90% |
| Search relevance (click-through) | > 60% |
| Time to answer "who owns X?" | < 10 seconds |

### 9.3 Business Metrics

| Metric | Year 1 Target |
|--------|---------------|
| Paying teams | 50 |
| ARR | $120k |
| NPS | > 40 |
| Churn (monthly) | < 5% |

---

## 10. Competitive Positioning

### 10.1 Landscape

| Product | Strength | Weakness | Atlas Advantage |
|---------|----------|----------|-----------------|
| **Fern** | Great API docs from OpenAPI | No repo intelligence, no knowledge graph | Living docs + full ecosystem understanding |
| **Storybook** | Component previews | Frontend only, manual | Auto-generated from code, multi-framework |
| **Backstage** | Service catalog | Complex setup, no doc generation | Simpler onboarding, auto-generated docs |
| **Notion/Confluence** | Flexible docs | Manual, disconnected from code | Auto-synced from engineering changes |
| **GitBook/ReadMe** | Clean doc sites | Static, no code understanding | Code-aware, living documentation |
| **Sourcegraph** | Code search | No docs, no knowledge capture | Docs + graph + conversation capture |

### 10.2 Why Atlas Wins

1. **Only platform that connects code → docs → conversations → decisions**
2. **Documentation that maintains itself** — no more stale API docs
3. **AI-native** — built for the era of coding assistants
4. **Fern-compatible** — better API docs with everything Fern lacks
5. **Knowledge graph** — answer questions no doc site can answer

### 10.3 Positioning Statement

> **Atlas is the Developer Knowledge Operating System.**  
> We don't just publish documentation — we understand your entire engineering ecosystem, keep knowledge alive, and make it accessible to humans and AI alike.

---

## Appendix A: Entity Relationship Diagram

```
┌─────────────┐     OWNS      ┌─────────────┐
│    Team     │◄──────────────│   Person    │
└──────┬──────┘               └─────────────┘
       │ OWNS
       ▼
┌─────────────┐    CONTAINS   ┌─────────────┐
│  Repository │──────────────▶│   Service   │
└─────────────┘               └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │ USES           │ EXPOSES        │ DOCUMENTED_IN
                    ▼                ▼                ▼
             ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
             │ Dependency  │  │     API     │  │  Document   │
             └─────────────┘  └─────────────┘  └─────────────┘
                                     │
                              DISCUSSED_IN
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
             ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
             │ SlackThread │  │   Meeting   │  │     ADR     │
             └─────────────┘  └─────────────┘  └─────────────┘
```

## Appendix B: API Surface (Planned)

| Endpoint | Method | Phase | Description |
|----------|--------|-------|-------------|
| `/api/v1/repos` | GET, POST | 1 | List/connect repositories |
| `/api/v1/repos/:id/scan` | POST | 1 | Trigger repo scan |
| `/api/v1/services` | GET | 1 | List discovered services |
| `/api/v1/services/:id` | GET | 1 | Service detail + graph |
| `/api/v1/docs` | GET, POST | 1 | Documentation CRUD |
| `/api/v1/docs/:id/diff` | GET | 1 | Version diff |
| `/api/v1/search` | GET | 1 | Hybrid search |
| `/api/v1/graph` | GET | 1 | Knowledge graph query |
| `/api/v1/slack/capture` | POST | 2 | Save Slack knowledge |
| `/api/v1/adrs` | GET, POST | 2 | ADR management |
| `/api/v1/health` | GET | 2 | Documentation health score |
| `/api/v1/context` | POST | 3 | AI context retrieval |
| `/api/v1/meetings` | GET, POST | 3 | Meeting artifacts |
| `/api/v1/plugins` | GET, POST | 4 | Plugin management |

## Appendix C: Team Structure (Recommended)

| Role | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| Full-stack engineer | 2 | 3 | 4 |
| Backend (Go/Rust) | 1 | 2 | 2 |
| Frontend (React) | 1 | 1 | 2 |
| ML/AI engineer | — | — | 1 |
| DevOps | — | 1 | 1 |
| Product/Design | 1 | 1 | 1 |
| **Total** | **5** | **8** | **11** |

---

*This document is the single source of truth for Atlas (Frond) product direction. Update as phases complete and priorities shift.*
