---
id: plan-058-duplicate-submission-guard
title: Plan 058 — Duplicate submission guard
sidebar_label: 058 Plan
---

# Plan — `058-duplicate-submission-guard`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

- `apps/web/lib/utils/source-url.ts` (pure, no framework imports): `normalizeSourceUrl()`
  builds a comparison key (`host[:port]/path?sorted-kept-params`) and
  `findItemBySourceUrl()` returns the first `pending` / `approved` item with the same key.
- `ClientItemRepository.createAsClient` reads the existing items with
  `ItemRepository.findAll()` (soft-deleted items are excluded by default), looks for a
  match before generating the slug, and throws `DuplicateSourceUrlError`. Only an
  `approved` match carries its slug.
- `POST /api/client/items` maps that error to a 409. No schema, setting, dependency or
  UI change.

## Risks

- **A shared homepage.** Two different items that legitimately point at the same page
  (for example two products of one vendor linked to its homepage) now conflict. Mitigated
  by exact-page matching (R2) and by the 409 message; a maintainer can still add such an
  item from the admin side.
- **Cost.** One extra read of the item list per submission, which is infrequent and
  already walks the same list for the slug check.

## Constitution Check

- [x] **I — Plugin-First** — not applicable; core submission path.
- [x] **II — TypeScript Everywhere** — helper, repository, route and spec are TypeScript.
- [x] **III — Spec Before Code** — spec, plan and tasks exist.
- [x] **IV — Documentation First-Class** — spec folder, index row and `docs/log.md` entry.
- [x] **V — Performance Budget** — O(n) over the item list on a rare write path.
- [x] **VI — Latest Stable Frameworks** — no changes.
- [x] **VII — Reuse Before Build** — uses the global `URL`; no new dependency.
- [x] **VIII — No Removal Without Migration** — additive; valid new links are accepted as before.
- [x] **IX — Test Coverage Bar** — unit spec in `test:unit`. A Playwright API spec for the 409 needs a seeded data repository and was not added (see tasks).
- [x] **X — Modular Packages** — no package changes.

## Follow-ups

1. Apply the same check to `PATCH /api/client/items/:id` when `source_url` changes.
2. Apply it to admin create and bulk import, as a warning rather than a block.
3. Per-user submission rate limit / pending cap.
