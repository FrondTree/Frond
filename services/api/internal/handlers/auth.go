package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"time"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type AuthHandler struct {
	Auth  *auth.Service
	Store *store.Store
}

type LoginRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}

	login := req.Username
	if login == "" {
		login = req.Email
	}
	if login == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "missing_credentials", "username/email and password required")
		return
	}

	user, err := h.Store.AuthenticateUser(r.Context(), login, req.Password)
	if err != nil {
		if errors.Is(err, store.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid username or password")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}

	jwt, err := h.Auth.IssueJWT(user.ID, user.Email, 7*24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token": jwt,
		"user":  user,
	})
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

	h.createAPIKey(w, r, userID, orgID, req.Name)
}

func (h *AuthHandler) CreateOrgAPIKey(w http.ResponseWriter, r *http.Request) {
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
	var req struct {
		Name string `json:"name"`
	}
	_ = decodeJSON(r, &req)
	h.createAPIKey(w, r, userID, org.ID, req.Name)
}

func (h *AuthHandler) createAPIKey(w http.ResponseWriter, r *http.Request, userID, orgID uuid.UUID, name string) {
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
	if name == "" {
		name = "CLI / CI"
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

func (h *AuthHandler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
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
	keys, err := h.Store.ListAPIKeys(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	if keys == nil {
		keys = []models.APIKey{}
	}
	writeJSON(w, http.StatusOK, keys)
}

func (h *AuthHandler) DeleteAPIKey(w http.ResponseWriter, r *http.Request) {
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
	keyID, err := parseUUID(chi.URLParam(r, "keyID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_key_id", "")
		return
	}
	if err := h.Store.DeleteAPIKey(r.Context(), org.ID, keyID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
