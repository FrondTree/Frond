package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound           = errors.New("not found")
	ErrAlreadyExists      = errors.New("already exists")
	ErrForbidden          = errors.New("forbidden")
	ErrInvalidCredentials = errors.New("invalid credentials")
)

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) UpsertGoogleUser(ctx context.Context, googleID, email, name, avatar string) (*models.User, error) {
	var u models.User
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (email, name, avatar_url, google_id, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (email) DO UPDATE SET
			name = EXCLUDED.name,
			avatar_url = EXCLUDED.avatar_url,
			google_id = COALESCE(users.google_id, EXCLUDED.google_id),
			updated_at = NOW()
		RETURNING id, email, COALESCE(username, ''), name, avatar_url, google_id, created_at, updated_at
	`, email, name, avatar, googleID).Scan(
		&u.ID, &u.Email, &u.Username, &u.Name, &u.AvatarURL, &u.GoogleID, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var u models.User
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, COALESCE(username, ''), name, avatar_url, google_id, created_at, updated_at
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.Email, &u.Username, &u.Name, &u.AvatarURL, &u.GoogleID, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (s *Store) AuthenticateUser(ctx context.Context, login, password string) (*models.User, error) {
	var u models.User
	var passwordHash *string
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, COALESCE(username, ''), name, avatar_url, google_id, password_hash, created_at, updated_at
		FROM users WHERE email = $1 OR username = $1
	`, login).Scan(
		&u.ID, &u.Email, &u.Username, &u.Name, &u.AvatarURL, &u.GoogleID, &passwordHash, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}
	if passwordHash == nil || *passwordHash == "" {
		return nil, ErrInvalidCredentials
	}
	if !auth.CheckPassword(*passwordHash, password) {
		return nil, ErrInvalidCredentials
	}
	return &u, nil
}

func (s *Store) CreateOrganization(ctx context.Context, userID uuid.UUID, name, slug string) (*models.Organization, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var org models.Organization
	err = tx.QueryRow(ctx, `
		INSERT INTO organizations (name, slug, updated_at) VALUES ($1, $2, NOW())
		RETURNING id, name, slug, plan, created_at, updated_at
	`, name, slug).Scan(&org.ID, &org.Name, &org.Slug, &org.Plan, &org.CreatedAt, &org.UpdatedAt)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO organization_members (organization_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, org.ID, userID)
	if err != nil {
		return nil, err
	}

	org.Role = "owner"
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &org, nil
}

func (s *Store) ListOrganizations(ctx context.Context, userID uuid.UUID) ([]models.Organization, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT o.id, o.name, o.slug, o.plan, om.role, o.created_at, o.updated_at
		FROM organizations o
		JOIN organization_members om ON om.organization_id = o.id
		WHERE om.user_id = $1
		ORDER BY o.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []models.Organization
	for rows.Next() {
		var o models.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.Plan, &o.Role, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		orgs = append(orgs, o)
	}
	return orgs, rows.Err()
}

func (s *Store) GetOrganizationBySlug(ctx context.Context, slug string) (*models.Organization, error) {
	var o models.Organization
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, slug, plan, created_at, updated_at FROM organizations WHERE slug = $1
	`, slug).Scan(&o.ID, &o.Name, &o.Slug, &o.Plan, &o.CreatedAt, &o.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &o, err
}

func (s *Store) UserOrgRole(ctx context.Context, userID, orgID uuid.UUID) (string, error) {
	var role string
	err := s.pool.QueryRow(ctx, `
		SELECT role FROM organization_members WHERE user_id = $1 AND organization_id = $2
	`, userID, orgID).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrForbidden
	}
	return role, err
}

func (s *Store) CreateProject(ctx context.Context, orgID uuid.UUID, name, slug, description, visibility string, config json.RawMessage) (*models.Project, error) {
	var p models.Project
	err := s.pool.QueryRow(ctx, `
		INSERT INTO projects (organization_id, name, slug, description, visibility, config, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		RETURNING id, organization_id, name, slug, description, visibility, config, created_at, updated_at
	`, orgID, name, slug, description, visibility, config).Scan(
		&p.ID, &p.OrganizationID, &p.Name, &p.Slug, &p.Description, &p.Visibility, &p.Config, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Store) ListProjects(ctx context.Context, orgID uuid.UUID) ([]models.Project, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, name, slug, description, visibility, config, created_at, updated_at
		FROM projects WHERE organization_id = $1 ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var p models.Project
		if err := rows.Scan(&p.ID, &p.OrganizationID, &p.Name, &p.Slug, &p.Description, &p.Visibility, &p.Config, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (s *Store) GetProjectByOrgSlug(ctx context.Context, orgSlug, projectSlug string) (*models.Project, *models.Organization, error) {
	org, err := s.GetOrganizationBySlug(ctx, orgSlug)
	if err != nil {
		return nil, nil, err
	}

	var p models.Project
	err = s.pool.QueryRow(ctx, `
		SELECT id, organization_id, name, slug, description, visibility, config, created_at, updated_at
		FROM projects WHERE organization_id = $1 AND slug = $2
	`, org.ID, projectSlug).Scan(
		&p.ID, &p.OrganizationID, &p.Name, &p.Slug, &p.Description, &p.Visibility, &p.Config, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, ErrNotFound
	}
	return &p, org, err
}

func (s *Store) GetProjectByID(ctx context.Context, id uuid.UUID) (*models.Project, error) {
	var p models.Project
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, name, slug, description, visibility, config, created_at, updated_at
		FROM projects WHERE id = $1
	`, id).Scan(&p.ID, &p.OrganizationID, &p.Name, &p.Slug, &p.Description, &p.Visibility, &p.Config, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (s *Store) SaveOAuthState(ctx context.Context, state, redirectURI string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO oauth_states (state, redirect_uri) VALUES ($1, $2)
	`, state, redirectURI)
	return err
}

func (s *Store) ConsumeOAuthState(ctx context.Context, state string) (string, error) {
	var redirectURI string
	err := s.pool.QueryRow(ctx, `
		DELETE FROM oauth_states WHERE state = $1 RETURNING redirect_uri
	`, state).Scan(&redirectURI)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return redirectURI, err
}

func (s *Store) CreateAPIKey(ctx context.Context, userID, orgID uuid.UUID, name, keyHash, prefix string) (*models.APIKey, error) {
	var k models.APIKey
	err := s.pool.QueryRow(ctx, `
		INSERT INTO api_keys (user_id, organization_id, name, key_hash, key_prefix)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, organization_id, name, key_prefix, created_at
	`, userID, orgID, name, keyHash, prefix).Scan(
		&k.ID, &k.UserID, &k.OrganizationID, &k.Name, &k.KeyPrefix, &k.CreatedAt,
	)
	return &k, err
}

func (s *Store) GetUserByAPIKey(ctx context.Context, keyHash string) (uuid.UUID, uuid.UUID, error) {
	var userID, orgID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		UPDATE api_keys SET last_used_at = NOW()
		WHERE key_hash = $1
		RETURNING user_id, organization_id
	`, keyHash).Scan(&userID, &orgID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, uuid.Nil, ErrNotFound
	}
	return userID, orgID, err
}

func (s *Store) PublishDocVersion(ctx context.Context, projectID uuid.UUID, versionLabel, openapiHash, bundlePath string, manifest json.RawMessage) (*models.DocVersion, *models.Deployment, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `UPDATE doc_versions SET is_latest = FALSE WHERE project_id = $1`, projectID)
	if err != nil {
		return nil, nil, err
	}

	var dv models.DocVersion
	err = tx.QueryRow(ctx, `
		INSERT INTO doc_versions (project_id, version_label, openapi_hash, bundle_path, manifest, is_latest)
		VALUES ($1, $2, $3, $4, $5, TRUE)
		RETURNING id, project_id, version_label, openapi_hash, bundle_path, manifest, is_latest, published_at, created_at
	`, projectID, versionLabel, openapiHash, bundlePath, manifest).Scan(
		&dv.ID, &dv.ProjectID, &dv.VersionLabel, &dv.OpenAPIHash, &dv.BundlePath, &dv.Manifest, &dv.IsLatest, &dv.PublishedAt, &dv.CreatedAt,
	)
	if err != nil {
		return nil, nil, err
	}

	var p models.Project
	var org models.Organization
	err = tx.QueryRow(ctx, `SELECT slug, organization_id FROM projects WHERE id = $1`, projectID).Scan(&p.Slug, &p.OrganizationID)
	if err != nil {
		return nil, nil, err
	}
	err = tx.QueryRow(ctx, `SELECT slug FROM organizations WHERE id = $1`, p.OrganizationID).Scan(&org.Slug)
	if err != nil {
		return nil, nil, err
	}

	docsBase := os.Getenv("DOCS_PUBLIC_URL")
	if docsBase == "" {
		docsBase = "http://localhost:3001"
	}
	url := fmt.Sprintf("%s/%s/%s", strings.TrimRight(docsBase, "/"), org.Slug, p.Slug)
	var dep models.Deployment
	err = tx.QueryRow(ctx, `
		INSERT INTO deployments (project_id, doc_version_id, url, status)
		VALUES ($1, $2, $3, 'active')
		RETURNING id, project_id, doc_version_id, url, custom_domain, status, created_at
	`, projectID, dv.ID, url).Scan(
		&dep.ID, &dep.ProjectID, &dep.DocVersionID, &dep.URL, &dep.CustomDomain, &dep.Status, &dep.CreatedAt,
	)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return &dv, &dep, nil
}

func (s *Store) GetLatestDocVersion(ctx context.Context, projectID uuid.UUID) (*models.DocVersion, error) {
	var dv models.DocVersion
	err := s.pool.QueryRow(ctx, `
		SELECT id, project_id, version_label, openapi_hash, bundle_path, manifest, is_latest, published_at, created_at
		FROM doc_versions WHERE project_id = $1 AND is_latest = TRUE
		ORDER BY published_at DESC LIMIT 1
	`, projectID).Scan(
		&dv.ID, &dv.ProjectID, &dv.VersionLabel, &dv.OpenAPIHash, &dv.BundlePath, &dv.Manifest, &dv.IsLatest, &dv.PublishedAt, &dv.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &dv, err
}

func (s *Store) ListDeployments(ctx context.Context, projectID uuid.UUID) ([]models.Deployment, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, project_id, doc_version_id, url, custom_domain, status, created_at
		FROM deployments WHERE project_id = $1 ORDER BY created_at DESC LIMIT 20
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deps []models.Deployment
	for rows.Next() {
		var d models.Deployment
		if err := rows.Scan(&d.ID, &d.ProjectID, &d.DocVersionID, &d.URL, &d.CustomDomain, &d.Status, &d.CreatedAt); err != nil {
			return nil, err
		}
		deps = append(deps, d)
	}
	return deps, rows.Err()
}

func (s *Store) CleanupExpiredStates(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM oauth_states WHERE created_at < $1`, time.Now().Add(-15*time.Minute))
	return err
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, COALESCE(username, ''), name, avatar_url, google_id, created_at, updated_at
		FROM users WHERE lower(email) = lower($1)
	`, email).Scan(&u.ID, &u.Email, &u.Username, &u.Name, &u.AvatarURL, &u.GoogleID, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (s *Store) ListOrgMembers(ctx context.Context, orgID uuid.UUID) ([]models.OrgMember, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT u.id, u.email, u.name, COALESCE(u.username, ''), om.role, om.created_at
		FROM organization_members om
		JOIN users u ON u.id = om.user_id
		WHERE om.organization_id = $1
		ORDER BY om.created_at ASC
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.OrgMember
	for rows.Next() {
		var m models.OrgMember
		if err := rows.Scan(&m.UserID, &m.Email, &m.Name, &m.Username, &m.Role, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) CreateOrgInvite(ctx context.Context, orgID, invitedBy uuid.UUID, email, role, token string, expiresAt time.Time) (*models.OrgInvite, error) {
	if role == "" {
		role = "member"
	}
	var inv models.OrgInvite
	err := s.pool.QueryRow(ctx, `
		INSERT INTO org_invites (organization_id, email, role, token, invited_by, expires_at)
		VALUES ($1, lower($2), $3, $4, $5, $6)
		RETURNING id, organization_id, email, role, token, invited_by, accepted_at, expires_at, created_at
	`, orgID, email, role, token, invitedBy, expiresAt).Scan(
		&inv.ID, &inv.OrganizationID, &inv.Email, &inv.Role, &inv.Token, &inv.InvitedBy, &inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt,
	)
	return &inv, err
}

func (s *Store) ListOrgInvites(ctx context.Context, orgID uuid.UUID) ([]models.OrgInvite, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, email, role, token, invited_by, accepted_at, expires_at, created_at
		FROM org_invites
		WHERE organization_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
		ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.OrgInvite
	for rows.Next() {
		var inv models.OrgInvite
		if err := rows.Scan(&inv.ID, &inv.OrganizationID, &inv.Email, &inv.Role, &inv.Token, &inv.InvitedBy, &inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, inv)
	}
	return out, rows.Err()
}

func (s *Store) AcceptOrgInvite(ctx context.Context, token string, userID uuid.UUID, userEmail string) (*models.Organization, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var inv models.OrgInvite
	err = tx.QueryRow(ctx, `
		SELECT id, organization_id, email, role, token, invited_by, accepted_at, expires_at, created_at
		FROM org_invites WHERE token = $1 FOR UPDATE
	`, token).Scan(
		&inv.ID, &inv.OrganizationID, &inv.Email, &inv.Role, &inv.Token, &inv.InvitedBy, &inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if inv.AcceptedAt != nil || inv.ExpiresAt.Before(time.Now()) {
		return nil, ErrForbidden
	}
	if !strings.EqualFold(inv.Email, userEmail) {
		return nil, ErrForbidden
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO organization_members (organization_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`, inv.OrganizationID, userID, inv.Role)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE org_invites SET accepted_at = NOW() WHERE id = $1`, inv.ID)
	if err != nil {
		return nil, err
	}

	var org models.Organization
	err = tx.QueryRow(ctx, `
		SELECT id, name, slug, plan, created_at, updated_at FROM organizations WHERE id = $1
	`, inv.OrganizationID).Scan(&org.ID, &org.Name, &org.Slug, &org.Plan, &org.CreatedAt, &org.UpdatedAt)
	if err != nil {
		return nil, err
	}
	org.Role = inv.Role
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &org, nil
}

func (s *Store) SetDeploymentCustomDomain(ctx context.Context, projectID uuid.UUID, domain string) (*models.Deployment, error) {
	domain = strings.ToLower(strings.TrimSpace(domain))
	var dep models.Deployment
	err := s.pool.QueryRow(ctx, `
		UPDATE deployments
		SET custom_domain = NULLIF($2, '')
		WHERE id = (
			SELECT id FROM deployments WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1
		)
		RETURNING id, project_id, doc_version_id, url, custom_domain, status, created_at
	`, projectID, domain).Scan(
		&dep.ID, &dep.ProjectID, &dep.DocVersionID, &dep.URL, &dep.CustomDomain, &dep.Status, &dep.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &dep, err
}

func (s *Store) ResolveCustomDomain(ctx context.Context, host string) (*models.Organization, *models.Project, *models.Deployment, error) {
	host = strings.ToLower(strings.TrimSpace(host))
	host = strings.TrimPrefix(host, "https://")
	host = strings.TrimPrefix(host, "http://")
	if i := strings.Index(host, "/"); i >= 0 {
		host = host[:i]
	}
	var dep models.Deployment
	var org models.Organization
	var p models.Project
	err := s.pool.QueryRow(ctx, `
		SELECT d.id, d.project_id, d.doc_version_id, d.url, d.custom_domain, d.status, d.created_at,
		       o.id, o.name, o.slug, o.plan, o.created_at, o.updated_at,
		       p.id, p.organization_id, p.name, p.slug, p.description, p.visibility, p.config, p.created_at, p.updated_at
		FROM deployments d
		JOIN projects p ON p.id = d.project_id
		JOIN organizations o ON o.id = p.organization_id
		WHERE lower(d.custom_domain) = $1 AND d.status = 'active'
		ORDER BY d.created_at DESC
		LIMIT 1
	`, host).Scan(
		&dep.ID, &dep.ProjectID, &dep.DocVersionID, &dep.URL, &dep.CustomDomain, &dep.Status, &dep.CreatedAt,
		&org.ID, &org.Name, &org.Slug, &org.Plan, &org.CreatedAt, &org.UpdatedAt,
		&p.ID, &p.OrganizationID, &p.Name, &p.Slug, &p.Description, &p.Visibility, &p.Config, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, nil, ErrNotFound
	}
	return &org, &p, &dep, err
}
