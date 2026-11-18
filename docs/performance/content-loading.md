---
id: content-loading
title: Content Loading — fail-loud contract
sidebar_label: Content Loading
---

# Content Loading — fail-loud contract

The Git-based CMS loader (`apps/web/lib/content.ts`) walks every
item directory under `.content/data/<slug>/` on each cold render and
parses its YAML. With ~1000+ items per locale (which is normal for
mature directories — see `awesome-time-tracking` at 993+ items as
of 2026-05), this means **~1000 file descriptors opened per
listing render**.

Two things follow from that:

1. **Concurrency must be bounded.** Vercel's serverless functions
   have a soft `EMFILE` ceiling around 1024. Without throttling,
   `Promise.all(files.map(fs.readFile))` exhausts the budget and
   triggers a stream of `EMFILE: too many open files` errors.
   This is fixed by the `mapWithConcurrency` helper introduced in
   PR #747; it caps concurrency to `CONTENT_FS_CONCURRENCY`
   (default 16).
2. **IO errors must be loud.** When an individual `parseItem`
   throws (EMFILE, ENOMEM, EACCES, transient FS error), the
   surrounding `Promise.all` produces `null` and the listing just
   becomes shorter. The page renders successfully with fewer items
   and looks legit. This silent symptom is *very* hard to debug
   from oncall.

This page documents the contract that `fetchItems` now follows
since [Spec 019](../spec/019-cdn-cacheable-i18n/spec.md).

## The contract

`fetchItems` distinguishes **two failure modes**:

### 1. Missing data (no YAML present at all)

Symptoms:

- The item directory contains no `.yml` / `.yaml` file (or vanished
  between the listing and the read). The pick rule lives in
  `pickItemYaml` in `apps/web/lib/item-file-cache.ts`.

Behaviour:

- Item is skipped silently.
- `missingItemDataCount` is incremented.
- A one-shot warning is logged (`[CONTENT] Skipping item directory
  with no YAML file: <slug>`).
- After the first pass, if `missingItemDataCount > 0`,
  `fetchItems` calls `repairContentRepositoryAfterMissingItems()`
  and recurses once. The repair runs once per distinct set of
  YAML-less directories (Spec 061): a directory the repository itself
  leaves without YAML no longer triggers a sync and a full cache clear
  on every walk.

This branch handles the legitimate case where the content sync
landed a partial repo state (e.g. a folder was created but the
YAML hadn't been pushed yet).

### 2. IO errors (read failure on a YAML that should exist)

Symptoms:

- `parseItem` or any FS call throws an `Error` with codes like
  `EMFILE`, `ENOMEM`, `EACCES`, etc.

Behaviour:

- Each error is collected into an `ioErrors: Array<{ slug, error }>`.
- After the map completes, if `ioErrors.length > 0`, `fetchItems`
  **throws**:
  ```
  [CONTENT] fetchItems failed for N of M item(s); refusing to
  return partial listing. Samples: <slug1>: <msg1>; <slug2>:
  <msg2>; <slug3>: <msg3>
  ```
- Vercel's serverless runtime turns the throw into a 5xx, which
  Vercel logs / alerts on, which Sentry captures.

This is **deliberately loud**. A 5xx with a stack trace is much
easier to fix than "users are saying we have fewer items than usual".

## Why not retry the whole listing on IO error?

Two reasons:

1. EMFILE is a process-wide condition. The instance is probably
   already over its fd budget; retrying immediately just doubles
   the pressure. Vercel will rotate the instance on its own
   (because of the 5xx), which is the right backoff.
2. A retry would mask the underlying signal. We *want* to see
   EMFILE so we can fix it (raise `CONTENT_FS_CONCURRENCY` lower,
   investigate fd leaks elsewhere, etc.).

If a fork wants retry semantics anyway, it can wrap `fetchItems`
in its own retry loop in a `lib/services/` helper.

## One parse for every locale

Since [Spec 061](../spec/061-shared-item-parse-cache/spec.md) the walk
is split in two (`apps/web/lib/item-file-cache.ts`):

1. **A shared snapshot of the data directory.** Each item directory is
   listed once (`readdir`), its YAML is picked (`<slug>.yml`, else the
   first YAML without a locale suffix, else any YAML) and `stat`ed, and
   the YAML is parsed only when its mtime or size changed since the last
   parse. The snapshot is shared by every locale and option set, kept
   for 10 minutes or until the data directory's mtime changes, and
   dropped by `clearFetchItemsCache()`. Walks that start at the same
   time share one snapshot build.
2. **A cheap per-locale pass.** `fetchItems({ lang })` copies each
   parsed item, overlays `<slug>.<lang>.yml` when the directory listing
   says it exists (also cached by mtime/size), and populates tags,
   categories and collections.

The same applies to `categories.yml`, `tags.yml`, `collections.yml` and
their locale overlays. On 4,111 items: the first walk takes about 2.4 s,
every further locale 5–9 ms, and a walk after a cache clear about 0.36 s
(stat only). Before, every locale and option set (`{ lang }`,
`{ lang, sortTags }`) re-parsed every file, about 3.5 s each.

The background sync (`lib/services/sync-service.ts`, every 5 minutes)
calls `invalidateContentCaches()` only when the content checkout's HEAD
moved since the last invalidation. A checkout without a readable HEAD is
invalidated on every sync, as before.

## Tuning concurrency

`CONTENT_FS_CONCURRENCY` env var (default `16`) caps the number of
in-flight item file reads. Reduce it on platforms with tighter fd
budgets; raise it on hosts with abundant fds and you want faster
cold rendering.

If you find yourself raising it: stop, and instead look at why your
listings are cold-rendered so often. Page-level ISR
(`revalidate = 600` on the segment) means the heavy walk happens
~once per 10 minutes per locale per region, which should be a tiny
fraction of total traffic.

## Related

- [CDN Cacheability](./cdn-cacheability.md) — make sure the
  expensive walk is amortized by the edge cache.
- [Spec 019 — CDN-Cacheable i18n](../spec/019-cdn-cacheable-i18n/spec.md).
- PR #747 — concurrency throttling for the FS reads.
- PR #753 — refactor to centralize all listing reads through
  `getCachedItems`.
