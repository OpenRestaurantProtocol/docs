# Como construir um MCP com OAuth

> Público: quem vai construir (ou adaptar) um servidor MCP que será consumido pela plataforma e precisa autenticar via OAuth.
> Escopo deste doc: o lado do servidor MCP e o que ele precisa expor para a plataforma conseguir autenticar e injetar o token.

## Visão geral

A plataforma não guarda a lista de lojas/recursos que o usuário pode acessar. Ela é o transportador do token do usuário. O fluxo é:

1. A plataforma descobre o authorization server do MCP (via metadados).
2. O usuário completa o fluxo de autorização (authorization code + PKCE).
3. A plataforma guarda o access token (e o refresh token) do usuário, criptografado.
4. A cada chamada de tool, a plataforma injeta `Authorization: Bearer <access_token>`.
5. O seu MCP/API usa esse token para decidir quais lojas/recursos o usuário pode acessar e responde somente isso.

A autorização por loja/recurso vive no seu servidor, não na plataforma.

## O que o seu MCP precisa expor

> Para o detalhamento completo dos metadados RFC 8414 (authorization server) e RFC 9728 (protected resource), veja a página de [Discovery](discovery.md).

### 1. Grant de authorization code + PKCE

O fluxo de autorização usa o grant de **authorization code** com **PKCE** (não confundir com client credentials, que é outro grant).

Requisitos obrigatórios no seu authorization server:

- Suporte a PKCE (`S256`), incluindo `code_challenge` e `code_verifier`.
- Emissão de **refresh token** junto com o access token.

### 2. Contrato de validação do token

A plataforma orquestra o fluxo completo: inicia a autorização, processa o callback, armazena o token, faz refresh e revogação. Do seu lado, o que importa é:

- A cada request, a plataforma injeta o header `Authorization: Bearer <access_token>`.
- Se o seu servidor responder `401`, a plataforma tenta um refresh e reexecuta a chamada uma única vez.
- Se ainda receber `401`, devolve erro de autenticação e o usuário precisa re-autorizar.

O seu servidor MCP deve validar o token em toda chamada e responder `401` quando ele for inválido ou expirado. É esse comportamento que aciona o mecanismo de refresh da plataforma.

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

As credenciais `client_id`/`client_secret` não entram aqui. O client OAuth é a plataforma (veja os [requisitos do OAuth](oauth-requirements.md)). O MCP server valida o token via JWKS ou, se preferir, via introspection.
