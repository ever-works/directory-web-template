---
id: plan-006-git-cms
title: 'Plan 006 — Git-based CMS'
sidebar_label: '006 Git CMS Plan'
---

# Implementation Plan — `006-git-cms`

> **Spec:** [`spec.md`](./spec.md)
>
> **Status.** Retroactive. Documents the shipped Git-based CMS and the
> plugin migration path.

## 1. High-Level Approach

Content (items, categories, tags, collections, pages) is sourced from a
**separate Git repository** pointed to by the `DATA_REPOSITORY` env var.
The bootstrap script `apps/web/scripts/clone.cjs` shallow-clones that
repo into `apps/web/.content/` at install / boot. The runtime read API
in `apps/web/lib/content.ts` parses YAML / Markdown frontmatter and
exposes typed accessors. A Drizzle mirror of the content (or a subset of
it) supports fast queries.

The forward direction is a `ContentSource` plugin interface. Today's
Git-clone path becomes `packages/plugin-content-git/`, and adopters can
write `plugin-content-{contentful,sanity,hygraph}` against the same
interface.

## 2. Architecture Diagram

```mermaid
flowchart LR
  Repo[(DATA_REPOSITORY git repo)] -->|shallow clone| Cache[.content/]
  Cache --> Reader[lib/content.ts]
  Reader --> Cache2[lib/cache-invalidation.ts]
  Reader --> Routes[app/[locale]/(listing)/**]
  Reader --> ItemDetail[app/[locale]/items/[slug]]
  Reader --> Categories[app/[locale]/categories/**]
  Reader --> Drizzle[(DB mirror)]
  subgraph Future
    SDK[ContentSource interface]
    GitPlug[plugin-content-git]
    HyPlug[plugin-content-hygraph]
  end
  SDK -. "future" .-> Reader
  GitPlug -. "implements" .-> SDK
  HyPlug -. "implements" .-> SDK
```

## 3. Affected Packages & Files

| Path                                            | Change      | Notes                                       |
| ----------------------------------------------- | ----------- | ------------------------------------------- |
| `apps/web/scripts/clone.cjs`                    | maintain    | Shallow clone bootstrap.                    |
| `apps/web/lib/content.ts`                       | maintain    | Typed read API.                             |
| `apps/web/lib/cache-invalidation.ts`            | maintain    | Cache layer.                                |
| `apps/web/.content/**`                          | git-ignored | Local clone target.                         |
| `apps/web/app/[locale]/items/**`                | maintain    | Item detail / listing routes.               |
| `apps/web-e2e/tests/public/{discover,item-detail,categories,collections,tags}.spec.ts` | maintain | Coverage. |
| `packages/plugin-content-git/`                  | future      | Plugin migration target.                    |
| `packages/plugin-content-hygraph/`              | future      | Optional adapter (Q-006a).                  |
| `docs/content-management/**`                    | maintain    | Operator docs.                              |
| `docs/spec/006-git-cms/{plan,tasks}.md`         | **this PR** | Catch up Spec Kit artefacts.                |

## 4. Public API / Plugin Manifest

Future SDK shape:

```ts
// packages/plugin-sdk/src/content-source.ts
export interface ContentSource {
  id: string;
  bootstrap?(): Promise<void>;
  listItems(filter?: ItemFilter): Promise<Item[]>;
  getItem(slug: string): Promise<Item | undefined>;
  listCategories(): Promise<Category[]>;
  listTags(): Promise<Tag[]>;
}
```

`plugin-content-git` ships with the template and is the default. Other
adapters live in their own packages.

## 5. Data Model

- Content schema enforced via Zod (existing).
- Drizzle mirror: `items`, `categories`, `tags`, `collections` tables.
- Migration: existing — see `apps/web/lib/db/schema/`.

## 6. UX & A11y Plan

No direct UX. Content drives the public surface (covered by spec 010).

## 7. Performance Plan

- Shallow clone keeps the data repo small.
- Content read API caches per-request; `lib/cache-invalidation.ts`
  handles invalidation on revalidate.
- Listing pages use Partial Prerendering / static rendering where
  feasible.

## 8. Security Plan

- `DATA_REPOSITORY` is read at boot only; no per-request fetches.
- Content files are static; no user-supplied templates execute.
- Build fails fast on schema violations.

## 9. Test Plan

- E2E: `tests/public/{discover,item-detail,categories,collections,tags}.spec.ts`
  exercise the read path.
- Manual: point `DATA_REPOSITORY` at an empty repo; build should fail
  with a clear message.

## 10. Rollout & Migration Plan

- Retroactive plan; no rollout.
- Plugin migration sequenced behind spec 002.

## 11. Constitution Check

- [x] **I — Plugin-First** — migration documented.
- [x] **II — TypeScript Everywhere** — TS read API; clone bootstrap is
  a `.cjs` script (legacy; will migrate to `.ts` via tsx in a follow-up).
- [x] **III — Spec Before Code** — this plan.
- [x] **IV — Documentation First-Class** — `docs/content-management/`.
- [x] **V — Performance Budget** — shallow clone + cache.
- [x] **VI — Latest Stable Frameworks** — Drizzle on latest.
- [x] **VII — Reuse Before Build** — `simple-git` / `gray-matter` reused.
- [x] **VIII — No Removal Without Migration** — Git path stays.
- [x] **IX — Test Coverage Bar** — content-driven specs exist.
- [x] **X — Modular Packages** — future plugin packages outlined.

## 12. Complexity Tracking

The bootstrap script is `.cjs` instead of `.ts`. Reason: it runs at
install before TypeScript compilation. Follow-up: move to `tsx` once a
guaranteed `tsx` resolution is available pre-install.

## 13. Open Questions

Mirrored to [`docs/questions.md`](../../questions.md):

- `Q-006a` Hygraph adapter as built-in plugin? — **default: wait until
  plugin SDK is stable**, then ship.

## 14. References

- Spec: `./spec.md`
- `apps/web/scripts/clone.cjs`
- `apps/web/lib/content.ts`
- Constitution Articles: I, IV, V, VII, IX.
