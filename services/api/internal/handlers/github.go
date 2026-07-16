package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/frond-dev/frond/services/api/internal/auth"
	gh "github.com/frond-dev/frond/services/api/internal/github"
	"github.com/frond-dev/frond/services/api/internal/graphstore"
	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/scanner"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GitHubHandler struct {
	Store         *store.Store
	Graph         *graphstore.Store
	GitHubOAuth   *gh.OAuthService
	WebhookSecret string
}

func (h *GitHubHandler) Connect(w http.ResponseWriter, r *http.Request) {
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

	if h.GitHubOAuth == nil {
		writeError(w, http.StatusServiceUnavailable, "github_not_configured", "Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET")
		return
	}

	state, err := auth.GenerateState()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "state_error", err.Error())
		return
	}

	payload, _ := json.Marshal(map[string]string{
		"org_slug": orgSlug,
		"user_id":  userID.String(),
		"redirect": r.URL.Query().Get("redirect_uri"),
	})
	_ = h.Store.SaveOAuthState(r.Context(), state, string(payload))

	authURL := h.GitHubOAuth.AuthURL(state)
	// JSON for SPA (Bearer via fetch); redirect for legacy browser navigations
	if r.Header.Get("Accept") == "application/json" || r.URL.Query().Get("format") == "json" {
		writeJSON(w, http.StatusOK, map[string]string{"url": authURL})
		return
	}
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

func (h *GitHubHandler) Callback(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	code := r.URL.Query().Get("code")
	if state == "" || code == "" {
		writeError(w, http.StatusBadRequest, "invalid_callback", "")
		return
	}

	payloadJSON, err := h.Store.ConsumeOAuthState(r.Context(), state)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_state", "")
		return
	}

	var payload struct {
		OrgSlug  string `json:"org_slug"`
		UserID   string `json:"user_id"`
		Redirect string `json:"redirect"`
	}
	_ = json.Unmarshal([]byte(payloadJSON), &payload)

	org, err := h.Store.GetOrganizationBySlug(r.Context(), payload.OrgSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "org_not_found", "")
		return
	}

	userID, _ := uuid.Parse(payload.UserID)

	token, err := h.GitHubOAuth.Exchange(r.Context(), code)
	if err != nil {
		writeError(w, http.StatusBadRequest, "oauth_error", err.Error())
		return
	}

	ghClient := h.GitHubOAuth.Client(r.Context(), token)
	user, err := ghClient.GetUser(r.Context())
	if err != nil {
		writeError(w, http.StatusBadRequest, "github_user_error", err.Error())
		return
	}

	_, err = h.Graph.UpsertGitHubConnection(r.Context(), org.ID, userID, user.ID, user.Login, token.AccessToken, "repo")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	redirectURI := payload.Redirect
	if redirectURI == "" {
		redirectURI = "http://localhost:3000/dashboard"
	}
	if strings.Contains(redirectURI, "?") {
		redirectURI += "&github=connected"
	} else {
		redirectURI += "?github=connected"
	}
	http.Redirect(w, r, redirectURI, http.StatusTemporaryRedirect)
}

func (h *GitHubHandler) Status(w http.ResponseWriter, r *http.Request) {
	orgSlug := chi.URLParam(r, "orgSlug")
	org, err := h.Store.GetOrganizationBySlug(r.Context(), orgSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "org_not_found", "")
		return
	}

	conn, err := h.Graph.GetGitHubConnection(r.Context(), org.ID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"connected": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"connected": true,
		"login":     conn.GitHubLogin,
	})
}

func (h *GitHubHandler) ListAvailableRepos(w http.ResponseWriter, r *http.Request) {
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

	token, err := h.Graph.GetGitHubToken(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "github_not_connected", "Connect GitHub first")
		return
	}

	repos, err := gh.NewClient(token).ListRepos(r.Context(), 100)
	if err != nil {
		writeError(w, http.StatusBadGateway, "github_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, repos)
}

type ConnectReposRequest struct {
	RepoIDs []int64 `json:"repo_ids"`
}

func (h *GitHubHandler) ConnectRepos(w http.ResponseWriter, r *http.Request) {
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
	if err != nil || (role != "owner" && role != "admin" && role != "member") {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return
	}

	conn, err := h.Graph.GetGitHubConnection(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "github_not_connected", "")
		return
	}

	var req ConnectReposRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}

	token, _ := h.Graph.GetGitHubToken(r.Context(), org.ID)
	allRepos, err := gh.NewClient(token).ListRepos(r.Context(), 100)
	if err != nil {
		writeError(w, http.StatusBadGateway, "github_error", err.Error())
		return
	}

	selected := map[int64]bool{}
	for _, id := range req.RepoIDs {
		selected[id] = true
	}

	var connected []models.ConnectedRepository
	for _, repo := range allRepos {
		if !selected[repo.ID] {
			continue
		}
		cr, err := h.Graph.ConnectRepository(r.Context(), org.ID, conn.ID, repo, nil)
		if err != nil {
			continue
		}
		_, _ = h.Graph.EnqueueScanJob(r.Context(), org.ID, cr.ID, "connect")
		connected = append(connected, *cr)
	}

	writeJSON(w, http.StatusCreated, connected)
}

func (h *GitHubHandler) ListConnectedRepos(w http.ResponseWriter, r *http.Request) {
	orgSlug := chi.URLParam(r, "orgSlug")
	org, err := h.Store.GetOrganizationBySlug(r.Context(), orgSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "org_not_found", "")
		return
	}

	repos, err := h.Graph.ListConnectedRepositories(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, repos)
}

func (h *GitHubHandler) TriggerScan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}

	orgSlug := chi.URLParam(r, "orgSlug")
	repoID, err := parseUUID(chi.URLParam(r, "repoID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_repo_id", "")
		return
	}

	org, err := h.Store.GetOrganizationBySlug(r.Context(), orgSlug)
	if err != nil {
		writeError(w, http.StatusNotFound, "org_not_found", "")
		return
	}

	if _, err := h.Store.UserOrgRole(r.Context(), userID, org.ID); err != nil {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return
	}

	job, err := h.Graph.EnqueueScanJob(r.Context(), org.ID, repoID, "manual")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusAccepted, job)
}

func (h *GitHubHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "read_error", "")
		return
	}

	if h.WebhookSecret != "" {
		sig := r.Header.Get("X-Hub-Signature-256")
		if !verifyGitHubSignature(body, sig, h.WebhookSecret) {
			writeError(w, http.StatusUnauthorized, "invalid_signature", "")
			return
		}
	}

	event := r.Header.Get("X-GitHub-Event")
	switch event {
	case "push":
		h.handlePush(r.Context(), body)
	case "pull_request":
		h.handlePullRequest(r.Context(), body)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *GitHubHandler) handlePush(ctx context.Context, body []byte) {
	var payload struct {
		Repository struct {
			ID       int64  `json:"id"`
			FullName string `json:"full_name"`
		} `json:"repository"`
	}
	if json.Unmarshal(body, &payload) != nil {
		return
	}
	orgID, err := h.Graph.GetOrgIDByGitHubRepoID(ctx, payload.Repository.ID)
	if err != nil {
		return
	}
	repo, err := h.Graph.GetRepositoryByFullName(ctx, orgID, payload.Repository.FullName)
	if err != nil {
		return
	}
	_, _ = h.Graph.EnqueueScanJob(ctx, orgID, repo.ID, "push")
}

func (h *GitHubHandler) handlePullRequest(ctx context.Context, body []byte) {
	var payload struct {
		Action string `json:"action"`
		Number int    `json:"number"`
		PullRequest struct {
			HTMLURL string `json:"html_url"`
		} `json:"pull_request"`
		Repository struct {
			ID       int64  `json:"id"`
			FullName string `json:"full_name"`
			Name     string `json:"name"`
			Owner    struct {
				Login string `json:"login"`
			} `json:"owner"`
		} `json:"repository"`
	}
	if json.Unmarshal(body, &payload) != nil {
		return
	}
	if payload.Action != "opened" && payload.Action != "synchronize" {
		return
	}

	orgID, err := h.Graph.GetOrgIDByGitHubRepoID(ctx, payload.Repository.ID)
	if err != nil {
		return
	}

	repo, _ := h.Graph.GetRepositoryByFullName(ctx, orgID, payload.Repository.FullName)
	var repoID *uuid.UUID
	if repo != nil {
		repoID = &repo.ID
	}

	published := h.Graph.ListDocumentedEndpointKeys(ctx, orgID)
	token, tokErr := h.Graph.GetGitHubToken(ctx, orgID)
	var drifts []string
	if tokErr == nil {
		ghClient := gh.NewClient(token)
		sc := scanner.New(ghClient)
		drifts, _ = sc.DetectDriftFromPR(ctx, payload.Repository.Owner.Login, payload.Repository.Name, payload.Number, published)
		if len(drifts) > 0 {
			comment := "**Frond documentation drift**\n\n" + strings.Join(drifts, "\n")
			if len(comment) > 6000 {
				comment = comment[:6000] + "\n…"
			}
			_ = ghClient.CreatePRComment(ctx, payload.Repository.Owner.Login, payload.Repository.Name, payload.Number, comment)
		}
	}

	if len(drifts) == 0 {
		drifts = []string{"PR touches API-related files. Review whether docs need updating."}
	}

	prNum := payload.Number
	prURL := payload.PullRequest.HTMLURL
	details, _ := json.Marshal(map[string]interface{}{"repo": payload.Repository.FullName, "drifts": drifts})
	_, _ = h.Graph.CreateDriftAlert(ctx, models.DocDriftAlert{
		OrganizationID: orgID,
		RepositoryID:   repoID,
		PRNumber:       &prNum,
		PRURL:          prURL,
		Severity:       "warning",
		Title:          "Documentation drift detected",
		Message:        drifts[0],
		Details:        details,
	})
}

func verifyGitHubSignature(body []byte, sig, secret string) bool {
	if !strings.HasPrefix(sig, "sha256=") {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}
