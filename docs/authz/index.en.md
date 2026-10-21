# Authorization

!!! info "What this section answers"
    How the **platform** and the **MCP** use the organization's authorization endpoints after OAuth: merchant scope, identity, and permissions.

## Roles

| Role | Responsibility |
|---|---|
| Organization (authorization server) | Exposes [userinfo](userinfo.md) and [merchants](merchants.md) |
| Platform | On connect, calls `GET /merchants` for store selection and the account's business profile |
| MCP | On each tool call, calls [userinfo](userinfo.md), applies permissions, and validates `merchant_ids` in scope |

The MCP may be hosted by the organization itself or by a delegated operator — see [MCP integration](../integrations/mcp.md). In both cases, userinfo and `/merchants` remain on the **Organization** authorization server.

## How it works

1. The organization authenticates the user (OAuth) and issues the token.
2. The **platform** calls `GET /merchants` on connect (preferred path): builds the picker, binds store(s), and builds the account business profile (store count, names, tax id, `external_ids`, etc.).
3. On tool calls, the **MCP** calls [userinfo](userinfo.md), applies profile/roles, and checks that requested `merchant_ids` are in scope.
4. The MCP **should** expose a `list_merchants` (`listar_lojas`) tool as a **fallback** for the agent (rediscovery, refresh, multi-turn), implemented via `GET /merchants` or equivalent. This does **not** replace the platform's `/merchants` call on connect.

The platform does **not** need the full userinfo payload on every call. At most an identity summary (`sub`, `name`, `email`) if the UI needs to show who is connected.

## Protocol endpoints

- [Userinfo (OIDC)](userinfo.md) — identity + permissions; primary consumer = MCP.
- [Merchants](merchants.md) — merchant catalog for the token; callers = platform (connect) and MCP (authz / fallback tool).
