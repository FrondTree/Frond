package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/frond-dev/frond/services/api/internal/github"
	"github.com/frond-dev/frond/services/api/internal/parser"
)

type Scanner struct {
	github *github.Client
}

func New(gh *github.Client) *Scanner {
	return &Scanner{github: gh}
}

func (s *Scanner) ScanRepository(ctx context.Context, owner, repo, branch, repoLanguage string) (*parser.ScanResult, int, error) {
	tree, err := s.github.ListTree(ctx, owner, repo, branch)
	if err != nil {
		return nil, 0, err
	}

	result := &parser.ScanResult{
		ServiceName: repo,
		Language:    repoLanguage,
		Owners:      []string{},
	}
	filesScanned := 0

	for _, entry := range tree {
		if entry.Type != "blob" {
			continue
		}
		path := entry.Path
		lower := strings.ToLower(path)

		switch {
		case parser.IsOpenAPIPath(path):
			content, err := s.github.GetFileContent(ctx, owner, repo, path, branch)
			if err != nil {
				continue
			}
			filesScanned++
			result.OpenAPIPaths = append(result.OpenAPIPaths, path)
			eps, err := parser.ParseOpenAPI(content, path)
			if err == nil {
				result.APIs = append(result.APIs, eps...)
			}

		case lower == "package.json" && !strings.Contains(lower, "node_modules"):
			content, err := s.github.GetFileContent(ctx, owner, repo, path, branch)
			if err != nil {
				continue
			}
			filesScanned++
			deps, name, framework := parser.ParsePackageJSON(content)
			result.Dependencies = append(result.Dependencies, deps...)
			if name != "" {
				result.ServiceName = name
			}
			if framework != "" {
				result.Framework = framework
			}

		case lower == "go.mod":
			content, err := s.github.GetFileContent(ctx, owner, repo, path, branch)
			if err != nil {
				continue
			}
			filesScanned++
			deps, _ := parser.ParseGoMod(content)
			result.Dependencies = append(result.Dependencies, deps...)
			if result.Framework == "" {
				result.Framework = "Go"
			}

		case parser.IsADRPath(path) && (strings.HasSuffix(lower, ".md") || strings.HasSuffix(lower, ".mdx")):
			content, err := s.github.GetFileContent(ctx, owner, repo, path, branch)
			if err != nil {
				continue
			}
			filesScanned++
			result.ADRs = append(result.ADRs, parser.ParseADR(content, path))

		case parser.IsCodeOwners(path):
			content, err := s.github.GetFileContent(ctx, owner, repo, path, branch)
			if err != nil {
				continue
			}
			filesScanned++
			result.Owners = parser.ParseCODEOWNERS(content)

		case lower == "readme.md":
			content, err := s.github.GetFileContent(ctx, owner, repo, path, branch)
			if err != nil {
				continue
			}
			filesScanned++
			result.Description = firstParagraph(content)

		case parser.IsRouteFile(path):
			content, err := s.github.GetFileContent(ctx, owner, repo, path, branch)
			if err != nil {
				continue
			}
			filesScanned++
			lang := parser.DetectLanguage(path)
			result.APIs = append(result.APIs, parser.ParseRoutes(content, lang)...)
		}
	}

	if result.Language == "" {
		result.Language = repoLanguage
	}

	return result, filesScanned, nil
}

func (s *Scanner) DetectDriftFromPR(ctx context.Context, owner, repo string, prNumber int, publishedEndpoints []string) ([]string, error) {
	files, err := s.github.GetPRFiles(ctx, owner, repo, prNumber)
	if err != nil {
		return nil, err
	}

	published := map[string]bool{}
	for _, ep := range publishedEndpoints {
		published[ep] = true
	}

	var drifts []string
	for _, f := range files {
		if !parser.IsOpenAPIPath(f.Filename) && !parser.IsRouteFile(f.Filename) {
			continue
		}
		if f.Patch == "" {
			continue
		}
		for _, line := range strings.Split(f.Patch, "\n") {
			if strings.HasPrefix(line, "+") && (strings.Contains(line, "post") || strings.Contains(line, "get") || strings.Contains(line, "Post") || strings.Contains(line, "Get")) {
				drifts = append(drifts, fmt.Sprintf("API change in %s: %s", f.Filename, strings.TrimPrefix(line, "+")))
			}
		}
	}

	_ = published
	return drifts, nil
}

func firstParagraph(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if len(line) > 300 {
			return line[:300]
		}
		return line
	}
	return ""
}

func OwnersJSON(owners []string) json.RawMessage {
	b, _ := json.Marshal(owners)
	return b
}
