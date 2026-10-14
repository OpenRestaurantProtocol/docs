# Autorização

!!! info "O que esta seção responde"
    Como o MCP controla o acesso a recursos (lojas, dados) para cada usuário autenticado.

## Como funciona

Depois que o usuário está autenticado (via OAuth), ainda é preciso decidir **o que** ele pode acessar. Essa decisão é feita pelo MCP.

O endpoint de [userinfo](userinfo.md) é sempre fornecido pelo parceiro (quem opera o authorization server). Quem cria o MCP usa esse endpoint para obter o contexto de autorização do usuário e implementar a lógica de acesso:

1. O MCP recebe o token do usuário.
2. O MCP chama o [userinfo](userinfo.md) para obter a identidade e as permissões do usuário.
3. O MCP usa esse contexto para decidir quais recursos liberar.
4. Quando necessário, o MCP lista as lojas autorizadas via [lojas](merchants.md).

## Endpoints deste protocolo

- [Userinfo (OIDC)](userinfo.md) — contexto de autorização: identidade + permissões do usuário.
- [Lojas](merchants.md) — lista de lojas autorizadas para o token do usuário.
