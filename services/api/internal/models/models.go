package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username,omitempty"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	GoogleID  *string   `json:"google_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Organization struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Plan      string    `json:"plan"`
	Role      string    `json:"role,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Project struct {
	ID             uuid.UUID       `json:"id"`
	OrganizationID uuid.UUID       `json:"organization_id"`
	Name           string          `json:"name"`
	Slug           string          `json:"slug"`
	Description    string          `json:"description"`
	Visibility     string          `json:"visibility"`
	Config         json.RawMessage `json:"config"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type DocVersion struct {
	ID           uuid.UUID       `json:"id"`
	ProjectID    uuid.UUID       `json:"project_id"`
	VersionLabel string          `json:"version_label"`
	OpenAPIHash  string          `json:"openapi_hash"`
	BundlePath   string          `json:"bundle_path"`
	Manifest     json.RawMessage `json:"manifest"`
	IsLatest     bool            `json:"is_latest"`
	PublishedAt  time.Time       `json:"published_at"`
	CreatedAt    time.Time       `json:"created_at"`
}

type Deployment struct {
	ID           uuid.UUID `json:"id"`
	ProjectID    uuid.UUID `json:"project_id"`
	DocVersionID uuid.UUID `json:"doc_version_id"`
	URL          string    `json:"url"`
	CustomDomain *string   `json:"custom_domain,omitempty"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type APIKey struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	Name           string     `json:"name"`
	KeyPrefix      string     `json:"key_prefix"`
	LastUsedAt     *time.Time `json:"last_used_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type PublishManifest struct {
	Title       string            `json:"title"`
	Versions    []ManifestVersion `json:"versions"`
	Navigation  json.RawMessage   `json:"navigation"`
	Theme       json.RawMessage   `json:"theme"`
	Playground  json.RawMessage   `json:"playground,omitempty"`
	Pages       []ManifestPage    `json:"pages"`
	Endpoints   []ManifestEndpoint `json:"endpoints"`
	SearchIndex []SearchDocument  `json:"search_index"`
}

type ManifestVersion struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	Deprecated  bool   `json:"deprecated"`
}

type ManifestPage struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Slug    string `json:"slug"`
	Content string `json:"content"`
	Type    string `json:"type"`
}

type ManifestEndpoint struct {
	ID          string          `json:"id"`
	Method      string          `json:"method"`
	Path        string          `json:"path"`
	Summary     string          `json:"summary"`
	Description string          `json:"description"`
	VersionID   string          `json:"version_id"`
	Tags        []string        `json:"tags"`
	Request     json.RawMessage `json:"request,omitempty"`
	Responses   json.RawMessage `json:"responses,omitempty"`
	Examples    json.RawMessage `json:"examples,omitempty"`
}

type SearchDocument struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Title   string `json:"title"`
	Content string `json:"content"`
	URL     string `json:"url"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
