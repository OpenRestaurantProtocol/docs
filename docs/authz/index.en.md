# Authorization

!!! info "What this section answers"
    How the MCP controls access to resources (merchants, data) for each authenticated user.

## How it works

After the user is authenticated (via OAuth), it is still necessary to decide **what** they can access. That decision is made by the MCP.

The [userinfo](userinfo.md) endpoint is always provided by the organization (whoever operates the authorization server). Whoever creates the MCP uses that endpoint to obtain the user's authorization context and implement the access logic:

1. The MCP receives the user's token.
2. The MCP calls [userinfo](userinfo.md) to obtain the user's identity and permissions.
3. The MCP uses that context to decide which resources to release.
4. When necessary, the MCP lists the authorized merchants via [merchants](merchants.md).

## Protocol endpoints

- [Userinfo (OIDC)](userinfo.md) — authorization context: user identity + permissions.
- [Merchants](merchants.md) — list of merchants authorized for the user's token.
