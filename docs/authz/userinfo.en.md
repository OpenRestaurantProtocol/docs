# Userinfo (OIDC)

!!! info "Audience"
    The organization that provides the authorization server and needs to expose the identity endpoint (OpenID Connect) to the platform.

    What this page answers: the contract of the **userinfo** endpoint, which returns the user's identity and permissions.

## What it is

**Userinfo** is an endpoint defined by **OpenID Connect (OIDC)**, the identity layer built on top of OAuth 2.0. It is not part of the OAuth requirements itself: it is the mechanism through which the **MCP** discovers **who the user is** (`sub`), their contact (`email`) and their **access profile/roles**.

!!! info
    The MCP calls this endpoint to obtain the user's permission context before deciding which resources to release.

## Request

The MCP calls the endpoint with the user's token:

```
Authorization: Bearer <access_token>
```

The endpoint must validate the token (signature, `iss`, `aud`, `exp`) and use the `sub` to identify the account before responding.

## Response

The endpoint must return, at minimum, the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `sub` | string | Yes | Unique user identifier |
| `email` | string | Yes | Email (or another contact identifier) |
| `name` | string | No | User's display name |
| `merchants` | array | Yes | List of merchants the user can access |
| `profile_permissions` | object | Yes | Access profile and roles of the account |

### `merchants`

List of merchants the user can access. The `id` of each item corresponds to the `merchant_id` of the [Merchants](merchants.md) contract:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Merchant identifier |

### `profile_permissions`

| Field | Type | Required | Description |
|---|---|---|---|
| `profile` | object | Yes | User profile (`id` and `name`) |
| `resource_access` | object | Yes | Permissions per application |

### Response example

```json
{
    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Maria Example",
    "email": "maria@example.com",
    "merchants": [
        { "id": "80727f01-5fa7-42d7-8735-9f0e847ff78c" },
        { "id": "2262aeff-9ea3-4314-a4a1-86f9fb57cbe1" }
    ],
    "profile_permissions": {
        "profile": { "id": 1006, "name": "Admin" },
        "resource_access": {
            "your-application": {
                "permissions": ["VIEW_MENU", "EDIT_MENU"]
            }
        }
    }
}
```

## Responsibilities

| Responsibility | Who does it |
|---|---|
| Expose the userinfo endpoint | Your organization (authorization server / IdP) |
| Call userinfo and obtain the permission context | MCP |
| Determine the access profile/roles from userinfo | MCP |
