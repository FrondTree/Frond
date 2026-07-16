-- Company docs subdomain (acme.frond.dev)

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS docs_subdomain TEXT;

UPDATE organizations
SET docs_subdomain = slug
WHERE docs_subdomain IS NULL OR docs_subdomain = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_docs_subdomain
    ON organizations (lower(docs_subdomain))
    WHERE docs_subdomain IS NOT NULL AND docs_subdomain <> '';
