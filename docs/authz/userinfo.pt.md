# Userinfo (OIDC)

!!! info "Público"
    A organização que opera o authorization server e precisa expor o endpoint de identidade (OpenID Connect).

    O que esta página responde: o contrato do endpoint de **userinfo**, que retorna a identidade e as permissões do usuário. O **consumidor primário** é o MCP.

## O que é

O **userinfo** é um endpoint definido pelo **OpenID Connect (OIDC)**, a camada de identidade construída sobre o OAuth 2.0. Ele não faz parte dos requisitos de OAuth em si: é o mecanismo pelo qual o **MCP** descobre **quem é o usuário** (`sub`), seu contato (`email`) e seu **perfil/roles de acesso**.

!!! info
    O MCP chama este endpoint em tool calls para obter o contexto de permissão antes de decidir quais recursos liberar. A plataforma não precisa do payload completo de userinfo; use [Lojas](merchants.md) no connect para seleção e perfil de negócio.

## Request

O MCP chama o endpoint com o token do usuário:

```
Authorization: Bearer <access_token>
```

O endpoint deve validar o token (assinatura, `iss`, `aud`, `exp`) e usar o `sub` para identificar a conta antes de responder.

## Resposta

O endpoint deve retornar, no mínimo, os seguintes campos:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `sub` | string | Sim | Identificador único do usuário |
| `email` | string | Sim | E-mail (ou outro identificador de contato) |
| `name` | string | Não | Nome de exibição do usuário |
| `merchants` | array | Sim | Lista de ids de lojas que o usuário pode acessar |
| `profile_permissions` | object | Sim | Perfil e roles de acesso da conta |

### `merchants`

Lista **mínima de ids** de lojas para authz rápida no MCP. O `id` de cada item corresponde ao `merchant_id` do contrato de [Lojas](merchants.md):

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | Sim | Identificador da loja |

Para catálogo rico (nome, endereço, CNPJ, `external_ids`) e UI de seleção, use `GET /merchants` — veja [Relação com `/merchants`](#relacao-com-merchants).

### `profile_permissions`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `profile` | object | Sim | Perfil do usuário (`id` e `name`) |
| `resource_access` | object | Sim | Permissões por aplicação |

### Exemplo de resposta

```json
{
    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Maria Exemplo",
    "email": "maria@exemplo.com.br",
    "merchants": [
        { "id": "80727f01-5fa7-42d7-8735-9f0e847ff78c" },
        { "id": "2262aeff-9ea3-4314-a4a1-86f9fb57cbe1" }
    ],
    "profile_permissions": {
        "profile": { "id": 1006, "name": "Admin" },
        "resource_access": {
            "sua-aplicacao": {
                "permissions": ["VIEW_MENU", "EDIT_MENU"]
            }
        }
    }
}
```

## Relação com `/merchants`

| Fonte | Conteúdo | Uso típico |
|---|---|---|
| `userinfo.merchants` | Ids mínimos | MCP: checagem rápida de escopo na tool |
| `GET /merchants` | Catálogo rico | Plataforma: picker, bind, perfil de negócio; MCP: tool `listar_lojas` (fallback) |

## Responsabilidades

| Responsabilidade | Quem faz |
|---|---|
| Expor o endpoint de userinfo | Organization (authorization server / IdP) |
| Chamar o userinfo e obter o contexto de permissão | MCP |
| Determinar o perfil/roles de acesso a partir do userinfo | MCP |
| Consumir o payload completo de userinfo em toda chamada | **Não** é papel da plataforma |
| Resumo de identidade na UI (`sub`, `name`, `email`), se necessário | Plataforma (opcional) |
