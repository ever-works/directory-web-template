---
id: spec-044-public-payment-config
title: Spec 044 — Public payment config served at runtime (/api/payment/public-config)
sidebar_label: 044 Public Payment Config
---

# Feature spec — `044-public-payment-config`

## 1. Summary

Let the browser obtain its **public** payment configuration — Stripe
publishable key, `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`, `NEXT_PUBLIC_DEMO` and
the list of configured checkout providers — from the server **at request time**
via a new `GET /api/payment/public-config` route and a `usePublicPaymentConfig()`
React Query hook, instead of relying on `process.env.NEXT_PUBLIC_*` having been
inlined into the client bundle at build time. Build-time values remain the
first-paint default and the fallback, so deployments that do inline them
(Vercel, local, demo) behave exactly as before.

## 2. Motivation

Platform-deployed k8s Works are built by `.github/workflows/k8s-build.yml`
**once, with no per-Work environment**. Next.js only inlines `NEXT_PUBLIC_*`
values it can see at `next build`, so the resulting client bundle has
`undefined` for every public payment key. At runtime the server process does
receive the values (spec 040 mounts the `${slug}-runtime-env` Secret via
`envFrom`), but nothing ever told the browser.

Client code read the env directly:

- `components/context/LayoutThemeContext.tsx` — `getConfiguredProviders()`
  detected Stripe / LemonSqueezy / Polar from `NEXT_PUBLIC_*` keys → always
  `[]` on k8s → `usePaymentAvailability().isPaymentConfigured === false` →
  **only the FREE plan card rendered** on `/pricing`.
- `components/payment/stripe-payment-modal.tsx` — read
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and its `useEffect` fired
  `onError(new Error('Payment system is not configured. Please contact support.'))` **on mount even when the modal was closed** → the red "Payment
  failed: Payment system is not configured" toast every visitor saw on
  `/pricing` load.
- `components/dashboard/add-payment-method-modal.tsx` — module-level
  `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)`.
- `hooks/use-stripe-products.ts` — `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` gate for
  `/api/stripe/products`; `lib/utils.ts isDemoMode()` from `NEXT_PUBLIC_DEMO`,
  used by `hooks/use-payment-availability.ts`.

Net effect on every platform-deployed directory (e.g.
`https://timetrack.ever.works/pricing`): FREE-only pricing and an error toast,
even though the server had `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the
publishable key.

Primary user: operators of platform-deployed Works (and their visitors). Fork
maintainers on Vercel are unaffected.

## 3. Goals

- A platform-deployed Work whose **runtime** env has the Stripe publishable key
  (+ secret key etc.) renders paid plans on `/pricing`, opens the Stripe
  payment modal with Stripe.js loaded, and lists Stripe as a configured
  provider in Settings → Checkout provider — with **no rebuild**.
- A closed `PaymentFormModal` must never toast. The "not configured" error
  only fires while the modal is open and after the runtime config fetch has
  settled.
- `process.env` fallback everywhere: builds that inline `NEXT_PUBLIC_*` render
  correctly on first paint (no flash, no extra wait), and if the new route is
  unavailable the client degrades to exactly the pre-044 behaviour.
- The route returns **public values only** — never `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET` or any other secret — and is never cached
  (`force-dynamic`, `Cache-Control: no-store`).
- One small fetch per page load (shared React Query cache, 5-minute stale
  time); no new dependencies.

### Non-goals

- Changing how the k8s image is built (per-Work builds, `NEXT_PUBLIC_*` at
  build time) — the platform intentionally builds one image.
- Making _every_ `NEXT_PUBLIC_*` runtime-aware. Only the payment surface is in
  scope; `lib/utils.ts isDemoMode()` keeps its env semantics for non-React
  callers (header badge, seed script, auth forms).
- Solidgate provider detection. `getConfiguredProviders()` never detected
  Solidgate from a public key before this spec; the route mirrors the existing
  Stripe / LemonSqueezy / Polar logic unchanged.
- Server-side payment configuration (`payment-provider-manager.ts`,
  `payment.schema.ts`) — already reads runtime env and is untouched.

## 4. Approach

- **Shared pure reader** `apps/web/lib/payment/public-config.ts` —
  `readPublicPaymentConfigFromEnv()` builds
  `{ stripePublishableKey, dynamicPricing, demo, configuredProviders }` from
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? STRIPE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING === 'true'`, `NEXT_PUBLIC_DEMO === 'true'`
  and the same per-provider public-key presence checks
  `LayoutThemeContext.getConfiguredProviders()` used (Stripe = publishable key,
  LemonSqueezy = any `NEXT_PUBLIC_LEMONSQUEEZY_*_VARIANT_ID`, Polar = any
  `NEXT_PUBLIC_POLAR_*_PLAN_ID`). `mergePublicPaymentConfig(primary, fallback)`
  layers a server response over the build-time env (scalars: primary wins when
  present; providers: union in canonical order; unknown values dropped). No
  server-only imports; no secret reads.
- **Route** `apps/web/app/api/payment/public-config/route.ts` —
  `export const dynamic = 'force-dynamic'`, `revalidate = 0`,
  `Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0`;
  `GET` returns `NextResponse.json(readPublicPaymentConfigFromEnv())`.
  Documented with the repo's swagger JSDoc style.
- **Hook** `apps/web/hooks/use-public-payment-config.ts` —
  `usePublicPaymentConfig()` = `useQuery` on `['payment','public-config']`
  with `initialData` from the build-time env (`initialDataUpdatedAt: 0` so the
  runtime fetch still happens on mount), `staleTime` 5 min, `retry: 1`.
  Returns `{ config, isResolved, isFetching, isError }` where `config` is the
  merged runtime-over-env value. Falls back to the shared browser
  `QueryClient` when rendered outside a `QueryClientProvider` (the root
  `app/layout.tsx` renders `LayoutThemeProvider` without one). Helpers
  `useStripePublishableKey()`, `useStripeDynamicPricingEnabled()`.
- **Consumers**
    - `LayoutThemeContext.tsx` — `CheckoutProvider` aliases
      `PublicPaymentProvider`; `useCheckoutProviderManager` takes
      `configuredProviders` from the hook (build-time env on first paint →
      runtime list once fetched); the non-React `getConfiguredProviders()` used by
      `resetToDefaults()` delegates to the shared reader (still browser-only).
    - `stripe-payment-modal.tsx` — publishable key from the hook; the error
      effect is guarded by `isOpen && !isFetching`.
    - `add-payment-method-modal.tsx` — `loadStripe(key)` memoised per instance
      from the runtime key; `null` keeps `<Elements>` inert when unknown.
    - `use-stripe-products.ts` — `useStripeProducts` / `useDynamicPricingStatus`
      default to `useStripeDynamicPricingEnabled()`; the plain
      `isStripeDynamicPricingEnabled()` stays exported (build-time only, doc'd).
      `use-pricing-section.ts` switched to the hook.
    - `use-payment-availability.ts` — `demo` from the hook; keeps the SSR
      default (all plans visible) until hydration **and** the first runtime
      fetch settled, so k8s builds don't flash "FREE only" before the provider
      list arrives.
- **SSR parity** — providers are only detected in the browser (as before), so
  server-rendered markup never assumes a provider; the other three fields are
  read from `process.env` on both sides exactly as before for inlined builds.

## 5. Acceptance

- `curl https://<work>/api/payment/public-config` → `200`,
  `content-type: application/json`, `cache-control: …no-store…`, body has
  exactly `stripePublishableKey | dynamicPricing | demo | configuredProviders`,
  no `sk_…` / `whsec_…` substrings
  (`apps/web-e2e/tests/api/payment-public-config.spec.ts`).
- Platform-deployed Work with Stripe runtime env: `/pricing` shows FREE +
  STANDARD + PREMIUM, no error toast on load; choosing a paid plan opens the
  Stripe modal with the card form; Settings → Checkout provider lists Stripe
  as configured.
- Platform-deployed Work **without** any payment env: `/pricing` shows FREE
  only, no toast (LIVE mode, unchanged from today's intent).
- Vercel / local build with `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` inlined:
  behaviour byte-for-byte identical on first paint; the confirm fetch returns
  the same values.
- Route unreachable (e.g. 404 behind a stale proxy): client behaves exactly
  as pre-044 (build-time env only), no uncaught errors.
- `apps/web-e2e/tests/public/pricing.spec.ts` (h1 + monthly/yearly toggle)
  still passes.

## 6. Rollout

- Ships in one PR on `develop`; no migration, no env change required. Existing
  `.env` files keep working; `.env.example` only gains a comment.
- k8s Works pick it up on their next image rebuild from `develop` (the
  platform's `k8s-build.yml`); no per-Work action.
- Rollback = revert the PR; the route is additive and consumers fall back to
  env.

## 7. Open questions

- Should the server-rendered `[locale]/layout.tsx` also pass the config as a
  prop (zero extra request, no post-hydration flip) in addition to the route?
  Default for now: **no** — the route + hook is sufficient, keeps the shape
  consistent with `useStripeProducts`, and the one-time fetch is tiny. Revisit
  if the post-fetch re-render becomes visible in the field.

## 8. Related

- `docs/spec/040-k8s-deploy-runtime-env/spec.md` — the `${slug}-runtime-env`
  Secret that gives the server process its runtime env on k8s.
- `docs/payment/stripe.md` — "Publishable key from the runtime environment" tip.
- ever-works monorepo `.github/workflows/k8s-build.yml` (platform side; builds
  the image once without per-Work env).
