---
id: tasks-016-typed-analytics-events
title: 'Tasks 016 — Typed Analytics Events'
sidebar_label: '016 Typed Events Tasks'
---

# Tasks — `016-typed-analytics-events`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Author Zod-typed event catalogue

- Files: `apps/web/lib/analytics/events.ts`.
- Verification: emitting an unknown event id fails to compile.

### T-002 [done] — Provider fan-out bus

- Files: `apps/web/lib/analytics/bus.ts`.
- Verification: enabling two providers causes both to receive every
  emission.

### T-003 [done] — Provider adapters share the bus contract

- Files: `apps/web/lib/analytics/providers/<name>.ts`.
- Verification: each adapter implements the same
  `forward(name, payload, context)` shape.

### T-004 [done] — Architecture documentation

- Files: `docs/architecture/analytics-layer.md`.
- Verification: page is reachable from `docs/index.md`.

### T-005 [seq] — Analytics-emission e2e (closes spec 010 AC-5)

- Files: `apps/web-e2e/tests/public/analytics-emission.spec.ts`,
  `apps/web-e2e/page-objects/public/AnalyticsPage.ts`.
- Steps:
  1. Capture outbound network requests to provider hosts.
  2. Visit canonical routes (home → category → item-detail).
  3. Assert ≥ 1 event per route per enabled provider.
- Verification: spec passes locally with a test PostHog key.

### T-006 [seq] — Migrate providers to plugins (per spec 002 / T-011)

- Files: `packages/plugin-analytics-<name>/**`.
- Verification: removing a provider package disables it without
  touching `lib/analytics/events.ts`.

### T-007 [seq] — Sampling for high-cardinality events (deferred)

- Files: `apps/web/lib/analytics/sampling.ts` (future),
  `docs/spec/NNN-analytics-sampling/` (future).
- Verification: spec lands; not part of this plan.

## Acceptance Criteria → Task Map

| AC    | Tasks               |
| ----- | ------------------- |
| AC-1  | T-001               |
| AC-2  | T-001               |
| AC-3  | T-002, T-003        |
| AC-4  | T-002               |
| AC-5  | T-004               |
| AC-6  | T-005               |

## Notes

- The typed event API is opinionated by design — every emitter must go
  through `events.ts`. Direct provider SDK calls are forbidden.
