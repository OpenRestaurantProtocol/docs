# Fluxo OAuth

Esta seção documenta o fluxo de **autenticação e autorização** usado para conectar uma **Organização** (ex.: uma plataforma de delivery, um sistema de POS ou um sistema de gestão de restaurantes) à **Plataforma** e permitir acesso seguro aos dados via MCP.

## Participantes

| Participante | Descrição |
|---|---|
| Usuário | Pessoa que opera a plataforma e conecta a organização |
| Plataforma | Agente que consome os dados via MCP |
| Login (Organização) | Página de login do software de restaurante |
| OAuth (Organização) | Authorization server da organização |
| MCP | Servidor MCP do ecossistema que expõe as tools |
| DataBridge | Camada de acesso aos dados (executa as queries) |

!!! note "Organização"
    "Organização" representa qualquer empresa integrada ao ecossistema. Nesse fluxo, a organização atua como **provedor**, expondo seus dados à plataforma. DataBridge é a camada genérica de acesso aos dados que executa as queries por trás de um MCP — qualquer lado pode operar a sua.

## Como a plataforma obtém o OAuth antes do fluxo

Antes do fluxo de autorização, a plataforma precisa descobrir os endpoints do authorization server e as credenciais do client. Há três cenários:

- **Sem metadados de descoberta** → **configuração manual**: a organização informa os endpoints e as credenciais (`client_id`/`client_secret`) explicitamente.
- **Com metadados + DCR** → **fluxo automático**: a plataforma lê os metadados (RFC 8414) e se auto-registra como client (RFC 7591). Nada é trocado manualmente.
- **Com metadados, sem DCR** → **descoberta automática dos endpoints**, mas as credenciais (`client_id`/`client_secret`) são informadas manualmente.

!!! info
    Os requisitos do authorization server são os mesmos em todos os cenários. Veja [Requisitos do OAuth](oauth-requirements.md) para o detalhamento completo.

## Diagrama de sequência interativo

<a href="../../../diagrams/oauth/auth-flow.html" target="_blank">Abrir em tela cheia ↗</a>

<iframe src="../../../diagrams/oauth/auth-flow.html" width="100%" height="950" style="border: 1px solid var(--md-default-fg-color--lightest); border-radius: 6px;" loading="lazy" title="Diagrama de sequência interativo do fluxo OAuth"></iframe>

## Etapas do fluxo

### 1. Conexão da organização

1. **Usuário → Plataforma:** clica em "Conectar Organização".
2. **Plataforma → Login:** redireciona o usuário enviando `client_id`, `scopes` e os parâmetros do fluxo **PKCE**.
3. **Usuário → Login:** insere credenciais (email/senha) e realiza MFA se necessário.
4. **Login → OAuth:** valida as credenciais fornecidas.
5. **OAuth → Plataforma:** retorna um **authorization code** via callback.
6. **Plataforma → OAuth:** troca o authorization code por tokens usando o `code_verifier` do PKCE.
7. **OAuth → Plataforma:** retorna `access_token` (JWT) e `refresh_token`.
8. **Plataforma:** armazena os tokens da conexão com a organização.
9. **Plataforma → Usuário:** informa que a organização foi conectada.

### 2. Pergunta sobre dados da organização

10. **Usuário → Plataforma:** envia um prompt que envolve dados da organização.
11. **Plataforma → MCP:** executa uma tool — no exemplo, `listar_lojas` — com `Bearer JWT`.
12. **MCP:** valida o JWT (assinatura, `iss`, `aud`, `exp`).
13. **MCP → OAuth (Organização):** chama `GET /userinfo` com o Bearer token para obter o contexto de autorização do usuário (identidade + permissões).
14. **OAuth (Organização) → MCP:** retorna `sub`, `email` e `profile_permissions`.
15. **MCP:** aplica a lógica de autorização — determina quais lojas/recursos o usuário pode acessar.
16. **MCP → Plataforma:** retorna a lista de lojas autorizadas.

### 3. Consulta dos dados

17. **Plataforma → MCP:** executa `tool_call buscar_dados(merchant_ids)` com `Bearer JWT`.
18. **MCP:** valida o JWT (assinatura, `iss`, `aud`, `exp`) e verifica o escopo de autorização do usuário.
19. **MCP → DataBridge:** executa as queries necessárias no armazenamento de dados da organização, filtradas pelos `merchant_ids` autorizados.
20. **DataBridge → MCP:** retorna os dados solicitados.
21. **MCP → Plataforma:** retorna o resultado da execução da tool.
22. **Plataforma → Usuário:** exibe a resposta com os dados das lojas.

## Referências

- [RFC 6749 — OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
