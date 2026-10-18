# Building an MCP with OAuth

!!! info "Audience"
    The organization that will build (or adapt) an MCP server that will be consumed by the platform and needs to authenticate via OAuth.

    Scope of this doc: the MCP server side and what it needs to expose for the platform to authenticate and inject the token.

## Overview

The platform does not store the list of merchants/resources the user can access. It is the transporter of the user's token. The flow is:

1. The platform discovers the MCP's authorization server (via metadata).
2. The user completes the authorization flow (authorization code + PKCE).
3. The platform stores the user's access token (and refresh token), encrypted.
4. On each tool call, the platform injects `Authorization: Bearer <access_token>`.
5. Your MCP/API uses that token to decide which merchants/resources the user can access and responds only with that.

Merchant/resource authorization lives on your server, not on the platform.

## What your MCP needs to expose

### 1. Protected resource metadata (RFC 9728)

Discovery happens in **two stages**. First the platform discovers the **protected resource** (your MCP/API) via RFC 9728; only then, from the list of authorization servers published there, it fetches the authorization server metadata (RFC 8414). In other words, the protected resource document is the entry point for authentication.

The protected resource metadata document must be published at `/.well-known/oauth-protected-resource` with, at minimum:

| Field | Required? | Notes |
|---|---|---|
| `resource` | Yes | Canonical identifier of the protected resource (the MCP URL) |
| `authorization_servers` | Yes | Non-empty list of the resource's authorization servers |

If the direct endpoint is not available, the platform makes a tokenless request to the MCP. A `401` response with the `WWW-Authenticate: Bearer resource_metadata="..."` header is expected and serves as a discovery signal (it is not an integration error). The platform then fetches the indicated URL. If there is neither a direct endpoint nor `resource_metadata`, auto-discovery is not possible.

With FastMCP, `RemoteAuthProvider` publishes this document automatically (see the example at the end of this page).

### 2. Authorization code + PKCE grant

The authorization flow uses the **authorization code** grant with **PKCE** (not to be confused with client credentials, which is another grant).

Mandatory requirements on your authorization server:

- PKCE support (`S256`), including `code_challenge` and `code_verifier`.
- Issue a **refresh token** together with the access token.

### 3. Token validation contract

The platform orchestrates the full flow: starts authorization, processes the callback, stores the token, refreshes and revokes. On your side, what matters is:

- On each request, the platform injects the `Authorization: Bearer <access_token>` header.
- If your server responds `401`, the platform attempts a refresh and reruns the call exactly once.
- If it still receives `401`, it returns an authentication error and the user must re-authorize.

Your MCP server must validate the token on every call and respond `401` when it is invalid or expired. It is this behavior that triggers the platform's refresh mechanism.

For the MCP to validate the token as a JWT, the authorization server must guarantee compatibility:

- Publish the `jwks_uri` (the token's public signing keys).
- Issue tokens with `issuer` and `audience` consistent with what the MCP expects.
- Ensure the token's `iss` matches the metadata `issuer` (RFC 8414).

## Credential scope: per-user vs. shared

The MCP server has a `credential_scope` field with two values:

- **`user`**: each user has their own token. Use this mode for "user token" / "merchants the user can access".
- **`global`** (default): a single token is valid for all users.

To list merchants with the user's token, configure `credential_scope: user`.

## Examples by language

The examples below are illustrative and focused on the MCP contract: publishing RFC 9728, validating the `Authorization: Bearer` and responding `401` correctly.

### Python (FastMCP)

The MCP server side in Python uses [FastMCP](https://gofastmcp.com) with `RemoteAuthProvider`, which publishes `/.well-known/oauth-protected-resource` (RFC 9728) automatically:

```python
from fastmcp import FastMCP
from fastmcp.server.auth import RemoteAuthProvider
from fastmcp.server.auth.providers.jwt import JWTVerifier
from pydantic import AnyHttpUrl

token_verifier = JWTVerifier(
    jwks_uri="https://auth.yourorganization.com/.well-known/jwks.json",
    issuer="https://auth.yourorganization.com",
    audience="your-mcp-server",
)

auth = RemoteAuthProvider(
    token_verifier=token_verifier,
    authorization_servers=[AnyHttpUrl("https://auth.yourorganization.com")],
    base_url="https://api.yourorganization.com",
)

mcp = FastMCP(name="Merchants", auth=auth)
```

### Go (illustrative)

Conceptual example in Go, covering only what the MCP needs to expose and validate (no specific library dependency):

```go
// 1. Publish the protected resource metadata (RFC 9728)
mux.HandleFunc("/.well-known/oauth-protected-resource", func(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]any{
        "resource":              "https://your-mcp.com",
        "authorization_servers": []string{"https://auth.yourorganization.com"},
    })
})

// 2. Validate the JWT on every protected call (jwks_uri + issuer + audience)
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

        claims, err := validateJWT(token)
        if err != nil {
            w.Header().Set("WWW-Authenticate", `Bearer resource_metadata="https://your-mcp.com/.well-known/oauth-protected-resource"`)
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }

        ctx := context.WithValue(r.Context(), claimsKey{}, claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

!!! note
    Other languages follow the same contract: publish RFC 9728, validate the `Authorization: Bearer` and respond `401` when the token is invalid or expired.

The `client_id`/`client_secret` credentials do not come in here. The OAuth client is the platform (see the [OAuth requirements](oauth-requirements.md)). The MCP server validates the token via JWKS or, if preferred, via introspection.
