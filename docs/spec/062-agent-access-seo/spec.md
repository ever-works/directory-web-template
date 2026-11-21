---
id: spec-062-agent-access-seo
title: Spec 062 — Agent access (Read API, MCP) and SEO
sidebar_label: 062 Agent access and SEO
---

# Feature spec — `062-agent-access-seo`

> **Status:** in-progress (code, unit tests and an e2e spec in the PR; not yet verified on a live site)

## 1. Summary

Every directory built from this template can be **discovered, read and queried by AI agents**
(ChatGPT, Claude, Perplexity, Gemini, coding agents, any MCP client) without scraping HTML or an
account, and its public pages carry **better search metadata**. Agents get a JSON Read API under
`/data/`, a stateless MCP server at `/mcp`, and discovery documents (`/llms.txt`,
`/.well-known/mcp.json`, `/.well-known/api-catalog`, `<head>` links). The URLs, JSON shapes, MCP tools
and behaviour are **Agent Access Contract v1**, shared with the Ever Works minimal (Astro) template, so
an agent that learns one Ever Works directory can use all of them.

## 2. Motivation

Owner request 2026-11-21: "significantly improve SEO" and "make sure each directory can be used by AI
agents: discoverable, queryable, ideally via MCP". The template already had `llms.txt`, `/items.json`,
Markdown mirrors and per-page JSON-LD, but agents could not query it (no search, no per-item JSON, no
MCP) and an audit of the public pages found invented or wrong data in the markup:

- Every item's Product JSON-LD carried an `Offer` with `availability: InStock` and no price (invented;
  Google rejects it) and the **directory's** brand ("Ever Works") as the item's `brand`.
- Organization JSON-LD named every directory "Ever Works" (build-time template default).
- JSON-LD URLs on item pages came from the build-time `siteConfig.url`, the fallback origin on
  images built without `NEXT_PUBLIC_APP_URL`; item JSON-LD was serialised without `<` escaping.
- Category / tag titles were "`<id>` Category" / "`<id>` Tag" with a generic description; the home page was
  titled "Discover"; meta descriptions were cut mid-word.
- Category and tag pages emitted two identical BreadcrumbLists, none listing the current page; no
  `CollectionPage` / `ItemList` on any listing.
- Sign-in, admin, client dashboard and dashboard pages declared `index, follow`.
- The site-wide OG image (`/opengraph-image`) answered 404 (the i18n middleware rewrote it to a
  locale path), and listing pages set `openGraph` without an image, so home, category and tag pages
  had no `og:image`.
- The sitemap stamped `lastModified: now` on every category, tag, collection and static page (so
  crawlers ignore all its dates), and advertised 5 of the 21 locales the pages declare as hreflang.
- The similar-items rail on item pages was client-only (`ssr: false`): no internal links in the HTML.

## 3. Goals

- G1. The Read API, MCP server and discovery documents of Contract v1 (§6), built from the same
  content the pages render (`getCachedItems()`), with no database read and no auth.
- G2. Public pages carry unique, data-driven titles and descriptions, absolute canonicals and hreflang,
  Open Graph / Twitter cards, and JSON-LD with no invented field.
- G3. Private pages are `noindex`; robots.txt allows every crawler, AI crawlers included, on the public
  and agent surfaces.
- G4. The sitemap's dates come from the data and its alternates match each page's hreflang.

## 4. Non-Goals

- No write API, no auth, rate limiting or analytics on `/mcp` (abuse is handled at the edge).
- No embeddings / vector search.
- No visual redesign (only the similar-items heading text changes, see R12).

## 5. Requirements

Agent Access Contract v1 (identical in the minimal template, whose spec is
`.specify/features/agent-access.md` there; reference code `packages/agent-api/src/` there):

- **R1 Read API.** `GET /data/directory.json` (`DirectoryInfo`), `/data/items.json`
  (`{ version: 1, total, items: ItemSummary[] }`), `/data/items/{slug}.json` (`ItemDetail`, 404 JSON when
  unknown), `/data/categories.json`, `/data/tags.json` (most used first), `/data/openapi.json`
  (OpenAPI 3.1 of these and `/mcp`). JSON, `Access-Control-Allow-Origin: *`,
  `Cache-Control: public, max-age=300, s-maxage=900`. Shapes: `apps/web/lib/agent-access/types.ts`.
  `/items.json` keeps its legacy shape.
- **R2 MCP.** `/mcp`: Streamable HTTP, stateless (no `Mcp-Session-Id`), one JSON response per request.
  `GET` 405 (`Allow: POST, OPTIONS`), `OPTIONS` 204, CORS `*`. `initialize` negotiates from
  `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05` (unknown: latest); notifications and client
  responses 202; `ping`; `tools/list`; `tools/call`; `resources/list` / `prompts/list` empty; unknown
  method -32601; batch -32600; invalid JSON -32700.
- **R3 Tools.** `get_directory_info`, `search_items {query, category?, tag?, limit 1-50 = 10}`,
  `list_items {category?, tag?, featured?, sort?, offset?, limit 1-100 = 25}`, `get_item {slug}`,
  `list_categories`, `list_tags {limit?}`. Result `{ content: [{type: 'text', text: JSON}],
  structuredContent }`; invalid arguments and an unknown slug: a result with `isError: true`; unknown tool
  name: JSON-RPC -32602. Category / tag filters take an id, name or slug.
- **R4 Ranking.** Normalised (lowercase, accents stripped) unique tokens; per token +8 whole name,
  else +5 a name word starts with it, else +3 name contains; +2 category/tag name contains; +1
  description contains; every token must match; +10 when the whole query is the name; +0.5 featured;
  ties by name. `list_items` default sort: featured first, then name.
- **R5 Discovery.** `/.well-known/mcp.json` (server card), `/.well-known/api-catalog` (RFC 9727
  linkset: `service-desc`, `service-doc`, `service-meta`), `<head>` links (`alternate` JSON ->
  `/data/items.json`, `service-desc` -> `/data/openapi.json`, `alternate` text/plain -> `/llms.txt`).
  `/llms.txt`: absolute URLs; summary, how to query (Read API, OpenAPI, MCP with a client config and the
  `claude mcp add` line), categories, canonical data, Markdown mirrors, feeds.
- **R6 Routing.** The agent URLs are app routes outside `[locale]`; `proxy.ts` skips `/mcp` (the other
  URLs contain a dot and were already skipped), so the i18n middleware never rewrites them.

SEO:

- **R7 Item pages.** Title `<Item> – <Category> | <Site>`, description from the item's text cut on a
  word boundary near 155 characters (factual fallback otherwise), OG image URL unprefixed for the default
  locale. Product JSON-LD: no `Offer`, `brand` only from the item's own `brand`, the item's website as
  `sameAs`, absolute image, URLs on the server-resolved origin, `<` escaped.
- **R8 Category / tag pages.** Title `<Name> <Items> (N) | <Site>`, the record's description or `Browse N
  <items> in <Name> on <Site>: A, B and more.`; `CollectionPage` + `ItemList` JSON-LD; one BreadcrumbList
  including the current page. A paginated category page (`?page=N`, N > 1) is its own canonical.
- **R9 Home.** Listings (home, category, tag) use the site-wide `/opengraph-image` card (now
  reachable: `proxy.ts` skips it) as `og:image` / `twitter:image`. Title `<Site> | <tagline>`; `CollectionPage` + `ItemList` of the listed items;
  Organization / WebSite JSON-LD with the server-resolved name, description and origin. The
  `SearchAction` keeps `?q=` (the home listing's real search parameter).
- **R10 Indexing.** `noindex, nofollow` on `/auth`, `/admin`, `/client` (public profiles at
  `/client/profile/*` stay indexable) and `/dashboard`. robots.txt: allows `/data/`, `/mcp`,
  `/.well-known/`, `/llms*.txt`; private areas disallowed with and without a locale prefix.
- **R11 Sitemap.** `lastModified` from item `updated_at` (category / tag: newest member item; home and
  listings: newest item; comparisons: `generated_at`; posts: their date); omitted when the data has no
  date. Every entry carries hreflang alternates for all locales + `x-default`; static routes are listed
  for every prefixed locale (was 5 of 20).
- **R12 Internal links.** The similar-items rail is server-rendered and titled `Alternatives to
  <Item>` (all 21 locales).

## 6. Acceptance Criteria

- [x] AC-1: unit tests for the builders, ranking, MCP handler (initialize, tools/list, each tool,
  errors), discovery documents (`apps/web/lib/agent-access/__tests__/`).
- [x] AC-2: unit tests for titles / descriptions, JSON-LD fixes and sitemap dates
  (`apps/web/lib/seo/__tests__/{meta-text,structured-data,sitemap-urls}.spec.ts`).
- [x] AC-3: e2e spec `apps/web-e2e/tests/api/agent-access.spec.ts` (Read API, discovery, MCP).
- [ ] AC-4: verified on a deployed directory (MCP client connects, Rich Results Test passes).

## 7. Open questions

Q-062a–f in [`docs/questions.md`](../../questions.md#spec-062--agent-access-and-seo).
