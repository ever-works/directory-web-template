---
id: spec-046-works-yml-pricing-config
title: Spec 046 — Provider-aware pricing configuration in works.yml
sidebar_label: 046 works.yml Pricing
---

# Feature spec — `046-works-yml-pricing-config`

## 1. Summary

Make the optional `pricing:` block of a data repository's `.works/works.yml` a
**documented, validated** contract: a complete published example covering every
field of `PricingPlanConfig` / `PricingConfig`, a Zod schema that checks the
block when the config is read, and clear per-field diagnostics when it is
malformed. Backward compatible in both directions — a `works.yml` with no
`pricing:` key behaves exactly as before, and unknown future keys are preserved
rather than rejected.

## 2. Motivation

The TypeScript structure has existed since PR #94: `PricingPlanConfig`
(`provider` + `plans.FREE` / `.STANDARD` / `.PREMIUM` + `currency` +
`lemonCheckoutUrl`) in `apps/web/lib/content.ts`, read by `getConfig()` and
consumed by `ConfigProvider`, `useSelectedCheckoutProvider`,
`use-pricing-section.ts` and `determinePaymentProvider()`.

What was missing is everything around it:

- **No complete example.** `docs/payment/payment.md` showed a five-field
  sketch. Twenty-two of the twenty-seven `PricingConfig` fields —
  `stripeProductId`, `annualPriceId`, `lemonVariantId`, `polar*PlanId`,
  `trialAmountId`, `isActive`, `isFeatured`, `disabled`, `envKey`, … — were
  documented nowhere, so an operator had to read the interface to author a
  block.
- **No validation.** `getConfig()` cast the YAML straight to `Config`.
  `price: "19"` (quoted, so a string), `interval: month`, a misspelled plan
  key — all reached the pricing page as an unusable card with no diagnostic in
  any log.
- **No accepted vocabulary for "no gateway".** EW-131 asks `provider` to accept
  `manual`; the enum only had gateway names, so `manual` silently became a
  provider nothing could instantiate.

## 3. Goals

- Publish a copy-ready `pricing:` block covering **every** field of the
  contract, and keep it from drifting from the code.
- Validate the block on read, naming each problem by its YAML path.
- Accept `stripe`, `lemonsqueezy`, `polar`, `solidgate` **and** `manual` for
  `provider`, case-insensitively.
- Accept `PRO` as an alias for the `STANDARD` plan key.
- Change nothing for the existing configs: a `works.yml` without `pricing:`,
  and every block that renders correctly today, must behave identically.

## 4. Non-Goals

- Adding `manual` to the `PaymentProvider` enum. That enum names gateways
  `PaymentProviderFactory` can build and `payment_provider` DB values reference;
  `manual` is the absence of one.
- Renaming the shipped `STANDARD` plan to `PRO`. `PaymentPlan.STANDARD`
  (EW-160) is the shipped vocabulary across the DB, the API and the UI; the
  ticket's `PRO` wording predates it and is honoured as an alias.
- Changing pricing-page rendering, checkout, or the built-in default plans.
- Writing the block into any canonical data repository (`awesome-data`,
  `awesome-time-tracking-data`) — those are separate repositories.

## 5. User Stories

As a directory operator, I want one documented list of every pricing field so
that I can author `.works/works.yml` without reading TypeScript.

As a directory operator, I want a mistyped price or interval to tell me which
line is wrong instead of silently rendering a broken plan card.

As a directory operator who takes payment outside the template, I want to
declare that in `works.yml` rather than leaving the provider blank.

## 6. Acceptance Criteria

- [x] AC-1: every field of `PricingPlanConfig` / `PricingConfig` is represented
      in the published example, and a compile-time check fails the build if a
      field is added to either interface without being added to the schema.
- [x] AC-2: the published example is valid YAML and is parsed by the test suite
      on every run, so it cannot drift from the schema.
- [x] AC-3: `provider` accepts `stripe`, `lemonsqueezy`, `manual` (plus the
      other shipped gateways `polar` and `solidgate`), in any case; anything
      else is a named error.
- [x] AC-4: `FREE`, `STANDARD` and `PREMIUM` are documented with the full
      metadata structure, and `PRO` is accepted as an alias for `STANDARD`.
- [x] AC-5: a malformed block is reported field by field and then ignored in
      favour of the built-in defaults — never fatal.
- [x] AC-6: a `works.yml` with no `pricing:` key, and blocks written against
      the previous shorter example, keep working unchanged.

## 7. Out-of-Scope Considerations

`provider: manual` resolves to "no gateway configured here", which is the same
state as a `works.yml` that names no provider. Whether the pricing page should
render a distinct manual-checkout call to action rather than the existing
DEMO / not-configured surface (spec 044) is a UX question left open — see
`docs/questions.md`.

## 8. UX Notes

No visible UI change and no new user-facing strings, so no localisation work.
The only new output is server-side `[CONTENT]` logging read by operators.

## 9. Status

Shipped — EW-131.
