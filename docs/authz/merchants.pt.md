# Lojas (Merchants)

!!! info
    Endpoint de autorização: lista as lojas que o usuário tem permissão de acessar, de acordo com o token.

## Visão geral

Este endpoint lista as lojas que o usuário pode acessar de acordo com o token. O MCP o chama para construir o escopo de autorização do usuário. A autorização (quais lojas) já foi resolvida a partir do token: este endpoint apenas devolve as lojas visíveis para aquele token.

## Endpoint

```
GET /merchants
```

A chamada deve incluir o header de autorização:

```
Authorization: Bearer <access_token>
```

## Resposta

A resposta é uma lista (array) de lojas. Cada item tem o seguinte formato:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `merchant_id` | string | Sim | Identificador único da loja (prefixado, ex.: `mrc_01JABC123`) |
| `domain` | string | Sim | Domínio ao qual a loja pertence |
| `name` | string | Sim | Nome completo da loja (inclui o identificador da unidade) |
| `simple_name` | string | Sim | Nome curto da loja |
| `logo_url` | string | Não | URL da imagem de logo da loja |
| `cnpj` | string | Não | CNPJ da loja (somente dígitos) |
| `active` | boolean | Sim | Indica se a loja está ativa |
| `address` | string | Não | Endereço da loja |
| `external_ids` | object | Não | Mapeamento de identificadores em sistemas externos |

### `external_ids`

Cada chave de `external_ids` é o identificador de um sistema externo (ex.: `ifood`), cujo valor é um objeto com:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `merchant_id` | string | Sim | Identificador da loja no sistema externo |

### Exemplo de resposta

```json
[
    {
        "merchant_id": "mrc_01JABC123",
        "domain": "example",
        "name": "Restaurante Exemplo - Unidade Centro",
        "simple_name": "Restaurante Exemplo",
        "logo_url": "https://static-images.example.com.br/logosgde/mrc_01JABC123/logo.png",
        "cnpj": "12345678000190",
        "active": true,
        "address": "Rua das Flores, 100, Centro, Rio de Janeiro - RJ",
        "external_ids": {
            "ifood": {
                "merchant_id": "abc123-def456"
            }
        }
    }
]
```
