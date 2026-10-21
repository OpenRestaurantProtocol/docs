# MCP integration

This section documents how to connect a service to the platform using the MCP (Model Context Protocol).

!!! info "Context"
    The MCP exposes ecosystem tools to the platform. Every call is authenticated with **Bearer JWT** and validated before touching the DataBridge — see the [OAuth flow](../auth/oauth.md).

## Who operates the MCP

The protocol separates the **Organization** (owner of the authorization server and merchant scope) from **who hosts** the MCP server:

| Model | Name | AS / userinfo / `/merchants` | MCP + DataBridge |
|---|---|---|---|
| **A** | *organization-hosted MCP* | Organization | Organization |
| **B** | *delegated MCP operator* | Organization (**required**) | Platform or third party |

Rules:

1. Identity and merchant scope (`userinfo`, `GET /merchants`) always belong to the Organization authorization server.
2. The MCP — in A or B — **consumes and applies** that context on tools. In model B the operator does **not** replace the AS.
3. The platform connects via OAuth, calls `GET /merchants` on connect, and sends tool calls to the configured MCP endpoint (A or B).

!!! example "Generic examples"
    - Model A: `https://mcp.organization.example` operated by the org; AS at `https://auth.organization.example`.
    - Model B: tools at `https://mcp.platform.example`; userinfo/merchants remain at `https://auth.organization.example`.

In model B, the MCP still calls the Organization AS on every tool that requires authorize — that is when **userinfo is required**, regardless of who hosts the MCP.

## Recommended tools

| Tool | Role |
|---|---|
| `list_merchants` / `listar_lojas` | **Recommended as a fallback** — rediscovery/refresh for the agent; should mirror or call `GET /merchants`. Does **not** replace the platform's `/merchants` call on connect. |
| Data tools (e.g. `fetch_data`) | Operate with `merchant_ids` already in scope; the MCP applies userinfo and validates scope. |

## Prerequisites

- [ ] Credential / token (Organization OAuth)
- [ ] MCP server endpoint (model A or B)
- [ ] MCP client configured

## Steps

1. **Configure the endpoint** — obtain the MCP server endpoint and point the client at it.
2. **Authenticate** — obtain the `access_token` via OAuth 2.0 + PKCE and send it as `Bearer` on every call (see [OAuth](../auth/oauth.md)).
3. **Connect** — the platform calls `GET /merchants` on the Organization AS (picker + business profile).
4. **Test the connection** — verify that a test tool (e.g. `list_merchants` or a data tool) returns the expected result.

??? example "Endpoint configuration example"
    ```json title="mcp_config.json"
    {
      "mcpServers": {
        "organization-example": {
          "url": "https://mcp.organization.example"
        }
      }
    }
    ```

## Security

!!! warning "Credentials"
    Never commit credentials to the repository. Use environment variables or a secret manager.

!!! warning "Token"
    Rotate tokens periodically and validate the JWT (`iss`, `aud`, `exp`) on every call.

## References

- [OAuth requirements](../auth/oauth-requirements.md)
- [Authorization](../authz/index.md)
- [Userinfo](../authz/userinfo.md)
- [Merchants](../authz/merchants.md)
