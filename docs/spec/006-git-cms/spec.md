---
id: spec-006-git-cms
title: 'Spec 006 — Git-based CMS'
sidebar_label: '006 Git-based CMS'
---

# Feature spec — `006-git-cms`

> **Status:** Shipped. Retroactive spec.

## 1. Summary

Source directory **content** (items, categories, tags, collections,
pages) from a separate **Git repository** that contains YAML / Markdown
files. The web app clones / pulls this repo at build time and at boot via
`apps/web/scripts/clone.cjs`, then exposes a typed content API in
[`apps/web/lib/content.ts`](../../apps/web/lib/content.ts) consumed by
the rest of the app.

## 2. Motivation

- Operating a directory is a content-heavy job; shipping content in Git
  gives non-developers a clean workflow (PR + review) and a free CDN for
  static assets.
- Git-as-CMS keeps content versioned, branchable, and easy to back up.
- Decouples deployment cadence (`apps/web`) from content cadence (the
  data repo).

## 3. Goals

- A configurable `DATA_REPOSITORY` env var pointing to the content repo.
- Bootstrapped via `scripts/clone.cjs` into `.content/`.
- Hot reload during dev when content changes.
- Strongly typed content models in TypeScript.
- SEO-friendly slug generation and stable URL structure.

## 4. Non-Goals

- A web-based content editor — out of scope (future plugin).
- Real-time collaboration on content — out of scope.

## 5. User Stories

```text
As a content editor, I want to manage items by editing Markdown / YAML
files and opening a PR, so my workflow is the same as the engineering
workflow.

As a developer, I want strongly typed access to content so my IDE
catches typos.
```

## 6. Acceptance Criteria

- [x] AC-1: `DATA_REPOSITORY` env var clones into `.content/`.
- [x] AC-2: Content schema enforced via Zod.
- [x] AC-3: Items, categories, tags, collections supported.
- [x] AC-4: Build fails with a clear error when content is malformed.
- [x] AC-5: Public listing and item detail pages render content.
- [x] AC-6: Recent hardening landed in PR #690 (auth secret + content
  bootstrap).

## 7. Out-of-Scope Considerations

- Multiple data repos at once (future spec).
- Per-user write access to data repo (future plugin).

## 8. UX Notes

No direct UX; content drives the public surface.

## 9. Data & API Surface

- Filesystem-based read API in `lib/content.ts`.
- DB tables that mirror content for fast queries (Drizzle).
- Cache invalidation through `lib/cache-invalidation.ts`.

## 10. Plugin / Adapter Impact

`ContentSource` will become a plugin interface (per
[`002`](../002-plugin-architecture/spec.md)) so adopters can swap Git for
a headless CMS (Contentful, Sanity, Hygraph) without touching core.

## 11. Risks & Open Questions

- **Risk:** large data repos slow first build. Mitigated by shallow
  clone in `clone.cjs`.
- **Open:** add Hygraph adapter as a built-in plugin? Default: **wait
  until plugin SDK is stable**.

## 12. Acceptance Test Plan

- `apps/web-e2e/tests/public/discover.spec.ts`,
  `apps/web-e2e/tests/public/item-detail.spec.ts`,
  `apps/web-e2e/tests/public/categories.spec.ts`.

## 13. References

- `apps/web/scripts/clone.cjs` (bootstrap)
- `apps/web/lib/content.ts` (read API)
- Constitution: I (future plugin), II (TS), III (Spec), IV (Docs).
