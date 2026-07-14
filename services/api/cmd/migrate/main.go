package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"

	"github.com/frond-dev/frond/services/api/internal/config"
	"github.com/joho/godotenv"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	migrationsDir := filepath.Join("internal", "db", "migrations")
	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("dialect: %v", err)
	}

	if err := goose.UpContext(context.Background(), db, migrationsDir); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	log.Println("migrations applied successfully")
	os.Exit(0)
}
