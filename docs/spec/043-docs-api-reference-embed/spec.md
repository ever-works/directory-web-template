---
id: spec-043-docs-api-reference-embed
title: Spec 043 — /docs API reference embed (route-scoped frame + CSP headers)
sidebar_label: 043 Docs API Reference Embed
---

# Feature spec — `043-docs-api-reference-embed`

## 1. Summary

Make the `/docs` page actually show the embedded Scalar API reference. `/docs`
renders `<iframe src="/api/reference">`; `/api/reference` is served by
`@scalar/nextjs-api-reference` and loads its browser bundle from jsDelivr. The
global security headers in `next.config.ts` (`X-Frame-Options: DENY`, CSP
`frame-ancestors 'none'`, `script-src` without any CDN) apply to **every**
route, so the browser refused to render the frame and — when `/api/reference`
was opened directly — refused to load Scalar's script. Every deployed directory
(`demo.ever.works`, `timetrack.ever.works`, …) showed an empty "blocked" frame
under the "API Documentation" heading; the footer links there as "API
Documentation".

## 2. Motivation

Observed 2026-08-22 on `timetrack.ever.works/docs` (Chromium console):

- `Framing 'https://timetrack.ever.works/' violates the following Content
  Security Policy directive: "frame-ancestors 'none'"` → `net::ERR_BLOCKED_BY_RESPONSE`
  for `/api/reference`.
- On `/api/reference` itself: `Loading the script
  'https://cdn.jsdelivr.net/npm/@scalar/api-reference' violates … "script-src …"`
  → `#app` stays empty.

Neither the page nor the handler is wrong; the one-size-fits-all header policy
is. The fix must not loosen the policy for the rest of the site.

## 3. Goals

- `/docs` renders the interactive API reference inside its same-origin iframe.
- `/api/reference` works when opened directly.
- Every other route keeps `X-Frame-Options: DENY` / `frame-ancestors 'none'`
  and the existing CSP (the `security-headers.spec.ts` matrix stays green).
- Regression-proof: e2e asserts the route's headers and that the iframe
  document mounts.

### Non-goals

- Self-hosting the Scalar bundle (would need `@scalar/api-reference` shipped
  under `public/` — a new dependency; the jsDelivr default is what the adapter
  ships with).
- Replacing the iframe with an inline React mount.
- The `/docs` `<title>` ("… - Ever Works Template") — follows spec 042's
  site-identity helpers once that lands.

## 4. Approach

`apps/web/next.config.ts` `headers()` gets a second entry after the global
`/(.*)` one. Next.js applies every matching entry and the **last value wins per
header key**, so this narrows the policy for exactly one route:

```ts
{
  source: '/api/reference',
  headers: [
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Content-Security-Policy', value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; " +
      "connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'self';" }
  ]
}
```

- `frame-ancestors 'self'` + `SAMEORIGIN`: only the site itself may frame it.
- `script-src`/`style-src`/`font-src` allow the Scalar CDN (and Google Fonts,
  which Scalar's default theme references); `connect-src https:` lets the
  "Try it" client call the documented APIs and fetch `/openapi.json`;
  `worker-src blob:` for Scalar's workers.
- All other headers (nosniff, Referrer-Policy, HSTS, X-DNS-Prefetch-Control)
  are inherited from the global entry.

e2e: `apps/web-e2e/tests/api/reference.spec.ts` asserts
`x-frame-options: SAMEORIGIN`, `frame-ancestors 'self'` and `cdn.jsdelivr.net`
on `/api/reference`; `apps/web-e2e/tests/public/docs.spec.ts` asserts the
iframe points at `/api/reference` and that the framed document's `#app` mounts
(the Scalar markup is part of the served HTML, so this does not depend on CDN
reachability in CI).

## 5. Acceptance

- `curl -I https://<site>/api/reference` → `x-frame-options: SAMEORIGIN`,
  CSP contains `frame-ancestors 'self'` and `https://cdn.jsdelivr.net`.
- `https://<site>/docs` shows the Scalar UI (sidebar + endpoints) in Chromium
  with no `ERR_BLOCKED_BY_RESPONSE` / CSP console errors for the frame.
- `curl -I https://<site>/` still returns `x-frame-options: DENY` and the
  unchanged global CSP.

## 6. Rollout

Normal `develop → stage → main` cascade; deployed Works pick it up on their next
website-template auto-update + redeploy (see Workspace runbook
`EVER_WORKS_DIRECTORY_BRANDING.md` for the propagation mechanics).
