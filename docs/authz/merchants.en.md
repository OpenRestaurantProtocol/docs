# Merchants

!!! info
    Authorization endpoint: lists the merchants the user has permission to access, according to the token.

## Overview

This endpoint lists the merchants the user can access according to the token. The MCP calls it to build the user's authorization scope. The authorization (which merchants) has already been resolved from the token: this endpoint only returns the merchants visible for that token.

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
