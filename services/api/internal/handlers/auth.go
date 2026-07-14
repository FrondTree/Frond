package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"time"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/store"
)

type AuthHandler struct {
	Auth  *auth.Service
	Store *store.Store
}

func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	state, err := auth.GenerateState()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "state_error", err.Error())
		return
	}

	redirectURI := r.URL.Query().Get("redirect_uri")
	if err := h.Store.SaveOAuthState(r.Context(), state, redirectURI); err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	http.Redirect(w, r, h.Auth.GoogleAuthURL(state), http.StatusTemporaryRedirect)
}

func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	code := r.URL.Query().Get("code")
	if state == "" || code == "" {
		writeError(w, http.StatusBadRequest, "invalid_callback", "missing state or code")
		return
	}

	redirectURI, err := h.Store.ConsumeOAuthState(r.Context(), state)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_state", "oauth state expired or invalid")
		return
	}

	token, err := h.Auth.ExchangeGoogleCode(r.Context(), code)
	if err != nil {
		writeError(w, http.StatusBadRequest, "oauth_error", err.Error())
		return
	}

	info, err := h.Auth.FetchGoogleUser(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusBadRequest, "user_error", err.Error())
		return
	}

	user, err := h.Store.UpsertGoogleUser(r.Context(), info.ID, info.Email, info.Name, info.Picture)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	jwt, err := h.Auth.IssueJWT(user.ID, user.Email, 7*24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token_error", err.Error())
		return
	}

	if redirectURI == "" {
		redirectURI = "http://localhost:3000/auth/callback"
	}

	u, _ := url.Parse(redirectURI)
	q := u.Query()
	q.Set("token", jwt)
	u.RawQuery = q.Encode()
	http.Redirect(w, r, u.String(), http.StatusTemporaryRedirect)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}

	user, err := h.Store.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, user)
}

type CreateAPIKeyRequest struct {
	OrganizationID string `json:"organization_id"`
	Name           string `json:"name"`
}

func (h *AuthHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}

	var req CreateAPIKeyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}

	orgID, err := parseUUID(req.OrganizationID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_org_id", "")
		return
	}

	role, err := h.Store.UserOrgRole(r.Context(), userID, orgID)
	if err != nil || (role != "owner" && role != "admin") {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return
	}

	raw, hash, prefix, err := auth.GenerateAPIKey()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "key_error", err.Error())
		return
	}

	name := req.Name
	if name == "" {
		name = "default"
	}

	key, err := h.Store.CreateAPIKey(r.Context(), userID, orgID, name, hash, prefix)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"key":    key,
		"secret": raw,
	})
}
