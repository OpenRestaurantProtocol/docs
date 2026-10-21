# OAuth Flow

This section documents the **authentication and authorization** flow used to connect an **Organization** (e.g., a delivery platform, POS system, or restaurant management system) to the **Platform** and allow secure access to data via MCP.

## Participants

| Participant | Description |
|---|---|
| User | Person who operates the platform and connects the organization |
| Platform | Agent / UI that consumes data via MCP |
| Login (Organization) | Login page of the restaurant software |
| OAuth (Organization) | Organization's authorization server |
| MCP | MCP server that exposes the tools (hosted by the organization or a [delegated operator](../integrations/mcp.md)) |
| DataBridge | Data access layer (runs the queries) |

!!! note "Organization"
    "Organization" represents any company integrated with the ecosystem. In this flow, the organization acts as a **provider**, exposing identity (OAuth / userinfo / merchants) and data. DataBridge is the generic data access layer behind an MCP — the organization or a delegated operator may run it. See [Who operates the MCP](../integrations/mcp.md#who-operates-the-mcp).

## How the platform obtains OAuth before the flow

Before the authorization flow, the platform needs to discover the authorization server endpoints and the client credentials. There are three scenarios:

- **No discovery metadata** → **manual configuration**: the organization provides the endpoints and credentials (`client_id`/`client_secret`) explicitly.
- **With metadata + DCR** → **automatic flow**: the platform reads the metadata (RFC 8414) and self-registers as a client (RFC 7591). Nothing is exchanged manually.
- **With metadata, without DCR** → **automatic endpoint discovery**, but the credentials (`client_id`/`client_secret`) are provided manually.

!!! info
    The authorization server requirements are the same in all scenarios. See [OAuth Requirements](oauth-requirements.md) for the full breakdown.

## Interactive sequence diagram

<a href="../../diagrams/oauth/auth-flow.html" target="_blank">Open fullscreen ↗</a>

<iframe src="../../diagrams/oauth/auth-flow.html" width="100%" height="950" style="border: 1px solid var(--md-default-fg-color--lightest); border-radius: 6px;" loading="lazy" title="Interactive sequence diagram of the OAuth flow"></iframe>

## Flow steps

### 1. Organization connection

1. **User → Platform:** clicks "Connect Organization".
2. **Platform → Login:** redirects the user sending `client_id`, `scopes` and the **PKCE** flow parameters.
3. **User → Login:** enters credentials (email/password) and performs MFA if necessary.
4. **Login → OAuth:** validates the provided credentials.
5. **OAuth → Platform:** returns an **authorization code** via callback.
6. **Platform → OAuth:** exchanges the authorization code for tokens using the PKCE `code_verifier`.
7. **OAuth → Platform:** returns `access_token` (JWT) and `refresh_token`.
8. **Platform:** stores the connection tokens with the organization.
9. **Platform → OAuth:** calls `GET /merchants` with the Bearer (preferred path for store scope).
10. **OAuth → Platform:** returns the merchant list (rich catalog).
11. **Platform:** builds the store picker / bind and the account **business profile**.
12. **Platform → User:** informs that the organization was connected.

!!! note
    The platform does **not** need to call `userinfo` in this step. Userinfo is consumed by the MCP on tool calls. See [Userinfo](../authz/userinfo.md) and [Merchants](../authz/merchants.md).

### 2. Query about organization data

13. **User → Platform:** sends a prompt involving organization data.
14. **Platform → MCP:** runs a tool — in the example, `list_merchants` (**fallback** for rediscovery/refresh; connect stores already came from `/merchants`) — with `Bearer JWT`.
15. **MCP:** validates the JWT (signature, `iss`, `aud`, `exp`).
16. **MCP → OAuth (Organization):** calls `GET /userinfo` with the Bearer token to obtain the user's authorization context (identity + permissions).
17. **OAuth (Organization) → MCP:** returns `sub`, `email` and `profile_permissions`.
18. **MCP:** applies the authorization logic — determines which merchants/resources the user can access.
19. **MCP → Platform:** returns the tool result (e.g. authorized merchant list).

!!! note
    The platform does **not** receive the raw userinfo payload. The MCP applies userinfo and returns only the tool result.

### 3. Data query

20. **Platform → MCP:** runs `tool_call fetch_data(merchant_ids)` with `Bearer JWT`.
21. **MCP:** validates the JWT (signature, `iss`, `aud`, `exp`) and checks the user's authorization scope (via userinfo / known scope).
22. **MCP → DataBridge:** runs the necessary queries against the organization's data store, filtered by the authorized `merchant_ids`.
23. **DataBridge → MCP:** returns the requested data.
24. **MCP → Platform:** returns the result of the tool execution.
25. **Platform → User:** displays the response with the merchant data.

## References

- [RFC 6749 — OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [Authorization](../authz/index.md)
- [MCP integration](../integrations/mcp.md)
