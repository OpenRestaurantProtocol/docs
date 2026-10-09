# Requisitos do OAuth para integração

> Público: empresas que querem integrar seu MCP/dados à plataforma e precisam construir o authorization server (OAuth) do lado delas.
> O que você entrega: o authorization server pronto, um endpoint de userinfo e as informações de configuração passadas à plataforma.

## Visão geral

A sua empresa constrói e opera um **authorization server** (OAuth 2.0 / OIDC) que autentica os usuários e emite tokens. A plataforma atua como *client* desse authorization server: descobre os endpoints, conduz o usuário pelo fluxo de autorização e guarda o token resultante. De posse do token, a plataforma consulta o seu endpoint de **userinfo** para descobrir a identidade, as lojas e o perfil de acesso da conta.

A autenticação, a emissão de token e o fornecimento do userinfo são responsabilidade da sua empresa. A configuração na plataforma é feita por nós, a partir das informações que você fornecer.

## O que você precisa fornecer

> Para o fluxo completo de descoberta (RFC 8414, RFC 9728 e Dynamic Client Registration), veja a página de [Discovery](discovery.md).

### 1. Authorization code + PKCE

- Grant: **authorization code**.
- **PKCE** obrigatório (método `S256`), com `code_challenge` e `code_verifier`.
- Emita **refresh token** junto com o access token.

### 2. Endpoint de userinfo (OIDC)

Além de emitir tokens, você precisa expor um endpoint de **userinfo** (OIDC). É com ele que a plataforma recupera a identidade do usuário e, principalmente, a lista de **lojas** e o **perfil/roles de acesso** da conta.

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

> É a partir da lista de lojas e do perfil/roles que a plataforma determina quais lojas o usuário pode acessar. A validação do token e a consulta ao userinfo são responsabilidade da plataforma; você só precisa expor o endpoint.

### 3. Credenciais do client

No fluxo de authorization code, o **client OAuth é a plataforma**, não o seu serviço. Para que a plataforma consiga se autenticar, existem dois caminhos: DCR (recomendado) e registro manual.

> O registro automático via Dynamic Client Registration (DCR) está detalhado na página de [Discovery](discovery.md).

#### Alternativa: registro manual

Se o seu authorization server não suportar DCR, registre a plataforma como client no seu IdP e nos envie:

- **`client_id`** e **`client_secret`** (o `client_secret` é obrigatório no fluxo típico com client confidencial).
- **URL de callback/redirect**: essa URL é fixa por ambiente da plataforma. Solicite o valor ao time da plataforma antes de registrar o client no seu IdP. Sem esse registro, o redirect do fluxo de autorização falha.

## Informações que você precisa fornecer

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
| Descoberta do authorization server | Plataforma |
| Guardar e criptografar o token | Plataforma |
| Consultar o userinfo e determinar lojas/perfil de acesso | Plataforma |
| Injetar `Authorization: Bearer` e fazer refresh | Plataforma |
