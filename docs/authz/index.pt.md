# Autorização

!!! info "O que esta seção responde"
    Como a **plataforma** e o **MCP** usam os endpoints de autorização da organização depois do OAuth: escopo de lojas, identidade e permissões.

## Papéis

| Papel | Responsabilidade |
|---|---|
| Organization (authorization server) | Expõe [userinfo](userinfo.md) e [lojas](merchants.md) |
| Plataforma | No connect, chama `GET /merchants` para seleção de loja e perfil de negócio da conta |
| MCP | Em cada tool call, chama [userinfo](userinfo.md), aplica permissões e valida `merchant_ids` no escopo |

O MCP pode ser hospedado pela própria organização ou por um operador delegado — veja [Integração via MCP](../integrations/mcp.md). Em ambos os casos, userinfo e `/merchants` continuam no authorization server da **Organization**.

## Como funciona

1. A organização autentica o usuário (OAuth) e emite o token.
2. A **plataforma** chama `GET /merchants` no connect (caminho preferido): monta o picker, faz o bind da(s) loja(s) e monta o perfil comercial da conta (quantas lojas, nomes, CNPJ, `external_ids`, etc.).
3. Em tool calls, o **MCP** chama [userinfo](userinfo.md), aplica o perfil/roles e verifica se os `merchant_ids` pedidos estão no escopo.
4. O MCP **deve** expor a tool `listar_lojas` (`list_merchants`) como **fallback** para o agente (rediscovery, refresh, multi-turn), implementada via `GET /merchants` ou equivalente. Isso **não** substitui a chamada da plataforma a `/merchants` no connect.

A plataforma **não** precisa do payload completo de userinfo em cada chamada. No máximo um resumo de identidade (`sub`, `name`, `email`) se a UI precisar mostrar quem está conectado.

## Endpoints deste protocolo

- [Userinfo (OIDC)](userinfo.md) — identidade + permissões; consumidor primário = MCP.
- [Lojas](merchants.md) — catálogo de lojas do token; callers = plataforma (connect) e MCP (authz / tool fallback).
