package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/go-chi/chi/v5"
)

// ProviderConnectHandler generates OAuth authorize URLs for GitLab / Bitbucket.
type ProviderConnectHandler struct {
	Provider        string
	ClientIDEnv     string
	ClientSecretEnv string
	AuthURL         string
	Scopes          string
}

func NewGitLabHandler() *ProviderConnectHandler {
	return &ProviderConnectHandler{
		Provider:        "gitlab",
		ClientIDEnv:     "GITLAB_CLIENT_ID",
		ClientSecretEnv: "GITLAB_CLIENT_SECRET",
		AuthURL:         "https://gitlab.com/oauth/authorize",
		Scopes:          "read_api read_repository",
	}
}

func NewBitbucketHandler() *ProviderConnectHandler {
	return &ProviderConnectHandler{
		Provider:        "bitbucket",
		ClientIDEnv:     "BITBUCKET_CLIENT_ID",
		ClientSecretEnv: "BITBUCKET_CLIENT_SECRET",
		AuthURL:         "https://bitbucket.org/site/oauth2/authorize",
		Scopes:          "repository",
	}
}

func (h *ProviderConnectHandler) Status(w http.ResponseWriter, r *http.Request) {
	configured := os.Getenv(h.ClientIDEnv) != "" && os.Getenv(h.ClientSecretEnv) != ""
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"provider":   h.Provider,
		"configured": configured,
		"connected":  false,
		"message": fmt.Sprintf(
			"%s OAuth stub — set %s/%s to enable connect URL generation",
			h.Provider, h.ClientIDEnv, h.ClientSecretEnv,
		),
	})
}

func (h *ProviderConnectHandler) Connect(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserID(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	_ = chi.URLParam(r, "orgSlug")

	clientID := os.Getenv(h.ClientIDEnv)
	if clientID == "" {
		writeError(w, http.StatusServiceUnavailable, h.Provider+"_not_configured",
			fmt.Sprintf("Set %s and %s", h.ClientIDEnv, h.ClientSecretEnv))
		return
	}

	baseURL := os.Getenv("API_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	redirectURI := fmt.Sprintf("%s/v1/auth/%s/callback", baseURL, h.Provider)
	state, _ := auth.GenerateState()

	u, err := url.Parse(h.AuthURL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "url_error", err.Error())
		return
	}
	q := u.Query()
	q.Set("client_id", clientID)
	q.Set("redirect_uri", redirectURI)
	q.Set("response_type", "code")
	q.Set("scope", h.Scopes)
	q.Set("state", state)
	u.RawQuery = q.Encode()

	writeJSON(w, http.StatusOK, map[string]string{
		"provider": h.Provider,
		"url":      u.String(),
		"state":    state,
		"note":     "OAuth URL generation is live; full token persistence ships with provider callbacks.",
	})
}
