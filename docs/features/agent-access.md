---
id: agent-access
title: AI Agent Access (Read API and MCP)
sidebar_label: AI Agent Access
---

# AI Agent Access (Read API and MCP)

Every directory built from this template can be used by AI agents (ChatGPT, Claude, Perplexity,
Gemini, coding agents, any MCP client) without scraping HTML and without an account. Nothing to
configure: the endpoints below are on by default, read-only and built from the same content the pages
show. They follow **Agent Access Contract v1**, shared with the Ever Works minimal template, so an
agent that knows one Ever Works directory knows them all. Spec:
[062](../spec/062-agent-access-seo/spec.md).

## Connect an MCP client

The MCP endpoint is `https://<your-directory>/mcp` (Streamable HTTP, stateless, no authentication).

```json
{
  "mcpServers": {
    "my-directory": { "type": "http", "url": "https://<your-directory>/mcp" }
  }
}
```

That is the `mcpServers` format: a project `.mcp.json`, Cursor's `.cursor/mcp.json`, Windsurf and other
clients that take a remote (HTTP) server in their configuration file.

- VS Code: `.vscode/mcp.json` uses a `servers` key, not `mcpServers`:
  `{ "servers": { "my-directory": { "type": "http", "url": "https://<your-directory>/mcp" } } }`.
- Claude Code: `claude mcp add --transport http my-directory https://<your-directory>/mcp`.
- Claude (desktop and web): Settings > Connectors > Add custom connector, with the URL above. The Claude Desktop
  configuration file only launches local servers.

`/llms.txt` on every directory prints these instructions with the real URL.

| Tool | Arguments | Returns |
| --- | --- | --- |
| `get_directory_info` | — | name, description, counts, endpoint URLs |
| `search_items` | `query`, `category?`, `tag?`, `limit?` (1-50, 10) | `{ query, total, items }`, best match first |
| `list_items` | `category?`, `tag?`, `featured?`, `sort?`, `offset?`, `limit?` (1-100, 25) | `{ total, offset, limit, items }` |
| `get_item` | `slug` | full details, Markdown body, related slugs |
| `list_categories` | — | `{ total, categories }` with item counts |
| `list_tags` | `limit?` | `{ total, tags }`, most used first |

`category` / `tag` accept an id, a display name or a slug. `sort`: `featured` (default: featured
first, then A-Z), `name-asc`, `name-desc`, `date-desc`, `date-asc`.

## Read API (JSON)

| URL | Content |
| --- | --- |
| `/data/directory.json` | directory name, description, counts, endpoints |
| `/data/items.json` | every item (summary fields) |
| `/data/items/<slug>.json` | one item with its Markdown body and related items |
| `/data/categories.json` | categories with item counts |
| `/data/tags.json` | tags with item counts |
| `/data/openapi.json` | OpenAPI 3.1 description of the above and `/mcp` (import it as a ChatGPT Action) |

All answer `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=300, s-maxage=900`.
The older `/items.json` keeps its own shape for existing integrations.

## Discovery

- `/llms.txt` — what the directory is and how to query it ([llmstxt.org](https://llmstxt.org)),
  `/llms-full.txt` — the whole directory as Markdown, and a `.md` twin of every public page.
- `/.well-known/mcp.json` — MCP server card; `/.well-known/api-catalog` — RFC 9727 API catalog.
- Every page's `<head>` links `/data/items.json`, `/data/openapi.json` and `/llms.txt`.
- `robots.txt` allows all crawlers, AI crawlers included, on these URLs (`AI_CRAWLERS` env var to
  change the AI-crawler stance, see [SEO](seo.md)).

## What is published

Only what the pages already show: items, categories, tags and the directory description. The data
repository URL (`data_repository`) is published only when the site reads it without a GitHub token
(a token means the repository may be private).
