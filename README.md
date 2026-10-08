# Open Restaurant Protocol

Documentação oficial do **Open Restaurant Protocol** (ORP): um padrão aberto para integrações no ecossistema de restaurantes — APIs, agentes, MCPs e autenticação.

A documentação é publicada em <https://openrestaurantprotocol.github.io/docs/>.

## Sobre o projeto

Este repositório contém o site de documentação, construído com [MkDocs](https://www.mkdocs.org/) e o tema [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).

### O que você encontra aqui

- **OAuth** — o fluxo de autenticação e autorização usado para conectar um parceiro ao Toqan, com um diagrama de sequência interativo.
- **Requisitos do OAuth no Toqan** — o que um parceiro precisa prover para integrar.
- **Como construir um MCP com OAuth** — o lado do servidor MCP.
- **Integrações** — conexão com o Toqan via MCP.

## Desenvolvimento local

O projeto usa [uv](https://docs.astral.sh/uv/) para gerenciar as dependências.

```bash
# instala as dependências
uv sync

# sobe o site localmente com hot reload
uv run mkdocs serve
```

Acesse <http://127.0.0.1:8000/docs/>.

## Build

```bash
uv run mkdocs build --strict
```

O site gerado fica na pasta `site/`.

## Deploy

O deploy é automático via GitHub Actions: a cada push na branch `main`, o workflow roda `mkdocs gh-deploy` e publica na branch `gh-pages`, servida pelo GitHub Pages.

## Estrutura

```
docs/
├── index.md                      # home
├── auth/
│   ├── oauth.md                  # fluxo OAuth (com diagrama interativo)
│   ├── toqan-oauth-requirements.md
│   └── toqan-mcp-oauth.md
├── integrations/
│   └── toqan-mcp.md
├── diagrams/oauth/               # fonte e HTML do diagrama de sequência
└── assets/                       # logo e ícone
mkdocs.yml                        # configuração do MkDocs
pyproject.toml                    # dependências (uv)
.github/workflows/deploy.yml      # deploy automático no GitHub Pages
```

## Licença

Consulte o arquivo [LICENSE](LICENSE).
