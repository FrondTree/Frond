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

	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/search"
	"github.com/frond-dev/frond/services/api/internal/storage"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
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
		// Phase 1: private docs require auth header; simplified check
		if r.Header.Get("Authorization") == "" && r.Header.Get("X-Frond-Api-Key") == "" {
			writeError(w, http.StatusUnauthorized, "private_docs", "authentication required")
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

	project, _, err := h.Store.GetProjectByOrgSlug(r.Context(), orgSlug, projectSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "")
		return
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

	project, _, err := h.Store.GetProjectByOrgSlug(r.Context(), orgSlug, projectSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "")
		return
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
