# Lojas (Merchants)

!!! info
    Endpoint de autorização: lista as lojas que o usuário tem permissão de acessar, de acordo com o token.

## Visão geral

Este endpoint lista as lojas visíveis para o token. A autorização (quais lojas) já foi resolvida a partir do token: o endpoint apenas materializa a lista.

**Callers:**

| Caller | Quando | Para quê |
|---|---|---|
| **Plataforma** (preferido) | No connect, após obter os tokens | Picker / bind de loja(s); **perfil de negócio** da conta (N lojas, nomes, endereço, CNPJ, `external_ids`) |
| **MCP** | Authz e tool `listar_lojas` | Validar escopo; **fallback** para o agente (rediscovery / refresh) quando o cache do connect não basta |

A tool `listar_lojas` (`list_merchants`) é **recomendada** no MCP e deve espelhar (ou chamar) este endpoint. Ela **não** substitui a chamada da plataforma a `GET /merchants` no connect.

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

Cada chave de `external_ids` é o identificador de um sistema externo (ex.: `ifood`), cujo valor é uma lista de objetos, cada um com:

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
            "ifood": [
                {
                    "merchant_id": "abc123-def456"
                }
            ]
        }
    }
]
```

## Relação com userinfo

`userinfo.merchants` traz só ids para authz rápida no MCP. Este endpoint é o **catálogo rico** para UI e perfil comercial. Veja [Userinfo](userinfo.md).

## Responsabilidades

| Responsabilidade | Quem faz |
|---|---|
| Expor `GET /merchants` | Organization (authorization server) |
| Chamar `/merchants` no connect (picker + perfil de negócio) | Plataforma |
| Expor tool `listar_lojas` como fallback (via este endpoint) | MCP |
| Aplicar escopo de loja nas tools de dados | MCP |
