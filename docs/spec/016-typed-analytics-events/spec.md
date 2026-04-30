---
id: spec-016-typed-analytics-events
title: 'Spec 016 — Typed Analytics Events'
sidebar_label: '016 Typed Analytics Events'
---

# Feature spec — `016-typed-analytics-events`

> **Status:** Shipped (PR #692). Retroactive spec.
> **Constitution articles invoked:** II (TypeScript), III (Spec Before Code,
> retroactively), IV (Documentation), V (Performance: minimal client cost),
> VII (Reuse Before Build).
> **Sibling spec:** [`008-analytics-providers`](../008-analytics-providers/spec.md)
> — defines the multi-provider plumbing this typed-events layer sits on top of.

## 1. Summary

Provide a **typed, central event API** the rest of the codebase calls instead
of provider-specific tracking calls. Every event has a Zod-validated payload,
a stable name, and a single emission call site. Providers consume the same
event stream; adding a new provider does not require touching tracked call
sites.

## 2. Motivation

- Tracking calls scattered across components are hard to audit, easy to typo,
  and a leading cause of dashboard drift.
- A typed event API converts compile-time guarantees into product-analytics
  hygiene — if a payload changes shape, every emission site fails to compile
  until updated.
- Removes the temptation to bypass the analytics module and call provider
  SDKs directly.

## 3. Goals

- A `track(event, payload)` (or `events.<name>(payload)`) API in
  [`apps/web/lib/analytics/`](../../../apps/web/lib/analytics) that is the
  **only** sanctioned way to emit analytics.
- Each event has a Zod schema in `events.ts` (or split per file), used both at
  compile time (TypeScript inference) and at run time (Zod validation in
  development; lightweight assertion in production).
- The full event catalogue is documented in `docs/architecture/analytics-layer.md`.
- Providers receive a normalised `{ name, payload, context }` triple and decide
  how to forward it.

## 4. Non-Goals

- Server-side event aggregation (warehouse pipeline) — out of scope.
- Anonymisation transforms beyond what each provider already does.
- A queryable event log inside the app (would be a future plugin).

## 5. User Stories

```text
As an engineer, I want `track('item.viewed', { id, slug })` to fail to compile
if I miss `slug`, so I cannot ship a broken event.

As a PM, I want a documented event catalogue so I know what to expect in our
analytics dashboards.

As an admin, I want to disable an analytics provider without losing the
events; the events should fan-out to whichever providers are enabled.
```

## 6. Acceptance Criteria

- [x] AC-1: A canonical `events` module exposes typed emitters for at least the
  following events: `page.viewed`, `item.viewed`, `item.favourited`,
  `item.unfavourited`, `item.upvoted`, `item.downvoted`, `comment.created`,
  `submission.created`, `submission.approved`, `submission.rejected`,
  `auth.signed-up`, `auth.signed-in`, `auth.signed-out`,
  `newsletter.subscribed`.
- [x] AC-2: Each emitter validates its payload via Zod in development; in
  production validation is conditional or stripped for cost.
- [x] AC-3: Emissions fan-out to every enabled provider in
  [`apps/web/lib/analytics/`](../../../apps/web/lib/analytics) without
  per-call branching.
- [x] AC-4: Provider initialisation uses the merged config from Spec 008
  (env < DB < override) and respects the `enabled` flag.
- [x] AC-5: Documented in `docs/architecture/analytics-layer.md` and
  cross-linked from `docs/index.md`.
- [ ] AC-6: An e2e spec verifies enabled providers receive events for each
  canonical route — tracked under
  [Spec 010 / Tasks T-006](../010-e2e-test-coverage/tasks.md#t-006-p--analytics-emission-spec).

## 7. Out-of-Scope Considerations

- Custom dashboards / queries on top of the event log.
- A/B-testing harness (could be a future plugin atop these events).

## 8. UX Notes

None — this is a developer-facing API.

## 9. Data & API Surface

- Module: `apps/web/lib/analytics/events.ts` (canonical types & emitters).
- Provider adapters live in
  `apps/web/lib/analytics/providers/<name>.ts`. Each adapter implements
  `forward(name, payload, context)`.
- A single `bus.ts` queues events and fans out to providers.

## 10. Plugin / Adapter Impact

Today the providers are hard-wired in `lib/analytics/providers/`. Migration
to the plugin architecture (Spec 002) replaces each provider with a
`packages/plugin-analytics-<name>/` package implementing the
`AnalyticsProvider` interface from `@ever-works/plugin-sdk`. The typed event
API stays put; only the provider plumbing moves. Tracked under
[Spec 002 / T-011](../002-plugin-architecture/tasks.md#t-011-seq-t-010--migrate-analytics-as-reference).

## 11. Risks & Open Questions

- **Risk:** runtime validation cost in hot paths. Mitigation: validate in
  dev, assert in prod. Measure on the item-detail page before shipping
  changes that add new events.
- **Open:** sample-rate analytics events for high-cardinality emitters
  (e.g. scroll). Default: **don’t emit scroll events at all** in v1.

## 12. Acceptance Test Plan

- Manual: enable PostHog test key, navigate canonical routes, confirm
  events arrive.
- E2E: see Spec 010 / T-006 above.

## 13. References

- PR #692 (typed events + integration).
- PR #685, #686 (multi-provider settings / admin UI).
- Constitution: II, III, IV, V, VII.
