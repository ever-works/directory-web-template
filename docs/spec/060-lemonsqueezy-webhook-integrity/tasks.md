---
id: tasks-060-lemonsqueezy-webhook-integrity
title: Tasks 060 — LemonSqueezy webhook integrity and list access
sidebar_label: 060 Tasks
---

# Tasks — `060-lemonsqueezy-webhook-integrity`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

- [x] **T-001** `apps/web/lib/payment/lemonsqueezy-webhook.ts`: raw-body HMAC-SHA256 check with a constant-time
  compare; parse the verified text (R1–R2).
- [x] **T-002** `apps/web/app/api/lemonsqueezy/webhook/route.ts`: read the body once, verify, dispatch; 503 on a
  failed write so the event is redelivered; bounded per-pod redelivery set (R4).
- [x] **T-003** `apps/web/lib/payment/lemonsqueezy-variant-{catalog,plan}.ts`: server-side variant → plan catalog
  from the pricing sources; unknown or doubly configured variants map to nothing (R9).
- [x] **T-004** `apps/web/lib/payment/lemonsqueezy-subscription-events.ts`: create needs a plan variant; updates and
  invoices touch existing rows only (`createIfMissing: false`); sponsor ads by variant and binding (R3, R6–R8,
  R11, R13).
- [x] **T-005** `apps/web/lib/payment/lemonsqueezy-checkout-params.ts` + `apps/web/app/api/lemonsqueezy/checkout/route.ts`:
  server-built custom data; only `variantId` and `dark` from the body (R10).
- [x] **T-006** `apps/web/app/api/lemonsqueezy/{update-plan,update}/route.ts`: catalog plan variants only, 400 otherwise (R12).
- [x] **T-007** `apps/web/lib/payment/lemonsqueezy-list-access.ts` + `apps/web/app/api/lemonsqueezy/list/route.ts`: session
  email; another email only for a live admin (R5).
- [x] **T-008** Unit specs in `test:unit`: `lemonsqueezy-webhook.spec.ts`, `lemonsqueezy-plan-integrity.spec.ts`,
  `lemonsqueezy-checkout-wiring.spec.ts`, `sponsor-ad-subscription.spec.ts`.
- [x] **T-009** Docs: spec 060, index row, Q-060a/Q-060b in `docs/questions.md`,
  `docs/api/lemonsqueezy-deep-dive.md`, `docs/log.md`.
- [x] **T-010** Verified-email user fallback (R14) and acknowledged payment failure for a missing row (R15);
  `lemonsqueezy-webhook-followups.spec.ts`.
- [ ] **T-011** Persisted event ids for cross-pod de-duplication (Q-060a, needs a migration).
