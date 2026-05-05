---
id: agent-discovery-spec
title: E2E Agent Discovery Spec (apps/web-e2e/tests/public/agent-discovery.spec.ts)
sidebar_label: E2E Agent Discovery Spec
sidebar_position: 616
---

# E2E Agent Discovery Spec — `apps/web-e2e/tests/public/agent-discovery.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public agent-discovery surface smoke** paired with
[`apps/web-e2e/tests/public/agent-discovery.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/agent-discovery.spec.ts).

This is the **first per-source-file public-route smoke**
the docs tree publishes that pins the **agent-targeted
discovery surface** — the public `/llms.txt` (per the
[llms.txt convention](https://llmstxt.org)) plus the paired
canonical-data `/items.json` JSON dump served by the `GET`
exports of
[`apps/web/app/llms.txt/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/llms.txt/route.ts)
and
[`apps/web/app/items.json/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/items.json/route.ts).

UNIQUE: every prior public-route smoke in the docs tree
covers a **crawler-targeted** SEO discovery surface (`robots.txt`,
`sitemap.xml`, `opengraph-image`, `favicon.ico`); this is the
**first** per-source-file smoke the docs tree publishes that
pins the **agent-targeted** discovery surface (llms.txt
convention + canonical JSON dump for downstream LLM agents).

## What's distinct from EVERY prior public-route smoke

- **Agent-targeted discovery surface (vs crawler-targeted)** —
  UNIQUE: the FIRST per-source-file public-route smoke
  pinning the llms.txt convention and a paired canonical-
  JSON dump. The neighbouring `seo-manifests.spec.ts` covers
  the crawler-targeted SEO discovery surface; this sibling
  pins the LLM-agent discovery surface that downstream
  zero-friction onboarding relies on.
- **Two-route paired contract** — UNIQUE: the FIRST per-
  source-file smoke that pins **two coupled routes** in a
  single spec. `/llms.txt` advertises `/items.json` as the
  canonical-data anchor; the spec validates BOTH the
  advertisement (text/plain body contains `/items.json`)
  AND the data contract (JSON envelope shape and
  `count === items.length` invariant).
- **`Cache-Control: public, max-age=300, s-maxage=900`** —
  UNIQUE: the FIRST per-source-file smoke pinning the
  shared 5-minute / 15-minute browser / CDN cache-tiering.
- **`Access-Control-Allow-Origin: *` CORS-open** — UNIQUE:
  the FIRST per-source-file smoke pinning a CORS-open
  public JSON endpoint. Agents must be able to fetch
  `/items.json` from any origin without a preflight gate.
- **Stable JSON envelope shape** — `{ site, generatedAt,
  count, items }` is the documented downstream contract.
  The spec pins:
    - `count` MUST be `items.length` (load-bearing
      invariant).
    - `generatedAt` MUST be ISO-8601 parseable.
    - Each item carries `slug` + `categories` (array) +
      `tags` (array) at minimum.
- **No side-channel branching** — UNIQUE: the FIRST per-
  source-file public-route smoke pinning that fabricated
  session cookies / Authorization headers do NOT alter
  the dispatch on EITHER route. Both routes are fully
  public.
- **Method-resolution surface** — both routes export ONLY
  `GET`. Cross-method probes (`POST` / `PUT` / `PATCH` /
  `DELETE`) MUST round-trip `< 500` (Next.js returns 405).

## Five-helper round-trip surface

The spec exercises these probes against BOTH routes:

1. **Status `< 500`** — public discovery surface MUST never
   5xx, even when the upstream Git CMS is unreachable.
2. **Content-type sanity** — `/llms.txt` is `text/plain`,
   `/items.json` is `application/json`.
3. **Body-shape sanity** — `/llms.txt` opens with `# `,
   advertises `/items.json` + `/sitemap.xml` + `/atom.xml`;
   `/items.json` carries the `{ site, generatedAt, count,
   items }` envelope.
4. **Cache-Control + CORS sanity** — `Cache-Control: public,
   max-age=300, s-maxage=900` on both; `/items.json` ALSO
   carries `Access-Control-Allow-Origin: *`.
5. **Side-channel + cross-method invariants** — fabricated
   cookies / Authorization headers do NOT alter dispatch;
   non-GET methods round-trip `< 500`.

## Sibling specs

- The neighbouring
  [`seo-manifests.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/seo-manifests.spec.ts)
  covers the **crawler-targeted** SEO discovery surface
  (`/robots.txt`, `/sitemap.xml`, `/opengraph-image`,
  `/favicon.ico`). This sibling pins the **agent-targeted**
  discovery surface — UNIQUE: the `/llms.txt` convention
  is `agent-targeted`, NOT crawler-targeted.

## Why this matters

Agents that **build** a directory via the Ever Works
zero-friction onboarding flow (see
`https://docs.ever.works/agent-services/zero-friction-onboarding`)
produce sites that are **immediately discoverable** by
other LLM agents. The `/llms.txt` advertises the canonical-
data anchor (`/items.json`) so downstream agents do NOT
need to scrape HTML. The spec pins the contract so the
zero-friction handoff is honoured across template
upgrades.

## Future-proofing

When the agent-discovery contract evolves, append a new
clause / probe to this spec — do NOT replace existing
clauses. Downstream agents MAY rely on the documented
envelope shape across template versions; breaking the
contract silently is a regression.
