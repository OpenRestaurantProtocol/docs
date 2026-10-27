# Requisitos do OAuth para integração

!!! info "Público"
    Organizações que querem integrar seu MCP/dados à plataforma e precisam construir o authorization server (OAuth) do lado delas.

    O que esta página responde: **o que o seu OAuth precisa ter para conseguir conectar à plataforma.**

## Resumo rápido

Para integrar, você vai precisar de:

- Um **authorization server** (OAuth 2.0 / OIDC) com metadados **RFC 8414**.
- Suporte a **authorization code + PKCE** e emissão de **refresh token**.
- Um endpoint de **userinfo** (OIDC) com identidade e perfil/roles.
- Um endpoint **`GET /merchants`** com o catálogo de lojas do token.
- Se houver um **MCP HTTP protegido por OAuth**: metadados do recurso protegido (**RFC 9728**) são obrigatórios.
- (Recomendado) **DCR** (RFC 7591) para registro automático do client.

## Visão geral

A sua organização constrói e opera um **authorization server** (OAuth 2.0 / OIDC) que autentica os usuários e emite tokens. A plataforma atua como *client* desse authorization server: descobre os endpoints, conduz o usuário pelo fluxo de autorização e guarda o token resultante. De posse do token, o **MCP** consulta o endpoint de **userinfo** do authorization server para descobrir a identidade e o perfil de acesso da conta.

Existem **três papéis** neste fluxo:

- **Servidor MCP** — o recurso protegido. Publica seus **Metadados do Recurso Protegido** (RFC 9728), que identificam o(s) authorization server(s) que o protegem.
- **Authorization server** — publica os **próprios** metadados (RFC 8414) com endpoints e capacidades (`authorization_endpoint`, `token_endpoint`, `response_types_supported`, `grant_types_supported`).
- **Cliente / plataforma** — descobre essa relação automaticamente e conclui o fluxo OAuth.

A integração padrão usa **autodescoberta**. A base obrigatória está na seção [Requisitos obrigatórios](#requisitos-obrigatorios).

## Glossário rápido

| Termo | Significado |
|---|---|
| `issuer` | Identificador do authorization server |
| `resource` | Identificador do MCP / recurso protegido |
| PRM | Protected Resource Metadata (RFC 9728) — identifica o recurso e seu(s) authorization server(s) |
| DCR | Dynamic Client Registration (RFC 7591) — registro automático do client |
| userinfo | Endpoint OIDC que retorna identidade e perfil do usuário |
| callback URL | URL de redirecionamento para onde o browser volta após o login |

## Requisitos obrigatórios

Estes requisitos são obrigatórios em toda integração. Estão organizados por onde cada um é implementado:

### No authorization server — authorization code + PKCE

- Grant: **authorization code**.
- **PKCE** obrigatório (método `S256`), com `code_challenge` e `code_verifier`.
- Emitir **refresh token** junto com o access token.

### No authorization server / IdP — endpoint de userinfo (OIDC)

O OAuth por si só entrega um token, mas **não** responde "quem é esse usuário" nem "o que ele pode acessar". Isso é papel do **userinfo** (OpenID Connect). O authorization server deve expor um endpoint de **userinfo** que retorna, no mínimo:

- `sub`: identificador único do usuário.
- `email` (ou outro identificador de contato).
- Perfil e roles de acesso da conta.

O **MCP** usa o userinfo como **contexto de autorização** nas tool calls (identidade + perfil/roles). A **plataforma** usa `GET /merchants` no connect para seleção de loja e perfil de negócio da conta — não precisa do payload completo de userinfo. O contrato completo de userinfo está na página [Userinfo (OIDC)](../authz/userinfo.md).

### No authorization server — endpoint de lojas (`GET /merchants`)

A lista de lojas que o usuário pode acessar é um **dado de domínio**, não identidade. O authorization server deve expor `GET /merchants` com o catálogo rico (nome, endereço, CNPJ, `external_ids`, etc.). Contrato completo: [Lojas](../authz/merchants.md).

## Descoberta OAuth

No fluxo padrão, o seu authorization server **publica metadados** e a plataforma descobre os endpoints automaticamente. Você não precisa configurar endpoints manualmente.

### 1. Metadados do authorization server (RFC 8414) — sempre

O authorization server publica um documento de metadados derivado do `issuer`. Na descoberta, você pode informar a URL base do authorization server (o `issuer`, ex.: `https://auth.suaorganizacao.com`) ou a URL do documento diretamente. A partir do `issuer`, a plataforma deriva o caminho:

```
https://auth.suaorganizacao.com/.well-known/oauth-authorization-server
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
| `registration_endpoint` | Recomendado | Necessário somente se quiser suportar DCR — evita troca manual de credenciais e cadastro manual da callback |

Exemplo de conteúdo:

```json
{
  "issuer": "https://auth.suaorganizacao.com",
  "authorization_endpoint": "https://auth.suaorganizacao.com/oauth/authorize",
  "token_endpoint": "https://auth.suaorganizacao.com/oauth/token",
  "registration_endpoint": "https://auth.suaorganizacao.com/oauth/register",
  "scopes_supported": ["openid", "profile", "menus:read"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic"],
  "code_challenge_methods_supported": ["S256"]
}
```

!!! info "Quem acessa e quando"
    Esse documento é acessado pela **plataforma**, uma única vez na descoberta (e guardado em cache). O usuário final **não** acessa esse caminho diretamente. No login, o browser é redirecionado para o `authorization_endpoint` que a plataforma já descobriu.

### 2. Metadados do Recurso Protegido (RFC 9728) — obrigatório para servidores MCP HTTP protegidos por OAuth

Para um MCP protegido por OAuth sobre HTTP, o servidor MCP publica seus **Metadados do Recurso Protegido** (RFC 9728). Esse documento descreve o recurso protegido e identifica o(s) authorization server(s); é o ponto de entrada da descoberta. A plataforma lê `authorization_servers` para saber **qual** authorization server protege aquele MCP.

!!! note "Metadados do recurso ≠ metadados do authorization server"
    O Metadado do Recurso Protegido descreve o recurso e aponta para o(s) authorization server(s). Ele **não** substitui os metadados do próprio authorization server. Endpoints e capacidades como `authorization_endpoint`, `token_endpoint`, `response_types_supported` e `grant_types_supported` são descobertos a partir dos metadados do authorization server (RFC 8414 / OpenID Connect Discovery), descritos na seção de metadados do authorization server acima.

**Campos:**

| Campo | Obrigatório? | Observação |
|---|---|---|
| `resource` | Obrigatório (RFC 9728) | URI canônica que identifica o recurso protegido (a URL do MCP). |
| `authorization_servers` | Opcional na RFC 9728; **obrigatório pela especificação de autorização do MCP** (ao menos uma entrada) | Lista de identificadores de issuer do authorization server. |
| `scopes_supported` | Recomendado (RFC 9728) | Scopes OAuth aceitos nas solicitações de autorização ao recurso. |
| `resource_name` | Recomendado (RFC 9728) | Nome legível do recurso para exibição. |
| `resource_documentation` | Opcional (RFC 9728) | URL da documentação do recurso para desenvolvedores. |
| `bearer_methods_supported` | Opcional (RFC 9728) | Métodos de envio de bearer token suportados (`header`, `body`, `query`). |

Exemplo mínimo:

```json
{
  "resource": "https://api.exemplo.com",
  "authorization_servers": [
    "https://auth.exemplo.com"
  ]
}
```

As URLs acima são ilustrativas — substitua pelas URLs reais do recurso e do authorization server.

**Fluxo de descoberta:**

1. O cliente MCP descobre os Metadados do Recurso Protegido usando o mecanismo de descoberta abaixo.
2. O cliente lê `authorization_servers` para identificar o authorization server.
3. O cliente descobre os metadados do authorization server (RFC 8414 / OpenID Connect Discovery).
4. O cliente usa os endpoints descobertos para concluir o fluxo OAuth.

O **servidor MCP** publica os Metadados do Recurso Protegido; o **authorization server** publica os próprios metadados.

**Mecanismos de descoberta.** Servidores MCP protegidos por OAuth sobre HTTP DEVEM implementar ao menos um dos seguintes (especificação de autorização do MCP):

- **Header `WWW-Authenticate`.** Retornar uma resposta `401 Unauthorized` com um header `WWW-Authenticate` cujo parâmetro `resource_metadata` aponta para o documento de metadados (`WWW-Authenticate: Bearer resource_metadata="https://.../.well-known/oauth-protected-resource"`).
- **URI well-known.** Publicar o documento na URI well-known aplicável `/.well-known/oauth-protected-resource`. Pode ser na raiz do host (`https://exemplo.com/.well-known/oauth-protected-resource`) ou no path do endpoint MCP (um MCP em `https://exemplo.com/public/mcp` hospeda os metadados em `https://exemplo.com/.well-known/oauth-protected-resource/public/mcp`).

**Ordem de fallback do cliente.** O cliente MCP DEVE suportar os dois mecanismos:

1. Quando o header `WWW-Authenticate` contém um parâmetro `resource_metadata`, o cliente usa a URL fornecida nesse parâmetro.
2. Quando não contém, o cliente recorre à URI well-known — primeiro a URI do path do endpoint MCP (`https://exemplo.com/.well-known/oauth-protected-resource/public/mcp`), depois a URI raiz (`https://exemplo.com/.well-known/oauth-protected-resource`).

!!! tip "FastMCP"
    Com FastMCP, o `RemoteAuthProvider` publica esse documento automaticamente. Veja [Como construir um MCP com OAuth](mcp-oauth.md).

### 3. Dynamic Client Registration (RFC 7591) — recomendado para as credenciais

Se o authorization server expuser `registration_endpoint` (RFC 7591) e suportar **Dynamic Client Registration (DCR)**, a plataforma se auto-registra como client e obtém `client_id`/`client_secret` sem nenhuma troca manual de credenciais. No DCR, a plataforma também informa seus próprios `redirect_uris` no payload de registro, então você não precisa fazer o allowlist manual da URL de callback.

**Sem DCR** (registro manual):

- Publicar metadata RFC 8414.
- Entregar `client_id`/`client_secret` manualmente.
- Fazer o allowlist manual da URL de callback no IdP.

**Com DCR** (recomendado):

- Publicar metadata RFC 8414 + `registration_endpoint`.
- A plataforma registra o client automaticamente (credenciais + `redirect_uris`). Nada a trocar manualmente.

!!! note
    O DCR **não** elimina a necessidade de publicar metadata. Ele só automatiza as credenciais do client e o allowlist da callback. O DCR só é possível se o seu IdP expuser o `registration_endpoint` (RFC 7591); sem ele, use o registro manual.

    O userinfo é uma camada separada (identidade/autorização), não um requisito de autenticação. Veja [Userinfo (OIDC)](../authz/userinfo.md).

## Avançado — configuração manual (legado e diagnóstico)

!!! warning "Não é o fluxo padrão"
    A configuração manual é uma **exceção avançada** para diagnóstico ou compatibilidade com integrações legadas. **Não** é o fluxo normal de descoberta MCP e **não** substitui os requisitos de descoberta de Metadados do Recurso Protegido do servidor MCP (RFC 9728).

Quando a autodescoberta não é possível (por exemplo, uma integração legada que não publica metadados, ou um client já registrado), você entrega explicitamente as informações de OAuth. Você precisa fornecer:

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
- **Correspondência exata de `issuer`**: o valor de `issuer` no metadata deve ser **idêntico** ao identificador usado para construir a URL de consulta do metadata (RFC 8414 §3.3). Compartilhar o mesmo domínio registrável não é suficiente; qualquer divergência faz a descoberta falhar (previne ataques de mix-up).
- **`resource` cobre a URL real**: no metadata do recurso protegido (RFC 9728), o `resource` deve cobrir a URL do MCP. O host raiz cobre qualquer path do mesmo host; um path específico não cobre subpaths arbitrários.

## O que não é suportado

- Apenas o grant **authorization code + PKCE** é usado para autenticação de usuário. Grants como `client_credentials` não fazem parte deste fluxo.
- A configuração manual é uma exceção avançada para integrações legadas ou diagnóstico — não é um substituto da descoberta de metadados, e não substitui os requisitos de descoberta de Metadados do Recurso Protegido do servidor MCP (RFC 9728).

## Checklist de validação antes da integração

Antes de tentar conectar, confirme cada item:

- [ ] Os Metadados do Recurso Protegido são detectáveis (via o parâmetro `resource_metadata` do header `WWW-Authenticate` ou pela URI well-known — no path do endpoint MCP ou na raiz) e retornam `resource` e `authorization_servers` (para um MCP HTTP protegido por OAuth).
- [ ] `GET /.well-known/oauth-authorization-server` retorna os campos obrigatórios da RFC 8414.
- [ ] O `issuer` do metadata coincide exatamente com o identificador usado para construir a URL de consulta do metadata.
- [ ] `code_challenge_methods_supported` contém `S256`.
- [ ] O fluxo emite **refresh token**.
- [ ] O `/userinfo` responde com identidade e perfil/roles.
- [ ] O fluxo testa PKCE (`code_challenge`/`code_verifier`).
- [ ] O refresh de token funciona (access token expirado → renovação via refresh token).
- [ ] Sem DCR: `client_id`/`client_secret` e a URL de callback foram registrados no IdP.
- [ ] Com DCR: `registration_endpoint` acessível e o registro de client é bem-sucedido.
- [ ] O MCP consegue validar o token (JWKS/`issuer`/`audience` compatíveis. Veja [Como construir um MCP com OAuth](mcp-oauth.md)).

## Troubleshooting

- **Descoberta do metadata do authorization server falha (404 no `/.well-known/oauth-authorization-server`)**: confirme que o documento está em HTTPS e no caminho correto derivado do `issuer`.
- **Metadados do Recurso Protegido não detectáveis**: confirme que o servidor retorna o header `WWW-Authenticate` com `resource_metadata`, ou que o documento está disponível na URI well-known — no path do endpoint MCP ou na raiz (`/.well-known/oauth-protected-resource`).
- **`issuer` não bate**: o `issuer` do metadata precisa ser **exatamente** idêntico ao identificador usado para construir a URL de consulta do metadata (RFC 8414 §3.3). Compartilhar o mesmo domínio registrável não é suficiente.
- **Redirect falha**: a URL de callback não foi cadastrada no allowlist do IdP.
- **`401` no `/userinfo`**: o token apresentado não é válido, está expirado, ou o `aud` não corresponde ao esperado. Verifique `iss`, `aud` e a assinatura.
- **`audience` inválido no JWT**: o `aud` do token não bate com o que o MCP espera. Alinhe o `audience` do authorization server com o MCP.
- **`401` nas chamadas do MCP**: o token não é válido para o MCP. Verifique `iss`, `aud` e o `jwks_uri` do authorization server.

## Responsabilidades

| Responsabilidade | Quem faz |
|---|---|
| Construir/operar o authorization server | Sua organização |
| Publicar metadados RFC 8414 (authorization server) | Sua organização |
| Publicar protected resource metadata RFC 9728 (MCP) | a organização que opera o MCP |
| Expor endpoint de userinfo (identidade + perfil/roles) | Sua organização |
| Autenticar o usuário e emitir tokens | Sua organização |
| Descoberta do authorization server (autodescoberta) | Plataforma |
| Guardar e criptografar o token | Plataforma |
| Consultar o endpoint de userinfo com o token e interpretar perfil/lojas | MCP |
| Injetar `Authorization: Bearer` e fazer refresh | Plataforma |

!!! note
    O authorization server e o MCP podem ser operados pela mesma organização ou por organizações diferentes. O RFC 8414 e o userinfo são responsabilidade da organização que opera o authorization server; o RFC 9728 é da organização que opera o MCP.
