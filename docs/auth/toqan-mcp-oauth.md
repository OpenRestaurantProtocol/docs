# Como construir um MCP com OAuth para integrar no Toqan

> Público: quem vai construir (ou adaptar) um servidor MCP que será consumido pelo Toqan e precisa autenticar via OAuth.
> Escopo deste doc: o lado do servidor MCP e o que ele precisa expor para o Toqan conseguir autenticar e injetar o token.

## Visão geral

O Toqan não guarda a lista de lojas/recursos que o usuário pode acessar. Ele é o transportador do token do usuário. O fluxo é:

1. O Toqan descobre o authorization server do MCP (via metadados).
2. O usuário completa o fluxo de autorização (authorization code + PKCE).
3. O Toqan guarda o access token (e o refresh token) do usuário, criptografado.
4. A cada chamada de tool, o Toqan injeta `Authorization: Bearer <access_token>`.
5. O seu MCP/API usa esse token para decidir quais lojas/recursos o usuário pode acessar e responde somente isso.

A autorização por loja/recurso vive no seu servidor, não no Toqan.

## O que o seu MCP precisa expor

### 1. Metadados de recurso protegido (RFC 8414 / RFC 9728)

O Toqan faz a descoberta a partir da URL do MCP (ou de um spec OpenAPI/discovery/cubejs): identifica a lista de authorization servers e os scopes suportados, depois baixa o `.well-known` do authorization server e lê os endpoints.

Para o fluxo funcionar sem configuração manual, o authorization server deve publicar o documento de metadados (ex.: `/.well-known/oauth-authorization-server`) com, no mínimo:

- `issuer`
- `authorization_endpoint`
- `token_endpoint`
- `scopes_supported`
- `response_types_supported`
- `grant_types_supported`
- `token_endpoint_auth_methods_supported`
- `code_challenge_methods_supported`
- `registration_endpoint` (opcional, necessário somente para suportar DCR)

### 2. Grant de authorization code + PKCE

O fluxo de autorização usa o grant de **authorization code** com **PKCE** (não confundir com client credentials, que é outro grant).

Requisitos obrigatórios no seu authorization server:

- Suporte a PKCE (`S256`), incluindo `code_challenge` e `code_verifier`.
- Emissão de **refresh token** junto com o access token.

### 3. Contrato de validação do token

O Toqan orquestra o fluxo completo: inicia a autorização, processa o callback, armazena o token, faz refresh e revogação. Do seu lado, o que importa é:

- A cada request, o Toqan injeta o header `Authorization: Bearer <access_token>`.
- Se o seu servidor responder `401`, o Toqan tenta um refresh e reexecuta a chamada uma única vez.
- Se ainda receber `401`, devolve erro de autenticação e o usuário precisa re-autorizar.

O seu servidor MCP deve validar o token em toda chamada e responder `401` quando ele for inválido ou expirado. É esse comportamento que aciona o mecanismo de refresh do Toqan.

## Escopo de credenciais: por usuário vs. compartilhado

O servidor MCP tem um campo `credential_scope` com dois valores:

- **`user`**: cada usuário tem o próprio token. Use este modo para "token do usuário" / "lojas que o usuário pode acessar".
- **`global`** (padrão): um único token vale para todos os usuários.

Para listar lojas com o token do usuário, configure `credential_scope: user`.

## Exemplo: MCP server em Python com FastMCP

O lado do MCP server em Python usa [FastMCP](https://gofastmcp.com) com `RemoteAuthProvider`, que publica o `/.well-known/oauth-protected-resource` (RFC 9728) automaticamente:

```python
from fastmcp import FastMCP
from fastmcp.server.auth import RemoteAuthProvider
from fastmcp.server.auth.providers.jwt import JWTVerifier
from pydantic import AnyHttpUrl

token_verifier = JWTVerifier(
    jwks_uri="https://auth.suaempresa.com/.well-known/jwks.json",
    issuer="https://auth.suaempresa.com",
    audience="seu-mcp-server",
)

auth = RemoteAuthProvider(
    token_verifier=token_verifier,
    authorization_servers=[AnyHttpUrl("https://auth.suaempresa.com")],
    base_url="https://api.suaempresa.com",
)

mcp = FastMCP(name="Lojas", auth=auth)
```

As credenciais `client_id`/`client_secret` não entram aqui. O client OAuth é o Toqan (veja os [requisitos do OAuth](toqan-oauth-requirements.md)). O MCP server valida o token via JWKS ou, se preferir, via introspection.
