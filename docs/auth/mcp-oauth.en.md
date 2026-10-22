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

The MCP server exposes this document through **one of** the two discovery mechanisms defined by the MCP Authorization specification:

- **`WWW-Authenticate` header.** On a tokenless request, return a `401 Unauthorized` response with a `WWW-Authenticate` header whose `resource_metadata` parameter is the URL of the metadata document (`WWW-Authenticate: Bearer resource_metadata="https://.../.well-known/oauth-protected-resource"`).
- **Well-known URI.** Publish the document at the applicable well-known URI `/.well-known/oauth-protected-resource`. This can be at the host root (`https://example.com/.well-known/oauth-protected-resource`) or at the path of the MCP endpoint (an MCP at `https://example.com/public/mcp` hosts metadata at `https://example.com/.well-known/oauth-protected-resource/public/mcp`).

The document must contain, at minimum:

| Field | Required? | Notes |
|---|---|---|
| `resource` | Required (RFC 9728) | Canonical identifier of the protected resource (the MCP URL, including its path when the MCP is served under a path) |
| `authorization_servers` | Optional in RFC 9728; **required by the MCP Authorization specification** (at least one entry) | Non-empty list of the resource's authorization servers |

**Client fallback order.** On the platform side:

1. When the `WWW-Authenticate` header contains a `resource_metadata` parameter, the platform uses the URL provided in that parameter.
2. When it does not, the platform falls back to the well-known URI — first the path-specific URI (`https://example.com/.well-known/oauth-protected-resource/public/mcp`), then the root URI (`https://example.com/.well-known/oauth-protected-resource`).

With FastMCP, `RemoteAuthProvider` publishes this document automatically — including path-specific discovery when the MCP endpoint is mounted under a path (see the example at the end of this page).

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

The MCP server side in Python uses [FastMCP](https://gofastmcp.com) with `RemoteAuthProvider`. FastMCP publishes the protected resource metadata automatically — at both the root well-known URI and the path-specific URI derived from the MCP endpoint's mount path (RFC 9728 §3.1) — and returns the `WWW-Authenticate: Bearer resource_metadata="..."` header on `401` responses. Served at the default mount path `/mcp`, the server below advertises `resource: https://api.yourorganization.com/mcp`:

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
# Served at /mcp by default: resource = https://api.yourorganization.com/mcp,
# with metadata at /.well-known/oauth-protected-resource and
# /.well-known/oauth-protected-resource/mcp.
```

### Go (illustrative)

Conceptual example in Go, covering only what the MCP needs to expose and validate (no specific library dependency). The well-known route is registered at the path-specific URI for an MCP served at `/mcp`:

```go
// 1. Publish the protected resource metadata (RFC 9728).
// The MCP is served at /mcp, so metadata is published at the path-specific URI.
mux.HandleFunc("/.well-known/oauth-protected-resource/mcp", func(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]any{
        "resource":              "https://your-mcp.com/mcp",
        "authorization_servers": []string{"https://auth.yourorganization.com"},
    })
})

// 2. Validate the JWT on every protected call (jwks_uri + issuer + audience)
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

        claims, err := validateJWT(token)
        if err != nil {
            // resource_metadata must point to the same well-known URI above.
            w.Header().Set("WWW-Authenticate", `Bearer resource_metadata="https://your-mcp.com/.well-known/oauth-protected-resource/mcp"`)
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

## Implementation checklist

- [ ] The protected resource metadata is discoverable via the `WWW-Authenticate` `resource_metadata` parameter **or** the well-known URI (path-specific or root).
- [ ] `resource` identifies the MCP server by its canonical URL, including the path when the MCP is served under a path.
- [ ] `authorization_servers` contains at least one authorization server.
- [ ] Protected endpoints return `401` with the `WWW-Authenticate: Bearer resource_metadata="..."` header when the token is missing or invalid.
- [ ] When the MCP endpoint has a path component, metadata is also published at the path-specific well-known URI (`/.well-known/oauth-protected-resource/<path>`), not only at the root.
