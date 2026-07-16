package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
)

var subdomainRegex = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)

type HostingHandler struct {
	Store *store.Store
}

func (h *HostingHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	orgSlug := chi.URLParam(r, "orgSlug")
	org, err := h.Store.GetOrganizationBySlug(r.Context(), orgSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "org_not_found", "")
		return
	}
	if _, err := h.Store.UserOrgRole(r.Context(), userID, org.ID); err != nil {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return
	}

	projects, err := h.Store.ListProjects(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	sub := org.DocsSubdomain
	if sub == "" {
		sub = org.Slug
	}
	hostedDomain := store.HostedDomain()
	if hostedDomain == "" {
		hostedDomain = "frond.dev"
	}

	type projectHost struct {
		ID           string      `json:"id"`
		Name         string      `json:"name"`
		Slug         string      `json:"slug"`
		URL          string      `json:"url"`
		LocalURL     string      `json:"local_url"`
		CustomDomain *string     `json:"custom_domain,omitempty"`
		Deployments  interface{} `json:"deployments"`
	}

	out := make([]projectHost, 0, len(projects))
	for _, p := range projects {
		deps, _ := h.Store.ListDeployments(r.Context(), p.ID)
		var custom *string
		latestURL := store.DocsPublicURL(sub, p.Slug)
		if len(deps) > 0 {
			latestURL = deps[0].URL
			custom = deps[0].CustomDomain
		}
		out = append(out, projectHost{
			ID:           p.ID.String(),
			Name:         p.Name,
			Slug:         p.Slug,
			URL:          latestURL,
			LocalURL:     "http://localhost:3001/" + org.Slug + "/" + p.Slug,
			CustomDomain: custom,
			Deployments:  deps,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"organization":    org,
		"docs_subdomain":  sub,
		"hosted_domain":   hostedDomain,
		"company_host":    sub + "." + hostedDomain,
		"preview_base":    "https://" + sub + "." + hostedDomain,
		"cname_target":    "cname.frond.dev",
		"projects":        out,
	})
}

func (h *HostingHandler) SetSubdomain(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	orgSlug := chi.URLParam(r, "orgSlug")
	org, err := h.Store.GetOrganizationBySlug(r.Context(), orgSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "org_not_found", "")
		return
	}
	role, err := h.Store.UserOrgRole(r.Context(), userID, org.ID)
	if err != nil || (role != "owner" && role != "admin") {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return
	}

	var body struct {
		Subdomain string `json:"subdomain"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	sub := strings.ToLower(strings.TrimSpace(body.Subdomain))
	if !subdomainRegex.MatchString(sub) {
		writeError(w, http.StatusBadRequest, "invalid_subdomain", "use lowercase letters, numbers, hyphens")
		return
	}

	updated, err := h.Store.SetOrgDocsSubdomain(r.Context(), org.ID, sub)
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			writeError(w, http.StatusConflict, "subdomain_taken", "that company subdomain is already in use")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	hosted := store.HostedDomain()
	if hosted == "" {
		hosted = "frond.dev"
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"organization":   updated,
		"docs_subdomain": updated.DocsSubdomain,
		"company_host":   updated.DocsSubdomain + "." + hosted,
		"message":        "Docs will be served at https://" + updated.DocsSubdomain + "." + hosted + "/{project}",
	})
}
