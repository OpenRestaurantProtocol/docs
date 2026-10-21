# Userinfo (OIDC)

!!! info "Audience"
    The organization that operates the authorization server and needs to expose the identity endpoint (OpenID Connect).

    What this page answers: the contract of the **userinfo** endpoint, which returns the user's identity and permissions. The **primary consumer** is the MCP.

## What it is

**Userinfo** is an endpoint defined by **OpenID Connect (OIDC)**, the identity layer built on top of OAuth 2.0. It is not part of the OAuth requirements itself: it is the mechanism through which the **MCP** discovers **who the user is** (`sub`), their contact (`email`) and their **access profile/roles**.

!!! info
    The MCP calls this endpoint on tool calls to obtain the permission context before deciding which resources to release. The platform does not need the full userinfo payload; use [Merchants](merchants.md) on connect for selection and business profile.

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
| `merchants` | array | Yes | List of merchant ids the user can access |
| `profile_permissions` | object | Yes | Access profile and roles of the account |

### `merchants`

**Minimal id list** for fast authz in the MCP. The `id` of each item corresponds to the `merchant_id` of the [Merchants](merchants.md) contract:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Merchant identifier |

For a rich catalog (name, address, tax id, `external_ids`) and selection UI, use `GET /merchants` — see [Relationship to `/merchants`](#relationship-to-merchants).

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

## Relationship to `/merchants`

| Source | Content | Typical use |
|---|---|---|
| `userinfo.merchants` | Minimal ids | MCP: fast scope check on the tool |
| `GET /merchants` | Rich catalog | Platform: picker, bind, business profile; MCP: `list_merchants` tool (fallback) |

## Responsibilities

| Responsibility | Who does it |
|---|---|
| Expose the userinfo endpoint | Organization (authorization server / IdP) |
| Call userinfo and obtain the permission context | MCP |
| Determine the access profile/roles from userinfo | MCP |
| Consume the full userinfo payload on every call | **Not** the platform's role |
| Identity summary in the UI (`sub`, `name`, `email`), if needed | Platform (optional) |
