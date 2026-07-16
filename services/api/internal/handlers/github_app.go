package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/go-chi/chi/v5"
)

// InstallApp returns a GitHub App installation URL (when GITHUB_APP_SLUG is set).
// Falls back to documenting that user OAuth is active.
func (h *GitHubHandler) InstallApp(w http.ResponseWriter, r *http.Request) {
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

	appSlug := os.Getenv("GITHUB_APP_SLUG")
	if appSlug == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"mode":    "oauth",
			"message": "GitHub App not configured. Use Connect (user OAuth) or set GITHUB_APP_SLUG.",
			"url":     "",
		})
		return
	}

	state, err := auth.GenerateState()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "state_error", err.Error())
		return
	}
	redirect := r.URL.Query().Get("redirect_uri")
	payload, _ := json.Marshal(map[string]string{
		"org_slug": orgSlug,
		"user_id":  userID.String(),
		"redirect": redirect,
		"kind":     "app_install",
	})
	_ = h.Store.SaveOAuthState(r.Context(), state, string(payload))

	installURL := fmt.Sprintf(
		"https://github.com/apps/%s/installations/new?state=%s",
		url.PathEscape(appSlug),
		url.QueryEscape(state),
	)
	writeJSON(w, http.StatusOK, map[string]string{
		"mode": "app",
		"url":  installURL,
	})
}
