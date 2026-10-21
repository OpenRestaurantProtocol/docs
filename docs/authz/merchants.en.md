# Merchants

!!! info
    Authorization endpoint: lists the merchants the user has permission to access, according to the token.

## Overview

This endpoint lists the merchants visible for the token. Authorization (which merchants) has already been resolved from the token: the endpoint only materializes the list.

**Callers:**

| Caller | When | What for |
|---|---|---|
| **Platform** (preferred) | On connect, after obtaining tokens | Store picker / bind; account **business profile** (store count, names, address, tax id, `external_ids`) |
| **MCP** | Authz and `list_merchants` tool | Validate scope; **fallback** for the agent (rediscovery / refresh) when the connect cache is not enough |

The `list_merchants` (`listar_lojas`) tool is **recommended** on the MCP and should mirror (or call) this endpoint. It does **not** replace the platform's `GET /merchants` call on connect.

## Endpoint

```
GET /merchants
```

The call must include the authorization header:

```
Authorization: Bearer <access_token>
```

## Response

The response is a list (array) of merchants. Each item has the following format:

| Field | Type | Required | Description |
|---|---|---|---|
| `merchant_id` | string | Yes | Unique merchant identifier (prefixed, e.g. `mrc_01JABC123`) |
| `domain` | string | Yes | Domain the merchant belongs to |
| `name` | string | Yes | Full merchant name (includes the unit identifier) |
| `simple_name` | string | Yes | Short merchant name |
| `logo_url` | string | No | Merchant logo image URL |
| `cnpj` | string | No | Merchant CNPJ (digits only) |
| `active` | boolean | Yes | Indicates whether the merchant is active |
| `address` | string | No | Merchant address |
| `external_ids` | object | No | Mapping of identifiers in external systems |

### `external_ids`

Each key of `external_ids` is the identifier of an external system (e.g. `ifood`), whose value is a list of objects, each with:

| Field | Type | Required | Description |
|---|---|---|---|
| `merchant_id` | string | Yes | Merchant identifier in the external system |

### Response example

```json
[
    {
        "merchant_id": "mrc_01JABC123",
        "domain": "example",
        "name": "Example Restaurant - Downtown Unit",
        "simple_name": "Example Restaurant",
        "logo_url": "https://static-images.example.com/logosgde/mrc_01JABC123/logo.png",
        "cnpj": "12345678000190",
        "active": true,
        "address": "100 Flower Street, Downtown, Rio de Janeiro - RJ",
        "external_ids": {
            "ifood": [
                {
                    "merchant_id": "abc123-def456"
                }
            ]
        }
    }
]
```

## Relationship to userinfo

`userinfo.merchants` carries ids only for fast MCP authz. This endpoint is the **rich catalog** for UI and business profile. See [Userinfo](userinfo.md).

## Responsibilities

| Responsibility | Who does it |
|---|---|
| Expose `GET /merchants` | Organization (authorization server) |
| Call `/merchants` on connect (picker + business profile) | Platform |
| Expose `list_merchants` as a fallback tool (via this endpoint) | MCP |
| Enforce merchant scope on data tools | MCP |
