---
id: spec-062-agent-access-seo-plan
title: Spec 062 — Plan
sidebar_label: 062 Plan
---

# Plan — `062-agent-access-seo`

## Architecture

```text
apps/web/lib/agent-access/          framework-free, unit-tested (tsx --test)
  types.ts        Contract v1 shapes (DirectoryInfo, ItemSummary, ItemDetail, ...)
  text.ts         normalizeText / taxonomySlug (same rules as the minimal template)
  dataset.ts      content -> catalogue (summaries, categories, tags, info), ItemDetail, related slugs
  search.ts       ranking, filters, sorts (R4)
  mcp.ts          handleMcpRequest(Request, loadDataset): Response (R2, R3)
  openapi.ts      /data/openapi.json
  discovery.ts    server card, RFC 9727 catalog, llms.txt
  http.ts         JSON + CORS + Cache-Control helpers, {slug}.json parsing
  server.ts       server-only loader: getCachedItems / getCachedConfig / getCachedComparisons
                  -> catalogue, memoised 30 s per process; Markdown via getCachedItem(slug)

apps/web/app/data/{directory,items,categories,tags,openapi}.json/route.ts
apps/web/app/data/items/[file]/route.ts        /data/items/{slug}.json
apps/web/app/mcp/route.ts                      POST/GET/DELETE/OPTIONS -> handleMcpRequest
apps/web/app/.well-known/{mcp.json,api-catalog}/route.ts
apps/web/app/llms.txt/route.ts                 buildLlmsTxt()
```

- **Routing.** Static app routes outside `[locale]` win over the dynamic segment; `proxy.ts` excludes
  `/mcp` from its matcher (`mcp$`), the other agent URLs contain a dot and were already excluded. The
  `/:path -> /:path/discover/1` rewrite is an `afterFiles` rewrite, so the `/mcp` route matches first.
  `app/.well-known/` is picked up by Next (only `_` folders are private); `tsconfig.json` includes it
  explicitly because TypeScript globs skip dot folders.
- **Runtime.** Node.js (default), `dynamic = 'force-dynamic'` like robots/sitemap (a prerendered copy
  would bake the build-time fallback origin); CDN caching via `s-maxage`. No database: everything comes
  from the Git CMS checkout through the content cache the pages use.
- **No SDK.** `@modelcontextprotocol/sdk` is not a dependency; the stateless JSON-only subset is ~300
  lines and mirrors the minimal template's reference handler line for line in behaviour.

## SEO changes

`lib/seo/meta-text.ts` (titles / descriptions), `lib/seo/breadcrumb-trail.ts`, `jsonLdScript()` and
the schema fixes in `lib/seo/schema.ts`, `components/seo/collection-json-ld.tsx`, page metadata in
`app/[locale]/{items/[slug],categories/[category],tags/[tag],(listing)/discover/[page]}/page.tsx`,
`noindex` metadata in the private layouts, `app/robots.ts`, `app/sitemap.ts` (+ date helpers in
`lib/seo/sitemap-urls.ts`).

## Constitution Check

- [x] **I — Plugin-First** — the agent surface is core routing over the core content cache; the
  handler is framework-free so it can move to `packages/agent-api` (Q-062e).
- [x] **II — TypeScript Everywhere** — all new source is TypeScript.
- [x] **III — Spec Before Code** — this spec and plan.
- [x] **IV — Documentation First-Class** — spec, plan, index row, `docs/log.md`,
  `docs/features/agent-access.md`, Q-062a–f.
- [x] **V — Performance Budget** — no client JS added; the similar-items rail now renders on the
  server (it was already in the page bundle). Agent routes read the cached content only.
- [x] **VI — Latest Stable Frameworks** — no framework change.
- [x] **VII — Reuse Before Build** — no new dependency.
- [x] **VIII — No Removal Without Migration** — `/items.json`, `/llms.txt` anchors, feeds and Markdown
  mirrors are kept; nothing removed.
- [x] **IX — Test Coverage Bar** — unit specs (AC-1, AC-2) and an e2e API spec (AC-3). The one new
  UI string (`itemDetail.ALTERNATIVES_TO`) is in all 21 locales.
- [x] **X — Modular Packages** — no package changes; `lib/agent-access/` (~1.2k lines with tests
  excluded) is self-contained and imports nothing from Next.js except in `server.ts` (Q-062e).
