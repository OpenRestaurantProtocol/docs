# Requisitos do OAuth para integração no Toqan

> Público: empresas que querem integrar seu MCP/dados ao Toqan e precisam construir o authorization server (OAuth) do lado delas.
> O que você entrega: o authorization server pronto, um endpoint de userinfo e as informações de configuração passadas ao time do Toqan.

## Visão geral

A sua empresa constrói e opera um **authorization server** (OAuth 2.0 / OIDC) que autentica os usuários e emite tokens. O Toqan atua como *client* desse authorization server: descobre os endpoints, conduz o usuário pelo fluxo de autorização e guarda o token resultante. De posse do token, o Toqan consulta o seu endpoint de **userinfo** para descobrir a identidade, as lojas e o perfil de acesso da conta.

A autenticação, a emissão de token e o fornecimento do userinfo são responsabilidade da sua empresa. A configuração no Toqan é feita por nós, a partir das informações que você fornecer.

## O que você precisa fornecer

### 1. Metadados de descoberta (RFC 8414)

Para que o Toqan descubra seu authorization server automaticamente (sem configuração manual), exponha um documento de metadados (ex.: `/.well-known/oauth-authorization-server`) com, no mínimo:

| Campo | Obrigatório? | Observação |
|---|---|---|
| `issuer` | Sim | Identificador do servidor de autorização |
| `authorization_endpoint` | Sim | Endpoint de autorização (authorization code) |
| `token_endpoint` | Sim | Endpoint de troca de code por token |
| `scopes_supported` | Recomendado | Lista de scopes aceitos |
| `response_types_supported` | Sim | Deve incluir `code` |
| `grant_types_supported` | Sim | Deve incluir `authorization_code` (e `refresh_token`) |
| `token_endpoint_auth_methods_supported` | Sim | Ex.: `client_secret_basic`, `client_secret_post`, `none` (para clientes públicos/PKCE) |
| `code_challenge_methods_supported` | Sim | Deve incluir `S256` (PKCE) |
| `registration_endpoint` | Opcional | Necessário somente se quiser suportar DCR |

### 2. Authorization code + PKCE

- Grant: **authorization code**.
- **PKCE** obrigatório (método `S256`), com `code_challenge` e `code_verifier`.
- Emita **refresh token** junto com o access token.

### 3. Endpoint de userinfo (OIDC)

Além de emitir tokens, você precisa expor um endpoint de **userinfo** (OIDC). É com ele que o Toqan recupera a identidade do usuário e, principalmente, a lista de **lojas** e o **perfil/roles de acesso** da conta.

O endpoint deve retornar, no mínimo:

- `sub`: identificador único do usuário.
- `email` (ou outro identificador de contato).
- Lista de lojas que a conta acessa, cada uma com um identificador único (no exemplo abaixo, o campo se chama `merchants[]`, mas o nome pode variar conforme a implementação).
- Perfil e roles de acesso da conta.

Exemplo resumido:

```json
{
    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Maria Exemplo",
    "email": "maria@exemplo.com.br",
    "merchants": [
        { "id": "e5c8b9a0-1111-2222-3333-444455556666" },
        { "id": "e5c8b9a0-7777-8888-9999-000011112222" }
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

> É a partir de `merchants[]` e do perfil/roles que o Toqan determina quais lojas o usuário pode acessar. A validação do token e a consulta ao userinfo são responsabilidade do Toqan; você só precisa expor o endpoint.

### 4. Credenciais do client

No fluxo de authorization code, o **client OAuth é o Toqan**, não o seu serviço. Para que o Toqan consiga se autenticar, existem dois caminhos: DCR (recomendado) e registro manual.

#### Opção recomendada: Dynamic Client Registration (DCR)

Se o seu authorization server expuser `registration_endpoint` (RFC 7591) e suportar **Dynamic Client Registration (DCR)**, o Toqan se auto-registra como client e obtém `client_id`/`client_secret` sem nenhuma troca manual de credenciais.

#### Alternativa: registro manual

Se o seu authorization server não suportar DCR, registre o Toqan como client no seu IdP e nos envie:

- **`client_id`** e **`client_secret`** (o `client_secret` é obrigatório no fluxo típico com client confidencial).
- **URL de callback/redirect**: essa URL é fixa por ambiente do Toqan. Solicite o valor ao time do Toqan antes de registrar o client no seu IdP. Sem esse registro, o redirect do fluxo de autorização falha.

## Informações que você precisa fornecer ao time do Toqan

Para configurarmos a integração:

- **URL do authorization server** (`.well-known` / metadados, ou os endpoints equivalentes se não houver metadados).
- **URL do endpoint de userinfo** (se não estiver nos metadados).
- **Escopos (scopes)** que devem ser solicitados no fluxo (não há um conjunto fixo; você define os seus).
- Credenciais do client: via **DCR** (se suportado) ou **`client_id`/`client_secret`** registrados manualmente.

## Responsabilidades

| Responsabilidade | Quem faz |
|---|---|
| Construir/operar o authorization server | Sua empresa |
| Publicar metadados RFC 8414 | Sua empresa |
| Expor endpoint de userinfo (identidade + lojas + perfil/roles) | Sua empresa |
| Autenticar o usuário e emitir tokens | Sua empresa |
| Descoberta do authorization server | Toqan |
| Guardar e criptografar o token | Toqan |
| Consultar o userinfo e determinar lojas/perfil de acesso | Toqan |
| Injetar `Authorization: Bearer` e fazer refresh | Toqan |
