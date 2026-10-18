# Data Contracts

!!! warning "Under development"
    This section is reserved for business domain contracts (e.g. orders, menu, ratings). No contract has been published yet.

## Overview

A **data contract** defines the structure that a data domain (for example, a type of resource exposed via MCP) must follow when shared with the platform. Each domain publishes its own contract, with its own fields, types and versioning rules.

## Template of a domain contract

Every domain contract must declare the fields it exposes, using the following structure:

| Field | Type | Required | Description |
|---|---|---|---|
| `<field>` | `<type>` | Yes/No | Field description |

Each contract must come with a payload example in JSON format:

```json
{
  "<field>": "<value>"
}
```

## Contract versioning

Each domain contract declares its own version, independent of the others. When a contract undergoes an incompatible change, a new version must be published, and the previous one remains accessible.

## References

- Model Context Protocol — [Resources](https://modelcontextprotocol.io/docs/concepts/resources)
