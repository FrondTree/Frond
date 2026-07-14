package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("demo")
	require.NoError(t, err)
	assert.True(t, CheckPassword(hash, "demo"))
	assert.False(t, CheckPassword(hash, "wrong"))
}
