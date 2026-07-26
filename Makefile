.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help up down build restart logs certs migrate makemigrations seed test lint fmt openapi storybook dev-portail dev-demarches dev-intranet dev-backoffice

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'

certs: ## Génère un certificat TLS auto-signé pour le développement local (*.localhost)
	@mkdir -p nginx/certs
	@openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
		-keyout nginx/certs/dev.key -out nginx/certs/dev.crt \
		-subj "/C=SN/O=DGAP/CN=administrationpenitentiaire.sn" \
		-addext "subjectAltName=DNS:*.administrationpenitentiaire.sn,DNS:*.localhost,DNS:localhost"
	@echo "Certificat de développement généré dans nginx/certs/. Ajoutez les hôtes suivants à /etc/hosts :"
	@echo "127.0.0.1 www.localhost demarches.localhost intranet.localhost admin.localhost"

up: certs ## Démarre la stack (profil dev par défaut)
	$(COMPOSE) up --build -d

up-full: certs ## Démarre la stack avec le profil "full" (Elasticsearch, Keycloak)
	$(COMPOSE) --profile full up --build -d

down: ## Arrête la stack
	$(COMPOSE) down

build: ## (Re)construit les images
	$(COMPOSE) build

restart: down up ## Redémarre la stack

logs: ## Suit les logs de tous les services
	$(COMPOSE) logs -f

migrate: ## Applique les migrations Django
	$(COMPOSE) exec backend python manage.py migrate

makemigrations: ## Génère les migrations Django manquantes
	$(COMPOSE) exec backend python manage.py makemigrations

seed: ## Peuple la base avec le jeu de données de démonstration (§11)
	$(COMPOSE) exec backend python manage.py shell -c "import scripts.seed"

test: ## Exécute les suites de tests backend et frontend
	$(COMPOSE) exec backend pytest
	cd frontend && pnpm -r test

lint: ## Lint backend (ruff) et frontend (eslint)
	$(COMPOSE) exec backend ruff check .
	cd frontend && pnpm -r lint

fmt: ## Formate le code (black, ruff --fix)
	$(COMPOSE) exec backend black .
	$(COMPOSE) exec backend ruff check --fix .

openapi: ## Régénère le schéma OpenAPI (docs/api/openapi.yaml)
	$(COMPOSE) exec backend python manage.py spectacular --file docs/api/openapi.yaml

storybook: ## Lance Storybook du design system @dgap/ui
	cd frontend && pnpm storybook

dev-portail: ## Lance le portail en mode développement (hors Docker, hot-reload)
	cd frontend && pnpm dev:portail

dev-demarches: ## Lance les démarches en mode développement
	cd frontend && pnpm dev:demarches

dev-intranet: ## Lance l'intranet en mode développement
	cd frontend && pnpm dev:intranet

dev-backoffice: ## Lance le back-office en mode développement
	cd frontend && pnpm dev:backoffice
