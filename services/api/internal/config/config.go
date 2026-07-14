package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port              string
	BaseURL           string
	DatabaseURL       string
	JWTSecret         string
	CORSOrigins       []string
	GoogleClientID    string
	GoogleClientSecret string
	GoogleRedirectURL string
	GitHubClientID    string
	GitHubClientSecret string
	GitHubRedirectURL string
	GitHubWebhookSecret string
	StorageType       string
	StorageLocalPath  string
	StoragePublicURL  string
	MeilisearchURL    string
	MeilisearchAPIKey string
	Environment       string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:               getEnv("API_PORT", "8080"),
		BaseURL:            getEnv("API_BASE_URL", "http://localhost:8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		CORSOrigins:        strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/v1/auth/google/callback"),
		GitHubClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		GitHubClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
		GitHubRedirectURL:  getEnv("GITHUB_REDIRECT_URL", "http://localhost:8080/v1/auth/github/callback"),
		GitHubWebhookSecret: os.Getenv("GITHUB_WEBHOOK_SECRET"),
		StorageType:        getEnv("STORAGE_TYPE", "local"),
		StorageLocalPath:   getEnv("STORAGE_LOCAL_PATH", "./data/artifacts"),
		StoragePublicURL:   getEnv("STORAGE_PUBLIC_URL", "http://localhost:8080/artifacts"),
		MeilisearchURL:     getEnv("MEILISEARCH_URL", "http://localhost:7700"),
		MeilisearchAPIKey:  getEnv("MEILISEARCH_API_KEY", ""),
		Environment:        getEnv("ENVIRONMENT", "development"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
