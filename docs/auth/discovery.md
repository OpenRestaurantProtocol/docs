# Discovery

Esta página consolida os mecanismos de **descoberta automática** (zero configuração manual) usados na integração OAuth/MCP entre um **Parceiro** (software de restaurante) e a **Plataforma**. Com eles, a plataforma descobre os endpoints do authorization server, o documento de metadados do recurso protegido e se auto-registra como client, sem troca manual de credenciais.

## RFC 8414 — Authorization Server Metadata

Para que a plataforma descubra o authorization server automaticamente, o parceiro expõe um documento de metadados (ex.: `/.well-known/oauth-authorization-server`) com, no mínimo:

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

## RFC 9728 — Protected Resource Metadata

A plataforma faz a descoberta do recurso protegido a partir da URL do MCP (ou de um spec OpenAPI/discovery): identifica a lista de authorization servers e os scopes suportados, depois baixa o `.well-known` do authorization server e lê os endpoints.

Do lado do servidor MCP, o documento de metadados do recurso protegido (`/.well-known/oauth-protected-resource`) é publicado automaticamente quando se usa o `RemoteAuthProvider` do FastMCP, que declara os authorization servers e o `base_url` do MCP.

## Dynamic Client Registration (RFC 7591)

No fluxo de authorization code, o **client OAuth é a plataforma**, não o serviço do parceiro. Para a plataforma se autenticar sem troca manual de credenciais, o authorization server do parceiro pode expor `registration_endpoint` (RFC 7591) e suportar **Dynamic Client Registration (DCR)**: a plataforma se auto-registra como client e obtém `client_id`/`client_secret` automaticamente.

Quando o authorization server **não** suporta DCR, o parceiro registra a plataforma como client no seu IdP manualmente e fornece `client_id`/`client_secret` e a URL de callback/redirect (fixa por ambiente da plataforma).

## Referências

- [RFC 8414 — OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [RFC 9728 — OAuth 2.0 Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [RFC 7591 — OAuth 2.0 Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591)
