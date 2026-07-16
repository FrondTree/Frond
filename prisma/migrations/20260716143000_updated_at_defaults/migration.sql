-- Go API inserts via pgx don't set updated_at; Prisma @updatedAt only runs in the Prisma client.
-- Add DB defaults so raw SQL inserts succeed.

ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "organizations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "github_connections" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "connected_repositories" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "kg_services" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
