---
id: plan-055-demo-banner
title: Plan 055 — Demo account banner
sidebar_label: 055 Plan
---

# Plan — `055-demo-banner`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

`apps/web/components/layout/demo-banner.tsx` is a client component.
`ConditionalLayout` renders it above `Header`. It reads `config.demo` from the
existing `usePublicPaymentConfig()` hook, which merges the server's runtime
values (`GET /api/payment/public-config`, `readPublicPaymentConfigFromRuntimeEnv`)
over the build-time env. No new route, setting or dependency.

The banner renders only once that request has succeeded (`isResolved && !isError`),
so the build-time env alone never shows it: not before the answer, and not when
the request fails. On the demo it appears once the answer arrives.

## Constitution Check

- **Plugin-first (§ "New surface area requires a slot").** Not met: see
  Complexity Tracking.
- **No new dependency, no removal:** met.
- **Runtime configuration over build-time:** met (R1).

## Complexity Tracking

| Violation | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| The banner is rendered directly in `ConditionalLayout`, not through a plugin slot | The slot runtime is not wired into the host app yet: no layout renders a `SlotHost` (Spec 002 / T-004 open), and `SLOT_IDS` has no slot above the header. A new slot id needs its own spec. | Building the host integration and a new slot for a one-line deployment notice would be a far larger change than the feature. The locale suggestion banner (Spec 019) sets the precedent of a notice rendered by the layout. Moving it is [Q-055a](../../questions.md). |
