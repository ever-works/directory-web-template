---
id: two-factor-auth
title: Email Two-Factor Authentication
sidebar_label: Two-Factor Auth
sidebar_position: 6
---

# Email Two-Factor Authentication

Client accounts that registered with an email address and a password can add a
second sign-in step: a six-digit code emailed to the account address on every
sign-in. It is off by default and each member turns it on for themselves.

Specification: [Spec 046](../spec/046-email-two-factor-auth/spec.md).

## For members

### Turning it on

1. Go to **Settings → Security** (`/client/settings/security`).
2. In the **Two-Factor Authentication** card, flip the switch.

The card shows the current status and, for accounts created through Google,
GitHub, Facebook or X, a notice explaining that email 2FA is not available:

> You cannot set up two-factor authentication because you signed up with OAuth.

An OAuth account has no password, so a second factor on top of one would never be
satisfiable. Turning 2FA **off** is always allowed for whoever owns the account.

### Signing in with it on

1. Enter your email and password as usual.
2. The form asks for the six-digit code that was just emailed to you.
3. Enter it. You are signed in only after it is accepted.

The code is valid for **10 minutes**. A countdown is shown; when it runs out,
use **Send a new code**. Requesting a new code invalidates the previous one, so
always use the newest email.

After **5** wrong codes, verification is blocked for **15 minutes**. The block
clears by itself — no support ticket is needed. A correct code resets the
counter, and so does letting a code expire.

## For operators

### Configuration

All four settings are optional; the defaults match the specification.

| Variable | Default | Meaning |
| --- | --- | --- |
| `TWO_FACTOR_CODE_SECRET` | `AUTH_SECRET` | Key the codes are hashed under; rotating it invalidates codes in flight |
| `TWO_FACTOR_CODE_TTL_MS` | `600000` (10 min) | How long a code stays valid |
| `TWO_FACTOR_MAX_ATTEMPTS` | `5` | Failed verifications before a lockout |
| `TWO_FACTOR_LOCK_MS` | `900000` (15 min) | How long that lockout lasts |

A working mail provider is required — the same one the rest of the template uses
(`SMTP_*` for Nodemailer, or `RESEND_API_KEY`; see
[Setup Guide](./setup-guide.md)). When no provider is configured the sign-in form
reports that the code could not be sent instead of stranding the user on a step
no email will ever satisfy.

### Unlocking an account by hand

```sql
UPDATE client_profiles
   SET two_factor_failed_attempts = 0,
       two_factor_locked_until = NULL
 WHERE email = 'member@example.com';
```

To turn the factor off for someone who has lost access to their inbox, set
`two_factor_enabled = false` on the same row.

## For developers

### Where the code lives

| Concern | File |
| --- | --- |
| Code generation, hashing, expiry / lockout arithmetic (pure) | `apps/web/lib/auth/two-factor-code.ts` |
| Issue / verify / enable / disable against the database | `apps/web/lib/auth/two-factor.ts` |
| Authoritative sign-in gate | `apps/web/lib/auth/credentials.ts` |
| Sign-in server action (specific error messages) | `apps/web/app/[locale]/auth/actions.ts` |
| Code step in the form | `apps/web/app/[locale]/auth/components/credentials-form.tsx` |
| Settings card | `apps/web/components/settings/security/two-factor-card.tsx` |
| Email template | `apps/web/lib/mail/templates/two-factor-code.ts` |

### API

| Route | Method | Notes |
| --- | --- | --- |
| `/api/auth/security/2fa/enable` | `POST` | Session required. `403` + `code: "OAUTH_ACCOUNT"` for OAuth-only accounts |
| `/api/auth/security/2fa/disable` | `POST` | Session required. No OAuth guard — turning a factor off is always allowed |
| `/api/auth/2fa/resend` | `POST` | Body `{ email, password }`. `400` for a malformed body, `429` when the 3-per-10-minutes budget per IP or per email is spent, `500` on an internal failure. Every other outcome is the same `200` envelope whatever the account state, so the response cannot be used to enumerate addresses |
| `/api/auth/security/settings` | `GET` | Now also returns `canEnableTwoFactor`, `authMethod`, `accountLockedUntil` |

Sign-in errors surface as `AuthErrorCode.TWO_FACTOR_REQUIRED`, `_INVALID`,
`_EXPIRED`, `_LOCKED` and `_SEND_FAILED`, each mapped to an `auth.TWO_FACTOR.*`
message.

Code **issuance** is itself capped at 6 per 10 minutes per account inside
`issueTwoFactorCode`, so the cap applies to the sign-in action, the NextAuth
`authorize` callback and the resend route alike — including a request posted
directly to `/api/auth/callback/credentials`. On the two **sign-in** paths
exceeding it surfaces as `AuthErrorCode.RATE_LIMITED`; the resend route mints
nothing but still answers its generic `200`, because reporting the throttle
there would leak that the address exists and has 2FA on.

The resend route resolves its tenant the way every session-free `/api` route in
this repo does — Next middleware does not run for `/api`, so the
`x-tenant-domain` header it injects is absent and `getTenantId()` falls through
to the environment or the default tenant. On a host-routed multi-tenant
deployment a resend for a member outside that tenant therefore sends nothing
(silently, by design of the generic envelope). The primary issuing path — the
sign-in server action — runs behind middleware and is tenant-correct. Tracked as
Q-046c.

### Storage

Only a **hex HMAC-SHA256 digest** of the code is written to `twoFactorCodes`,
keyed by `TWO_FACTOR_CODE_SECRET` (falling back to `AUTH_SECRET`); the plaintext
exists solely in the issuing request and the email. The keying matters because
the six-digit space is small enough that a bare SHA-256 could be reversed from a
database dump in about a second — the key lives in the environment, not the
database. Verification re-hashes the submitted value and compares digests with
`crypto.timingSafeEqual`. The brute-force counter lives on `client_profiles`,
not on the code row, so that requesting a new code cannot reset it.

Because there is no column holding a usable code, the e2e helper
(`apps/web-e2e/helpers/two-factor-db.ts`) recovers one by hashing the six-digit
space **under the same key** against the stored digest — which doubles as a
standing assertion that the column really is a keyed hash: without the secret,
the search finds nothing.

Enabling 2FA is refused with `503` `EMAIL_NOT_CONFIGURED` on a deployment with
no mail provider, because a code that can never be delivered would lock the
member out at their next sign-in.
