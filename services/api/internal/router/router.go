package router

import (
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/config"
	gh "github.com/frond-dev/frond/services/api/internal/github"
	"github.com/frond-dev/frond/services/api/internal/graphstore"
	"github.com/frond-dev/frond/services/api/internal/handlers"
	"github.com/frond-dev/frond/services/api/internal/middleware"
	"github.com/frond-dev/frond/services/api/internal/search"
	"github.com/frond-dev/frond/services/api/internal/storage"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
)

type Deps struct {
	Config  *config.Config
	Store   *store.Store
	Graph   *graphstore.Store
	Auth    *auth.Service
	Storage storage.Store
	Search  *search.Client
}

func New(d Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(httprate.LimitByIP(200, time.Minute))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   d.Config.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Frond-Api-Key", "X-Hub-Signature-256"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	var githubOAuth *gh.OAuthService
	if d.Config.GitHubClientID != "" && d.Config.GitHubClientSecret != "" {
		githubOAuth = gh.NewOAuthService(d.Config.GitHubClientID, d.Config.GitHubClientSecret, d.Config.GitHubRedirectURL)
	}

	authHandler := &handlers.AuthHandler{Auth: d.Auth, Store: d.Store}
	orgHandler := &handlers.OrgHandler{Store: d.Store}
	projectHandler := &handlers.ProjectHandler{Store: d.Store}
	publishHandler := &handlers.PublishHandler{Store: d.Store, Storage: d.Storage, Search: d.Search}
	docsHandler := &handlers.DocsHandler{Store: d.Store, Storage: d.Storage, Search: d.Search}
	githubHandler := &handlers.GitHubHandler{
		Store: d.Store, Graph: d.Graph, GitHubOAuth: githubOAuth, WebhookSecret: d.Config.GitHubWebhookSecret,
	}
	intelHandler := &handlers.IntelligenceHandler{Store: d.Store, Graph: d.Graph}

	r.Get("/health", handlers.Health)
	r.Get("/v1/health", handlers.Health)

	if d.Config.StorageType == "local" {
		artifactsPath := d.Config.StorageLocalPath
		r.Handle("/artifacts/*", http.StripPrefix("/artifacts/", http.FileServer(http.Dir(artifactsPath))))
	}

	r.Route("/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Get("/google", authHandler.GoogleLogin)
			r.Get("/google/callback", authHandler.GoogleCallback)
			r.Get("/github/callback", githubHandler.Callback)
			r.With(middleware.AuthJWT(d.Auth)).Get("/me", authHandler.Me)
			r.With(middleware.AuthJWT(d.Auth)).Post("/api-keys", authHandler.CreateAPIKey)
		})

		r.Post("/webhooks/github", githubHandler.Webhook)

		r.Route("/orgs", func(r chi.Router) {
			r.With(middleware.AuthJWT(d.Auth)).Get("/", orgHandler.List)
			r.With(middleware.AuthJWT(d.Auth)).Post("/", orgHandler.Create)
			r.Get("/{slug}", orgHandler.Get)

			r.Route("/{orgSlug}/projects", func(r chi.Router) {
				r.Get("/", projectHandler.List)
				r.With(middleware.AuthJWTOrAPIKey(d.Auth, d.Store)).Post("/", projectHandler.Create)
				r.Get("/{projectSlug}", projectHandler.Get)
			})

			// Phase 2: GitHub integration
			r.Route("/{orgSlug}/github", func(r chi.Router) {
				r.With(middleware.AuthJWT(d.Auth)).Get("/status", githubHandler.Status)
				r.With(middleware.AuthJWT(d.Auth)).Get("/connect", githubHandler.Connect)
				r.With(middleware.AuthJWT(d.Auth)).Get("/repos", githubHandler.ListAvailableRepos)
				r.With(middleware.AuthJWT(d.Auth)).Post("/repos", githubHandler.ConnectRepos)
				r.With(middleware.AuthJWT(d.Auth)).Get("/connected", githubHandler.ListConnectedRepos)
				r.With(middleware.AuthJWT(d.Auth)).Post("/repos/{repoID}/scan", githubHandler.TriggerScan)
				r.With(middleware.AuthJWT(d.Auth)).Post("/repos/{repoID}/link", intelHandler.LinkRepoProject)
			})

			// Phase 2: Intelligence
			r.Route("/{orgSlug}/intelligence", func(r chi.Router) {
				r.Get("/architecture", intelHandler.Architecture)
				r.Get("/services", intelHandler.Services)
				r.Get("/services/{serviceID}", intelHandler.ServiceDetail)
				r.Get("/dependencies", intelHandler.Dependencies)
				r.Get("/health", intelHandler.Health)
				r.With(middleware.AuthJWT(d.Auth)).Post("/health/recompute", intelHandler.RecomputeHealth)
				r.Get("/search", intelHandler.Search)
				r.Get("/drift", intelHandler.DriftAlerts)
			})
		})

		r.Route("/projects/{projectID}", func(r chi.Router) {
			r.With(middleware.AuthJWTOrAPIKey(d.Auth, d.Store)).Post("/publish", publishHandler.Publish)
			r.With(middleware.AuthJWTOrAPIKey(d.Auth, d.Store)).Get("/deployments", publishHandler.ListDeployments)
		})

		r.Route("/docs/{orgSlug}/{projectSlug}", func(r chi.Router) {
			r.Get("/", docsHandler.GetPublished)
			r.Get("/search", docsHandler.SearchDocs)
			r.Get("/bundle", docsHandler.GetBundle)
		})
	})

	_ = os.MkdirAll(filepath.Clean(d.Config.StorageLocalPath), 0o755)
	return r
}
