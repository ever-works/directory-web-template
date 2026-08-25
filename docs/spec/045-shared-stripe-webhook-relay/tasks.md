---
id: tasks-045-shared-stripe-webhook-relay
title: Tasks 045 — Shared Stripe webhook relay
sidebar_label: 045 Tasks
---

# Tasks — `045-shared-stripe-webhook-relay`

> **Spec:** [`spec.md`](./spec.md)
>
> **Plan:** [`plan.md`](./plan.md)

## Task list

- [x] T-001: retain the nine `work_id` metadata-routing cases under the Node test harness.
- [x] T-002: lift the direct webhook handlers and make both routes use the shared dispatcher.
- [x] T-003: add the platform HMAC route without removing the legacy direct route.
- [x] T-004: remember only successfully fulfilled event ids; return retryable 502 failures while reserving 503 for unprovisioned sites.
- [x] T-005: format Stripe integer amounts before the payment email boundary.
- [x] T-006: add Node and Playwright API security coverage.
- [x] T-007: keep generated OpenAPI discovery working after the handler lift.
- [x] T-008: document the route, rollout, verification, data impact, and rollback.
- [ ] T-009: merge PR #1037 and verify its develop, stage, and production deployments.

## Acceptance Criteria → Task Map

| AC         | Tasks        |
| ---------- | ------------ |
| AC-1, AC-6 | T-002, T-003 |
| AC-2       | T-003, T-006 |
| AC-3, AC-4 | T-004, T-006 |
| AC-5       | T-005, T-006 |

## Rollback

Disable relay delivery at the Ever Works platform and re-enable the retained
legacy Stripe endpoint. No schema or customer data migration is involved.
