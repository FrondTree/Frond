package graphstore

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/parser"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) UpsertGitHubConnection(ctx context.Context, orgID, userID uuid.UUID, ghUserID int64, login, token, scope string) (*models.GitHubConnection, error) {
	var conn models.GitHubConnection
	err := s.pool.QueryRow(ctx, `
		INSERT INTO github_connections (organization_id, user_id, github_user_id, github_login, access_token, token_scope, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (organization_id) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			github_user_id = EXCLUDED.github_user_id,
			github_login = EXCLUDED.github_login,
			access_token = EXCLUDED.access_token,
			token_scope = EXCLUDED.token_scope,
			updated_at = NOW()
		RETURNING id, organization_id, user_id, github_user_id, github_login, created_at, updated_at
	`, orgID, userID, ghUserID, login, token, scope).Scan(
		&conn.ID, &conn.OrganizationID, &conn.UserID, &conn.GitHubUserID, &conn.GitHubLogin, &conn.CreatedAt, &conn.UpdatedAt,
	)
	return &conn, err
}

func (s *Store) GetGitHubToken(ctx context.Context, orgID uuid.UUID) (string, error) {
	var token string
	err := s.pool.QueryRow(ctx, `SELECT access_token FROM github_connections WHERE organization_id = $1`, orgID).Scan(&token)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", store.ErrNotFound
	}
	return token, err
}

func (s *Store) GetGitHubConnection(ctx context.Context, orgID uuid.UUID) (*models.GitHubConnection, error) {
	var conn models.GitHubConnection
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, user_id, github_user_id, github_login, created_at, updated_at
		FROM github_connections WHERE organization_id = $1
	`, orgID).Scan(&conn.ID, &conn.OrganizationID, &conn.UserID, &conn.GitHubUserID, &conn.GitHubLogin, &conn.CreatedAt, &conn.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	return &conn, err
}

func (s *Store) ConnectRepository(ctx context.Context, orgID, connID uuid.UUID, repo models.GitHubRepoListing, linkedProjectID *uuid.UUID) (*models.ConnectedRepository, error) {
	branch := repo.DefaultBranch
	if branch == "" {
		branch = "main"
	}
	var r models.ConnectedRepository
	err := s.pool.QueryRow(ctx, `
		INSERT INTO connected_repositories (
			organization_id, github_connection_id, github_repo_id, full_name, name,
			default_branch, html_url, description, language, linked_project_id, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
		ON CONFLICT (organization_id, github_repo_id) DO UPDATE SET
			full_name = EXCLUDED.full_name,
			description = EXCLUDED.description,
			language = EXCLUDED.language,
			linked_project_id = COALESCE(EXCLUDED.linked_project_id, connected_repositories.linked_project_id),
			updated_at = NOW()
		RETURNING id, organization_id, github_connection_id, github_repo_id, full_name, name,
			default_branch, html_url, description, language, linked_project_id, scan_status,
			last_scanned_at, last_scan_error, created_at, updated_at
	`, orgID, connID, repo.ID, repo.FullName, repo.Name, branch, repo.HTMLURL, repo.Description, repo.Language, linkedProjectID).Scan(
		&r.ID, &r.OrganizationID, &r.GitHubConnectionID, &r.GitHubRepoID, &r.FullName, &r.Name,
		&r.DefaultBranch, &r.HTMLURL, &r.Description, &r.Language, &r.LinkedProjectID, &r.ScanStatus,
		&r.LastScannedAt, &r.LastScanError, &r.CreatedAt, &r.UpdatedAt,
	)
	return &r, err
}

func (s *Store) ListConnectedRepositories(ctx context.Context, orgID uuid.UUID) ([]models.ConnectedRepository, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, github_connection_id, github_repo_id, full_name, name,
			default_branch, html_url, description, language, linked_project_id, scan_status,
			last_scanned_at, last_scan_error, created_at, updated_at
		FROM connected_repositories WHERE organization_id = $1 ORDER BY name
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanConnectedRepos(rows)
}

func scanConnectedRepos(rows pgx.Rows) ([]models.ConnectedRepository, error) {
	var repos []models.ConnectedRepository
	for rows.Next() {
		var r models.ConnectedRepository
		if err := rows.Scan(
			&r.ID, &r.OrganizationID, &r.GitHubConnectionID, &r.GitHubRepoID, &r.FullName, &r.Name,
			&r.DefaultBranch, &r.HTMLURL, &r.Description, &r.Language, &r.LinkedProjectID, &r.ScanStatus,
			&r.LastScannedAt, &r.LastScanError, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		repos = append(repos, r)
	}
	return repos, rows.Err()
}

func (s *Store) EnqueueScanJob(ctx context.Context, orgID, repoID uuid.UUID, trigger string) (*models.ScanJob, error) {
	var job models.ScanJob
	err := s.pool.QueryRow(ctx, `
		INSERT INTO scan_jobs (repository_id, organization_id, status, trigger_type)
		VALUES ($1, $2, 'queued', $3)
		RETURNING id, repository_id, organization_id, status, trigger_type, files_scanned, error_message, started_at, completed_at, created_at
	`, repoID, orgID, trigger).Scan(
		&job.ID, &job.RepositoryID, &job.OrganizationID, &job.Status, &job.TriggerType,
		&job.FilesScanned, &job.ErrorMessage, &job.StartedAt, &job.CompletedAt, &job.CreatedAt,
	)
	return &job, err
}

func (s *Store) ClaimNextScanJob(ctx context.Context) (*models.ScanJob, *models.ConnectedRepository, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	var job models.ScanJob
	err = tx.QueryRow(ctx, `
		SELECT id, repository_id, organization_id, status, trigger_type, files_scanned, error_message, started_at, completed_at, created_at
		FROM scan_jobs WHERE status = 'queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
	`).Scan(
		&job.ID, &job.RepositoryID, &job.OrganizationID, &job.Status, &job.TriggerType,
		&job.FilesScanned, &job.ErrorMessage, &job.StartedAt, &job.CompletedAt, &job.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}

	_, err = tx.Exec(ctx, `UPDATE scan_jobs SET status = 'running', started_at = NOW() WHERE id = $1`, job.ID)
	if err != nil {
		return nil, nil, err
	}

	var repo models.ConnectedRepository
	err = tx.QueryRow(ctx, `
		SELECT id, organization_id, github_connection_id, github_repo_id, full_name, name,
			default_branch, html_url, description, language, linked_project_id, scan_status,
			last_scanned_at, last_scan_error, created_at, updated_at
		FROM connected_repositories WHERE id = $1
	`, job.RepositoryID).Scan(
		&repo.ID, &repo.OrganizationID, &repo.GitHubConnectionID, &repo.GitHubRepoID, &repo.FullName, &repo.Name,
		&repo.DefaultBranch, &repo.HTMLURL, &repo.Description, &repo.Language, &repo.LinkedProjectID, &repo.ScanStatus,
		&repo.LastScannedAt, &repo.LastScanError, &repo.CreatedAt, &repo.UpdatedAt,
	)
	if err != nil {
		return nil, nil, err
	}

	_, err = tx.Exec(ctx, `UPDATE connected_repositories SET scan_status = 'scanning', updated_at = NOW() WHERE id = $1`, repo.ID)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	job.Status = "running"
	return &job, &repo, nil
}

func (s *Store) CompleteScanJob(ctx context.Context, jobID, repoID uuid.UUID, filesScanned int, scanErr error) error {
	status := "completed"
	var errMsg *string
	repoStatus := "completed"
	if scanErr != nil {
		status = "failed"
		repoStatus = "failed"
		msg := scanErr.Error()
		errMsg = &msg
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		UPDATE scan_jobs SET status = $2, files_scanned = $3, error_message = $4, completed_at = NOW() WHERE id = $1
	`, jobID, status, filesScanned, errMsg)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		UPDATE connected_repositories SET scan_status = $2, last_scanned_at = NOW(), last_scan_error = $3, updated_at = NOW() WHERE id = $1
	`, repoID, repoStatus, errMsg)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Store) SaveScanResult(ctx context.Context, orgID uuid.UUID, repo *models.ConnectedRepository, result *parser.ScanResult) (*models.KGService, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	ownersJSON, _ := json.Marshal(result.Owners)
	metaJSON, _ := json.Marshal(map[string]interface{}{
		"openapi_paths": result.OpenAPIPaths,
	})

	slug := slugify(result.ServiceName)
	var svc models.KGService
	err = tx.QueryRow(ctx, `
		INSERT INTO kg_services (organization_id, repository_id, name, slug, description, language, framework, owners, metadata, linked_project_id, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
		ON CONFLICT (repository_id) DO UPDATE SET
			name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description,
			language = EXCLUDED.language, framework = EXCLUDED.framework,
			owners = EXCLUDED.owners, metadata = EXCLUDED.metadata, updated_at = NOW()
		RETURNING id, organization_id, repository_id, name, slug, description, language, framework, owners, metadata, linked_project_id, created_at, updated_at
	`, orgID, repo.ID, result.ServiceName, slug, result.Description, result.Language, result.Framework, ownersJSON, metaJSON, repo.LinkedProjectID).Scan(
		&svc.ID, &svc.OrganizationID, &svc.RepositoryID, &svc.Name, &svc.Slug, &svc.Description,
		&svc.Language, &svc.Framework, &svc.Owners, &svc.Metadata, &svc.LinkedProjectID, &svc.CreatedAt, &svc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	_, _ = tx.Exec(ctx, `DELETE FROM kg_apis WHERE service_id = $1`, svc.ID)
	_, _ = tx.Exec(ctx, `DELETE FROM kg_dependencies WHERE service_id = $1`, svc.ID)
	_, _ = tx.Exec(ctx, `DELETE FROM kg_adrs WHERE repository_id = $1`, repo.ID)

	for _, ep := range result.APIs {
		source := ep.Source
		if source == "" {
			source = "openapi"
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO kg_apis (organization_id, service_id, repository_id, method, path, summary, description, operation_id, source, spec_path)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			ON CONFLICT (service_id, method, path) DO UPDATE SET summary = EXCLUDED.summary, source = EXCLUDED.source
		`, orgID, svc.ID, repo.ID, ep.Method, ep.Path, ep.Summary, ep.Description, ep.OperationID, source, ep.SpecPath)
		if err != nil {
			return nil, err
		}
	}

	for _, dep := range result.Dependencies {
		meta, _ := json.Marshal(map[string]string{"ecosystem": dep.Type})
		_, err = tx.Exec(ctx, `
			INSERT INTO kg_dependencies (organization_id, service_id, name, version, dep_type, metadata)
			VALUES ($1,$2,$3,$4,$5,$6)
			ON CONFLICT (service_id, name, dep_type) DO UPDATE SET version = EXCLUDED.version
		`, orgID, svc.ID, dep.Name, dep.Version, dep.Type, meta)
		if err != nil {
			return nil, err
		}
	}

	for _, adr := range result.ADRs {
		_, err = tx.Exec(ctx, `
			INSERT INTO kg_adrs (organization_id, repository_id, service_id, adr_number, title, status, content, file_path)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			ON CONFLICT (repository_id, file_path) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content
		`, orgID, repo.ID, svc.ID, adr.Number, adr.Title, adr.Status, adr.Content, adr.Path)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &svc, nil
}

func (s *Store) ListServices(ctx context.Context, orgID uuid.UUID) ([]models.KGService, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT s.id, s.organization_id, s.repository_id, s.name, s.slug, s.description, s.language, s.framework,
			s.owners, s.metadata, s.linked_project_id, s.created_at, s.updated_at, r.full_name, r.html_url
		FROM kg_services s
		JOIN connected_repositories r ON r.id = s.repository_id
		WHERE s.organization_id = $1 ORDER BY s.name
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.KGService
	for rows.Next() {
		var svc models.KGService
		if err := rows.Scan(
			&svc.ID, &svc.OrganizationID, &svc.RepositoryID, &svc.Name, &svc.Slug, &svc.Description,
			&svc.Language, &svc.Framework, &svc.Owners, &svc.Metadata, &svc.LinkedProjectID,
			&svc.CreatedAt, &svc.UpdatedAt, &svc.RepositoryName, &svc.HTMLURL,
		); err != nil {
			return nil, err
		}
		services = append(services, svc)
	}
	return services, rows.Err()
}

func (s *Store) GetServiceDetail(ctx context.Context, orgID, serviceID uuid.UUID) (*models.ServiceDetail, error) {
	var svc models.KGService
	err := s.pool.QueryRow(ctx, `
		SELECT s.id, s.organization_id, s.repository_id, s.name, s.slug, s.description, s.language, s.framework,
			s.owners, s.metadata, s.linked_project_id, s.created_at, s.updated_at, r.full_name, r.html_url
		FROM kg_services s JOIN connected_repositories r ON r.id = s.repository_id
		WHERE s.organization_id = $1 AND s.id = $2
	`, orgID, serviceID).Scan(
		&svc.ID, &svc.OrganizationID, &svc.RepositoryID, &svc.Name, &svc.Slug, &svc.Description,
		&svc.Language, &svc.Framework, &svc.Owners, &svc.Metadata, &svc.LinkedProjectID,
		&svc.CreatedAt, &svc.UpdatedAt, &svc.RepositoryName, &svc.HTMLURL,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	detail := &models.ServiceDetail{Service: svc}
	detail.APIs, _ = s.listAPIs(ctx, serviceID)
	detail.Dependencies, _ = s.listDeps(ctx, serviceID)
	detail.ADRs, _ = s.listADRs(ctx, svc.RepositoryID)
	return detail, nil
}

func (s *Store) listAPIs(ctx context.Context, serviceID uuid.UUID) ([]models.KGAPI, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, service_id, repository_id, method, path, summary, description, operation_id, source, spec_path, documented
		FROM kg_apis WHERE service_id = $1 ORDER BY path, method
	`, serviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var apis []models.KGAPI
	for rows.Next() {
		var a models.KGAPI
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.ServiceID, &a.RepositoryID, &a.Method, &a.Path, &a.Summary, &a.Description, &a.OperationID, &a.Source, &a.SpecPath, &a.Documented); err != nil {
			return nil, err
		}
		apis = append(apis, a)
	}
	return apis, rows.Err()
}

func (s *Store) listDeps(ctx context.Context, serviceID uuid.UUID) ([]models.KGDependency, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, service_id, name, version, dep_type, metadata FROM kg_dependencies WHERE service_id = $1 ORDER BY dep_type, name
	`, serviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var deps []models.KGDependency
	for rows.Next() {
		var d models.KGDependency
		if err := rows.Scan(&d.ID, &d.OrganizationID, &d.ServiceID, &d.Name, &d.Version, &d.DepType, &d.Metadata); err != nil {
			return nil, err
		}
		deps = append(deps, d)
	}
	return deps, rows.Err()
}

func (s *Store) listADRs(ctx context.Context, repoID uuid.UUID) ([]models.KGADR, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, repository_id, service_id, adr_number, title, status, content, file_path
		FROM kg_adrs WHERE repository_id = $1 ORDER BY adr_number
	`, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var adrs []models.KGADR
	for rows.Next() {
		var a models.KGADR
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.RepositoryID, &a.ServiceID, &a.ADRNumber, &a.Title, &a.Status, &a.Content, &a.FilePath); err != nil {
			return nil, err
		}
		adrs = append(adrs, a)
	}
	return adrs, rows.Err()
}

func (s *Store) BuildArchitectureGraph(ctx context.Context, orgID uuid.UUID) (*models.ArchitectureGraph, error) {
	services, err := s.ListServices(ctx, orgID)
	if err != nil {
		return nil, err
	}

	n := len(services)
	cols := int(math.Ceil(math.Sqrt(float64(n))))
	if cols < 1 {
		cols = 1
	}

	graph := &models.ArchitectureGraph{Nodes: []models.GraphNode{}, Edges: []models.GraphEdge{}}
	serviceNodeIDs := map[uuid.UUID]string{}

	for i, svc := range services {
		nodeID := "service-" + svc.ID.String()
		serviceNodeIDs[svc.ID] = nodeID
		data, _ := json.Marshal(map[string]interface{}{
			"service_id": svc.ID, "slug": svc.Slug, "language": svc.Language, "framework": svc.Framework,
			"repository": svc.RepositoryName, "html_url": svc.HTMLURL, "owners": svc.Owners,
		})
		graph.Nodes = append(graph.Nodes, models.GraphNode{
			ID: nodeID, Type: "service", Label: svc.Name, Data: data,
			Position: &models.GraphPosition{X: float64(i%cols) * 280, Y: float64(i/cols) * 180},
		})
	}

	for _, svc := range services {
		deps, _ := s.listDeps(ctx, svc.ID)
		srcID := serviceNodeIDs[svc.ID]
		for _, dep := range deps {
			if dep.DepType == "package" || dep.DepType == "go" || dep.DepType == "external" {
				depNodeID := "dep-" + dep.Name
				found := false
				for _, n := range graph.Nodes {
					if n.ID == depNodeID {
						found = true
						break
					}
				}
				if !found {
					data, _ := json.Marshal(map[string]string{"name": dep.Name, "version": dep.Version, "type": dep.DepType})
					graph.Nodes = append(graph.Nodes, models.GraphNode{
						ID: depNodeID, Type: "dependency", Label: dep.Name, Data: data,
						Position: &models.GraphPosition{X: 600, Y: float64(len(graph.Nodes) * 60)},
					})
				}
				graph.Edges = append(graph.Edges, models.GraphEdge{
					ID: srcID + "-" + depNodeID, Source: srcID, Target: depNodeID, Relationship: "USES", Label: "uses",
				})
			}
		}
	}

	return graph, nil
}

func (s *Store) ListDocumentedEndpointKeys(ctx context.Context, orgID uuid.UUID) []string {
	rows, err := s.pool.Query(ctx, `
		SELECT DISTINCT UPPER(a.method) || ' ' || a.path
		FROM kg_apis a
		WHERE a.organization_id = $1 AND a.documented = TRUE
	`, orgID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var keys []string
	for rows.Next() {
		var k string
		if rows.Scan(&k) == nil {
			keys = append(keys, k)
		}
	}
	return keys
}

func (s *Store) MarkDocumentedAPIs(ctx context.Context, orgID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE kg_apis a SET documented = TRUE
		FROM kg_services s
		JOIN projects p ON p.id = s.linked_project_id
		JOIN doc_versions dv ON dv.project_id = p.id AND dv.is_latest = TRUE
		WHERE a.service_id = s.id AND a.organization_id = $1
	`, orgID)
	return err
}

func (s *Store) ComputeHealth(ctx context.Context, orgID uuid.UUID) (*models.DocHealthSnapshot, error) {
	var total, documented int
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kg_apis WHERE organization_id = $1`, orgID).Scan(&total)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kg_apis WHERE organization_id = $1 AND documented = TRUE`, orgID).Scan(&documented)

	coverage := 0
	if total > 0 {
		coverage = int(float64(documented) / float64(total) * 100)
	}
	score := coverage
	if score > 100 {
		score = 100
	}

	var issues []map[string]string
	rows, _ := s.pool.Query(ctx, `
		SELECT s.name, a.method, a.path FROM kg_apis a
		JOIN kg_services s ON s.id = a.service_id
		WHERE a.organization_id = $1 AND a.documented = FALSE LIMIT 20
	`, orgID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var name, method, path string
			if rows.Scan(&name, &method, &path) == nil {
				issues = append(issues, map[string]string{
					"severity": "warning",
					"message":  fmt.Sprintf("%s: %s %s not documented", name, method, path),
				})
			}
		}
	}

	var stale int
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM kg_apis a
		JOIN connected_repositories r ON r.id = a.repository_id
		WHERE a.organization_id = $1
		  AND a.documented = FALSE
		  AND (r.last_scanned_at IS NULL OR r.last_scanned_at < NOW() - INTERVAL '14 days')
	`, orgID).Scan(&stale)

	var unscanned int
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM connected_repositories
		WHERE organization_id = $1 AND (last_scanned_at IS NULL OR last_scanned_at < NOW() - INTERVAL '30 days')
	`, orgID).Scan(&unscanned)
	stale += unscanned

	if stale > 0 {
		issues = append(issues, map[string]string{
			"severity": "warning",
			"message":  fmt.Sprintf("%d stale API/repo freshness signals detected", stale),
		})
	}

	// Soft-penalize score for staleness
	if stale > 0 && score > 10 {
		penalty := stale * 2
		if penalty > 20 {
			penalty = 20
		}
		score -= penalty
	}

	issuesJSON, _ := json.Marshal(issues)
	var snap models.DocHealthSnapshot
	err := s.pool.QueryRow(ctx, `
		INSERT INTO doc_health_snapshots (organization_id, score, coverage_pct, api_total, api_documented, stale_pages, issues)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id, organization_id, score, coverage_pct, api_total, api_documented, stale_pages, issues, computed_at
	`, orgID, score, coverage, total, documented, stale, issuesJSON).Scan(
		&snap.ID, &snap.OrganizationID, &snap.Score, &snap.CoveragePct, &snap.APITotal, &snap.APIDocumented, &snap.StalePages, &snap.Issues, &snap.ComputedAt,
	)
	return &snap, err
}

func (s *Store) GetLatestHealth(ctx context.Context, orgID uuid.UUID) (*models.DocHealthSnapshot, error) {
	var snap models.DocHealthSnapshot
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, score, coverage_pct, api_total, api_documented, stale_pages, issues, computed_at
		FROM doc_health_snapshots WHERE organization_id = $1 ORDER BY computed_at DESC LIMIT 1
	`, orgID).Scan(
		&snap.ID, &snap.OrganizationID, &snap.Score, &snap.CoveragePct, &snap.APITotal, &snap.APIDocumented, &snap.StalePages, &snap.Issues, &snap.ComputedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	return &snap, err
}

func (s *Store) CreateDriftAlert(ctx context.Context, alert models.DocDriftAlert) (*models.DocDriftAlert, error) {
	var a models.DocDriftAlert
	err := s.pool.QueryRow(ctx, `
		INSERT INTO doc_drift_alerts (organization_id, project_id, repository_id, service_id, pr_number, pr_url, severity, title, message, details)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id, organization_id, project_id, repository_id, service_id, pr_number, pr_url, severity, title, message, details, status, created_at
	`, alert.OrganizationID, alert.ProjectID, alert.RepositoryID, alert.ServiceID, alert.PRNumber, alert.PRURL,
		alert.Severity, alert.Title, alert.Message, alert.Details).Scan(
		&a.ID, &a.OrganizationID, &a.ProjectID, &a.RepositoryID, &a.ServiceID, &a.PRNumber, &a.PRURL,
		&a.Severity, &a.Title, &a.Message, &a.Details, &a.Status, &a.CreatedAt,
	)
	return &a, err
}

func (s *Store) ListDriftAlerts(ctx context.Context, orgID uuid.UUID) ([]models.DocDriftAlert, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, organization_id, project_id, repository_id, service_id, pr_number, pr_url, severity, title, message, details, status, created_at
		FROM doc_drift_alerts WHERE organization_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 50
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var alerts []models.DocDriftAlert
	for rows.Next() {
		var a models.DocDriftAlert
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.ProjectID, &a.RepositoryID, &a.ServiceID, &a.PRNumber, &a.PRURL, &a.Severity, &a.Title, &a.Message, &a.Details, &a.Status, &a.CreatedAt); err != nil {
			return nil, err
		}
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}

func (s *Store) UnifiedSearch(ctx context.Context, orgID uuid.UUID, query string, limit int) ([]models.UnifiedSearchResult, error) {
	if limit <= 0 {
		limit = 20
	}
	q := "%" + strings.ToLower(query) + "%"
	var results []models.UnifiedSearchResult

	rows, err := s.pool.Query(ctx, `
		SELECT 'service' as type, s.id::text, s.name, COALESCE(s.description,''), '/services/' || s.id::text
		FROM kg_services s WHERE s.organization_id = $1 AND (LOWER(s.name) LIKE $2 OR LOWER(s.description) LIKE $2)
		LIMIT $3
	`, orgID, q, limit)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var r models.UnifiedSearchResult
			if rows.Scan(&r.Type, &r.ID, &r.Title, &r.Content, &r.URL) == nil {
				results = append(results, r)
			}
		}
	}

	rows2, err := s.pool.Query(ctx, `
		SELECT 'api', a.id::text, a.method || ' ' || a.path, COALESCE(a.summary,''), '/services/' || a.service_id::text
		FROM kg_apis a WHERE a.organization_id = $1 AND (LOWER(a.path) LIKE $2 OR LOWER(a.summary) LIKE $2)
		LIMIT $3
	`, orgID, q, limit)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var r models.UnifiedSearchResult
			if rows2.Scan(&r.Type, &r.ID, &r.Title, &r.Content, &r.URL) == nil {
				results = append(results, r)
			}
		}
	}

	rows3, err := s.pool.Query(ctx, `
		SELECT 'adr', id::text, title, LEFT(content, 200), file_path
		FROM kg_adrs WHERE organization_id = $1 AND (LOWER(title) LIKE $2 OR LOWER(content) LIKE $2)
		LIMIT $3
	`, orgID, q, limit)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var r models.UnifiedSearchResult
			if rows3.Scan(&r.Type, &r.ID, &r.Title, &r.Content, &r.URL) == nil {
				results = append(results, r)
			}
		}
	}

	return results, nil
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "_", "-")
	return s
}

func (s *Store) GetRepositoryByFullName(ctx context.Context, orgID uuid.UUID, fullName string) (*models.ConnectedRepository, error) {
	var r models.ConnectedRepository
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, github_connection_id, github_repo_id, full_name, name,
			default_branch, html_url, description, language, linked_project_id, scan_status,
			last_scanned_at, last_scan_error, created_at, updated_at
		FROM connected_repositories WHERE organization_id = $1 AND full_name = $2
	`, orgID, fullName).Scan(
		&r.ID, &r.OrganizationID, &r.GitHubConnectionID, &r.GitHubRepoID, &r.FullName, &r.Name,
		&r.DefaultBranch, &r.HTMLURL, &r.Description, &r.Language, &r.LinkedProjectID, &r.ScanStatus,
		&r.LastScannedAt, &r.LastScanError, &r.CreatedAt, &r.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	return &r, err
}

func (s *Store) GetOrgIDByGitHubRepoID(ctx context.Context, githubRepoID int64) (uuid.UUID, error) {
	var orgID uuid.UUID
	err := s.pool.QueryRow(ctx, `SELECT organization_id FROM connected_repositories WHERE github_repo_id = $1 LIMIT 1`, githubRepoID).Scan(&orgID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, store.ErrNotFound
	}
	return orgID, err
}

func (s *Store) LinkRepositoryProject(ctx context.Context, repoID, projectID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `UPDATE connected_repositories SET linked_project_id = $2, updated_at = NOW() WHERE id = $1`, repoID, projectID)
	_, err2 := s.pool.Exec(ctx, `UPDATE kg_services SET linked_project_id = $2, updated_at = NOW() WHERE repository_id = $1`, repoID, projectID)
	if err != nil {
		return err
	}
	return err2
}

func (s *Store) GetConnectedRepository(ctx context.Context, orgID, repoID uuid.UUID) (*models.ConnectedRepository, error) {
	var r models.ConnectedRepository
	err := s.pool.QueryRow(ctx, `
		SELECT id, organization_id, github_connection_id, github_repo_id, full_name, name,
			default_branch, html_url, description, language, linked_project_id, scan_status,
			last_scanned_at, last_scan_error, created_at, updated_at
		FROM connected_repositories WHERE organization_id = $1 AND id = $2
	`, orgID, repoID).Scan(
		&r.ID, &r.OrganizationID, &r.GitHubConnectionID, &r.GitHubRepoID, &r.FullName, &r.Name,
		&r.DefaultBranch, &r.HTMLURL, &r.Description, &r.Language, &r.LinkedProjectID, &r.ScanStatus,
		&r.LastScannedAt, &r.LastScanError, &r.CreatedAt, &r.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	return &r, err
}
