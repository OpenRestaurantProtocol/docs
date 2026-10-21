# Integração via MCP

Esta seção documenta como conectar um serviço à plataforma usando o protocolo MCP (Model Context Protocol).

!!! info "Contexto"
    O MCP expõe as tools do ecossistema para a plataforma. Toda chamada é autenticada com **Bearer JWT** e validada antes de tocar no DataBridge — veja o [fluxo OAuth](../auth/oauth.md).

## Quem opera o MCP

O protocolo separa a **Organization** (dona do authorization server e do escopo de lojas) de **quem hospeda** o servidor MCP:

| Modelo | Nome | AS / userinfo / `/merchants` | MCP + DataBridge |
|---|---|---|---|
| **A** | *organization-hosted MCP* | Organization | Organization |
| **B** | *delegated MCP operator* | Organization (**obrigatório**) | Plataforma ou terceiro |

Regras:

1. Identidade e escopo de loja (`userinfo`, `GET /merchants`) pertencem **sempre** ao authorization server da Organization.
2. O MCP — em A ou B — **consome e aplica** esse contexto nas tools. No modelo B o operador **não substitui** o AS.
3. A plataforma conecta via OAuth, chama `GET /merchants` no connect e envia tool calls ao endpoint MCP configurado (A ou B).

!!! example "Exemplos genéricos"
    - Modelo A: `https://mcp.organization.example` operado pela própria org; AS em `https://auth.organization.example`.
    - Modelo B: tools em `https://mcp.platform.example`; userinfo/merchants continuam em `https://auth.organization.example`.

No modelo B, o MCP ainda chama o AS da Organization em toda tool que exige authorize — é o cenário em que **userinfo é necessário**, independentemente de quem hospeda o MCP.

## Tools recomendadas

| Tool | Papel |
|---|---|
| `listar_lojas` / `list_merchants` | **Recomendada como fallback** — rediscovery/refresh para o agente; deve espelhar ou chamar `GET /merchants`. **Não** substitui a chamada da plataforma a `/merchants` no connect. |
| Tools de dados (ex.: `buscar_dados`) | Operam com `merchant_ids` já no escopo; o MCP aplica userinfo e valida o escopo. |

## Pré-requisitos

- [ ] Credencial / token (OAuth da Organization)
- [ ] Endpoint do servidor MCP (modelo A ou B)
- [ ] Cliente MCP configurado

## Passo a passo

1. **Configurar o endpoint** — obter o endpoint do servidor MCP e apontar o cliente.
2. **Autenticar** — obter o `access_token` via OAuth 2.0 + PKCE e enviá-lo como `Bearer` em cada chamada (ver [OAuth](../auth/oauth.md)).
3. **Connect** — a plataforma chama `GET /merchants` no AS da Organization (picker + perfil de negócio).
4. **Testar a conexão** — verificar que uma tool de teste (ex.: `listar_lojas` ou uma tool de dados) retorna o esperado.

??? example "Exemplo de configuração do endpoint"
    ```json title="mcp_config.json"
    {
      "mcpServers": {
        "organization-example": {
          "url": "https://mcp.organization.example"
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

- [Requisitos do OAuth](../auth/oauth-requirements.md)
- [Autorização](../authz/index.md)
- [Userinfo](../authz/userinfo.md)
- [Lojas](../authz/merchants.md)
