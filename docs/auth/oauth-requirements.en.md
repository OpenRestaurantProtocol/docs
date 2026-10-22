# OAuth requirements for integration

!!! info "Audience"
    Organizations that want to integrate their MCP/data with the platform and need to build the authorization server (OAuth) on their side.

    What this page answers: **what your OAuth needs to have in order to connect to the platform.**

## Quick summary

To integrate, you will need:

- An **authorization server** (OAuth 2.0 / OIDC) with **RFC 8414** metadata.
- Support for **authorization code + PKCE** and issuing a **refresh token**.
- A **userinfo** endpoint (OIDC) with identity and profile/roles.
- A **`GET /merchants`** endpoint with the merchant catalog for the token.
- If there is an **OAuth-protected HTTP MCP**: protected resource metadata (**RFC 9728**) is required.
- (Optional) **DCR** (RFC 7591) for automatic client registration.

## Overview

Your organization builds and operates an **authorization server** (OAuth 2.0 / OIDC) that authenticates users and issues tokens. The platform acts as a *client* of that authorization server: it discovers the endpoints, guides the user through the authorization flow, and stores the resulting token. With the token in hand, the **MCP** queries the authorization server's **userinfo** endpoint to discover the identity and access profile of the account.

There are **three roles** in this flow:

- **MCP server** — the protected resource. It publishes its **Protected Resource Metadata** (RFC 9728), which identifies the authorization server(s) that protect it.
- **Authorization server** — publishes its **own** metadata (RFC 8414) with endpoints and capabilities (`authorization_endpoint`, `token_endpoint`, `response_types_supported`, `grant_types_supported`).
- **Client / platform** — discovers this relationship automatically and completes the OAuth flow.

The standard integration uses **auto-discovery**. The mandatory baseline is in the [Mandatory requirements](#mandatory-requirements) section.

## Quick glossary

| Term | Meaning |
|---|---|
| `issuer` | Authorization server identifier |
| `resource` | MCP / protected resource identifier |
| PRM | Protected Resource Metadata (RFC 9728) — identifies the resource and its authorization server(s) |
| DCR | Dynamic Client Registration (RFC 7591) — automatic client registration |
| userinfo | OIDC endpoint that returns the user's identity and profile |
| callback URL | Redirect URL where the browser returns after login |

## Mandatory requirements

These requirements are mandatory in every integration. They are organized by where each one is implemented:

### On the authorization server — authorization code + PKCE

- Grant: **authorization code**.
- **PKCE** is mandatory (`S256` method), with `code_challenge` and `code_verifier`.
- Issue a **refresh token** together with the access token.

### On the authorization server / IdP — userinfo endpoint (OIDC)

OAuth by itself delivers a token, but it does **not** answer "who is this user" nor "what can they access". That is the role of **userinfo** (OpenID Connect). The authorization server must expose a **userinfo** endpoint that returns, at minimum:

- `sub`: unique user identifier.
- `email` (or another contact identifier).
- Access profile and roles of the account.

The **MCP** uses userinfo as the **authorization context** on tool calls (identity + profile/roles). The **platform** uses `GET /merchants` on connect for store selection and the account business profile — it does not need the full userinfo payload. The full userinfo contract is on the [Userinfo (OIDC)](../authz/userinfo.md) page.

### On the authorization server — merchants endpoint (`GET /merchants`)

The list of merchants the user can access is **domain data**, not identity. The authorization server must expose `GET /merchants` with the rich catalog (name, address, tax id, `external_ids`, etc.). Full contract: [Merchants](../authz/merchants.md).

## OAuth discovery

In the standard flow, your authorization server **publishes metadata** and the platform discovers the endpoints automatically. You don't need to configure endpoints manually.

### 1. Authorization server metadata (RFC 8414) — always

The authorization server publishes a metadata document derived from the `issuer`. During discovery, you can provide the authorization server's base URL (the `issuer`, e.g. `https://auth.yourorganization.com`) or the document URL directly. From the `issuer`, the platform derives the path:

```
https://auth.yourorganization.com/.well-known/oauth-authorization-server
```

!!! info "OpenID Connect"
    OpenID Connect providers can be discovered via the alternative path `/.well-known/openid-configuration`, which the platform also accepts.

With, at minimum, the following fields:

| Field | Required? | Notes |
|---|---|---|
| `issuer` | Yes | Authorization server identifier |
| `authorization_endpoint` | Yes | Authorization endpoint (authorization code) |
| `token_endpoint` | Yes | Code-for-token exchange endpoint |
| `revocation_endpoint` | Optional | Token revocation endpoint (RFC 7009) |
| `scopes_supported` | Recommended | List of accepted scopes (e.g. `openid`, `profile`, `menus:read`) |
| `response_types_supported` | Yes | Must include `code` |
| `grant_types_supported` | Yes | Must include `authorization_code` (and `refresh_token`) |
| `token_endpoint_auth_methods_supported` | Yes | E.g. `client_secret_basic`, `client_secret_post`, `none` (for public/PKCE clients) |
| `code_challenge_methods_supported` | Yes | Must include `S256` (PKCE) |
| `registration_endpoint` | Optional | Required only if you want to support DCR |

Content example:

```json
{
  "issuer": "https://auth.yourorganization.com",
  "authorization_endpoint": "https://auth.yourorganization.com/oauth/authorize",
  "token_endpoint": "https://auth.yourorganization.com/oauth/token",
  "registration_endpoint": "https://auth.yourorganization.com/oauth/register",
  "scopes_supported": ["openid", "profile", "menus:read"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic"],
  "code_challenge_methods_supported": ["S256"]
}
```

!!! info "Who accesses it and when"
    This document is accessed by the **platform**, once during discovery (and cached). The end user does **not** access this path directly. At login, the browser is redirected to the `authorization_endpoint` that the platform has already discovered.

### 2. Protected Resource Metadata (RFC 9728) — required for OAuth-protected HTTP MCP servers

For an MCP protected by OAuth over HTTP, the MCP server publishes its **Protected Resource Metadata** (RFC 9728). This document describes the protected resource and identifies its authorization server(s); it is the entry point for discovery. The platform reads `authorization_servers` to learn **which** authorization server protects that MCP.

!!! note "Resource metadata ≠ authorization server metadata"
    Protected Resource Metadata describes the resource and points to its authorization server(s). It does **not** replace the authorization server's own metadata. Endpoints and capabilities such as `authorization_endpoint`, `token_endpoint`, `response_types_supported` and `grant_types_supported` are discovered from the authorization server's metadata (RFC 8414 / OpenID Connect Discovery), described in the Authorization server metadata section above.

**Fields:**

| Field | Required? | Notes |
|---|---|---|
| `resource` | Required (RFC 9728) | Canonical URI that identifies the protected resource (the MCP URL). |
| `authorization_servers` | Optional in RFC 9728; **required by the MCP Authorization specification** (at least one entry) | List of authorization server issuer identifiers. |
| `scopes_supported` | Recommended (RFC 9728) | OAuth scopes accepted in authorization requests to the resource. |
| `resource_name` | Recommended (RFC 9728) | Human-readable display name of the resource. |
| `resource_documentation` | Optional (RFC 9728) | URL of developer documentation for the resource. |
| `bearer_methods_supported` | Optional (RFC 9728) | Supported bearer token methods (`header`, `body`, `query`). |

Minimal example:

```json
{
  "resource": "https://api.example.com",
  "authorization_servers": [
    "https://auth.example.com"
  ]
}
```

The URLs above are illustrative — replace them with the actual resource and authorization server URLs.

**Discovery flow:**

1. The MCP client discovers the Protected Resource Metadata using the discovery mechanism below.
2. The client reads `authorization_servers` to identify the authorization server.
3. The client discovers the authorization server's metadata (RFC 8414 / OpenID Connect Discovery).
4. The client uses the discovered endpoints to complete the OAuth flow.

The **MCP server** publishes the Protected Resource Metadata; the **authorization server** publishes its own metadata.

**Discovery mechanisms.** MCP servers protected by OAuth over HTTP MUST implement at least one of the following (MCP Authorization specification):

- **`WWW-Authenticate` header.** Return a `401 Unauthorized` response with a `WWW-Authenticate` header whose `resource_metadata` parameter points to the metadata document (`WWW-Authenticate: Bearer resource_metadata="https://.../.well-known/oauth-protected-resource"`).
- **Well-known URI.** Publish the document at the applicable well-known URI `/.well-known/oauth-protected-resource`. This can be at the host root (`https://example.com/.well-known/oauth-protected-resource`) or at the path of the MCP endpoint (an MCP at `https://example.com/public/mcp` hosts metadata at `https://example.com/.well-known/oauth-protected-resource/public/mcp`).

**Client fallback order.** The MCP client MUST support both mechanisms:

1. When the `WWW-Authenticate` header contains a `resource_metadata` parameter, the client uses the URL provided in that parameter.
2. When it does not, the client falls back to the well-known URI — first the path-specific URI (`https://example.com/.well-known/oauth-protected-resource/public/mcp`), then the root URI (`https://example.com/.well-known/oauth-protected-resource`).

!!! tip "FastMCP"
    With FastMCP, `RemoteAuthProvider` publishes this document automatically. See [Building an MCP with OAuth](mcp-oauth.md).

### 3. Dynamic Client Registration (RFC 7591) — recommended for credentials

If the authorization server exposes `registration_endpoint` (RFC 7591) and supports **Dynamic Client Registration (DCR)**, the platform self-registers as a client and obtains `client_id`/`client_secret` with no manual credential exchange. With DCR, the platform also provides its own `redirect_uris` in the registration payload, so you don't need to manually allowlist the callback URL.

**Without DCR** (manual registration):

- Publish RFC 8414 metadata.
- Provide `client_id`/`client_secret` manually.
- Manually allowlist the callback URL in the IdP.

**With DCR** (recommended):

- Publish RFC 8414 metadata + `registration_endpoint`.
- The platform registers the client automatically (credentials + `redirect_uris`). Nothing to exchange manually.

!!! note
    DCR does **not** eliminate the need to publish metadata. It only automates the client credentials and the callback allowlist. DCR is only possible if your IdP exposes the `registration_endpoint` (RFC 7591); without it, use manual registration.

    Userinfo is a separate layer (identity/authorization), not an authentication requirement. See [Userinfo (OIDC)](../authz/userinfo.md).

## Advanced — manual configuration (legacy & diagnostics)

!!! warning "Not the standard flow"
    Manual configuration is an **advanced exception** for troubleshooting or compatibility with legacy integrations. It is **not** the normal MCP discovery flow, and it does **not** replace the MCP server's Protected Resource Metadata discovery requirements (RFC 9728).

When auto-discovery is not possible (for example, a legacy integration that does not publish metadata, or an already-registered client), you explicitly provide the OAuth information. You need to provide:

- **Authorization server endpoints**: `authorization_endpoint` and `token_endpoint` (and `revocation_endpoint`, if any).
- **`client_id`** and **`client_secret`** (the `client_secret` is mandatory in the typical confidential client flow).
- **Callback/redirect URL**: see the block below.
- **Scopes** that must be requested in the flow (there is no fixed set; you define yours; e.g. `openid`, `profile`, `menus:read`).

!!! warning "Callback URL (redirect_uri)"
    The callback URL is **not invented by you**. It is provided by the platform (it is fixed per environment). You must:

    1. Obtain the callback URL from the platform.
    2. Register it in your IdP's allowed redirect URIs (allowlist).
    3. Without this registration, the authorization flow redirect **fails**.

    In the DCR flow, this step is automatic (the platform provides the `redirect_uris` in the registration).

The configuration on the platform is done by us, based on the information you provide. [Contact us](#) to start the integration.

## Validation rules

Some operational rules make discovery fail if not met. Before publishing, ensure:

- **Mandatory HTTPS**: metadata documents (RFC 8414 and RFC 9728) must be served over **HTTPS** (RFC 8414 requires the `https` scheme). Plain HTTP is not accepted for discovery.
- **Exact `issuer` match**: the `issuer` value in the metadata must be **identical** to the identifier used to construct the metadata lookup URL (RFC 8414 §3.3). Sharing the same registrable domain is not sufficient; any mismatch makes discovery fail (prevents mix-up attacks).
- **`resource` covers the real URL**: in the protected resource metadata (RFC 9728), the `resource` must cover the MCP URL. The root host covers any path on the same host; a specific path does not cover arbitrary subpaths.

## What is not supported

- Only the **authorization code + PKCE** grant is used for user authentication. Grants such as `client_credentials` are not part of this flow.
- Manual configuration is an advanced exception for legacy integrations or diagnostics — it is not a substitute for metadata discovery, and it does not replace the MCP server's Protected Resource Metadata discovery requirements (RFC 9728).

## Validation checklist before integration

Before attempting to connect, confirm each item:

- [ ] The Protected Resource Metadata is discoverable (via the `WWW-Authenticate` `resource_metadata` parameter or the well-known URI — path-specific or root) and returns `resource` and `authorization_servers` (for an OAuth-protected HTTP MCP).
- [ ] `GET /.well-known/oauth-authorization-server` returns the mandatory RFC 8414 fields.
- [ ] The metadata `issuer` exactly matches the identifier used to construct the metadata lookup URL.
- [ ] `code_challenge_methods_supported` contains `S256`.
- [ ] The flow issues a **refresh token**.
- [ ] The `/userinfo` responds with identity and profile/roles.
- [ ] The flow tests PKCE (`code_challenge`/`code_verifier`).
- [ ] Token refresh works (expired access token → renewal via refresh token).
- [ ] Without DCR: `client_id`/`client_secret` and the callback URL are registered in the IdP.
- [ ] With DCR: `registration_endpoint` is accessible and client registration succeeds.
- [ ] The MCP can validate the token (JWKS/`issuer`/`audience` compatible. See [Building an MCP with OAuth](mcp-oauth.md)).

## Troubleshooting

- **Authorization server metadata discovery fails (404 on `/.well-known/oauth-authorization-server`)**: confirm the document is served over HTTPS and at the correct path derived from the `issuer`.
- **Protected Resource Metadata not discoverable**: confirm the server returns the `WWW-Authenticate` header with `resource_metadata`, or that the document is available at the path-specific or root well-known URI (`/.well-known/oauth-protected-resource`).
- **`issuer` mismatch**: the metadata `issuer` must be **exactly** identical to the identifier used to construct the metadata lookup URL (RFC 8414 §3.3). Sharing the same registrable domain is not sufficient.
- **Redirect fails**: the callback URL was not registered in the IdP allowlist.
- **`401` on `/userinfo`**: the presented token is invalid, expired, or the `aud` does not match the expected value. Check `iss`, `aud` and the signature.
- **Invalid `audience` in the JWT**: the token `aud` does not match what the MCP expects. Align the authorization server's `audience` with the MCP.
- **`401` on MCP calls**: the token is not valid for the MCP. Check `iss`, `aud` and the authorization server's `jwks_uri`.

## Responsibilities

| Responsibility | Who does it |
|---|---|
| Build/operate the authorization server | Your organization |
| Publish RFC 8414 metadata (authorization server) | Your organization |
| Publish RFC 9728 protected resource metadata (MCP) | The organization that operates the MCP |
| Expose the userinfo endpoint (identity + profile/roles) | Your organization |
| Authenticate the user and issue tokens | Your organization |
| Authorization server discovery (auto-discovery) | Platform |
| Store and encrypt the token | Platform |
| Query the userinfo endpoint with the token and interpret profile/merchants | MCP |
| Inject `Authorization: Bearer` and refresh | Platform |

!!! note
    The authorization server and the MCP can be operated by the same organization or by different organizations. RFC 8414 and userinfo are the responsibility of the organization that operates the authorization server; RFC 9728 is the responsibility of the organization that operates the MCP.
