---
id: spec-008-analytics-providers
title: 'Spec 008 — Analytics Providers'
sidebar_label: '008 Analytics Providers'
---

# Feature spec — `008-analytics-providers`

> **Status:** Shipped (PR #685, #686, #692). Retroactive spec.
> **Future direction:** reference migration target for plugin architecture
> per [`002`](../002-plugin-architecture/spec.md).

## 1. Summary

Multi-provider analytics with **PostHog**, **Google Analytics**,
**Plausible**, **DataFast**, **Jitsu**, and **Segment**. Each provider can
be independently enabled / disabled via env vars **and** a deep-merging
admin UI section. A typed event API is exposed by
[`apps/web/lib/analytics/`](../../apps/web/lib/analytics) and reused
across the codebase to track key user events.

## 2. Motivation

- Different adopters use different analytics tools; locking in one is a
  non-starter.
- Engineering hygiene: typed events prevent “string typo” drift between
  client tracking and dashboards.
- The admin UI lets non-developers turn providers on/off without redeploys.

## 3. Goals

- Typed event API with Zod-validated payloads.
- Per-provider enable toggle (`enabled: true` in Zod schema; PR #685).
- Admin Analytics Settings section with deep-merge logic (env baseline +
  DB overrides; PR #686).
- All key user events emitted: page views, item interactions, sign-up,
  comments, votes, favourites (PR #692).
- Strict CSP that allows the script origins of enabled providers (PR
  #691).

## 4. Non-Goals

- Server-side event aggregation pipeline (future spec).
- Anonymisation policy beyond what each provider supports.

## 5. User Stories

```text
As an admin, I want to flip a single switch to enable Plausible without
redeploying the site.

As an engineer, I want a typed `track('item.viewed', { id, slug })`
function so my events match a known schema.
```

## 6. Acceptance Criteria

- [x] AC-1: Each provider has an explicit `enabled` toggle in its Zod
  schema.
- [x] AC-2: Admin Settings has an Analytics section.
- [x] AC-3: Deep merge precedence: env vars < DB settings < explicit
  override.
- [x] AC-4: Typed events module under `apps/web/lib/analytics/events.ts`
  (or equivalent).
- [x] AC-5: CSP permits enabled providers and blocks the rest.
- [x] AC-6: i18n keys for every UI string under
  `apps/web/messages/en.json`.

## 7. Out-of-Scope Considerations

- Custom provider beyond the six supported (future plugin).
- Cookieless analytics enforcement (provider-dependent).

## 8. UX Notes

- Settings panel is disabled if `enabled=false`.
- All toggles describe the data they collect for compliance clarity.

## 9. Data & API Surface

- `analytics_settings` row in DB with deep-merged JSON.
- Event API in TS.

## 10. Plugin / Adapter Impact

Reference migration target. Each provider becomes a plugin in
`packages/plugin-analytics-<name>/`. Tracked under
[`002/tasks.md` → T-011](../002-plugin-architecture/tasks.md).

## 11. Risks & Open Questions

- **Risk:** misconfigured CSP breaks production. Mitigation: test in PR
  preview environments.
- **Open:** consent banner integration. Default: **none yet, plugin
  later**.

## 12. Acceptance Test Plan

- `apps/web-e2e/tests/admin/settings.spec.ts` (Settings UI).
- Manual: enable provider, verify network calls.
- New e2e to add (see Spec 010 backlog): typed event emission per route.

## 13. References

- PR #685, #686, #691, #692.
- Constitution: I (future plugin), II, III, IV, V (no perf regressions),
  VI, VII.
