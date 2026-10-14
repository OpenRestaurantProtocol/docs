# Requisitos do OAuth para integração

!!! info "Público"
    Empresas que querem integrar seu MCP/dados à plataforma e precisam construir o authorization server (OAuth) do lado delas.

    O que esta página responde: **o que o seu OAuth precisa ter para conseguir conectar à plataforma.**

## Resumo rápido

Para integrar, você vai precisar de:

- Um **authorization server** (OAuth 2.0 / OIDC) com metadados **RFC 8414**.
- Suporte a **authorization code + PKCE** e emissão de **refresh token**.
- Um endpoint de **userinfo** (OIDC) com identidade e perfil/roles.
- Se houver **MCP**: metadados do recurso protegido (**RFC 9728**).
- (Opcional) **DCR** (RFC 7591) para registro automático do client.

## Visão geral

A sua empresa constrói e opera um **authorization server** (OAuth 2.0 / OIDC) que autentica os usuários e emite tokens. A plataforma atua como *client* desse authorization server: descobre os endpoints, conduz o usuário pelo fluxo de autorização e guarda o token resultante. De posse do token, o **MCP** consulta o endpoint de **userinfo** do authorization server para descobrir a identidade e o perfil de acesso da conta.

Existem **dois caminhos** para conectar o seu OAuth à plataforma. Eles diferem apenas em *como* a plataforma obtém as informações. **Os requisitos do authorization server são os mesmos** nos dois casos. A base obrigatória está na seção [O que é igual nos dois caminhos](#o-que-e-igual-nos-dois-caminhos).

## Glossário rápido

| Termo | Significado |
|---|---|
| `issuer` | Identificador do authorization server |
| `resource` | Identificador do MCP / recurso protegido |
| PRM | Protected Resource Metadata (RFC 9728) — metadados do recurso protegido |
| DCR | Dynamic Client Registration (RFC 7591) — registro automático do client |
| userinfo | Endpoint OIDC que retorna identidade e perfil do usuário |
| callback URL | URL de redirecionamento para onde o browser volta após o login |

## O que é igual nos dois caminhos

Independente do caminho escolhido, estes requisitos são obrigatórios. Estão organizados por onde cada um é implementado:

### No authorization server — authorization code + PKCE

- Grant: **authorization code**.
- **PKCE** obrigatório (método `S256`), com `code_challenge` e `code_verifier`.
- Emitir **refresh token** junto com o access token.

### No authorization server / IdP — endpoint de userinfo (OIDC)

O OAuth por si só entrega um token, mas **não** responde "quem é esse usuário" nem "o que ele pode acessar". Isso é papel do **userinfo** (OpenID Connect). O authorization server deve expor um endpoint de **userinfo** que retorna, no mínimo:

- `sub`: identificador único do usuário.
- `email` (ou outro identificador de contato).
- Perfil e roles de acesso da conta.

A plataforma usa o userinfo como **contexto de autorização**: é a partir dele que se determina quais lojas/recursos o usuário pode acessar. O contrato completo (request com `Authorization: Bearer`, exemplo de resposta e responsabilidades) está na página [Userinfo (OIDC)](../authz/userinfo.md).

!!! info
    A lista de lojas que o usuário pode acessar é um dado de domínio, não identidade. Veja [Lojas](../authz/merchants.md).

## Caminho 1 — Autodescoberta (recomendado)

Nesse caminho, o seu authorization server **publica metadados** e a plataforma descobre os endpoints automaticamente. Você não precisa configurar endpoints manualmente.

### 1. Metadados do authorization server (RFC 8414) — sempre

O authorization server publica um documento de metadados derivado do `issuer`. Na descoberta, você pode informar a URL base do authorization server (o `issuer`, ex.: `https://auth.suaempresa.com`) ou a URL do documento diretamente. A partir do `issuer`, a plataforma deriva o caminho:

```
https://auth.suaempresa.com/.well-known/oauth-authorization-server
```

!!! info "OpenID Connect"
    Providers OpenID Connect podem ser descobertos pelo caminho alternativo `/.well-known/openid-configuration`, que a plataforma também aceita.

Com, no mínimo, os seguintes campos:

| Campo | Obrigatório? | Observação |
|---|---|---|
| `issuer` | Sim | Identificador do servidor de autorização |
| `authorization_endpoint` | Sim | Endpoint de autorização (authorization code) |
| `token_endpoint` | Sim | Endpoint de troca de code por token |
| `revocation_endpoint` | Opcional | Endpoint de revogação de token (RFC 7009) |
| `scopes_supported` | Recomendado | Lista de scopes aceitos (ex.: `openid`, `profile`, `menus:read`) |
| `response_types_supported` | Sim | Deve incluir `code` |
| `grant_types_supported` | Sim | Deve incluir `authorization_code` (e `refresh_token`) |
| `token_endpoint_auth_methods_supported` | Sim | Ex.: `client_secret_basic`, `client_secret_post`, `none` (para clientes públicos/PKCE) |
| `code_challenge_methods_supported` | Sim | Deve incluir `S256` (PKCE) |
| `registration_endpoint` | Opcional | Necessário somente se quiser suportar DCR |

Exemplo de conteúdo:

```json
{
  "issuer": "https://auth.suaempresa.com",
  "authorization_endpoint": "https://auth.suaempresa.com/oauth/authorize",
  "token_endpoint": "https://auth.suaempresa.com/oauth/token",
  "registration_endpoint": "https://auth.suaempresa.com/oauth/register",
  "scopes_supported": ["openid", "profile", "menus:read"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic"],
  "code_challenge_methods_supported": ["S256"]
}
```

!!! info "Quem acessa e quando"
    Esse documento é acessado pela **plataforma**, uma única vez na descoberta (e guardado em cache). O usuário final **não** acessa esse caminho diretamente. No login, o browser é redirecionado para o `authorization_endpoint` que a plataforma já descobriu.

### 2. Metadados do recurso protegido (RFC 9728) — somente se houver MCP

Se a integração envolve um **MCP**, o MCP publica um documento de metadados do recurso protegido em `/.well-known/oauth-protected-resource`, apontando para o authorization server. A plataforma usa isso para descobrir automaticamente **qual** authorization server protege aquele MCP, sem que você precise informar a URL manualmente ao cadastrar o MCP.

| Campo | Obrigatório? | Observação |
|---|---|---|
| `resource` | Sim | Identificador canônico do recurso protegido (a URL do MCP). O host raiz (`/`) cobre qualquer path do mesmo host; um path específico não cobre subpaths arbitrários |
| `authorization_servers` | Sim | Lista não vazia de authorization servers do recurso |

Se esse endpoint não estiver disponível, a plataforma pode obter o metadata a partir do header `WWW-Authenticate: resource_metadata=...` retornado em respostas `401`. Se nenhum dos dois estiver presente, a plataforma não consegue descobrir o authorization server a partir do MCP. Nesse caso, informe a URL do authorization server manualmente.

!!! tip "FastMCP"
    Com FastMCP, o `RemoteAuthProvider` publica esse documento automaticamente. Veja [Como construir um MCP com OAuth](mcp-oauth.md).

### 3. Dynamic Client Registration (RFC 7591) — recomendado para as credenciais

Se o authorization server expuser `registration_endpoint` (RFC 7591) e suportar **Dynamic Client Registration (DCR)**, a plataforma se auto-registra como client e obtém `client_id`/`client_secret` sem nenhuma troca manual de credenciais. No DCR, a plataforma também informa seus próprios `redirect_uris` no payload de registro, então você não precisa fazer o allowlist manual da URL de callback.

**Sem DCR** (registro manual):

- Publicar metadata RFC 8414 + expor `/userinfo`.
- Entregar `client_id`/`client_secret` manualmente.
- Fazer o allowlist manual da URL de callback no IdP.

**Com DCR** (recomendado):

- Publicar metadata RFC 8414 + `registration_endpoint` + expor `/userinfo`.
- A plataforma registra o client automaticamente (credenciais + `redirect_uris`). Nada a trocar manualmente.

!!! note
    O DCR **não** elimina a necessidade de publicar metadata e userinfo. Ele só automatiza as credenciais do client e o allowlist da callback. O DCR só é possível se o seu IdP expuser o `registration_endpoint` (RFC 7591); sem ele, use o registro manual.

## Caminho 2 — Configuração manual

Quando a autodescoberta não é possível (por exemplo, o MCP não publica os metadados, ou é preciso usar um client já registrado), você entrega explicitamente as informações de OAuth. Você precisa fornecer:

- **Endpoints do authorization server**: `authorization_endpoint` e `token_endpoint` (e `revocation_endpoint`, se houver).
- **`client_id`** e **`client_secret`** (o `client_secret` é obrigatório no fluxo típico com client confidencial).
- **URL de callback/redirect**: veja o bloco abaixo.
- **Escopos (scopes)** que devem ser solicitados no fluxo (não há um conjunto fixo; você define os seus; ex.: `openid`, `profile`, `menus:read`).

!!! warning "URL de callback (redirect_uri)"
    A URL de callback **não é inventada por você**. Ela é fornecida pela plataforma (é fixa por ambiente). Você deve:

    1. Obter a URL de callback da plataforma.
    2. Cadastrá-la nas URIs de redirecionamento permitidas do seu IdP (allowlist).
    3. Sem esse cadastro, o redirect do fluxo de autorização **falha**.

    No fluxo com DCR, essa etapa é automática (a plataforma informa os `redirect_uris` no registro).

A configuração na plataforma é feita por nós, a partir das informações que você fornecer. [Entre em contato](#) para dar início à integração.

## Regras de validação

Algumas regras operacionais fazem a descoberta falhar se não forem cumpridas. Antes de publicar, garanta:

- **HTTPS obrigatório**: os documentos de metadados (RFC 8414 e RFC 9728) devem ser servidos por **HTTPS** (a RFC 8414 exige o scheme `https`). HTTP simples não é aceito para descoberta.
- **`issuer` consistente**: o valor de `issuer` no metadata deve ser **idêntico** ao identificador usado para buscar o documento (RFC 8414 §3.3), ou compartilhar o **mesmo domínio registrável** (ex.: `mcp.exemplo.com` e `auth.exemplo.com`). Um `issuer` em domínio totalmente diferente faz a descoberta falhar (previne ataques de mix-up).
- **`resource` cobre a URL real**: no metadata do recurso protegido (RFC 9728), o `resource` deve cobrir a URL do MCP. O host raiz cobre qualquer path do mesmo host; um path específico não cobre subpaths arbitrários.

## O que não é suportado

- Apenas o grant **authorization code + PKCE** é usado para autenticação de usuário. Grants como `client_credentials` não fazem parte deste fluxo.
- Sem metadados de descoberta **e** sem DCR, a configuração manual é obrigatória.

## Checklist de validação antes da integração

Antes de tentar conectar, confirme cada item:

- [ ] `GET /.well-known/oauth-protected-resource` retorna `resource` e `authorization_servers` (se houver MCP).
- [ ] `GET /.well-known/oauth-authorization-server` retorna os campos obrigatórios da RFC 8414.
- [ ] O `issuer` do metadata coincide com o identificador usado para buscar o documento, ou compartilha o mesmo domínio registrável.
- [ ] `code_challenge_methods_supported` contém `S256`.
- [ ] O fluxo emite **refresh token**.
- [ ] O `/userinfo` responde com identidade e perfil/roles.
- [ ] O fluxo testa PKCE (`code_challenge`/`code_verifier`).
- [ ] O refresh de token funciona (access token expirado → renovação via refresh token).
- [ ] Sem DCR: `client_id`/`client_secret` e a URL de callback foram registrados no IdP.
- [ ] Com DCR: `registration_endpoint` acessível e o registro de client é bem-sucedido.
- [ ] O MCP consegue validar o token (JWKS/`issuer`/`audience` compatíveis. Veja [Como construir um MCP com OAuth](mcp-oauth.md)).

## Troubleshooting

- **Descoberta falha (404 no `/.well-known`)**: confirme que o documento está em HTTPS e no caminho correto derivado do `issuer`.
- **`issuer` não bate**: o `issuer` do metadata precisa ser idêntico ao identificador usado na busca, ou compartilhar o mesmo domínio registrável (RFC 8414 §3.3).
- **Redirect falha**: a URL de callback não foi cadastrada no allowlist do IdP.
- **`401` no `/userinfo`**: o token apresentado não é válido, está expirado, ou o `aud` não corresponde ao esperado. Verifique `iss`, `aud` e a assinatura.
- **`audience` inválido no JWT**: o `aud` do token não bate com o que o MCP espera. Alinhe o `audience` do authorization server com o MCP.
- **`401` nas chamadas do MCP**: o token não é válido para o MCP. Verifique `iss`, `aud` e o `jwks_uri` do authorization server.

## Responsabilidades

| Responsabilidade | Quem faz |
|---|---|
| Construir/operar o authorization server | Sua empresa |
| Publicar metadados RFC 8414 (authorization server) | Sua empresa |
| Publicar protected resource metadata RFC 9728 (MCP) | Quem opera o MCP |
| Expor endpoint de userinfo (identidade + perfil/roles) | Sua empresa |
| Autenticar o usuário e emitir tokens | Sua empresa |
| Descoberta do authorization server (autodescoberta) | Plataforma |
| Guardar e criptografar o token | Plataforma |
| Consultar o endpoint de userinfo com o token e interpretar perfil/lojas | MCP |
| Injetar `Authorization: Bearer` e fazer refresh | Plataforma |

!!! note
    O authorization server e o MCP podem ser operados pela mesma empresa ou por empresas diferentes. O RFC 8414 e o userinfo são responsabilidade de quem opera o authorization server; o RFC 9728 é de quem opera o MCP.
