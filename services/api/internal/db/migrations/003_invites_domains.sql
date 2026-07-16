-- Org invites + custom domain lookup helpers

CREATE TABLE IF NOT EXISTS org_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deployments_custom_domain
    ON deployments (lower(custom_domain))
    WHERE custom_domain IS NOT NULL AND custom_domain <> '';

-- Optional GitHub App installation id on connections
ALTER TABLE github_connections
    ADD COLUMN IF NOT EXISTS installation_id BIGINT;
