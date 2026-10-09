# Contratos de Dados

!!! warning "Em desenvolvimento"
    Esta seção ainda não tem contratos de domínio publicados. O conteúdo abaixo descreve o template que cada contrato de domínio deverá seguir.

## Visão geral

Um **contrato de dados** define a estrutura que um domínio de dados (por exemplo, um tipo de recurso exposto via MCP) deve seguir ao ser compartilhado com a plataforma. Cada domínio publica seu próprio contrato, com seus próprios campos, tipos e regras de versionamento.

## Template de um contrato de domínio

Todo contrato de domínio deve declarar os campos que expõe, usando a seguinte estrutura:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `<campo>` | `<tipo>` | Sim/Não | Descrição do campo |

Cada contrato deve acompanhar um exemplo de payload no formato JSON:

```json
{
  "<campo>": "<valor>"
}
```

## Versionamento do contrato

Cada contrato de domínio declara sua própria versão, independente das demais. Quando um contrato sofre uma mudança incompatível, uma nova versão deve ser publicada, e a anterior permanece acessível.

## Referências

- Model Context Protocol — [Resources](https://modelcontextprotocol.io/docs/concepts/resources)
