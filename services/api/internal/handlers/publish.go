package handlers

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/search"
	"github.com/frond-dev/frond/services/api/internal/storage"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type PublishHandler struct {
	Store   *store.Store
	Storage storage.Store
	Search  *search.Client
}

type PublishRequest struct {
	VersionLabel string                `json:"version_label"`
	OpenAPIHash  string                `json:"openapi_hash"`
	Manifest     models.PublishManifest `json:"manifest"`
}

func (h *PublishHandler) Publish(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}

	projectID, err := parseUUID(chi.URLParam(r, "projectID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_project_id", "")
		return
	}

	project, err := h.Store.GetProjectByID(r.Context(), projectID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	role, err := h.Store.UserOrgRole(r.Context(), userID, project.OrganizationID)
	if err != nil || (role != "owner" && role != "admin" && role != "member") {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return
	}

	if err := r.ParseMultipartForm(64 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_form", err.Error())
		return
	}

	metaJSON := r.FormValue("manifest")
	if metaJSON == "" {
		writeError(w, http.StatusBadRequest, "missing_manifest", "")
		return
	}

	var manifest models.PublishManifest
	if err := json.Unmarshal([]byte(metaJSON), &manifest); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_manifest", err.Error())
		return
	}

	versionLabel := r.FormValue("version_label")
	if versionLabel == "" && len(manifest.Versions) > 0 {
		versionLabel = manifest.Versions[0].ID
	}
	if versionLabel == "" {
		versionLabel = "latest"
	}

	file, _, err := r.FormFile("bundle")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing_bundle", err.Error())
		return
	}
	defer file.Close()

	bundleBytes, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "read_error", err.Error())
		return
	}

	openapiHash := r.FormValue("openapi_hash")
	if openapiHash == "" {
		sum := sha256.Sum256(bundleBytes)
		openapiHash = hex.EncodeToString(sum[:])
	}

	bundleKey := fmt.Sprintf("%s/%s/%s.tar.gz", project.OrganizationID, project.ID, openapiHash)
	if _, err := h.Storage.Save(r.Context(), bundleKey, bytes.NewReader(bundleBytes)); err != nil {
		writeError(w, http.StatusInternalServerError, "storage_error", err.Error())
		return
	}

	manifestJSON, _ := json.Marshal(manifest)
	dv, dep, err := h.Store.PublishDocVersion(r.Context(), project.ID, versionLabel, openapiHash, bundleKey, manifestJSON)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	_ = h.Search.DeleteProjectDocuments(r.Context(), project.ID.String())
	_ = h.Search.IndexDocuments(r.Context(), project.ID.String(), manifest.SearchIndex)

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"version":    dv,
		"deployment": dep,
		"url":        dep.URL,
	})
}

func (h *PublishHandler) ListDeployments(w http.ResponseWriter, r *http.Request) {
	projectID, err := parseUUID(chi.URLParam(r, "projectID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_project_id", "")
		return
	}

	deps, err := h.Store.ListDeployments(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, deps)
}

type DocsHandler struct {
	Store   *store.Store
	Storage storage.Store
	Search  *search.Client
	Auth    *auth.Service
}

func (h *DocsHandler) authorizePrivate(w http.ResponseWriter, r *http.Request, orgID uuid.UUID) bool {
	rawKey := r.Header.Get("X-Frond-Api-Key")
	bearer := ""
	if authHdr := r.Header.Get("Authorization"); strings.HasPrefix(authHdr, "Bearer ") {
		bearer = strings.TrimPrefix(authHdr, "Bearer ")
	}

	if rawKey == "" && strings.HasPrefix(bearer, "frond_") {
		rawKey = bearer
	}

	if rawKey != "" {
		userID, keyOrgID, err := h.Store.GetUserByAPIKey(r.Context(), auth.HashAPIKey(rawKey))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid_api_key", "invalid API key")
			return false
		}
		if keyOrgID != orgID {
			writeError(w, http.StatusForbidden, "forbidden", "API key not valid for this organization")
			return false
		}
		_ = userID
		return true
	}

	if bearer != "" && h.Auth != nil {
		claims, err := h.Auth.ParseJWT(bearer)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid_token", "invalid token")
			return false
		}
		role, err := h.Store.UserOrgRole(r.Context(), claims.UserID, orgID)
		if err != nil || role == "" {
			writeError(w, http.StatusForbidden, "forbidden", "not a member of this organization")
			return false
		}
		return true
	}

	writeError(w, http.StatusUnauthorized, "private_docs", "authentication required")
	return false
}

func (h *DocsHandler) GetPublished(w http.ResponseWriter, r *http.Request) {
	orgSlug := chi.URLParam(r, "orgSlug")
	projectSlug := chi.URLParam(r, "projectSlug")

	project, org, err := h.Store.GetProjectByOrgSlug(r.Context(), orgSlug, projectSlug)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	if project.Visibility == "private" {
		if !h.authorizePrivate(w, r, org.ID) {
			return
		}
	}

	dv, err := h.Store.GetLatestDocVersion(r.Context(), project.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "no_published_docs", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	var manifest models.PublishManifest
	_ = json.Unmarshal(dv.Manifest, &manifest)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"organization": org,
		"project":      project,
		"version":      dv,
		"manifest":     manifest,
	})
}

func (h *DocsHandler) SearchDocs(w http.ResponseWriter, r *http.Request) {
	orgSlug := chi.URLParam(r, "orgSlug")
	projectSlug := chi.URLParam(r, "projectSlug")
	query := r.URL.Query().Get("q")

	project, org, err := h.Store.GetProjectByOrgSlug(r.Context(), orgSlug, projectSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "")
		return
	}
	if project.Visibility == "private" {
		if !h.authorizePrivate(w, r, org.ID) {
			return
		}
	}

	results, err := h.Search.Search(r.Context(), project.ID.String(), query, 20)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "search_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, results)
}

func (h *DocsHandler) GetBundle(w http.ResponseWriter, r *http.Request) {
	orgSlug := chi.URLParam(r, "orgSlug")
	projectSlug := chi.URLParam(r, "projectSlug")

	project, org, err := h.Store.GetProjectByOrgSlug(r.Context(), orgSlug, projectSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "")
		return
	}
	if project.Visibility == "private" {
		if !h.authorizePrivate(w, r, org.ID) {
			return
		}
	}

	dv, err := h.Store.GetLatestDocVersion(r.Context(), project.ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "no_published_docs", "")
		return
	}

	reader, err := h.Storage.Open(r.Context(), dv.BundlePath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "storage_error", err.Error())
		return
	}
	defer reader.Close()

	w.Header().Set("Content-Type", "application/gzip")
	io.Copy(w, reader)
}

func (h *DocsHandler) ResolveDomain(w http.ResponseWriter, r *http.Request) {
	host := r.URL.Query().Get("host")
	if host == "" {
		host = r.Host
	}
	org, project, dep, err := h.Store.ResolveCustomDomain(r.Context(), host)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "domain_not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"organization": org,
		"project":      project,
		"deployment":   dep,
		"path":         "/" + org.Slug + "/" + project.Slug,
	})
}

func (h *PublishHandler) SetCustomDomain(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	projectID, err := parseUUID(chi.URLParam(r, "projectID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_project_id", "")
		return
	}
	project, err := h.Store.GetProjectByID(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "")
		return
	}
	role, err := h.Store.UserOrgRole(r.Context(), userID, project.OrganizationID)
	if err != nil || (role != "owner" && role != "admin") {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return
	}
	var body struct {
		Domain string `json:"domain"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	dep, err := h.Store.SetDeploymentCustomDomain(r.Context(), projectID, body.Domain)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "no_deployment", "publish docs before setting a custom domain")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"deployment": dep,
		"instructions": map[string]string{
			"cname":  "cname.frond.dev",
			"domain": body.Domain,
			"note":   "Point your domain CNAME to the Frond docs host, then wait for DNS propagation.",
		},
	})
}

// ExtractManifestFromBundle reads manifest.json from a tar.gz bundle.
func ExtractManifestFromBundle(data []byte) (*models.PublishManifest, error) {
	gzr, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if hdr.Name == "manifest.json" {
			var m models.PublishManifest
			if err := json.NewDecoder(tr).Decode(&m); err != nil {
				return nil, err
			}
			return &m, nil
		}
	}
	return nil, fmt.Errorf("manifest.json not found in bundle")
}
