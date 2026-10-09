# Fluxo OAuth

Esta seção documenta o fluxo de **autenticação e autorização** usado para conectar um **Parceiro** (software de restaurante) à **Plataforma** e permitir acesso seguro aos dados via MCP.

## Participantes

| Participante | Descrição |
|---|---|
| Usuário | Pessoa que opera a plataforma e conecta o parceiro |
| Plataforma | Agente que consome os dados via MCP |
| Login (Parceiro) | Página de login do software de restaurante |
| OAuth (Parceiro) | Authorization server do parceiro |
| Auth-Service (Parceiro) | Serviço de autorização do parceiro |
| MCP | Servidor MCP do ecossistema que expõe as tools |
| DataBridge | Camada de acesso aos dados (executa as queries) |

> **Nota:** "Parceiro" representa qualquer software de restaurante integrado.

## Diagrama de sequência interativo

<a href="../../diagrams/oauth/auth-flow.html" target="_blank">Abrir em tela cheia ↗</a>

<iframe src="../../diagrams/oauth/auth-flow.html" width="100%" height="950" style="border: 1px solid var(--md-default-fg-color--lightest); border-radius: 6px;" loading="lazy" title="Diagrama de sequência interativo do fluxo OAuth"></iframe>

## Etapas do fluxo

### 1. Conexão do parceiro

1. **Usuário → Plataforma:** clica em "Conectar Parceiro".
2. **Plataforma → Login:** redireciona o usuário enviando `client_id`, `scopes` e os parâmetros do fluxo **PKCE**.
3. **Usuário → Login:** insere credenciais (email/senha) e realiza MFA se necessário.
4. **Login → OAuth:** valida as credenciais fornecidas.
5. **OAuth → Plataforma:** retorna um **authorization code** via callback.
6. **Plataforma → OAuth:** troca o authorization code por tokens usando o `code_verifier` do PKCE.
7. **OAuth → Plataforma:** retorna `access_token` (JWT) e `refresh_token`.
8. **Plataforma:** armazena os tokens da conexão com o parceiro.
9. **Plataforma → Usuário:** informa que o parceiro foi conectado.

### 2. Pergunta sobre dados do parceiro

10. **Usuário → Plataforma:** envia um prompt que envolve dados do parceiro.
11. **Plataforma → MCP:** executa `tool_call listar_lojas` com `Bearer JWT`.
12. **MCP:** valida o JWT (assinatura, `iss`, `aud`, `exp`).
13. **MCP → Auth-Service:** consulta lojas e permissões do usuário/sub.
14. **Auth-Service → MCP:** retorna `stores` e `permissions`.
15. **MCP:** armazena/cacheia as permissões por um **TTL curto**.
16. **MCP → Plataforma:** retorna a lista de lojas (`ids` e `names`).

### 3. Consulta dos dados

17. **Plataforma → MCP:** executa `tool_call buscar_dados(store_ids)` com `Bearer JWT`.
18. **MCP:** valida novamente o JWT (assinatura, `iss`, `aud`, `exp`).
19. **MCP → Auth-Service:** valida as permissões do `sub` para as lojas solicitadas (ou usa o cache).
20. **Auth-Service → MCP:** retorna as lojas e permissões.
21. **MCP → DataBridge:** executa as queries necessárias, filtradas pelos `store_ids` autorizados.
22. **DataBridge → MCP:** retorna os dados solicitados.
23. **MCP → Plataforma:** retorna o resultado da execução da tool.
24. **Plataforma → Usuário:** exibe a resposta com os dados das lojas.

## Referências

- [RFC 6749 — OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
