package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/frond-dev/frond/services/api/internal/auth"
	"github.com/frond-dev/frond/services/api/internal/config"
	"github.com/frond-dev/frond/services/api/internal/db"
	"github.com/frond-dev/frond/services/api/internal/graphstore"
	"github.com/frond-dev/frond/services/api/internal/router"
	"github.com/frond-dev/frond/services/api/internal/search"
	"github.com/frond-dev/frond/services/api/internal/storage"
	"github.com/frond-dev/frond/services/api/internal/store"
	"github.com/frond-dev/frond/services/api/internal/worker"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	st := store.New(pool)
	graph := graphstore.New(pool)
	authSvc := auth.NewService(cfg.JWTSecret, cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURL)

	localStore, err := storage.NewLocalStore(cfg.StorageLocalPath, cfg.StoragePublicURL)
	if err != nil {
		log.Fatalf("storage: %v", err)
	}

	searchClient, err := search.New(cfg.MeilisearchURL, cfg.MeilisearchAPIKey)
	if err != nil {
		log.Fatalf("search: %v", err)
	}
	if err := searchClient.EnsureIndex(ctx); err != nil {
		log.Printf("search index warning: %v", err)
	}

	scanWorker := worker.New(graph, searchClient)
	scanWorker.Start(ctx)

	handler := router.New(router.Deps{
		Config:  cfg,
		Store:   st,
		Graph:   graph,
		Auth:    authSvc,
		Storage: localStore,
		Search:  searchClient,
	})

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("frond api listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}
