package github

import (
	"encoding/base64"
	"strings"
)

func decodeBase64Content(s string) (string, error) {
	s = strings.ReplaceAll(s, "\n", "")
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
