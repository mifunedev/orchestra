.PHONY: setup dev.docker.up dev.docker.down dev.docker.logs dev.docker.ps dev.docker.migrate dev.docker.test.up dev.docker.test.down benchmark.images test.images

ENV ?= dev
COMPOSE = docker compose -f infra/docker-compose.yml
COMPOSE_TEST = docker compose -f infra/docker-compose.yml -f infra/docker-compose.test.yml
DOCKER_DEV_LOG_SERVICES ?= app worker

# Install pre-commit hooks
setup:
	pre-commit install

dev.docker.up:
	@$(COMPOSE) up --build -d

dev.docker.down:
	@$(COMPOSE) down --remove-orphans

dev.docker.logs:
	@$(COMPOSE) logs -f --tail=200 $(DOCKER_DEV_LOG_SERVICES)

dev.docker.ps:
	@$(COMPOSE) ps

dev.docker.migrate:
	@$(COMPOSE) run --rm app uv run alembic upgrade head

# Local end-to-end test stack (default + test overlay). CI uses pytest + GH services.
dev.docker.test.up:
	@$(COMPOSE_TEST) up --build -d

dev.docker.test.down:
	@$(COMPOSE_TEST) down --remove-orphans

# Image benchmarks — build both targets and report sizes
benchmark.images:
	bash backend/scripts/benchmark-images.sh

# Integration test with split images
test.images:
	bash backend/scripts/test-images.sh $(TAG)
