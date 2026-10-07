# Como construir um MCP com OAuth para integrar no Toqan

> Público: quem vai construir (ou adaptar) um servidor MCP que será consumido pelo Toqan e precisa autenticar via OAuth.
> Escopo deste doc: o lado do **servidor MCP** e do que ele precisa expor para o Toqan conseguir autenticar e injetar o token.

## Visão geral

O Toqan **não guarda a lista de lojas/recursos que o usuário pode acessar**. Ele é o transportador do token do usuário. O fluxo é:

1. O Toqan descobre o authorization server do MCP (via metadados).
2. O usuário completa o fluxo de autorização (authorization code + PKCE).
3. O Toqan guarda o access token (e o refresh token) do usuário, criptografado.
4. A cada chamada de tool, o Toqan injeta `Authorization: Bearer <access_token>`.
5. **O seu MCP/API** usa esse token para decidir quais lojas/recursos o usuário pode acessar e responde somente isso.

Ou seja: a autorização por loja/recurso **vive no seu servidor**, não no Toqan.

## O que o seu MCP precisa expor

### 1. Metadados de recurso protegido (RFC 8414 / RFC 9728)

O Toqan faz a descoberta em duas etapas: primeiro descobre a lista de authorization servers (`authorization_servers[]`) e os `scopes_supported` a partir da URL do MCP (ou de um spec OpenAPI/discovery/cubejs); depois baixa o `.well-known` do authorization server e lê os endpoints.

Para o fluxo funcionar sem digitação manual, o authorization server deve publicar o documento de metadados de servidor de autorização (ex.: `/.well-known/oauth-authorization-server`), contendo no mínimo:

- `issuer`
- `authorization_endpoint`
- `token_endpoint`
- `scopes_supported`
- `response_types_supported`
- `grant_types_supported`
- `token_endpoint_auth_methods_supported`
- `code_challenge_methods_supported`
- `registration_endpoint` (opcional — só se quiser suportar DCR)

Sem isso, a integração exige preencher os endpoints manualmente nas "opções avançadas" da UI.

### 2. Grant de authorization code + PKCE

O fluxo de autorização usa o grant de **authorization code** com **PKCE** (não confundir com client credentials, que é outro grant).

Pontos obrigatórios no seu authorization server:

- Suportar PKCE (`S256`), incluindo `code_challenge` / `code_verifier`.
- Emitir **refresh token** além do access token.

### 3. Injeção do token nas chamadas

O Toqan é responsável por orquestrar o fluxo (iniciar autorização, processar o callback, armazenar o token, refresh e revogação). Do seu lado, o que importa é:

- A cada request, o Toqan injeta o header `Authorization: Bearer <access_token>`.
- Se o seu servidor responder `401`, o Toqan tenta um refresh e reexecuta a chamada uma única vez.
- Se ainda receber `401`, devolve erro de autenticação e o usuário precisa re-autorizar.

Isso significa que o seu servidor MCP **deve validar o token em toda chamada** e responder `401` quando o token for inválido/expirado, para o mecanismo de refresh/re-auth do Toqan funcionar corretamente.

## Escopo de credenciais: por usuário vs. compartilhado

O servidor MCP tem um campo `credential_scope` com dois valores:

- **`user`** — cada usuário tem o próprio token. O Toqan guarda o token por usuário. Este é o modo que você quer para "token do usuário" / "lojas que o usuário pode acessar".
- **`global`** (padrão) — um único token/credencial vale para todos.

Para o caso de "listar lojas com o token do usuário", configure `credential_scope: user`.
