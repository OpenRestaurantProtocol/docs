# Open Restaurant Protocol — documentação
# Requer: uv (https://docs.astral.sh/uv/)

VERSION ?= v1
ALIAS   ?= latest
ADDR    ?= 127.0.0.1:8000

.PHONY: help setup serve versioned-serve build versioned-build deploy clean

help: ## Lista os comandos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Instala as dependências (uv sync)
	uv sync

serve: ## Sobe o site sem versionamento, com hot reload (mkdocs serve)
	uv run mkdocs serve --dev-addr $(ADDR)

versioned-serve: ## Sobe o site versionado (mike serve), servindo a branch gh-pages local
	uv run mike serve --dev-addr $(ADDR)

build: ## Gera o site sem versionamento em site/ (mkdocs build --strict)
	uv run mkdocs build --strict

versioned-build: ## Publica o working tree na branch gh-pages local como $(VERSION) com alias $(ALIAS) (sem --push)
	uv run mike deploy $(VERSION) $(ALIAS)

deploy: ## Publica e envia a versão $(VERSION) com alias $(ALIAS) para o remoto (mike deploy --push)
	uv run mike deploy --push --update-aliases $(VERSION) $(ALIAS)

clean: ## Remove a pasta site/ gerada
	rm -rf site
