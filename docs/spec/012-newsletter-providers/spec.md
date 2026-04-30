---
id: spec-012-newsletter-providers
title: 'Spec 012 — Newsletter Providers'
sidebar_label: '012 Newsletter'
---

# Feature spec — `012-newsletter-providers`

> **Status:** Shipped. Retroactive spec.

## 1. Summary

Newsletter signup integration sitting behind an adapter
(`NewsletterProvider`) so adopters can wire Resend, Mailchimp,
ConvertKit, Loops, Substack-via-API, etc. without touching the signup
form. The default provider is **Resend** (transactional + broadcast
campaigns).

## 2. Motivation

- Almost every directory grows a newsletter audience; offering this out
  of the box is high leverage.
- A single signup form must work regardless of provider.

## 3. Goals

- A `NewsletterProvider` interface in
  [`apps/web/lib/newsletter/`](../../apps/web/lib/newsletter).
- Resend implementation + admin email-from configuration.
- Public signup form with double opt-in flow when supported.
- Server action with validated payload via Zod.

## 4. Non-Goals

- Campaign builder UI.
- Segmenting subscribers by behaviour.

## 5. User Stories

```text
As a visitor, I want to subscribe to the directory newsletter from any
page that includes the signup form.

As an admin, I want to plug in my own newsletter provider via env vars
without redeploying the form code.
```

## 6. Acceptance Criteria

- [x] AC-1: Provider interface defined.
- [x] AC-2: Resend implementation works.
- [x] AC-3: Form validates email; shows success / error toasts.
- [x] AC-4: Admin Settings includes newsletter section.
- [x] AC-5: E2E:
  `apps/web-e2e/tests/public/newsletter.spec.ts`.

## 7. Out-of-Scope Considerations

- Subscriber-only content gating.

## 8. UX Notes

- Localised strings.
- Inline errors with `aria-live`.

## 9. Data & API Surface

- `subscribers` table or provider-managed list.
- API: `POST /api/newsletter/subscribe`.

## 10. Plugin / Adapter Impact

Migration target. Each provider becomes a plugin in
`packages/plugin-newsletter-<name>/`.

## 11. Risks & Open Questions

- **Open:** persist subscribers in our DB even when an external
  provider is configured? Default: **mirror via DB row for audit**.

## 12. Acceptance Test Plan

`apps/web-e2e/tests/public/newsletter.spec.ts`.

## 13. References

- Constitution Articles I (future), II, III, IV, VII.
