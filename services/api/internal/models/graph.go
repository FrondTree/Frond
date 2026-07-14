package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type GitHubConnection struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	UserID         uuid.UUID `json:"user_id"`
	GitHubUserID   int64     `json:"github_user_id"`
	GitHubLogin    string    `json:"github_login"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ConnectedRepository struct {
	ID               uuid.UUID  `json:"id"`
	OrganizationID   uuid.UUID  `json:"organization_id"`
	GitHubConnectionID uuid.UUID `json:"github_connection_id"`
	GitHubRepoID     int64      `json:"github_repo_id"`
	FullName         string     `json:"full_name"`
	Name             string     `json:"name"`
	DefaultBranch    string     `json:"default_branch"`
	HTMLURL          string     `json:"html_url"`
	Description      string     `json:"description"`
	Language         string     `json:"language"`
	LinkedProjectID  *uuid.UUID `json:"linked_project_id,omitempty"`
	ScanStatus       string     `json:"scan_status"`
	LastScannedAt    *time.Time `json:"last_scanned_at,omitempty"`
	LastScanError    *string    `json:"last_scan_error,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type ScanJob struct {
	ID             uuid.UUID  `json:"id"`
	RepositoryID   uuid.UUID  `json:"repository_id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	Status         string     `json:"status"`
	TriggerType    string     `json:"trigger_type"`
	FilesScanned   int        `json:"files_scanned"`
	ErrorMessage   *string    `json:"error_message,omitempty"`
	StartedAt      *time.Time `json:"started_at,omitempty"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type KGService struct {
	ID              uuid.UUID       `json:"id"`
	OrganizationID  uuid.UUID       `json:"organization_id"`
	RepositoryID    uuid.UUID       `json:"repository_id"`
	Name            string          `json:"name"`
	Slug            string          `json:"slug"`
	Description     string          `json:"description"`
	Language        string          `json:"language"`
	Framework       string          `json:"framework"`
	Owners          json.RawMessage `json:"owners"`
	Metadata        json.RawMessage `json:"metadata"`
	LinkedProjectID *uuid.UUID      `json:"linked_project_id,omitempty"`
	RepositoryName  string          `json:"repository_name,omitempty"`
	HTMLURL           string          `json:"html_url,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type KGAPI struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	ServiceID      uuid.UUID `json:"service_id"`
	RepositoryID   uuid.UUID `json:"repository_id"`
	Method         string    `json:"method"`
	Path           string    `json:"path"`
	Summary        string    `json:"summary"`
	Description    string    `json:"description"`
	OperationID    string    `json:"operation_id"`
	Source         string    `json:"source"`
	SpecPath       string    `json:"spec_path"`
	Documented     bool      `json:"documented"`
}

type KGDependency struct {
	ID             uuid.UUID       `json:"id"`
	OrganizationID uuid.UUID       `json:"organization_id"`
	ServiceID      uuid.UUID       `json:"service_id"`
	Name           string          `json:"name"`
	Version        string          `json:"version"`
	DepType        string          `json:"dep_type"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
}

type KGADR struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	RepositoryID   uuid.UUID  `json:"repository_id"`
	ServiceID      *uuid.UUID `json:"service_id,omitempty"`
	ADRNumber      string     `json:"adr_number"`
	Title          string     `json:"title"`
	Status         string     `json:"status"`
	Content        string     `json:"content"`
	FilePath       string     `json:"file_path"`
}

type DocDriftAlert struct {
	ID             uuid.UUID       `json:"id"`
	OrganizationID uuid.UUID       `json:"organization_id"`
	ProjectID      *uuid.UUID      `json:"project_id,omitempty"`
	RepositoryID   *uuid.UUID      `json:"repository_id,omitempty"`
	ServiceID      *uuid.UUID      `json:"service_id,omitempty"`
	PRNumber       *int            `json:"pr_number,omitempty"`
	PRURL          string          `json:"pr_url"`
	Severity       string          `json:"severity"`
	Title          string          `json:"title"`
	Message        string          `json:"message"`
	Details        json.RawMessage `json:"details"`
	Status         string          `json:"status"`
	CreatedAt      time.Time       `json:"created_at"`
}

type DocHealthSnapshot struct {
	ID            uuid.UUID       `json:"id"`
	OrganizationID uuid.UUID      `json:"organization_id"`
	Score         int             `json:"score"`
	CoveragePct   int             `json:"coverage_pct"`
	APITotal      int             `json:"api_total"`
	APIDocumented int             `json:"api_documented"`
	StalePages    int             `json:"stale_pages"`
	Issues        json.RawMessage `json:"issues"`
	ComputedAt    time.Time       `json:"computed_at"`
}

type GraphNode struct {
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Label    string          `json:"label"`
	Data     json.RawMessage `json:"data"`
	Position *GraphPosition  `json:"position,omitempty"`
}

type GraphPosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type GraphEdge struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	Target       string `json:"target"`
	Relationship string `json:"relationship"`
	Label        string `json:"label,omitempty"`
}

type ArchitectureGraph struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}

type ServiceDetail struct {
	Service      KGService      `json:"service"`
	APIs         []KGAPI        `json:"apis"`
	Dependencies []KGDependency `json:"dependencies"`
	ADRs         []KGADR        `json:"adrs"`
}

type UnifiedSearchResult struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Title   string `json:"title"`
	Content string `json:"content"`
	URL     string `json:"url"`
}

type GitHubRepoListing struct {
	ID          int64  `json:"id"`
	FullName    string `json:"full_name"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Language    string `json:"language"`
	HTMLURL     string `json:"html_url"`
	DefaultBranch string `json:"default_branch"`
	Private     bool   `json:"private"`
}
