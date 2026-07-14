package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/google/uuid"
)

type contextKey string

const UserIDKey contextKey = "user_id"
const OrgIDKey contextKey = "org_id"

func AuthJWT(authSvc *auth.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearer(r)
			if token == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			claims, err := authSvc.ParseJWT(token)
			if err != nil {
				http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AuthAPIKey(authSvc *auth.Service, st *store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := r.Header.Get("X-Frond-Api-Key")
			if raw == "" {
				raw = extractBearer(r)
			}
			if raw == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			userID, orgID, err := st.GetUserByAPIKey(r.Context(), auth.HashAPIKey(raw))
			if err != nil {
				http.Error(w, `{"error":"invalid_api_key"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, OrgIDKey, orgID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AuthJWTOrAPIKey(authSvc *auth.Service, st *store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("X-Frond-Api-Key") != "" || strings.HasPrefix(r.Header.Get("Authorization"), "Bearer frond_") {
				AuthAPIKey(authSvc, st)(next).ServeHTTP(w, r)
				return
			}
			AuthJWT(authSvc)(next).ServeHTTP(w, r)
		})
	}
}

func UserID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return id, ok
}

func OrgID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(OrgIDKey).(uuid.UUID)
	return id, ok
}

func extractBearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	return ""
}
