# Integration via MCP

This section documents how to connect a service to the platform using the MCP (Model Context Protocol).

!!! info "Context"
    The MCP exposes the ecosystem tools (for example, `listar_lojas` and `buscar_dados`) to the platform. Every call is authenticated with **Bearer JWT** and validated before touching the DataBridge — see the [OAuth flow](../auth/oauth.md).

## Prerequisites

- [ ] Credential / token
- [ ] MCP server endpoint
- [ ] Configured MCP client

## Step by step

1. **Configure the endpoint** — obtain the MCP server endpoint and point the client to it.
2. **Authenticate** — obtain the `access_token` via OAuth 2.0 + PKCE and send it as `Bearer` on each call (see [OAuth](../auth/oauth.md)).
3. **Test the connection** — verify that a test call returns the expected data.

??? example "Endpoint configuration example"
    ```json title="mcp_config.json"
    {
      "mcpServers": {
        "my-server": {
          "url": "https://mcp.example.com/my-server"
        }
      }
    }
    ```

## Security

!!! warning "Credentials"
    Never version credentials in the repository. Use environment variables or a secret manager.

!!! warning "Token"
    Rotate tokens periodically and validate the JWT (`iss`, `aud`, `exp`) on every call.

## References

- [OAuth Requirements](../auth/oauth-requirements.md)
- [ ] MCP specification
