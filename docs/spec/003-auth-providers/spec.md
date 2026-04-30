---
id: spec-003-auth-providers
title: 'Spec 003 — Authentication Providers'
sidebar_label: '003 Auth Providers'
---

# Feature spec — `003-auth-providers`

> **Status:** Shipped (Auth.js v5 with Supabase, Google, GitHub, Facebook,
> Twitter, Microsoft providers — see PR #690 for the most recent hardening).
> Retroactive spec.
> **Future direction:** migrate to plugin architecture per
> [`002-plugin-architecture`](../002-plugin-architecture/spec.md).

## 1. Summary

Provide flexible authentication for the directory using **Auth.js v5**
(NextAuth) plus the **Supabase Auth adapter** and an array of OAuth
providers (Google, GitHub, Facebook, Twitter, Microsoft) selectable via
environment variables. Sessions are stored in the application database via
the Drizzle adapter and respected by middleware-protected routes.

## 2. Motivation

- Directories typically support sign-in to enable submissions, comments,
  votes, and favourites — but template adopters have wildly different
  auth requirements.
- Centralising auth on Auth.js keeps the server-side surface uniform while
  letting users compose providers without rewriting the auth layer.

## 3. Goals

- Drop-in support for credential, magic-link, and OAuth providers.
- Per-environment selection of providers via env vars.
- Single source of truth for the current user session in server components,
  client components, and route handlers.
- Pluggable database adapter (Drizzle today, Supabase available).
- Strong defaults: secure cookies, `AUTH_SECRET` validation, CSRF
  protection.

## 4. Non-Goals

- Multi-tenant identity (per-tenant providers).
- Passkey / WebAuthn (future spec).
- SAML SSO (future spec).

## 5. User Stories

```text
As an end-user, I want to sign in with Google so that I do not need to
create yet another password.

As a site admin, I want to disable OAuth providers I am not using so the
sign-in page does not show empty buttons.

As a fork maintainer, I want to add a private OAuth provider without
modifying core code so my upstream stays clean.
```

## 6. Acceptance Criteria

- [x] AC-1: `apps/web/auth.config.ts` is the single configuration entry
  point.
- [x] AC-2: Providers enabled via `AUTH_<PROVIDER>_ENABLED=true` env vars.
- [x] AC-3: Sign-in page lists only enabled providers.
- [x] AC-4: Sessions persist via the Drizzle adapter when configured.
- [x] AC-5: Middleware (`apps/web/proxy.ts` / `middleware.ts`) protects
  authenticated routes.
- [x] AC-6: `AUTH_SECRET` is validated; missing values fail loudly at
  boot.
- [x] AC-7: Hardened cookie defaults (`COOKIE_SECRET`, `COOKIE_DOMAIN`,
  `COOKIE_SECURE`).
- [x] AC-8: E2E specs exist for register, signin, signout
  (`apps/web-e2e/tests/auth/`).

## 7. Out-of-Scope Considerations

- Custom auth UI per fork — the existing UI is reused; deeper
  customisation is a follow-up.

## 8. UX Notes

- Sign-in / register pages localised via `next-intl`.
- OAuth provider buttons render only when enabled.
- Error messages are localised and translated to user-friendly text.

## 9. Data & API Surface

- Drizzle tables: `users`, `accounts`, `sessions`, `verification_tokens`
  per the Auth.js Drizzle adapter contract.
- Supabase adapter alternative documented in
  [`docs/authentication/`](../../authentication/).

## 10. Plugin / Adapter Impact

Currently implemented as a hard dependency. Migration to plugin
architecture (`AuthProvider` adapter) tracked in
[`002-plugin-architecture/tasks.md`](../002-plugin-architecture/tasks.md).

## 11. Risks & Open Questions

- **Risk:** rotating `AUTH_SECRET` invalidates active sessions. Documented
  in `docs/authentication/`.
- **Open:** should we ship Passkey support? See `docs/questions.md`.

## 12. Acceptance Test Plan

- `apps/web-e2e/tests/auth/register.spec.ts`
- `apps/web-e2e/tests/auth/signin.spec.ts`
- `apps/web-e2e/tests/auth/signout.spec.ts`

## 13. References

- Constitution: I (Plugin-First, future migration), II (TypeScript), III
  (Spec), IV (Docs), VI (Latest Stable Frameworks).
- Auth.js: <https://authjs.dev>
