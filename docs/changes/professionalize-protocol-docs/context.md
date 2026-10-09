## Context

### Rules
- NUNCA remover o arquivo `docs/CNAME`'s função de proteção do domínio customizado sem garantir que `openrestaurantprotocol.org` continue resolvendo — incidente anterior: `mkdocs gh-deploy --force` já apagou o CNAME da branch `gh-pages` uma vez.
- `mike` NUNCA deve ser limpo via `mike delete --all` neste repositório — esse comando apaga toda a branch `gh-pages`, incluindo o `CNAME`. A limpeza de conteúdo legado deve remover arquivos/diretórios por nome explícito, preservando `CNAME` e `.nojekyll`.
- O padrão de `exclude_docs` em `mkdocs.yml` já existe (`diagrams/oauth/*.json`, `diagrams/oauth/*.mjs`) e deve ser estendido, não substituído, ao adicionar `docs/changes/*`.
- Não inventar domínios de dados (reais ou fictícios) na página de Contratos de Dados — apenas o template/estrutura genérica.
- Não duplicar conteúdo de discovery entre a nova página `discovery.md` e as páginas de origem (`oauth-requirements.md`, `mcp-oauth.md`) — as páginas de origem devem referenciar a nova página, não repetir o conteúdo técnico.
- Versão a publicar: `v1`, alias `latest` — convenção de nomenclatura sequencial explícita do usuário ("v1, v2...").
- O site é 100% em português (pt), mas o diagrama de sequência OAuth já usa inglês ("Platform"/"User") por decisão de uma mudança anterior — este plano não altera essa convenção.

### Routing
- Toda escrita de arquivo neste change vai para `builder`, nunca editada diretamente pelo agente que planeja.
- Fatos sobre bibliotecas de terceiros (mike, mkdocs-material) e estado real de infraestrutura (branch gh-pages, workflow de CI) foram obtidos via `scout`/`worker` durante o planejamento — não re-obter via suposição durante a execução; os fatos já estão citados em `plan.md`.
- Operações de git/branch (migração do gh-pages) vão para `worker`, nunca para `builder` (builder não tem acesso a bash/git).
- Cadência de validação: `per-step` — maestro valida depois de CADA passo individual, não em lote.

### Domain
- "Plataforma": termo genérico usado nas páginas de Autenticação para o agente que consome dados via MCP (substituiu "Toqan" numa mudança anterior).
- "Parceiro": qualquer software de restaurante integrado ao ecossistema (termo genérico, não um fornecedor específico).
- "Discovery": novo termo/página consolidando os mecanismos de descoberta automática via RFC 8414 (Authorization Server Metadata), RFC 9728 (Protected Resource Metadata) e RFC 7591 (Dynamic Client Registration).
- "Contratos de Dados": nova seção de template (não conteúdo final) descrevendo como um contrato de domínio de dados deve ser estruturado — sem nomear domínios reais.
- "Especificação": novo rótulo de nav para a antiga aba "Início" (`index.md`), reestruturada em estilo Model Context Protocol (seções Overview/Key Details/Versões/Learn More).
- Versionamento: gerenciado pelo plugin `mike` (não por diretórios manuais nem por uma página de changelog isolada) — cada versão publicada vira um diretório próprio na branch `gh-pages` (`/v1/`, `/v2/`, ...) com seletor de versão nativo no tema Material.

### Acceptance
- `uv run mkdocs build --strict` deve terminar com exit code 0 após cada step aplicado (verificação per-step).
- O diretório `site/` gerado não deve conter nenhum artefato de `docs/changes/`.
- `https://openrestaurantprotocol.org/` deve retornar HTTP 200 tanto imediatamente após a migração da branch `gh-pages` (step-2) quanto na verificação final (step-8).
- `git show origin/gh-pages:CNAME` deve retornar `openrestaurantprotocol.org` em toda checagem intermediária e final.
- `docs/data-contracts/index.md` não deve conter nenhum nome de domínio de dados nomeado (real ou inventado).
- `docs/auth/discovery.md` deve conter o conteúdo técnico equivalente ao que estava nas seções de descoberta de `oauth-requirements.md` e `mcp-oauth.md`, sem duplicação remanescente nessas duas páginas.
