package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIssueAndParseJWT(t *testing.T) {
	svc := NewService("test-secret-key-at-least-32-chars-long", "", "", "")
	userID := uuid.New()

	token, err := svc.IssueJWT(userID, "test@frond.dev", time.Hour)
	require.NoError(t, err)
	require.NotEmpty(t, token)

	claims, err := svc.ParseJWT(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, "test@frond.dev", claims.Email)
}

func TestGenerateAPIKey(t *testing.T) {
	raw, hash, prefix, err := GenerateAPIKey()
	require.NoError(t, err)
	assert.True(t, len(raw) > 20)
	assert.True(t, len(hash) == 64)
	assert.Equal(t, raw[:12], prefix)
	assert.Equal(t, hash, HashAPIKey(raw))
}

func TestInvalidJWT(t *testing.T) {
	svc := NewService("test-secret-key-at-least-32-chars-long", "", "", "")
	_, err := svc.ParseJWT("invalid.token.here")
	assert.ErrorIs(t, err, ErrInvalidToken)
}
