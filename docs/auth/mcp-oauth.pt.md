# Como construir um MCP com OAuth

!!! info "Público"
    A organização que vai construir (ou adaptar) um servidor MCP que será consumido pela plataforma e precisa autenticar via OAuth.

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

O servidor MCP expõe esse documento por meio de **um dos** dois mecanismos de descoberta definidos pela especificação de autorização do MCP:

- **Header `WWW-Authenticate`.** Em um request sem token, retorne uma resposta `401 Unauthorized` com um header `WWW-Authenticate` cujo parâmetro `resource_metadata` é a URL do documento de metadados (`WWW-Authenticate: Bearer resource_metadata="https://.../.well-known/oauth-protected-resource"`).
- **URI well-known.** Publique o documento na URI well-known aplicável `/.well-known/oauth-protected-resource`. Pode ser na raiz do host (`https://exemplo.com/.well-known/oauth-protected-resource`) ou no path do endpoint MCP (um MCP em `https://exemplo.com/public/mcp` hospeda os metadados em `https://exemplo.com/.well-known/oauth-protected-resource/public/mcp`).

O documento deve conter, no mínimo:

| Campo | Obrigatório? | Observação |
|---|---|---|
| `resource` | Obrigatório (RFC 9728) | Identificador canônico do recurso protegido (a URL do MCP, incluindo o path quando o MCP é servido sob um path) |
| `authorization_servers` | Opcional na RFC 9728; **obrigatório pela especificação de autorização do MCP** (ao menos uma entrada) | Lista não vazia de authorization servers do recurso |

**Ordem de fallback do cliente.** Do lado da plataforma:

1. Quando o header `WWW-Authenticate` contém um parâmetro `resource_metadata`, a plataforma usa a URL fornecida nesse parâmetro.
2. Quando não contém, a plataforma recorre à URI well-known — primeiro a URI do path do endpoint MCP (`https://exemplo.com/.well-known/oauth-protected-resource/public/mcp`), depois a URI raiz (`https://exemplo.com/.well-known/oauth-protected-resource`).

Com FastMCP, o `RemoteAuthProvider` publica esse documento automaticamente — incluindo a descoberta path-specific quando o endpoint MCP é montado sob um path (veja o exemplo no final desta página).

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

O lado do MCP server em Python usa [FastMCP](https://gofastmcp.com) com `RemoteAuthProvider`. O FastMCP publica os metadados do recurso protegido automaticamente — tanto na URI well-known raiz quanto na URI path-specific derivada do path de montagem do endpoint MCP (RFC 9728 §3.1) — e retorna o header `WWW-Authenticate: Bearer resource_metadata="..."` nas respostas `401`. Servido no path de montagem padrão `/mcp`, o servidor abaixo anuncia `resource: https://api.suaorganizacao.com/mcp`:

```python
from fastmcp import FastMCP
from fastmcp.server.auth import RemoteAuthProvider
from fastmcp.server.auth.providers.jwt import JWTVerifier
from pydantic import AnyHttpUrl

token_verifier = JWTVerifier(
    jwks_uri="https://auth.suaorganizacao.com/.well-known/jwks.json",
    issuer="https://auth.suaorganizacao.com",
    audience="seu-mcp-server",
)

auth = RemoteAuthProvider(
    token_verifier=token_verifier,
    authorization_servers=[AnyHttpUrl("https://auth.suaorganizacao.com")],
    base_url="https://api.suaorganizacao.com",
)

mcp = FastMCP(name="Lojas", auth=auth)
# Servido em /mcp por padrão: resource = https://api.suaorganizacao.com/mcp,
# com metadata em /.well-known/oauth-protected-resource e
# /.well-known/oauth-protected-resource/mcp.
```

### Go (ilustrativo)

Exemplo conceitual em Go, cobrindo apenas o que o MCP precisa expor e validar (sem dependência de lib específica). A rota well-known é registrada na URI path-specific para um MCP servido em `/mcp`:

```go
// 1. Publicar o metadata do recurso protegido (RFC 9728).
// O MCP é servido em /mcp, então o metadata é publicado na URI path-specific.
mux.HandleFunc("/.well-known/oauth-protected-resource/mcp", func(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]any{
        "resource":              "https://seu-mcp.com/mcp",
        "authorization_servers": []string{"https://auth.suaorganizacao.com"},
    })
})

// 2. Validar o JWT em toda chamada protegida (jwks_uri + issuer + audience)
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

        claims, err := validateJWT(token)
        if err != nil {
            // resource_metadata deve apontar para a mesma URI well-known acima.
            w.Header().Set("WWW-Authenticate", `Bearer resource_metadata="https://seu-mcp.com/.well-known/oauth-protected-resource/mcp"`)
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

## Checklist de implementação

- [ ] Os metadados do recurso protegido são detectáveis via o parâmetro `resource_metadata` do header `WWW-Authenticate` **ou** pela URI well-known (path-specific ou raiz).
- [ ] `resource` identifica o servidor MCP pela URL canônica, incluindo o path quando o MCP é servido sob um path.
- [ ] `authorization_servers` contém ao menos um authorization server.
- [ ] Endpoints protegidos retornam `401` com o header `WWW-Authenticate: Bearer resource_metadata="..."` quando o token está ausente ou inválido.
- [ ] Quando o endpoint MCP tem um componente de path, os metadados também são publicados na URI well-known path-specific (`/.well-known/oauth-protected-resource/<path>`), não apenas na raiz.
