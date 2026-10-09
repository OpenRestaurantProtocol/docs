---
agent: plan
timestamp: 2026-10-08T18:00:00Z
slug: professionalize-protocol-docs
topic: Versionamento (mike), consolidação de Discovery OAuth/MCP, template de Contratos de Dados e reestruturação em estilo MCP
---

# Plan: Profissionalizar a documentação do Open Restaurant Protocol

## Goal

Transformar o site do Open Restaurant Protocol (MkDocs + Material, repo `OpenRestaurantProtocol/docs`) numa documentação de protocolo genérico e profissional, nos moldes de especificações como a do Model Context Protocol: com versionamento real (v1, v2, ...) via `mike`, uma página de Discovery dedicada que consolida os mecanismos de descoberta OAuth/MCP (RFC 8414, RFC 9728, DCR) hoje espalhados em duas páginas, uma página de template de Contratos de Dados (sem inventar domínios reais, marcada como em desenvolvimento), e uma landing page em estilo "Especificação" (Overview/Key Details/Learn More cards). O site nunca foi versionado antes — não há conteúdo legado para preservar sob uma versão anterior; tudo que existe hoje se torna a v1.

## Constraints

- NUNCA remover ou substituir o arquivo `docs/CNAME`'s propósito sem garantir que o domínio customizado `openrestaurantprotocol.org` continue resolvendo — o repo já sofreu um incidente em que um `mkdocs gh-deploy --force` apagou o CNAME da branch `gh-pages`.
- `mike` NÃO gerencia automaticamente arquivos fora de seus próprios diretórios de versão (`versions.json`, diretórios de versão, `index.html` de redirecionamento). Arquivos como `CNAME` devem ser geridos manualmente na raiz da branch `gh-pages`, nunca via `mike delete --all` (que apaga TODO o conteúdo da branch, incluindo CNAME).
- Manter o padrão de `exclude_docs` já usado em `mkdocs.yml` (hoje excluindo `diagrams/oauth/*.json` e `diagrams/oauth/*.mjs`) ao adicionar a exclusão de `docs/changes/*`.
- Não inventar domínios de dados fictícios na página de Contratos de Dados — só o template/estrutura, sem nomes de domínio reais ou inventados.
- Não duplicar conteúdo de discovery entre `discovery.md` e as páginas de origem (`oauth-requirements.md`, `mcp-oauth.md`) — as páginas de origem devem referenciar `discovery.md`, não repetir o conteúdo.
- A versão a publicar é `v1` com alias `latest` (convenção de nomenclatura explícita do usuário: "v1, v2...").

## Open Questions

- None.

## Validation

cadence: per-step

## Research Summary

- `jimporter/mike` README (https://raw.githubusercontent.com/jimporter/mike/master/README.md): plugin config YAML (`plugins: - mike: ...`), instalação (`pip install mike`), comandos (`mike deploy [version] [alias]...`, `mike set-default [identifier]`), seção "## How It Works" (deploy de uma versão sobrescreve só aquela versão; outras versões "remain untouched"), seção "## Before Using mike" (recomenda `mike delete --all` para limpeza — EVITADO neste plano por apagar o CNAME), seção "## Deploying via CI" (CI com clone shallow precisa de `git fetch origin gh-pages --depth=1` antes do mike rodar, e configuração de git user via `git config user.name`/`user.email` ou variáveis `GIT_COMMITTER_NAME`/`GIT_COMMITTER_EMAIL`), e seção dedicada "## `CNAME` (and Other Special Files)" (confirma que mike não tem tratamento especial para CNAME — deve ser commitado manualmente na raiz da branch).
- Documentação oficial do mkdocs-material sobre versionamento (https://squidfunk.github.io/mkdocs-material/setup/setting-up-versioning/): bloco `extra: version: provider: mike` necessário no `mkdocs.yml` para o seletor de versão aparecer no tema; comando de exemplo `mike deploy --push --update-aliases 0.1 latest` e `mike set-default --push latest`.
- Site oficial do Model Context Protocol (https://modelcontextprotocol.io/specification/2025-06-18): estrutura de referência usada como estilo visual/estrutural — seletor de versão no cabeçalho (rótulo "Version 2025-06-18"), seções de topo "Overview", "Key Details", "Security and Trust & Safety", "Learn More", com cards de navegação cruzada no final da página.
- Estado real da branch `gh-pages` do repo (verificado via `git fetch origin gh-pages` + `git ls-tree -r --name-only origin/gh-pages`, 2026-10-08): contém `CNAME` (conteúdo `openrestaurantprotocol.org`), `.nojekyll`, `404.html`, `assets/**`, `auth/oauth/`, `auth/toqan-mcp-oauth/`, `auth/toqan-oauth-requirements/`, `diagrams/oauth/auth-flow.html`, `index.html`, `integrations/toqan-mcp/`, `search/search_index.json`, `sitemap.xml`, `sitemap.xml.gz` — todo esse conteúdo (exceto `CNAME` e `.nojekyll`) é o output plano do `mkdocs gh-deploy` atual e precisa ser removido antes do primeiro deploy versionado do mike, para não ficar como lixo órfão na raiz da branch ao lado dos novos diretórios `/v1/` e `/latest/`.
- Conteúdo verbatim atual de `docs/auth/oauth-requirements.md` e `docs/auth/mcp-oauth.md` (lido via scout, 2026-10-08): as seções de descoberta já existem integralmente nesses dois arquivos — "1. Metadados de descoberta (RFC 8414)" e "Opção recomendada: Dynamic Client Registration (DCR)" em `oauth-requirements.md`; "1. Metadados de recurso protegido (RFC 8414 / RFC 9728)" em `mcp-oauth.md`. Este plano consolida esse conteúdo já escrito em uma página nova, em vez de reescrevê-lo do zero.
- `.github/workflows/deploy.yml` atual (24 linhas, lido via scout): usa `actions/checkout@v4` (clone shallow por padrão), `astral-sh/setup-uv@v5`, `uv sync`, e `uv run mkdocs gh-deploy --force` como step final — este último step precisa ser substituído.

## Steps

### step-1
- title: Preparar infraestrutura de versionamento (mike) e isolar artefatos de planejamento
- agent: builder
- inputs:
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/mkdocs.yml
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/pyproject.toml
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/docs/CNAME
- details:
  - templates: |
      No `mkdocs.yml`, dentro do bloco `exclude_docs` já existente, adicionar a linha `docs/changes/*` (mantendo as duas linhas já presentes `diagrams/oauth/*.json` e `diagrams/oauth/*.mjs`).
      Adicionar ao `mkdocs.yml`, dentro de `plugins:` (hoje só `- search`), a entrada `- mike` (forma mínima, sem overrides — os defaults do mike já incluem `version_selector: true`).
      Adicionar ao `mkdocs.yml` um bloco novo de topo:
      ```yaml
      extra:
        version:
          provider: mike
      ```
      No `pyproject.toml`, adicionar `"mike"` à lista `dependencies` (sem pin de versão — deixar o `uv` resolver a versão mais recente compatível).
      Remover o arquivo `docs/CNAME` — sob o fluxo do `mike`, o build de cada versão fica em um subdiretório (`/v1/`, `/v2/`, ...), então um `CNAME` dentro de `docs/` seria copiado para dentro de `/v1/CNAME` (local errado; GitHub Pages só honra CNAME na raiz da branch). O CNAME correto na raiz da branch `gh-pages` será gerido manualmente no step-2, não mais via build do mkdocs.
  - patterns: |
      `mkdocs.yml` hoje tem exatamente:
      ```yaml
      exclude_docs: |
        diagrams/oauth/*.json
        diagrams/oauth/*.mjs
      ```
      e
      ```yaml
      plugins:
        - search
      ```
      `pyproject.toml` hoje tem exatamente:
      ```toml
      [project]
      name = "openrestaurantprotocol"
      version = "0.1.0"
      description = "Documentação do Open Restaurant Protocol"
      requires-python = ">=3.12"
      dependencies = [
          "mkdocs>=1.6",
          "mkdocs-material>=9.5",
      ]
      ```
  - constraints: |
      - MUST NOT remover as duas linhas já existentes em `exclude_docs`.
      - MUST NOT fixar número de versão do `mike` em `pyproject.toml`.
      - MUST remover `docs/CNAME` (arquivo físico), não apenas desreferenciá-lo.
  - hints: |
      - O bloco `extra:` é novo no arquivo — não existe hoje nenhum bloco `extra:` em `mkdocs.yml`, deve ser adicionado como chave de topo (mesmo nível de `theme:`, `nav:`, `plugins:`).
  - examples: |
      `mkdocs.yml` final (trechos relevantes) deve conter:
      ```yaml
      exclude_docs: |
        diagrams/oauth/*.json
        diagrams/oauth/*.mjs
        docs/changes/*
      plugins:
        - search
        - mike
      extra:
        version:
          provider: mike
      ```
      `pyproject.toml` final deve conter `"mike",` na lista `dependencies`.
- done-when: `mkdocs.yml` contém `docs/changes/*` em `exclude_docs`, `- mike` em `plugins`, e o bloco `extra: version: provider: mike`; `pyproject.toml` contém `mike` em `dependencies`; o arquivo `docs/CNAME` não existe mais.

### step-2
- title: Migrar a branch gh-pages para o layout versionado do mike preservando o CNAME
- agent: worker
- inputs:
  - File: nenhum arquivo do repo de trabalho — operação direta na branch remota `gh-pages`.
- details:
  - constraints: |
      - MUST NOT executar `mike delete --all` (apaga toda a branch, incluindo o CNAME — repetiria o incidente anterior).
      - MUST preservar `CNAME` e `.nojekyll` na raiz da branch `gh-pages` durante a limpeza.
      - MUST confirmar o conteúdo do CNAME (`openrestaurantprotocol.org`) antes E depois da limpeza.
      - MUST executar a limpeza ANTES do primeiro `mike deploy`, para a branch não ficar com uma mistura de conteúdo legado e versionado.
  - patterns: |
      Estado real confirmado da branch `gh-pages` (via `git fetch origin gh-pages` + `git ls-tree -r --name-only origin/gh-pages`, 2026-10-08):
      ```
      .nojekyll
      404.html
      CNAME
      assets/** (várias subpastas e arquivos)
      auth/oauth/index.html
      auth/toqan-mcp-oauth/index.html
      auth/toqan-oauth-requirements/index.html
      diagrams/oauth/auth-flow.html
      index.html
      integrations/toqan-mcp/index.html
      search/search_index.json
      sitemap.xml
      sitemap.xml.gz
      ```
      `git show origin/gh-pages:CNAME` retorna `openrestaurantprotocol.org`.
  - hints: |
      - `assets`, `auth`, `diagrams`, `integrations`, `search` são diretórios inteiros (removê-los recursivamente); `404.html`, `index.html`, `sitemap.xml`, `sitemap.xml.gz` são arquivos únicos na raiz.
  - examples: |
      Sequência de comandos (sub-task 2.1, limpeza):
      ```sh
      cd /Users/marcus.nunes/projects/openrestaurantprotocol
      git fetch origin gh-pages
      git worktree add /tmp/orp-ghpages-cleanup origin/gh-pages
      cd /tmp/orp-ghpages-cleanup
      git checkout -b gh-pages-cleanup
      git rm -r -- 404.html assets auth diagrams index.html integrations search sitemap.xml sitemap.xml.gz
      git commit -m "Remove legacy flat-site artifacts before migrating to mike-based versioning (preserving CNAME and .nojekyll)"
      git push origin gh-pages-cleanup:gh-pages
      cd /Users/marcus.nunes/projects/openrestaurantprotocol
      git worktree remove /tmp/orp-ghpages-cleanup --force
      git fetch origin gh-pages
      git ls-tree -r --name-only origin/gh-pages
      git show origin/gh-pages:CNAME
      ```
      Esperado após a limpeza: `git ls-tree -r --name-only origin/gh-pages` retorna apenas `CNAME` e `.nojekyll`; `git show origin/gh-pages:CNAME` ainda retorna `openrestaurantprotocol.org`.

      Sequência de comandos (sub-task 2.2, primeiro deploy versionado — executar só depois do step-1 já estar mesclado/aplicado localmente, pois depende do `mike` estar em `pyproject.toml`):
      ```sh
      cd /Users/marcus.nunes/projects/openrestaurantprotocol
      uv sync
      uv run mike deploy --push --update-aliases v1 latest
      uv run mike set-default --push latest
      curl -sI https://openrestaurantprotocol.org/
      git fetch origin gh-pages
      git ls-tree -r --name-only origin/gh-pages
      git show origin/gh-pages:CNAME
      ```
      Esperado: `curl -sI https://openrestaurantprotocol.org/` retorna status `200` (ou uma cadeia de redirecionamento que termina em `200`); a árvore da branch passa a conter `CNAME`, `.nojekyll`, `versions.json`, um `index.html` de redirecionamento na raiz, e os diretórios `v1/` e `latest/`; `git show origin/gh-pages:CNAME` continua retornando `openrestaurantprotocol.org`.
- done-when: a branch `gh-pages` remota contém `CNAME` (conteúdo `openrestaurantprotocol.org`), `.nojekyll`, `versions.json`, `v1/` e `latest/`, sem nenhum dos arquivos/diretórios legados listados em `patterns:`; `curl -sI https://openrestaurantprotocol.org/` retorna 200.

### step-3
- title: Reescrever o workflow de CI para publicar via mike
- agent: builder
- inputs:
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/.github/workflows/deploy.yml
- details:
  - patterns: |
      Conteúdo atual completo (24 linhas):
      ```yaml
      name: Deploy docs

      on:
        push:
          branches: [main]
        workflow_dispatch:

      permissions:
        contents: write

      jobs:
        deploy:
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v4
            - name: Install uv
              uses: astral-sh/setup-uv@v5
              with:
                enable-cache: true
                python-version: "3.12"
            - name: Install dependencies
              run: uv sync
            - name: Build and deploy
              run: uv run mkdocs gh-deploy --force
      ```
  - constraints: |
      - MUST manter os steps `actions/checkout@v4`, `astral-sh/setup-uv@v5` e `uv sync` exatamente como estão.
      - MUST adicionar um step de configuração de git user ANTES do deploy (mike precisa comitar na branch gh-pages) — usar `git config user.name "github-actions[bot]"` e `git config user.email "github-actions[bot]@users.noreply.github.com"`.
      - MUST adicionar um step `git fetch origin gh-pages --depth=1` ANTES de rodar `mike deploy`, pois o checkout padrão do `actions/checkout@v4` é shallow e o mike precisa da branch gh-pages localmente para comitar.
      - MUST substituir o step "Build and deploy" (`uv run mkdocs gh-deploy --force`) por dois steps: `uv run mike deploy --push --update-aliases v1 latest` seguido de `uv run mike set-default --push latest`.
      - MUST NOT reintroduzir `mkdocs gh-deploy` em nenhuma forma.
  - hints: |
      - Fonte da orientação de CI: seção "## Deploying via CI" do README do `jimporter/mike` (fetch shallow + git user config).
  - examples: |
      ```yaml
      name: Deploy docs

      on:
        push:
          branches: [main]
        workflow_dispatch:

      permissions:
        contents: write

      jobs:
        deploy:
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v4
            - name: Install uv
              uses: astral-sh/setup-uv@v5
              with:
                enable-cache: true
                python-version: "3.12"
            - name: Install dependencies
              run: uv sync
            - name: Configure git user
              run: |
                git config user.name "github-actions[bot]"
                git config user.email "github-actions[bot]@users.noreply.github.com"
            - name: Fetch gh-pages branch
              run: git fetch origin gh-pages --depth=1
            - name: Deploy version v1
              run: uv run mike deploy --push --update-aliases v1 latest
            - name: Set default version
              run: uv run mike set-default --push latest
      ```
- done-when: `.github/workflows/deploy.yml` não contém mais `mkdocs gh-deploy`; contém `mike deploy --push --update-aliases v1 latest`, `mike set-default --push latest`, um step de `git config user.name`/`user.email`, e um step `git fetch origin gh-pages --depth=1`.

### step-4
- title: Consolidar Discovery e atualizar as páginas de Autenticação
- agent: builder
- inputs:
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/docs/auth/oauth-requirements.md
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/docs/auth/mcp-oauth.md
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/docs/auth/discovery.md (novo)
- details:
  - patterns: |
      Conteúdo verbatim a mover de `oauth-requirements.md` para `discovery.md` (seção "### 1. Metadados de descoberta (RFC 8414)", incluindo a tabela de campos `issuer`/`authorization_endpoint`/`token_endpoint`/`scopes_supported`/`response_types_supported`/`grant_types_supported`/`token_endpoint_auth_methods_supported`/`code_challenge_methods_supported`/`registration_endpoint`, e a seção "#### Opção recomendada: Dynamic Client Registration (DCR)" com a referência a RFC 7591).
      Conteúdo verbatim a mover de `mcp-oauth.md` para `discovery.md` (seção "### 1. Metadados de recurso protegido (RFC 8414 / RFC 9728)", incluindo a lista de campos do documento `.well-known/oauth-authorization-server` e a menção ao `/.well-known/oauth-protected-resource` via `RemoteAuthProvider` do FastMCP).
  - constraints: |
      - MUST remover o conteúdo detalhado das seções movidas das duas páginas de origem, substituindo por uma frase curta de referência cruzada, ex.: "Para o fluxo completo de descoberta (RFC 8414, RFC 9728, DCR), veja [Discovery](discovery.md)." — NÃO duplicar o conteúdo técnico.
      - MUST manter em `oauth-requirements.md` e `mcp-oauth.md` todo o restante do conteúdo que NÃO é sobre descoberta (ex.: seção de userinfo endpoint, grant authorization code + PKCE, contrato de validação de token, exemplo FastMCP) — só as seções de discovery/DCR saem.
      - `discovery.md` deve ter: título "# Discovery", uma seção de overview explicando o objetivo (zero configuração manual), uma seção "## RFC 8414 — Authorization Server Metadata" com a tabela de campos (movida de `oauth-requirements.md`), uma seção "## RFC 9728 — Protected Resource Metadata" (movida de `mcp-oauth.md`), uma seção "## Dynamic Client Registration (RFC 7591)" (movida de `oauth-requirements.md`), e uma seção final "## Referências" com links para as RFCs 8414, 9728 e 7591.
      - `discovery.md` deve ser referenciado no `nav:` do `mkdocs.yml` dentro de "Autenticação" (ver step-6).
  - examples: |
      Frase de referência cruzada a inserir em `oauth-requirements.md` no lugar da seção "### 1. Metadados de descoberta (RFC 8414)":
      ```markdown
      ## Descoberta automática

      Para que a plataforma descubra seu authorization server e os mecanismos de registro de client automaticamente, veja a página de [Discovery](discovery.md) (RFC 8414, RFC 9728 e Dynamic Client Registration).
      ```
      Frase equivalente em `mcp-oauth.md` no lugar da seção "### 1. Metadados de recurso protegido (RFC 8414 / RFC 9728)":
      ```markdown
      ### 1. Descoberta automática

      Veja a página de [Discovery](discovery.md) para o detalhamento completo dos metadados RFC 8414 (authorization server) e RFC 9728 (protected resource) que seu MCP/authorization server devem publicar.
      ```
- done-when: `docs/auth/discovery.md` existe e contém as três seções RFC 8414/RFC 9728/DCR com o conteúdo tecnicamente equivalente ao que estava nas duas páginas de origem; `oauth-requirements.md` e `mcp-oauth.md` não contêm mais a tabela de campos de metadados RFC 8414 nem a seção de DCR, apenas um link para `discovery.md`.

### step-5
- title: Reestruturar a página inicial em estilo "Especificação" (MCP-style)
- agent: builder
- inputs:
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/docs/index.md
- details:
  - patterns: |
      Estrutura de referência do site oficial do MCP (modelcontextprotocol.io/specification): seções de topo "Overview", "Key Details", "Learn More" (cards de navegação cruzada ao final).
      Conteúdo atual de `docs/index.md` (a preservar/adaptar, não descartar o sentido): link do logo, menção a "APIs, agentes, MCPs e autenticação", bullets de Integrações/Autenticação, admonition "Documentação em construção".
  - constraints: |
      - MUST manter a imagem do logo (`![Open Restaurant Protocol](assets/logo.webp){ width="480" }`).
      - MUST remover a admonition genérica "Documentação em construção" do nível raiz — a página de Contratos de Dados (step-7) terá sua própria admonition "em desenvolvimento" com escopo específico.
      - MUST incluir uma seção com o histórico de versão citando explicitamente "v1 — lançamento inicial" (texto curto, não uma changelog extensa — não há versão anterior a documentar).
      - MUST incluir uma seção final no estilo "Learn More" com cards/links para as 4 abas do nav: Especificação (a própria página), Autenticação, Contratos de Dados, Integrações.
      - Título do H1 permanece "Open Restaurant Protocol"; o rótulo no `nav:` passa a ser "Especificação" (ver step-6), mas o arquivo continua sendo `index.md`.
  - examples: |
      Estrutura de seções esperada no arquivo final (títulos exatos):
      ```markdown
      # Open Restaurant Protocol

      ## Overview
      ...

      ## Key Details
      ...

      ## Versões
      ...v1 — lançamento inicial...

      ## Learn More
      ...links para Autenticação, Contratos de Dados, Integrações...
      ```
- done-when: `docs/index.md` contém as seções `## Overview`, `## Key Details`, `## Versões` (com o texto "v1 — lançamento inicial") e `## Learn More`; a admonition "Documentação em construção" não está mais presente no arquivo.

### step-6
- title: Criar a página de template de Contratos de Dados
- agent: builder
- inputs:
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/docs/data-contracts/index.md (novo)
- details:
  - constraints: |
      - MUST ter uma admonition `!!! warning "Em desenvolvimento"` (ou `note`, mas sinalizando claramente que a seção ainda não tem contratos publicados) logo após o título.
      - MUST NOT inventar nomes de domínio de dados reais ou fictícios (nenhum "Lojas", "Pedidos", "Cardápio" ou equivalente como exemplo nomeado).
      - MUST conter uma seção de template genérico mostrando: uma tabela com colunas "Campo", "Tipo", "Obrigatório", "Descrição" preenchida com placeholders genéricos (ex.: `<campo>`, `<tipo>`), um esqueleto de exemplo de payload JSON com chaves placeholder (ex.: `"<campo>": "<valor>"`), e uma nota sobre como o contrato de cada domínio deve declarar sua própria versão.
      - MUST ter um título "# Contratos de Dados".
  - examples: |
      ```markdown
      # Contratos de Dados

      !!! warning "Em desenvolvimento"
          Esta seção ainda não tem contratos de domínio publicados. O conteúdo abaixo descreve o template que cada contrato de domínio deverá seguir.

      ## Visão geral
      ...

      ## Template de um contrato de domínio

      | Campo | Tipo | Obrigatório | Descrição |
      |---|---|---|---|
      | `<campo>` | `<tipo>` | Sim/Não | ... |

      ```json
      {
        "<campo>": "<valor>"
      }
      ```

      ## Versionamento do contrato
      ...
      ```
- done-when: `docs/data-contracts/index.md` existe, contém a admonition de "em desenvolvimento", a tabela de template com placeholders, o esqueleto de payload JSON, e não contém nenhum nome de domínio de dados nomeado (real ou inventado).

### step-7
- title: Atualizar navegação do mkdocs.yml e cross-reference em integrações
- agent: builder
- inputs:
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/mkdocs.yml
  - File: /Users/marcus.nunes/projects/openrestaurantprotocol/docs/integrations/mcp.md
- details:
  - patterns: |
      `nav:` atual:
      ```yaml
      nav:
        - Início: index.md
        - Integrações:
            - MCP: integrations/mcp.md
        - Autenticação:
            - OAuth: auth/oauth.md
            - Requisitos do OAuth: auth/oauth-requirements.md
            - Como construir um MCP com OAuth: auth/mcp-oauth.md
      ```
  - constraints: |
      - MUST reorganizar para exatamente 4 abas de topo, nesta ordem: "Especificação", "Autenticação", "Contratos de Dados", "Integrações".
      - "Especificação" aponta para `index.md`.
      - "Autenticação" contém, nesta ordem: "OAuth" (`auth/oauth.md`), "Requisitos do OAuth" (`auth/oauth-requirements.md`), "Discovery" (`auth/discovery.md`), "Como construir um MCP com OAuth" (`auth/mcp-oauth.md`).
      - "Contratos de Dados" contém "Visão geral" (`data-contracts/index.md`).
      - "Integrações" contém "MCP" (`integrations/mcp.md`), sem alterações na própria entrada do nav.
      - Em `docs/integrations/mcp.md`, adicionar uma linha de referência cruzada para `discovery.md` na seção "## Referências" existente (hoje contém só um item `- [ ] Especificação do MCP`), sem remover o item já existente.
  - examples: |
      `nav:` final:
      ```yaml
      nav:
        - Especificação: index.md
        - Autenticação:
            - OAuth: auth/oauth.md
            - Requisitos do OAuth: auth/oauth-requirements.md
            - Discovery: auth/discovery.md
            - Como construir um MCP com OAuth: auth/mcp-oauth.md
        - Contratos de Dados:
            - Visão geral: data-contracts/index.md
        - Integrações:
            - MCP: integrations/mcp.md
      ```
      Linha a adicionar em `docs/integrations/mcp.md`, seção "## Referências":
      ```markdown
      - [Discovery OAuth/MCP](../auth/discovery.md)
      ```
- done-when: `mkdocs.yml` tem o `nav:` com exatamente as 4 abas e a ordem de itens especificada; `docs/integrations/mcp.md` contém o link para `../auth/discovery.md` em "## Referências".

### step-8
- title: Verificação final de build e domínio customizado
- agent: worker
- inputs:
  - File: nenhum arquivo específico — comandos de verificação sobre o repositório já modificado.
- details:
  - constraints: |
      - MUST rodar com todos os steps 1, 3 a 7 já aplicados (step-2 já foi verificado dentro de si mesmo).
  - examples: |
      ```sh
      cd /Users/marcus.nunes/projects/openrestaurantprotocol
      uv sync
      uv run mkdocs build --strict
      grep -rc "docs/changes" site/ || echo "OK: nenhum artefato de planejamento no site publicado"
      curl -sI https://openrestaurantprotocol.org/
      ```
      Esperado: `mkdocs build --strict` sai com código 0; nenhuma ocorrência de `docs/changes` dentro do diretório `site/` gerado; `curl -sI https://openrestaurantprotocol.org/` retorna status 200.
- done-when: `uv run mkdocs build --strict` termina com exit code 0, o diretório `site/` não contém nenhum artefato de `docs/changes/`, e `https://openrestaurantprotocol.org/` responde 200.

## Risks

- A migração da branch `gh-pages` (step-2) é uma operação destrutiva em uma branch de produção já usada por um domínio customizado. Mitigação: a limpeza remove explicitamente só a lista de arquivos/diretórios confirmada via `git ls-tree` (não um wildcard), preserva `CNAME` e `.nojekyll` por nome, e o done-when do step exige confirmação do conteúdo do CNAME antes de seguir para o step-3.
- Trocar `mkdocs gh-deploy --force` por `mike deploy` no CI (step-3) muda o modelo de deploy de "substitui tudo" para "só a versão alvo é sobrescrita, demais versões e arquivos fora dos diretórios de versão ficam intocados" — se o CI falhar no meio de um `mike deploy --push`, a branch pode ficar com um commit parcial. Mitigação: `mike deploy` cria um único commit atômico por chamada (confirmado no README: "mike works by creating a new Git commit... every time you deploy"), então uma falha de rede antes do commit não deixa estado parcial; uma falha depois do commit mas antes do push é recuperável re-executando o mesmo comando.
- Consolidar discovery (step-4) pode quebrar links externos que já apontem para as seções específicas removidas de `oauth-requirements.md`/`mcp-oauth.md` (ex.: âncoras `#1-metadados-de-descoberta-rfc-8414`). Mitigação: fora de escopo deste plano — o site é novo (v1 é o primeiro lançamento formal), não há consumidores externos com links profundos ainda publicados a esses anchors.

## Verification Criteria

- `uv run mkdocs build --strict` sai com código 0 após todos os steps aplicados (step-8).
- `curl -sI https://openrestaurantprotocol.org/` retorna HTTP 200 tanto imediatamente após o step-2 (migração do gh-pages) quanto no step-8 (verificação final pós-CI).
- O seletor de versão do mike aparece no cabeçalho do tema Material ao visitar o site publicado (verificação visual, fora do escopo de comandos automatizados, mas observável pelo usuário final após o primeiro deploy).
- `git show origin/gh-pages:CNAME` retorna `openrestaurantprotocol.org` em todas as checagens intermediárias e na checagem final.
- Nenhum arquivo em `docs/data-contracts/index.md` cita um nome de domínio de dados real ou inventado (grep manual por nomes próprios de domínio ausente do template).
