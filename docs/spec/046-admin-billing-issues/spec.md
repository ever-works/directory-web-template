---
id: spec-046-admin-billing-issues
title: Spec 046 — Admin billing issues and refunds
sidebar_label: 046 Admin billing issues
---

# Feature spec — `046-admin-billing-issues`

## 1. Summary

An admin can see every payment problem the site knows about in one place —
`/admin/billing-issues` — and act on it: mark it resolved or dismissed, or issue
a refund through whichever payment provider took the money.

## 2. Motivation

The template already collects everything needed to spot a billing problem: the
`subscriptions` table records `failed_payment_count`, `status`, `payment_provider`
and the provider invoice id, and every payment provider adapter already implements
`refundPayment(paymentId, amount?)`. None of it was reachable. A failed renewal
sent the customer an email and then vanished, and the refund seam had **zero
callers** — an operator's only recourse was the provider's own dashboard, one
provider at a time, with no record on the site.

Jira: [EW-116](https://evertech.atlassian.net/browse/EW-116).

## 3. Goals

- One admin queue for failed payments, disputes, refund requests, and
  subscriptions stuck in a bad state.
- Refund from that queue through the provider named on the payment record.
- Mark an issue resolved or dismissed, with a note and the acting admin recorded.
- Populate the queue from the payment records the site already stores, and from
  the failed-payment webhook, without a separate ingestion service.

## 4. Non-Goals

- A new payment abstraction. Money state stays on `subscriptions`; this feature
  adds triage state only.
- Provider-side reconciliation or a scheduled poller.
- Customer-facing refund requests. Only an admin can open or close an issue in
  this slice.
- LemonSqueezy refunds, which its adapter cannot perform (dashboard-only).

## 5. User Stories

As an admin, I want to see payment problems in one queue so that a failed charge
does not sit unnoticed.

As an admin, I want to refund a customer without leaving the site so that the
refund and the reason for it are recorded together.

As an admin, I want to mark an issue resolved with a note so that the next admin
knows what already happened.

## 6. Acceptance Criteria

- [x] AC-1: a "Billing Issues" entry exists in the admin dashboard grid and in the
      admin profile menu, pointing at `/admin/billing-issues`.
- [x] AC-2: the page lists issues with status, type, provider, amount, customer
      and the reason the issue was raised, filterable by status, type and provider
      and searchable by customer, payment or subscription.
- [x] AC-3: an admin can issue a full or partial refund from a row, executed
      through the provider on the underlying payment record.
- [x] AC-4: an admin can mark an issue `in_review`, `resolved` or `dismissed`,
      with an optional note; the acting admin and timestamp are stored.
- [x] AC-5: a refund is only recorded on the issue after the provider call
      succeeds, and a refunded issue can never be moved to another status.
- [x] AC-6: the queue is populated from the stored payment records on demand
      (idempotently) and from the failed-payment webhook as it arrives.
- [x] AC-7: every route is admin-gated; the refund route additionally requires a
      resolved session so the acting admin id can be stamped.
- [x] AC-8: refunds and closures are written to the subscription history and the
      activity log.

## 7. Out-of-Scope Considerations

Disputes are modelled (`type = 'dispute'`) but Stripe's `charge.dispute.*` events
are not yet mapped in `stripe-event-map.ts`; a dispute issue can be raised
manually or by the re-scan today. Mapping those events is a follow-up to this
spec, not a new one.

## 8. UX Notes

The page reuses the admin shell exactly as `/admin/reports` does: `Container`,
`AdminStatusTabs`, `AdminFilterPopover`, `AdminActiveFilters`, `AdminSearchBar`,
`useAdminFilters` and `UniversalPagination`. Row actions open one dialog carrying
both the status control and the refund control, so the admin never has to guess
which button moves money. The refund button is two-step: the first click reveals
a confirm button labelled with the exact amount.

All copy is `next-intl` under `admin.ADMIN_BILLING_ISSUES_PAGE`, present in all
21 locale files.

## 9. Data & API Surface

New table `billing_issues` (migration `0040_admin_billing_issues.sql`): references
`users` and (nullably) `subscriptions`, with `type`, `status`, `payment_provider`,
`provider_payment_id`, `amount`, `currency`, `detection_reason`, `source_key`,
`refund_id`, `refund_amount`, `refunded_at`, `resolution_note`, `resolved_by`,
`resolved_at`, `tenant_id`. A unique index on `(tenant_id, source_key)` makes
detection idempotent.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/admin/billing-issues` | GET | Filtered, paginated list |
| `/api/admin/billing-issues` | POST | `{action:'sync'}` re-scan, or create one manually |
| `/api/admin/billing-issues/stats` | GET | Counts by status/type/provider + amount at risk |
| `/api/admin/billing-issues/{id}` | GET | One issue with its payment context |
| `/api/admin/billing-issues/{id}` | PATCH | Set status + resolution note |
| `/api/admin/billing-issues/{id}/refund` | POST | Refund via the record's provider |

`PATCH` deliberately rejects `status: 'refunded'`: only a successful provider call
may set it, so the row can never claim a refund that did not happen.

**Currency units.** Every amount this feature stores or accepts is in the smallest
currency unit (integer cents), matching `subscriptions.amount`. Every
`PaymentProviderInterface.refundPayment` implementation, however, takes a *major*
unit amount and multiplies by 100 itself (`stripe-provider.ts` →
`Math.round(amount * 100)`; the same in the Polar and Solidgate adapters) and
returns `refund.amount / 100`. The conversion therefore happens once, at the
provider call in `billing-issue.service.ts`; passing cents through unconverted
would refund 100× the intended amount.

**Refund target.** `POST .../refund` accepts an optional `providerPaymentId` that
overrides the reference stored on the issue and is persisted when the refund
succeeds. Detection can only fill that column from what the site stores
(`subscriptions.invoice_id`), and Stripe's `refunds.create` takes a payment intent
rather than an invoice id, so the dialog exposes the reference as an editable
field and an admin holding the real charge id from the provider dashboard can
supply it instead of hitting a dead end. The failed-payment webhook prefers the
invoice's `payment_intent` when Stripe expanded one.

## 10. Plugin / Adapter Impact

None. The refund resolves its provider through the existing
`getOrCreateProvider(name)` factory, so any provider added to that factory later
becomes refundable here with no further change.

## 11. Risks & Open Questions

- A provider refund that succeeds while the follow-up row update fails would leave
  the issue open against a refunded payment. The provider call is therefore last
  before the write, and the write is a single statement.
- LemonSqueezy answers 409 with an instruction rather than attempting a refund.
- Webhook intake is best-effort by design: a failure there must not make the relay
  retry an already-fulfilled payment, and the re-scan recovers the row anyway.

## 12. Acceptance Test Plan

Playwright specs `apps/web-e2e/tests/admin/billing-issues.spec.ts` (admin sees the
page and its controls; client and anonymous are gated) and
`apps/web-e2e/tests/api/admin-billing-issues-query.spec.ts` (the full query
surface cannot bypass the gate; the refund route rejects anonymous callers, bad
amounts and unknown issues before any provider call). Both new routes are added to
the admin route and API coverage matrices.

## 13. References

- Related spec: [004 payment providers](../004-payment-providers/spec.md)
- Related spec: [047 admin payment reports](../047-admin-payment-reports/spec.md)
- Plan: [`plan.md`](./plan.md) · Tasks: [`tasks.md`](./tasks.md)
