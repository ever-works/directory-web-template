---
id: spec-061-shared-item-parse-cache
title: Spec 061 — Parse item YAML once for every locale
sidebar_label: 061 Shared item parse cache
---

# Feature spec — `061-shared-item-parse-cache`

> **Status:** in-progress (shipped in code; measured locally against `awesome-mcp-servers-data`, not yet on a live site)

## 1. Summary

`fetchItems` parses each item's base YAML once per file version and shares it by every
locale and option set. A locale only copies the parsed items and overlays its own
`<slug>.<lang>.yml` files. The background content sync no longer clears every cache when
the pull brought no new commit.

## 2. Motivation

On 2026-11-14 a site with 4,105 items and 21 locales (`mcpserver.ever.works`, data repo
`awesome-mcp-servers-data`) started failing readiness probes and answering 503 under crawler
traffic on localized item pages. Localized item pages took 5–12 s.

Measured locally on a production build with that data repo:

- The listing for one locale (`fetchItems({ lang })`) read and YAML-parsed all 4,111 item
  files: about 5 s of CPU, 3.2 s of it in `yaml.parse`, the rest in per-file `realpath` /
  `access` / failed opens of translation files that do not exist.
- That work was cached per option set: `{ lang }` and `{ lang, sortTags }` for each of 21
  locales, so up to 42 full walks of the same base files.
- The background sync runs every 5 minutes and called `invalidateContentCaches()` after
  every successful pull, even when the pull brought nothing. Each run threw all 42 away.
- Each per-locale result held its own full copy of 4,111 parsed items: about 975 MB of heap
  after one crawl of 630 localized item URLs.
- A directory with no YAML file at all made every walk run a repository sync and clear every
  locale's caches again, on every walk.
- The tags pages counted every tag twice: the per-locale category/tag maps were stored in the
  directory cache and then mutated by `populate()` (`count++`), so the next option set for the
  same locale started from counted maps (`open-source`: 1,038 instead of 519).

## 3. Requirements

- **R1.** An item's base YAML is parsed once and reused until its mtime or size changes. All
  locales and option sets share the parsed item; each `fetchItems` call works on a shallow copy.
- **R2.** A locale overlay `<slug>.<lang>.yml` is read only when it exists (known from the
  item directory listing) and is cached by mtime/size per locale.
- **R3.** `clearFetchItemsCache()` drops the shared snapshot; the next walk does one `readdir`
  and one `stat` per item and re-parses only changed files. Removed items leave the cache.
- **R4.** Concurrent walks for different locales share one directory walk (single-flight).
- **R5.** `categories.yml` / `tags.yml` / `collections.yml` and their locale overlays are parsed
  once per file version; callers get copies.
- **R6.** The directory cache stores copies of the category/tag/collection maps, so counts are
  right for every option set.
- **R7.** The sync service invalidates content caches (and rebuilds the location index) only
  when the content checkout's HEAD differs from the one it last invalidated for. Content that
  is not a git checkout is invalidated on every sync, as before. HEAD is read for loose, packed
  and detached refs (`lib/content-revision.ts`).
- **R8.** The missing-YAML repair runs once per distinct set of YAML-less directories instead
  of on every walk.
- **R9.** Behaviour is otherwise unchanged: same items, order, translations, YAML fallback file
  rule, IO-error threshold and missing-data warnings. No new route, setting, dependency or
  outbound call.

## 4. Out of scope

- Making item pages ISR-cacheable (the route is dynamic today).
- Replacing the `yaml` parser.
- Warming the parse cache at process start.

## 5. Results (local production build, `awesome-mcp-servers-data`, 21 locales)

| Load | Before | After |
|---|---|---|
| Item walk (`fetchItems` body), first locale | 2.7–3.8 s | 2.4 s |
| Item walk, each further locale / option set | 2.7–3.8 s each | 5–9 ms |
| Item walk after a cache clear (sync with a new commit) | 2.7–3.8 s per locale | 0.36 s once, then 5–9 ms per locale |
| First localized item request per locale | 4.8–6.3 s | 0.18–0.49 s |
| Warm localized item request | 0.10–0.17 s | 0.10–0.14 s |
| 210 distinct item URLs, 21 locales, 4 concurrent, fresh process | 103 s wall, p90 12.9 s, p99 15.6 s | 30–40 s wall, p90 0.8–1.0 s, p99 4–10 s (first parse) |
| Same, locales already warm, new slugs | 35 s wall, p50 578 ms, p99 1.9 s | 20–26 s wall, p50 357–386 ms, p99 0.6–1.0 s |
| Heap after 630 requests (after GC) | 975 MB | 766 MB |

## 6. Tests

- `apps/web/lib/__tests__/item-file-cache.spec.ts` — parse once, single-flight, mtime
  re-validation, missing/fallback YAML, removed items, translation overlay caching.
- `apps/web/lib/__tests__/content-revision.spec.ts` — loose, packed, detached and unborn HEAD,
  and refs outside `.git`.
