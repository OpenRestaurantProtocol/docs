---
slug: professionalize-protocol-docs
specs_generated: false
validation:
  cadence: per-step
---

# Tasks

## 1. Preparar infraestrutura de versionamento (mike) e isolar artefatos de planejamento
- [x] 1.1 [builder] Adicionar `docs/changes/*` ao `exclude_docs` do mkdocs.yml → plan.md#step-1
- [x] 1.2 [builder] Adicionar dependência `mike` ao pyproject.toml e configurar `plugins`/`extra.version.provider` no mkdocs.yml → plan.md#step-1
- [x] 1.3 [builder] Remover o arquivo docs/CNAME → plan.md#step-1

## 2. Migrar a branch gh-pages para o layout versionado do mike preservando o CNAME
- [x] 2.1 [worker] Limpar os arquivos legados da raiz da branch gh-pages preservando CNAME e .nojekyll → plan.md#step-2
- [x] 2.2 [worker] Executar o primeiro `mike deploy`/`mike set-default` e verificar o domínio customizado → plan.md#step-2

## 3. Reescrever o workflow de CI para publicar via mike
- [x] 3.1 [builder] Substituir `mkdocs gh-deploy --force` por `mike deploy`/`mike set-default` com git user config e fetch do gh-pages em .github/workflows/deploy.yml → plan.md#step-3

## 4. Consolidar Discovery e atualizar as páginas de Autenticação
- [x] 4.1 [builder] Criar docs/auth/discovery.md consolidando RFC 8414, RFC 9728 e DCR → plan.md#step-4
- [x] 4.2 [builder] Trimar a seção de descoberta RFC 8414/DCR de docs/auth/oauth-requirements.md e substituir por referência a discovery.md → plan.md#step-4
- [x] 4.3 [builder] Trimar a seção de descoberta RFC 8414/RFC 9728 de docs/auth/mcp-oauth.md e substituir por referência a discovery.md → plan.md#step-4

## 5. Reestruturar a página inicial em estilo Especificação (MCP-style)
- [x] 5.1 [builder] Reescrever docs/index.md com seções Overview, Key Details, Versões e Learn More → plan.md#step-5

## 6. Criar a página de template de Contratos de Dados
- [x] 6.1 [builder] Criar docs/data-contracts/index.md como template genérico marcado em desenvolvimento → plan.md#step-6

## 7. Atualizar navegação do mkdocs.yml e cross-reference em integrações
- [x] 7.1 [builder] Reescrever o nav do mkdocs.yml para as 4 abas (Especificação, Autenticação, Contratos de Dados, Integrações) → plan.md#step-7
- [x] 7.2 [builder] Adicionar referência cruzada para discovery.md em docs/integrations/mcp.md → plan.md#step-7

## 8. Verificação final de build e domínio customizado
- [x] 8.1 [worker] Rodar mkdocs build --strict, confirmar ausência de docs/changes no site publicado e checar o domínio customizado → plan.md#step-8
