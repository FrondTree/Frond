package handlers

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)

type OrgHandler struct {
	Store *store.Store
}

type CreateOrgRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (h *OrgHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}

	var req CreateOrgRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}

	req.Slug = normalizeSlug(req.Slug, req.Name)
	if !slugRegex.MatchString(req.Slug) {
		writeError(w, http.StatusBadRequest, "invalid_slug", "slug must be lowercase alphanumeric with hyphens")
		return
	}

	org, err := h.Store.CreateOrganization(r.Context(), userID, req.Name, req.Slug)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, org)
}

func (h *OrgHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}

	orgs, err := h.Store.ListOrganizations(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	if orgs == nil {
		orgs = []models.Organization{}
	}
	writeJSON(w, http.StatusOK, orgs)
}

func (h *OrgHandler) Get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	org, err := h.Store.GetOrganizationBySlug(r.Context(), slug)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func normalizeSlug(slug, name string) string {
	base := slug
	if base == "" {
		base = name
	}
	s := strings.ToLower(strings.TrimSpace(base))
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "_", "-")
	s = regexp.MustCompile(`[^a-z0-9-]+`).ReplaceAllString(s, "")
	s = regexp.MustCompile(`-+`).ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "item"
	}
	if len(s) > 63 {
		s = strings.Trim(s[:63], "-")
	}
	return s
}
