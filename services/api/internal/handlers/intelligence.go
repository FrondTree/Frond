package handlers

import (
	"errors"
	"net/http"

	"github.com/frond-dev/frond/services/api/internal/graphstore"
	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/search"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type IntelligenceHandler struct {
	Store        *store.Store
	Graph        *graphstore.Store
	SearchClient *search.Client
}

func (h *IntelligenceHandler) Architecture(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	graph, err := h.Graph.BuildArchitectureGraph(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, graph)
}

func (h *IntelligenceHandler) Services(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	services, err := h.Graph.ListServices(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, services)
}

func (h *IntelligenceHandler) ServiceDetail(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	serviceID, err := parseUUID(chi.URLParam(r, "serviceID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_service_id", "")
		return
	}
	detail, err := h.Graph.GetServiceDetail(r.Context(), org.ID, serviceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func (h *IntelligenceHandler) Dependencies(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	services, err := h.Graph.ListServices(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	type DepTree struct {
		Service      models.KGService      `json:"service"`
		Dependencies []models.KGDependency `json:"dependencies"`
	}
	var trees []DepTree
	for _, svc := range services {
		detail, _ := h.Graph.GetServiceDetail(r.Context(), org.ID, svc.ID)
		if detail != nil {
			trees = append(trees, DepTree{Service: svc, Dependencies: detail.Dependencies})
		}
	}
	writeJSON(w, http.StatusOK, trees)
}

func (h *IntelligenceHandler) Health(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	snap, err := h.Graph.GetLatestHealth(r.Context(), org.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			_ = h.Graph.MarkDocumentedAPIs(r.Context(), org.ID)
			snap, err = h.Graph.ComputeHealth(r.Context(), org.ID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "db_error", err.Error())
				return
			}
		} else {
			writeError(w, http.StatusInternalServerError, "db_error", err.Error())
			return
		}
	}
	writeJSON(w, http.StatusOK, snap)
}

func (h *IntelligenceHandler) RecomputeHealth(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	_ = h.Graph.MarkDocumentedAPIs(r.Context(), org.ID)
	snap, err := h.Graph.ComputeHealth(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, snap)
}

func (h *IntelligenceHandler) Search(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusOK, []models.UnifiedSearchResult{})
		return
	}

	if h.SearchClient != nil {
		if docs, err := h.SearchClient.SearchOrg(r.Context(), org.ID.String(), q, 30); err == nil && len(docs) > 0 {
			out := make([]models.UnifiedSearchResult, 0, len(docs))
			for _, d := range docs {
				out = append(out, models.UnifiedSearchResult{
					Type:    d.Type,
					Title:   d.Title,
					Content: d.Content,
					URL:     d.URL,
				})
			}
			writeJSON(w, http.StatusOK, out)
			return
		}
	}

	results, err := h.Graph.UnifiedSearch(r.Context(), org.ID, q, 30)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "search_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, results)
}

func (h *IntelligenceHandler) DriftAlerts(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	alerts, err := h.Graph.ListDriftAlerts(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, alerts)
}

func (h *IntelligenceHandler) resolveOrg(w http.ResponseWriter, r *http.Request) (*models.Organization, bool) {
	orgSlug := chi.URLParam(r, "orgSlug")
	org, err := h.Store.GetOrganizationBySlug(r.Context(), orgSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "org_not_found", "")
		return nil, false
	}
	return org, true
}

type LinkRepoProjectRequest struct {
	ProjectID string `json:"project_id"`
}

func (h *IntelligenceHandler) LinkRepoProject(w http.ResponseWriter, r *http.Request) {
	org, ok := h.resolveOrg(w, r)
	if !ok {
		return
	}
	repoID, err := parseUUID(chi.URLParam(r, "repoID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_repo_id", "")
		return
	}
	var req LinkRepoProjectRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	projectID, err := uuid.Parse(req.ProjectID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_project_id", "")
		return
	}
	_, err = h.Graph.GetConnectedRepository(r.Context(), org.ID, repoID)
	if err != nil {
		writeError(w, http.StatusNotFound, "repo_not_found", "")
		return
	}
	if err := h.Graph.LinkRepositoryProject(r.Context(), repoID, projectID); err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	_ = h.Graph.MarkDocumentedAPIs(r.Context(), org.ID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "linked"})
}
