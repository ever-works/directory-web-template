# Spec 027 — Fix post-register auto-login race

**Status:** shipped (in-flight at time of writing, pending merge)
**Owner:** template auth flow
**Discovered:** 2026-05-18 (reproduced on `https://demo.ever.works`)

## What

When a new user submits the register form on the production Template
deployment, the user record is created in the database but the user is
**not** logged in afterwards. Navigating to `/client/dashboard` or
`/client/profile/*` then redirects them back to `/auth/signin` even
though the client-side header avatar (via `useSession()`) shows them as
logged in. The user-visible symptom is "create account → get bounced
back to sign in", and the page they tried to visit appears to "hang on
loading" because the layout still renders while server-side `auth()`
returns null and bounces.

## Why this happens

The previous flow handed sign-in to the client:

1. `signUp` server action created the user and returned
   `{ success: true, autoLogin: true, email, … }`.
2. A `useEffect` in `credentials-form.tsx` watched `state.success` and,
   when set, called `signIn('credentials', { email, password,
   redirect: false })` from `next-auth/react` to issue the session
   cookie, then `window.location.href = '/client/dashboard'`.

Two compounding problems in production:

1. **Double-fire.** The effect's dependency list included
   `refreshSession`, `invalidateAllUserData`, and `tCred` — all of
   which change identity on every render. After the first successful
   `signIn` triggered a re-render (via `refreshSession()` and the React
   Query cache invalidation), the effect ran again and started a
   **second** `signIn` fetch. Reproduced as a `TypeError: Failed to
   fetch` in the browser console because the second fetch was aborted
   by `window.location.href`.
2. **Cookie race with navigation.** Even when only one `signIn` ran,
   the `window.location.href` navigation could begin before the
   `Set-Cookie` from the `signIn` POST was fully committed in
   server-visible state. The dashboard `await auth()` on the new
   request then saw no session and redirected to `/auth/signin`.

End-to-end repro and screenshots saved alongside the run log used to
diagnose this against `demo.ever.works`.

## What we changed

`signUp` (server action) now issues the session cookie itself, in the
same response that returns the success body:

```ts
// apps/web/app/[locale]/auth/actions.ts
await serverSignIn('credentials', {
    email: normalizedEmail,
    password,
    redirect: false
});
```

It returns `{ autoLoggedIn: true, … }` on success. The client form
treats this as "session is already established — just refresh
`useSession`'s cache and navigate". No second `signIn` fetch from the
browser, no race against navigation.

The legacy client-side auto-login path (still used by the login form
via `signInAction`) keeps the existing behaviour but is now guarded by
a `useRef` flag so the effect can call `signIn` **at most once** per
form submission. The previous re-fire causing `TypeError: Failed to
fetch` cannot happen anymore.

## Files touched

- `apps/web/app/[locale]/auth/actions.ts` — `signUp` calls
  `serverSignIn`; adds `isNextRedirectError` helper.
- `apps/web/app/[locale]/auth/components/credentials-form.tsx` —
  `autoLoginFiredRef` / `successHandledRef` guards, new
  `state.autoLoggedIn` branch.
- `apps/web/app/[locale]/client/{dashboard,settings,submissions,submissions/trash}/page.tsx`
  — added `export const dynamic = 'force-dynamic'` so Next.js does not
  pre-render the `redirect('/auth/signin')` branch at build time and
  serve that cached redirect to authenticated requests. (Sibling
  `client/sponsorships/page.tsx` and `client/users/page.tsx` already
  had it; the missing markers on the others were the root cause of the
  user-visible "logged in but bounced to signin" symptom on every
  protected client page, including the dashboard.)
- Spec + log entry.

## Why both halves of the fix are needed

PR #853 (the first half) issued the session cookie server-side on
register. Re-running the Playwright repro against demo.ever.works
after that landed confirmed `POST /auth/register` now ships
`Set-Cookie: __Secure-authjs.session-token=…` in the response, **but**
`GET /client/dashboard` still redirected to `/auth/signin`. Meanwhile
`GET /api/auth/session` and `GET /api/current-user` both returned the
user happily (proving the cookie + JWT were valid). The asymmetry
pointed at static pre-rendering: at build time `auth()` returns null
and the page renders `redirect('/auth/signin')`. Next.js cached that
redirect as the static result and served it on every later request
without re-running `auth()`. Marking the page dynamic forces a
per-request render. PR #856 is the second half.

## Verification

- Manual: register a fresh user on the Vercel preview built from this
  branch, watch the network panel — exactly one POST to
  `/api/auth/callback/credentials`, no `Failed to fetch` in console,
  navigation lands on `/client/dashboard` rendered with the user's
  session (not the sign-in page).
- E2E: existing `apps/web-e2e/tests/auth/register.spec.ts` still
  passes (it asserts the final URL contains `/client/dashboard`).

## Rollback

Revert the commit; the prior client-side `signIn` path remains in the
file (now reachable via `state.autoLogin`) so reverting only removes
the server-side path.
