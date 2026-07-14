.PHONY: dev up down migrate test-api test-ts build

up:
	docker compose up -d postgres meilisearch

down:
	docker compose down

migrate:
	cd services/api && go run ./cmd/migrate

api:
	cd services/api && go run ./cmd/server

dev-api:
	cd services/api && air

test-api:
	cd services/api && go test ./... -count=1

test-ts:
	pnpm test

build:
	pnpm build
	cd services/api && go build -o bin/server ./cmd/server

compose-up:
	docker compose up --build
