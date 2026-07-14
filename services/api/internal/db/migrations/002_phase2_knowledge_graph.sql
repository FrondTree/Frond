-- +goose Up
CREATE TABLE github_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_user_id BIGINT NOT NULL,
    github_login TEXT NOT NULL,
    access_token TEXT NOT NULL,
    token_scope TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

CREATE TABLE connected_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    github_connection_id UUID NOT NULL REFERENCES github_connections(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    full_name TEXT NOT NULL,
    name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    html_url TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT '',
    linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'scanning', 'completed', 'failed')),
    last_scanned_at TIMESTAMPTZ,
    last_scan_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, github_repo_id)
);

CREATE INDEX idx_connected_repos_org ON connected_repositories(organization_id);

CREATE TABLE scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES connected_repositories(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    trigger_type TEXT NOT NULL DEFAULT 'manual',
    files_scanned INT NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_jobs_status ON scan_jobs(status, created_at);

CREATE TABLE kg_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES connected_repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT '',
    framework TEXT NOT NULL DEFAULT '',
    owners JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (repository_id)
);

CREATE INDEX idx_kg_services_org ON kg_services(organization_id);

CREATE TABLE kg_apis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES kg_services(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES connected_repositories(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    operation_id TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'openapi',
    spec_path TEXT NOT NULL DEFAULT '',
    documented BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (service_id, method, path)
);

CREATE INDEX idx_kg_apis_org ON kg_apis(organization_id);
CREATE INDEX idx_kg_apis_service ON kg_apis(service_id);

CREATE TABLE kg_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES kg_services(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '',
    dep_type TEXT NOT NULL DEFAULT 'package',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (service_id, name, dep_type)
);

CREATE INDEX idx_kg_deps_service ON kg_dependencies(service_id);

CREATE TABLE kg_adrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES connected_repositories(id) ON DELETE CASCADE,
    service_id UUID REFERENCES kg_services(id) ON DELETE SET NULL,
    adr_number TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted',
    content TEXT NOT NULL DEFAULT '',
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (repository_id, file_path)
);

CREATE INDEX idx_kg_adrs_org ON kg_adrs(organization_id);

CREATE TABLE kg_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    relationship TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, source_type, source_id, target_type, target_id, relationship)
);

CREATE INDEX idx_kg_rel_org ON kg_relationships(organization_id);
CREATE INDEX idx_kg_rel_source ON kg_relationships(source_type, source_id);
CREATE INDEX idx_kg_rel_target ON kg_relationships(target_type, target_id);

CREATE TABLE doc_drift_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    repository_id UUID REFERENCES connected_repositories(id) ON DELETE SET NULL,
    service_id UUID REFERENCES kg_services(id) ON DELETE SET NULL,
    pr_number INT,
    pr_url TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drift_org ON doc_drift_alerts(organization_id, status);

CREATE TABLE doc_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    score INT NOT NULL DEFAULT 0,
    coverage_pct INT NOT NULL DEFAULT 0,
    api_total INT NOT NULL DEFAULT 0,
    api_documented INT NOT NULL DEFAULT 0,
    stale_pages INT NOT NULL DEFAULT 0,
    issues JSONB NOT NULL DEFAULT '[]',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_org ON doc_health_snapshots(organization_id, computed_at DESC);

-- +goose Down
DROP TABLE IF EXISTS doc_health_snapshots;
DROP TABLE IF EXISTS doc_drift_alerts;
DROP TABLE IF EXISTS kg_relationships;
DROP TABLE IF EXISTS kg_adrs;
DROP TABLE IF EXISTS kg_dependencies;
DROP TABLE IF EXISTS kg_apis;
DROP TABLE IF EXISTS kg_services;
DROP TABLE IF EXISTS scan_jobs;
DROP TABLE IF EXISTS connected_repositories;
DROP TABLE IF EXISTS github_connections;
