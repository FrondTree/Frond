package parser

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const sampleOpenAPI = `
openapi: 3.0.0
paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
    post:
      summary: Create user
  /health:
    get:
      summary: Health check
`

func TestParseOpenAPI(t *testing.T) {
	eps, err := ParseOpenAPI(sampleOpenAPI, "openapi.yaml")
	require.NoError(t, err)
	assert.Len(t, eps, 3)
}

func TestParseCODEOWNERS(t *testing.T) {
	owners := ParseCODEOWNERS("* @payments-team @alice\n")
	assert.Contains(t, owners, "@payments-team")
}

func TestIsOpenAPIPath(t *testing.T) {
	assert.True(t, IsOpenAPIPath("openapi.yaml"))
	assert.True(t, IsOpenAPIPath("docs/openapi.json"))
	assert.False(t, IsOpenAPIPath("README.md"))
}
