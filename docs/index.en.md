![Open Restaurant Protocol](assets/logo.webp){ width="480" }

# Open Restaurant Protocol

An open standard for integrations between systems in the restaurant ecosystem — APIs, agents, MCPs, and authentication.

## Overview

The **Open Restaurant Protocol** (ORP) defines how systems connect and exchange data in a secure, standardized way. It covers three pillars:

- **Authentication** — the OAuth 2.0 flow that authorizes access to data.
- **Discovery** — how authorization servers and protected resources are discovered automatically.
- **Data Contracts** — the structure each data domain must follow when exposing its data.

## Key Details

- Based on the **MCP** (Model Context Protocol) for exposing tools and data.
- Authentication via **OAuth 2.0** with **authorization code + PKCE**.
- Automatic discovery via **RFC 8414** (Authorization Server Metadata), **RFC 9728** (Protected Resource Metadata) and **RFC 7591** (Dynamic Client Registration).
- Semantic versioning of the protocol (v1, v2, ...), with access to previous versions via the version selector.

## Terminology

- **Organization** — a company registered in the ORP ecosystem, regardless of role. Examples: a delivery platform, a POS provider, a restaurant management system, or a data consumer.
- **Provider** — an organization acting as a supplier of data, APIs, tools, services, or capabilities.
- **Consumer** — an organization acting as a consumer of data, APIs, tools, services, or capabilities.

An organization may act as a provider, a consumer, or both — the roles are not exclusive.

## Versions

- **v1** — initial release (current).

## Learn More

- [Authentication](auth/oauth.md) — the OAuth flow and the requirements to integrate.
- [OAuth Requirements](auth/oauth-requirements.md) — how to configure OAuth.
- [Authorization](authz/index.md) — userinfo, merchants and access control.
- [Data Contracts](data-contracts/index.md) — the structure of a domain contract.
- [Integrations](integrations/mcp.md) — how to connect via MCP.
