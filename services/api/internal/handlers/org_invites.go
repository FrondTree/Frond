package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
)

type CreateInviteRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *OrgHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	org, ok := h.requireOrgAccess(w, r, userID, "")
	if !ok {
		return
	}
	members, err := h.Store.ListOrgMembers(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	if members == nil {
		members = []models.OrgMember{}
	}
	writeJSON(w, http.StatusOK, members)
}

func (h *OrgHandler) ListInvites(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	org, ok := h.requireOrgAccess(w, r, userID, "admin")
	if !ok {
		return
	}
	invites, err := h.Store.ListOrgInvites(r.Context(), org.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	if invites == nil {
		invites = []models.OrgInvite{}
	}
	writeJSON(w, http.StatusOK, invites)
}

func (h *OrgHandler) CreateInvite(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	org, ok := h.requireOrgAccess(w, r, userID, "admin")
	if !ok {
		return
	}

	var req CreateInviteRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		writeError(w, http.StatusBadRequest, "invalid_email", "")
		return
	}
	role := req.Role
	if role == "" {
		role = "member"
	}
	if role != "member" && role != "admin" {
		writeError(w, http.StatusBadRequest, "invalid_role", "role must be member or admin")
		return
	}

	tokenBytes := make([]byte, 24)
	if _, err := rand.Read(tokenBytes); err != nil {
		writeError(w, http.StatusInternalServerError, "token_error", err.Error())
		return
	}
	token := hex.EncodeToString(tokenBytes)

	inv, err := h.Store.CreateOrgInvite(r.Context(), org.ID, userID, req.Email, role, token, time.Now().Add(7*24*time.Hour))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	inv.OrgSlug = org.Slug
	inv.OrgName = org.Name
	writeJSON(w, http.StatusCreated, inv)
}

func (h *OrgHandler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	token := chi.URLParam(r, "token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "missing_token", "")
		return
	}
	user, err := h.Store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	org, err := h.Store.AcceptOrgInvite(r.Context(), token, userID, user.Email)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "invite_not_found", "")
			return
		}
		if errors.Is(err, store.ErrForbidden) {
			writeError(w, http.StatusForbidden, "invite_invalid", "invite expired, accepted, or email mismatch")
			return
		}
		writeError(w, http.StatusInternalServerError, "db_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, org)
}

// requireOrgAccess loads org by {orgSlug} or {slug} and checks membership.
// minRole "" = any member; "admin" = owner or admin.
func (h *OrgHandler) requireOrgAccess(w http.ResponseWriter, r *http.Request, _ interface{}, minRole string) (*models.Organization, bool) {
	slug := chi.URLParam(r, "orgSlug")
	if slug == "" {
		slug = chi.URLParam(r, "slug")
	}
	org, err := h.Store.GetOrganizationBySlug(r.Context(), slug)
	if err != nil {
		writeError(w, http.StatusNotFound, "org_not_found", "")
		return nil, false
	}
	uid, ok := middleware.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "")
		return nil, false
	}
	role, err := h.Store.UserOrgRole(r.Context(), uid, org.ID)
	if err != nil || role == "" {
		writeError(w, http.StatusForbidden, "forbidden", "")
		return nil, false
	}
	if minRole == "admin" && role != "owner" && role != "admin" {
		writeError(w, http.StatusForbidden, "forbidden", "admin required")
		return nil, false
	}
	return org, true
}
