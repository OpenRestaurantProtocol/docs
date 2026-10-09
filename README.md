# Open Restaurant Protocol

Documentação oficial do **Open Restaurant Protocol** (ORP): um padrão aberto para integrações no ecossistema de restaurantes — APIs, agentes, MCPs e autenticação.

A documentação é publicada em <https://openrestaurantprotocol.org/>.

## Sobre o projeto

Este repositório contém o site de documentação, construído com [MkDocs](https://www.mkdocs.org/) e o tema [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/), com versionamento de documentação via [mike](https://github.com/jimporter/mike).

### O que você encontra aqui

- **OAuth** — o fluxo de autenticação e autorização usado para conectar um parceiro à Plataforma, com um diagrama de sequência interativo.
- **Requisitos do OAuth** — o que um parceiro precisa prover para integrar.
- **Discovery** — descoberta automática de authorization servers e recursos protegidos (RFC 8414, RFC 9728, DCR).
- **Como construir um MCP com OAuth** — o lado do servidor MCP.
- **Contratos de Dados** — o template que cada domínio de dados deve seguir (em desenvolvimento).
- **Integrações** — conexão via MCP.

## Desenvolvimento local

O projeto usa [uv](https://docs.astral.sh/uv/) para gerenciar as dependências.

```bash
# instala as dependências
uv sync

# sobe o site localmente com hot reload (sem versionamento)
uv run mkdocs serve
```

Acesse <http://127.0.0.1:8000/>.

### Comandos via Makefile

Um `Makefile` agrupa os comandos mais comuns. Rode `make help` para ver todos.

```bash
make help              # lista os comandos disponíveis
make setup             # instala as dependências (uv sync)
make serve             # site sem versionamento, com hot reload
make build             # build sem versionamento (site/)
```

## Versionamento

O site é versionado (v1, v2, ...) com **mike**. Cada versão publicada vira um diretório próprio na branch `gh-pages` (`/v1/`, `/v2/`, ...), com um seletor de versão no cabeçalho do site.

> **Atenção:** `mkdocs serve` mostra o **working tree** (suas edições não commitadas). `mike serve` mostra a **branch `gh-pages`** (o último `mike deploy`). Para ver o conteúdo novo versionado, faça um `mike deploy` local antes.

```bash
# 1. publica o working tree na branch gh-pages LOCAL (sem subir pro remoto)
uv run mike deploy v1 latest

# 2. serve o site versionado a partir da branch gh-pages local
uv run mike serve
# → http://localhost:8000 (com seletor de versão)

# versão via Makefile
make versioned-build    # = mike deploy v1 latest (local)
make versioned-serve    # = mike serve
```

## Build

```bash
uv run mkdocs build --strict
```

O site gerado fica na pasta `site/`.

## Deploy

O deploy é automático via GitHub Actions: a cada push na branch `main`, o workflow roda `mike deploy --push --update-aliases v1 latest` e `mike set-default --push latest`, publicando na branch `gh-pages`, servida pelo GitHub Pages no domínio customizado.

> O arquivo `CNAME` (contendo `openrestaurantprotocol.org`) é mantido manualmente na raiz da branch `gh-pages` — o mike não o gerencia. Nunca use `mike delete --all`, que apagaria o `CNAME` junto com o resto da branch.

Para publicar manualmente:

```bash
uv run mike deploy --push --update-aliases v1 latest
uv run mike set-default --push latest
```

## Estrutura

```
docs/
├── index.md                      # home (Início)
├── auth/
│   ├── oauth.md                  # fluxo OAuth (com diagrama interativo)
│   ├── oauth-requirements.md     # requisitos do OAuth
│   ├── discovery.md              # descoberta automática (RFC 8414/9728, DCR)
│   └── mcp-oauth.md              # como construir um MCP com OAuth
├── data-contracts/
│   └── index.md                  # template de contratos de dados
├── integrations/
│   └── mcp.md                    # integração via MCP
├── diagrams/oauth/               # fonte e HTML do diagrama de sequência
└── assets/                       # logo e ícone
mkdocs.yml                        # configuração do MkDocs
pyproject.toml                    # dependências (uv)
Makefile                          # comandos de desenvolvimento
.github/workflows/deploy.yml      # deploy automático no GitHub Pages
```

## Licença

Consulte o arquivo [LICENSE](LICENSE).
