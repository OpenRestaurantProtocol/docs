# Fluxo OAuth

!!! warning "Conteúdo em construção"
    Esta página é um esqueleto. Preencha o fluxo real conforme o padrão for definido.

Esta seção documenta o fluxo **OAuth** necessário para que as integrações funcionem corretamente.

## Visão geral

- [ ] Descrever os papéis (client, authorization server, resource server).
- [ ] Listar os endpoints do authorization server.

## Grant types necessários

- [ ] Authorization Code + PKCE (integrações com usuário)
- [ ] Client Credentials (integrações servidor-a-servidor)

## Escopos (scopes)

- [ ] Listar os scopes disponíveis e o que cada um permite.

## Passos

1. **Registrar o client** — TODO
2. **Solicitar autorização** — TODO
3. **Trocar o code por token** — TODO
4. **Renovar o token (refresh)** — TODO

## Segurança

- [ ] PKCE obrigatório para clientes públicos.
- [ ] Guardar secrets apenas em secret manager.

## Referências

- [ ] RFC 6749 (OAuth 2.0)
- [ ] RFC 7636 (PKCE)
