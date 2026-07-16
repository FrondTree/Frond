package store

import (
	"fmt"
	"os"
	"strings"
)

// DocsPublicURL builds the public docs URL for a project.
// When DOCS_HOSTED_DOMAIN is set (e.g. "frond.dev"), returns https://{company}.frond.dev/{project}.
// Otherwise returns {DOCS_PUBLIC_URL}/{company}/{project} (default http://localhost:3001/...).
func DocsPublicURL(companySubdomain, projectSlug string) string {
	company := strings.ToLower(strings.TrimSpace(companySubdomain))
	project := strings.Trim(strings.TrimSpace(projectSlug), "/")
	if company == "" {
		company = "docs"
	}

	hosted := strings.TrimSpace(os.Getenv("DOCS_HOSTED_DOMAIN"))
	if hosted != "" {
		scheme := os.Getenv("DOCS_PUBLIC_SCHEME")
		if scheme == "" {
			scheme = "https"
		}
		return fmt.Sprintf("%s://%s.%s/%s", scheme, company, hosted, project)
	}

	base := os.Getenv("DOCS_PUBLIC_URL")
	if base == "" {
		base = "http://localhost:3001"
	}
	return fmt.Sprintf("%s/%s/%s", strings.TrimRight(base, "/"), company, project)
}

// HostedDomain returns DOCS_HOSTED_DOMAIN or empty.
func HostedDomain() string {
	return strings.TrimSpace(os.Getenv("DOCS_HOSTED_DOMAIN"))
}
