# maarkn.dev — production ops shortcuts.
# Run from the repo root (next to docker-compose.prod.yml), on the EC2 or any host.
#
#   make help          list all targets
#   make bootstrap     first-time setup (migrate + seed + ingest + up)
#   make deploy        manual deploy (what the GitHub Actions job does)
#
# Override the service for `logs`:  make logs S=traefik

COMPOSE := docker compose -f docker-compose.prod.yml

.DEFAULT_GOAL := help
.PHONY: help up down restart logs ps deploy migrate seed ingest bootstrap build pull prune

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# --- lifecycle ---
up: ## Build & start the whole stack (traefik + postgres + app)
	$(COMPOSE) up -d --build

down: ## Stop & remove containers (volumes/data are kept)
	$(COMPOSE) down

restart: ## Restart the app container
	$(COMPOSE) restart app

logs: ## Tail logs (make logs S=app | S=traefik | S=postgres)
	$(COMPOSE) logs -f $(S)

ps: ## Show container status
	$(COMPOSE) ps

# --- deploy / database ---
deploy: ## Manual deploy: sync main, migrate, rebuild app (mirrors CI)
	git fetch --prune origin
	git reset --hard origin/main
	$(COMPOSE) up -d postgres
	$(COMPOSE) run --rm migrate
	$(COMPOSE) up -d --build app traefik
	docker image prune -f

migrate: ## Apply Prisma migrations (prisma migrate deploy)
	$(COMPOSE) up -d postgres
	$(COMPOSE) run --rm migrate

seed: ## Seed admin user + starter projects (first deploy only)
	$(COMPOSE) run --rm --entrypoint sh migrate -c "pnpm run db:seed"

ingest: ## (Re)index the knowledge base into pgvector
	$(COMPOSE) run --rm --entrypoint sh migrate -c "pnpm run db:ingest"

bootstrap: ## First-time full setup: migrate -> seed -> ingest -> up
	$(MAKE) migrate
	$(MAKE) seed
	$(MAKE) ingest
	$(COMPOSE) up -d --build

# --- maintenance ---
build: ## Rebuild images without starting them
	$(COMPOSE) build

pull: ## Pull the latest base images (postgres, traefik)
	$(COMPOSE) pull

prune: ## Remove dangling images
	docker image prune -f
