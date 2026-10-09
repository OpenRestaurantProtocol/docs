# Integração via MCP

Esta seção documenta como conectar um serviço à plataforma usando o protocolo MCP (Model Context Protocol).

!!! info "Contexto"
    O MCP expõe as tools do ecossistema (por exemplo, `listar_lojas` e `buscar_dados`) para a plataforma. Toda chamada é autenticada com **Bearer JWT** e validada antes de tocar no DataBridge — veja o [fluxo OAuth](../auth/oauth.md).

## Pré-requisitos

- [ ] Credencial / token
- [ ] Endpoint do servidor MCP
- [ ] Cliente MCP configurado

## Passo a passo

1. **Configurar o endpoint** — obter o endpoint do servidor MCP e apontar o cliente.
2. **Autenticar** — obter o `access_token` via OAuth 2.0 + PKCE e enviá-lo como `Bearer` em cada chamada (ver [OAuth](../auth/oauth.md)).
3. **Testar a conexão** — verificar que uma chamada de teste retorna os dados esperados.

??? example "Exemplo de configuração do endpoint"
    ```json title="mcp_config.json"
    {
      "mcpServers": {
        "meu-servidor": {
          "url": "https://mcp.example.com/meu-servidor"
        }
      }
    }
    ```

## Segurança

!!! warning "Credenciais"
    Nunca versione credenciais no repositório. Use variáveis de ambiente ou secret manager.

!!! warning "Token"
    Rotacione tokens periodicamente e valide o JWT (`iss`, `aud`, `exp`) a cada chamada.

## Referências

- [Discovery OAuth/MCP](../auth/discovery.md)
- [ ] Especificação do MCP
