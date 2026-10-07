# Requisitos do OAuth para integração no Toqan

> Público: empresas que querem integrar seu MCP/dados ao Toqan e precisam construir o **authorization server** (OAuth) do lado delas.
> O que você entrega: o authorization server pronto + as informações de configuração que serão passadas ao time do Toqan.

## Visão geral

A sua empresa constrói e opera um **authorization server** (OAuth 2.0) que autentica os usuários e emite tokens. O Toqan atua como *client* desse authorization server: descobre os endpoints, conduz o usuário pelo fluxo de autorização e guarda o token resultante.

A autenticação e a emissão de token são responsabilidade da sua empresa; a configuração no Toqan é feita por nós, a partir das informações que você fornecer.

## O que o seu authorization server precisa suportar

### 1. Metadados de descoberta (RFC 8414)

Expor um documento de metadados (ex.: `/.well-known/oauth-authorization-server`) com, no mínimo:

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
| `registration_endpoint` | Opcional | Só se quiser suportar DCR |

### 2. Authorization code + PKCE

- Grant: **authorization code**.
- **PKCE** obrigatório (método `S256`), com `code_challenge` e `code_verifier`.
- Emitir **refresh token** junto com o access token.

### 3. Validar o token em toda chamada

O seu servidor deve validar o token em **toda** chamada e responder `401` quando o token for inválido ou expirado. É isso que permite o mecanismo de refresh/re-autorização funcionar corretamente.

## Informações que você precisa fornecer ao time do Toqan

Para configurarmos a integração, precisamos de:

- **URL do authorization server** — o `.well-known` / metadados (ou os endpoints equivalentes, se não houver metadados).
- **Client ID** e **Client Secret** — credenciais do client que o Toqan usará; ou suporte a **DCR (Dynamic Client Registration)** para registro automático.
- **Escopos (scopes)** que devem ser solicitados no fluxo.
- **Token por usuário** — nesta integração usamos token por usuário (cada usuário tem o próprio token, para autorização por loja/recurso).

## Responsabilidades

| Responsabilidade | Quem faz |
|---|---|
| Construir/operar o authorization server | **Sua empresa** |
| Publicar metadados RFC 8414 | **Sua empresa** |
| Autenticar o usuário e emitir tokens | **Sua empresa** |
| Autorização por loja/recurso (usando o token) | **Sua empresa (seu MCP/API)** |
| Descoberta do authorization server | Toqan |
| Guardar/criptografar o token | Toqan |
| Injetar `Authorization: Bearer` e refresh | Toqan |
