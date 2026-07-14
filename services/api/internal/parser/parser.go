package parser

import (
	"encoding/json"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

type APIEndpoint struct {
	Method      string
	Path        string
	Summary     string
	Description string
	OperationID string
	SpecPath    string
	Source      string
}

type Dependency struct {
	Name    string
	Version string
	Type    string
}

type ADR struct {
	Number  string
	Title   string
	Status  string
	Content string
	Path    string
}

type ScanResult struct {
	ServiceName string
	Description string
	Language    string
	Framework   string
	Owners      []string
	APIs        []APIEndpoint
	Dependencies []Dependency
	ADRs        []ADR
	OpenAPIPaths []string
}

var openapiPaths = []string{
	"openapi.yaml", "openapi.yml", "openapi.json",
	"swagger.yaml", "swagger.yml", "swagger.json",
	"api/openapi.yaml", "docs/openapi.yaml",
	"frond/openapi/v1/openapi.yaml",
}

func IsOpenAPIPath(path string) bool {
	lower := strings.ToLower(path)
	for _, p := range openapiPaths {
		if lower == p || strings.HasSuffix(lower, "/"+p) {
			return true
		}
	}
	if strings.Contains(lower, "openapi") && (strings.HasSuffix(lower, ".yaml") || strings.HasSuffix(lower, ".yml") || strings.HasSuffix(lower, ".json")) {
		return true
	}
	return false
}

func IsADRPath(path string) bool {
	lower := strings.ToLower(path)
	return strings.Contains(lower, "docs/adr/") ||
		strings.Contains(lower, "adr/") ||
		strings.HasPrefix(lower, "adr-") ||
		regexp.MustCompile(`(?i)adr-\d+`).MatchString(path)
}

func IsDependencyFile(path string) bool {
	lower := strings.ToLower(path)
	return lower == "package.json" || lower == "go.mod" || lower == "requirements.txt" || lower == "pyproject.toml" || lower == "cargo.toml"
}

func IsCodeOwners(path string) bool {
	return strings.EqualFold(path, "CODEOWNERS") || strings.HasSuffix(path, "/CODEOWNERS")
}

func IsRouteFile(path string) bool {
	lower := strings.ToLower(path)
	if !strings.HasSuffix(lower, ".ts") && !strings.HasSuffix(lower, ".js") && !strings.HasSuffix(lower, ".go") && !strings.HasSuffix(lower, ".py") {
		return false
	}
	return strings.Contains(lower, "route") || strings.Contains(lower, "handler") || strings.Contains(lower, "/api/")
}

func ParseOpenAPI(content, specPath string) ([]APIEndpoint, error) {
	var spec map[string]interface{}
	if strings.HasSuffix(specPath, ".json") {
		if err := json.Unmarshal([]byte(content), &spec); err != nil {
			return nil, err
		}
	} else {
		if err := yaml.Unmarshal([]byte(content), &spec); err != nil {
			return nil, err
		}
	}

	paths, ok := spec["paths"].(map[string]interface{})
	if !ok {
		return nil, nil
	}

	var endpoints []APIEndpoint
	methods := []string{"get", "post", "put", "patch", "delete", "options", "head"}
	for path, item := range paths {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		for _, method := range methods {
			op, ok := itemMap[method].(map[string]interface{})
			if !ok {
				continue
			}
			ep := APIEndpoint{
				Method:   strings.ToUpper(method),
				Path:     path,
				SpecPath: specPath,
				Source:   "openapi",
			}
			if s, ok := op["summary"].(string); ok {
				ep.Summary = s
			}
			if d, ok := op["description"].(string); ok {
				ep.Description = d
			}
			if id, ok := op["operationId"].(string); ok {
				ep.OperationID = id
			}
			endpoints = append(endpoints, ep)
		}
	}
	return endpoints, nil
}

func ParsePackageJSON(content string) ([]Dependency, string, string) {
	var pkg struct {
		Name         string            `json:"name"`
		Description  string            `json:"description"`
		Dependencies map[string]string `json:"dependencies"`
	}
	if err := json.Unmarshal([]byte(content), &pkg); err != nil {
		return nil, "", ""
	}
	var deps []Dependency
	for name, version := range pkg.Dependencies {
		depType := "package"
		if strings.Contains(name, "postgres") || strings.Contains(name, "pg") {
			depType = "database"
		}
		if strings.Contains(name, "redis") {
			depType = "cache"
		}
		if strings.Contains(name, "stripe") {
			depType = "external"
		}
		deps = append(deps, Dependency{Name: name, Version: version, Type: depType})
	}
	framework := detectJSFramework(pkg.Dependencies)
	return deps, pkg.Name, framework
}

func detectJSFramework(deps map[string]string) string {
	if _, ok := deps["next"]; ok {
		return "Next.js"
	}
	if _, ok := deps["express"]; ok {
		return "Express"
	}
	if _, ok := deps["fastify"]; ok {
		return "Fastify"
	}
	if _, ok := deps["@nestjs/core"]; ok {
		return "NestJS"
	}
	return ""
}

func ParseGoMod(content string) ([]Dependency, string) {
	var deps []Dependency
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "require ") && !strings.Contains(line, "(") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				deps = append(deps, Dependency{Name: parts[1], Version: parts[2], Type: "go"})
			}
		}
	}
	return deps, "Go"
}

func ParseADR(content, path string) ADR {
	adr := ADR{Path: path, Status: "accepted", Content: content}
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		lower := strings.ToLower(line)
		if strings.HasPrefix(lower, "# ") {
			adr.Title = strings.TrimPrefix(line, "# ")
		}
		if strings.Contains(lower, "adr-") {
			re := regexp.MustCompile(`(?i)adr-(\d+)`)
			if m := re.FindStringSubmatch(line); len(m) > 1 {
				adr.Number = m[1]
			}
		}
		if strings.HasPrefix(lower, "status:") {
			adr.Status = strings.TrimSpace(strings.TrimPrefix(lower, "status:"))
		}
	}
	if adr.Title == "" {
		adr.Title = path
	}
	return adr
}

func ParseCODEOWNERS(content string) []string {
	var owners []string
	seen := map[string]bool{}
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Fields(line)
		for _, p := range parts[1:] {
			if strings.HasPrefix(p, "@") && !seen[p] {
				seen[p] = true
				owners = append(owners, p)
			}
		}
	}
	return owners
}

func ParseRoutes(content, lang string) []APIEndpoint {
	var endpoints []APIEndpoint
	switch lang {
	case "go":
		re := regexp.MustCompile(`\.(Get|Post|Put|Patch|Delete)\("([^"]+)"`)
		for _, m := range re.FindAllStringSubmatch(content, -1) {
			endpoints = append(endpoints, APIEndpoint{
				Method: strings.ToUpper(m[1]),
				Path:   m[2],
				Source: "inferred",
			})
		}
	case "ts", "js":
		re := regexp.MustCompile(`\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]`)
		for _, m := range re.FindAllStringSubmatch(content, -1) {
			endpoints = append(endpoints, APIEndpoint{
				Method: strings.ToUpper(m[1]),
				Path:   m[2],
				Source: "inferred",
			})
		}
	}
	return endpoints
}

func DetectLanguage(path string) string {
	lower := strings.ToLower(path)
	switch {
	case strings.HasSuffix(lower, ".go"):
		return "go"
	case strings.HasSuffix(lower, ".ts"), strings.HasSuffix(lower, ".tsx"):
		return "ts"
	case strings.HasSuffix(lower, ".js"), strings.HasSuffix(lower, ".jsx"):
		return "js"
	case strings.HasSuffix(lower, ".py"):
		return "py"
	case strings.HasSuffix(lower, ".rs"):
		return "rust"
	default:
		return ""
	}
}