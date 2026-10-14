# Como construir um MCP com OAuth

!!! info "Público"
    Quem vai construir (ou adaptar) um servidor MCP que será consumido pela plataforma e precisa autenticar via OAuth.

    Escopo deste doc: o lado do servidor MCP e o que ele precisa expor para a plataforma conseguir autenticar e injetar o token.

## Visão geral

A plataforma não guarda a lista de lojas/recursos que o usuário pode acessar. Ela é o transportador do token do usuário. O fluxo é:

1. A plataforma descobre o authorization server do MCP (via metadados).
2. O usuário completa o fluxo de autorização (authorization code + PKCE).
3. A plataforma guarda o access token (e o refresh token) do usuário, criptografado.
4. A cada chamada de tool, a plataforma injeta `Authorization: Bearer <access_token>`.
5. O seu MCP/API usa esse token para decidir quais lojas/recursos o usuário pode acessar e responde somente isso.

A autorização por loja/recurso vive no seu servidor, não na plataforma.

## O que o seu MCP precisa expor

### 1. Metadados do recurso protegido (RFC 9728)

A descoberta acontece em **dois estágios**. Primeiro a plataforma descobre o **recurso protegido** (o seu MCP/API) via RFC 9728; só depois, a partir da lista de authorization servers publicada ali, ela busca os metadados do authorization server (RFC 8414). Ou seja, o documento do recurso protegido é o ponto de entrada da autenticação.

O documento de metadados do recurso protegido deve ser publicado em `/.well-known/oauth-protected-resource` com, no mínimo:

| Campo | Obrigatório? | Observação |
|---|---|---|
| `resource` | Sim | Identificador canônico do recurso protegido (a URL do MCP) |
| `authorization_servers` | Sim | Lista não vazia de authorization servers do recurso |

Se o endpoint direto não estiver disponível, a plataforma faz um request sem token para o MCP. Uma resposta `401` com o header `WWW-Authenticate: Bearer resource_metadata="..."` é esperada e serve como sinal de descoberta (não é um erro de integração). A plataforma então busca a URL indicada. Se não houver nem endpoint direto nem `resource_metadata`, a autodescoberta não é possível.

Com FastMCP, o `RemoteAuthProvider` publica esse documento automaticamente (veja o exemplo no final desta página).

### 2. Grant de authorization code + PKCE

O fluxo de autorização usa o grant de **authorization code** com **PKCE** (não confundir com client credentials, que é outro grant).

Requisitos obrigatórios no seu authorization server:

- Suporte a PKCE (`S256`), incluindo `code_challenge` e `code_verifier`.
- Emissão de **refresh token** junto com o access token.

### 3. Contrato de validação do token

A plataforma orquestra o fluxo completo: inicia a autorização, processa o callback, armazena o token, faz refresh e revogação. Do seu lado, o que importa é:

- A cada request, a plataforma injeta o header `Authorization: Bearer <access_token>`.
- Se o seu servidor responder `401`, a plataforma tenta um refresh e reexecuta a chamada uma única vez.
- Se ainda receber `401`, devolve erro de autenticação e o usuário precisa re-autorizar.

O seu servidor MCP deve validar o token em toda chamada e responder `401` quando ele for inválido ou expirado. É esse comportamento que aciona o mecanismo de refresh da plataforma.

Para o MCP validar o token como JWT, o authorization server precisa garantir a compatibilidade:

- Publicar o `jwks_uri` (as chaves públicas de assinatura do token).
- Emitir tokens com `issuer` e `audience` consistentes com o que o MCP espera.
- Garantir que o `iss` do token corresponda ao `issuer` do metadata (RFC 8414).

## Escopo de credenciais: por usuário vs. compartilhado

O servidor MCP tem um campo `credential_scope` com dois valores:

- **`user`**: cada usuário tem o próprio token. Use este modo para "token do usuário" / "lojas que o usuário pode acessar".
- **`global`** (padrão): um único token vale para todos os usuários.

Para listar lojas com o token do usuário, configure `credential_scope: user`.

## Exemplos por linguagem

Os exemplos abaixo são ilustrativos e focados no contrato do MCP: publicar o RFC 9728, validar o `Authorization: Bearer` e responder `401` corretamente.

### Python (FastMCP)

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

### Go (ilustrativo)

Exemplo conceitual em Go, cobrindo apenas o que o MCP precisa expor e validar (sem dependência de lib específica):

```go
// 1. Publicar o metadata do recurso protegido (RFC 9728)
mux.HandleFunc("/.well-known/oauth-protected-resource", func(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]any{
        "resource":              "https://seu-mcp.com",
        "authorization_servers": []string{"https://auth.suaempresa.com"},
    })
})

// 2. Validar o JWT em toda chamada protegida (jwks_uri + issuer + audience)
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

        claims, err := validateJWT(token)
        if err != nil {
            w.Header().Set("WWW-Authenticate", `Bearer resource_metadata="https://seu-mcp.com/.well-known/oauth-protected-resource"`)
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }

        ctx := context.WithValue(r.Context(), claimsKey{}, claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

!!! note
    Outras linguagens seguem o mesmo contrato: publicar o RFC 9728, validar o `Authorization: Bearer` e responder `401` quando o token for inválido ou expirado.

As credenciais `client_id`/`client_secret` não entram aqui. O client OAuth é a plataforma (veja os [requisitos do OAuth](oauth-requirements.md)). O MCP server valida o token via JWKS ou, se preferir, via introspection.
