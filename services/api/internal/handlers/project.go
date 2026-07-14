package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ProjectHandler struct {
	Store *store.Store
}

type CreateProjectRequest struct {
	Name        string          `json:"name"`
	Slug        string          `json:"slug"`
	Description string          `json:"description"`
	Visibility  string          `json:"visibility"`
	Config      json.RawMessage `json:"config"`
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}

	orgSlug := chi.URLParam(r, "orgSlug")
	org, err := h.Store.GetOrganizationBySlug(r.Context(), orgSlug)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "org_not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	role, err := h.Store.UserOrgRole(r.Context(), userID, org.ID)
	if err != nil || (role != "owner" && role != "admin" && role != "member") {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return
	}

	var req CreateProjectRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}

	req.Slug = normalizeSlug(req.Slug, req.Name)
	if !slugRegex.MatchString(req.Slug) {
		writeError(w, http.StatusBadRequest, "invalid_slug", "")
		return
	}

	if req.Visibility == "" {
		req.Visibility = "public"
	}
	if req.Config == nil {
		req.Config = json.RawMessage(`{}`)
	}

	project, err := h.Store.CreateProject(r.Context(), org.ID, req.Name, req.Slug, req.Description, req.Visibility, req.Config)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, project)
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	orgSlug := chi.URLParam(r, "orgSlug")
	org, err := h.Store.GetOrganizationBySlug(r.Context(), orgSlug)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "org_not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	projects, err := h.Store.ListProjects(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, projects)
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"project":      project,
		"organization": org,
	})
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}
