---
id: spec-031-client-danger-zone
title: 'Spec 031 — Client Danger Zone (account deletion UI)'
sidebar_label: '031 Client Danger Zone'
---

# Feature spec — `031-client-danger-zone`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Jira:** [EW-635](https://evertech.atlassian.net/browse/EW-635).
>
> **Constitution articles invoked:** III (Spec Before Code),
> VII (Plugin-First / Reuse-What-Exists),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

The client area in `directory-web-template` exposes settings sections
for Profile, Appearance, Preferences, Security, and Content & Billing,
but has **no Danger Zone** — destructive, irreversible account
actions are not exposed in the UI at all.

A server action for account deletion **already exists** and is wired
to soft-delete + activity log:

- `apps/web/app/[locale]/auth/actions.ts` → `deleteAccount`
  (requires password, calls `softDeleteUser`, logs
  `ActivityType.DELETE_ACCOUNT`, signs out, redirects to
  `/auth/signin`).

This spec adds the missing UI surface so clients can self-serve
account deletion without going through support, while keeping the
existing backend behaviour untouched.

## 2. Motivation

- **Self-service parity.** Every other client-relevant setting is
  reachable from `/client/settings`. Deletion is the one action that
  forces the user to contact support — an irreversible decision is
  precisely the one we want the user to make under their own control,
  not via a side channel.
- **Compliance posture.** Account deletion as a first-class,
  password-confirmed action is the baseline a directory-hosting
  template is expected to ship — anything less is a known gap
  flagged by clients on first review.
- **Backend already exists.** The server action, soft-delete, and
  activity log are already in place. Withholding the UI for a wired
  action is dead code on one side and a missing feature on the other.

## 3. Goals

- Authenticated, non-admin user opening `/client/settings` sees a new
  **Danger Zone** section at the bottom of the page, visually
  distinct (red/destructive accent, **not** `theme-primary`).
- The Danger Zone section links to a dedicated page at
  `/client/settings/danger-zone` that lists destructive actions as
  cards, each with a clear consequence and a destructive CTA.
- The initial action — **Delete account** — opens a confirmation
  modal that requires password re-entry (matches the existing
  `deleteAccountSchema`).
- On submit the modal calls the existing `deleteAccount` server
  action and on success the user is signed out and redirected to
  `/auth/signin` (existing behaviour, unchanged).
- All copy is localized through `next-intl` under
  `settings.DANGER_ZONE.*`. English ships as the baseline; every
  other locale (FR/ES/DE/AR/ZH) gets the same key set with the
  English fallback string until translators provide localized copy.

## 4. Non-Goals

- **Backend changes are limited to `deleteAccount` itself plus one
  new query helper.** Four touch-ups were needed for the UI to
  actually deliver the feature:
  1. **Password verifier:** `deleteAccount` was admin-only — it
     checked `users.passwordHash` via `comparePasswords`, and always
     failed for client users whose hash lives on
     `accounts.passwordHash` (provider='credentials'). The action
     now mirrors `signInAction` — it tries
     `verifyClientPassword(email, password)` first and falls back
     to the admin path.
  2. **Hard delete instead of soft delete.** The user-facing
     contract of "delete my account" is irreversible removal, not a
     `deletedAt` sentinel + email mangling. Added a new
     `hardDeleteUser` query and switched `deleteAccount` to call it.
     The schema's FK rules cascade-delete everything the user owns
     (accounts, clientProfiles, submissions, sponsorships, …) while
     audit columns referencing `users.id` with `onDelete:'set null'`
     (`actor_id`, `reviewed_by`, `performed_by`) keep their rows so
     other actors' audit history is preserved. The pre-delete
     `logActivity(DELETE_ACCOUNT)` call is dropped — `activityLogs`
     cascades, so that row would be wiped immediately anyway.
     `softDeleteUser` is left in place for any caller that still
     wants the sentinel-row behaviour.
  3. **Sign-out + redirect chain:** the old chain relied on
     `NextAuthService.signOut()` (which returns `Promise<any>` with
     no explicit value) and then destructured `{ error }`, which
     threw before the final `redirect('/auth/signin')` could fire.
     Replaced with `signOut({ redirect: false })` + explicit
     `redirect('/auth/signin')`, so the client always lands on the
     sign-in page after a successful delete.
  4. **Soft-delete safety net (deferred bug fix).** While
     investigating bug 2 we also fixed `softDeleteUser` to mangle
     the user's `accounts.email` and null `accounts.passwordHash`
     in the same transaction. The credentials provider now cannot
     mint a session for a soft-deleted row either, in case some
     other code path keeps using `softDeleteUser`.
- **No GDPR data takeout.** Export-then-delete is a separate
  follow-up — this spec only exposes the existing soft-delete flow.
- **No account deactivation.** A soft-pause (suspend without
  deletion) is intentionally out of scope.
- **No OAuth-only deletion path.** The existing server action
  requires password verification. Users without a password (pure
  OAuth signups) will see the Danger Zone but, on submit, hit the
  existing "Incorrect password" error. A "type your email to
  confirm" fallback for OAuth-only accounts is tracked as a
  follow-up.
- **No new dependencies.** Reuse `react-hook-form`, `zod`, the
  existing modal primitive, and `sonner` for toasts — all already
  used elsewhere in `apps/web`.

## 5. User Stories

- **As an authenticated user** browsing `/client/settings`, I see a
  **Danger Zone** section at the bottom of the page styled in red.
  I understand from the colour and copy that the contents are
  destructive before I click anything.
- **As an authenticated user** clicking into the Danger Zone, I land
  on `/client/settings/danger-zone` and see a card titled
  "Delete account" with a short consequence summary and a red
  destructive button.
- **As an authenticated user** clicking that button, I see a modal
  asking me to type my password to confirm. The CTA in the modal is
  also destructive (red), labelled "Delete my account permanently"
  (or localized equivalent).
- **As an authenticated user** submitting the modal with the wrong
  password, I see an inline error / toast and stay on the page.
- **As an authenticated user** submitting the modal with the
  correct password, I am signed out and redirected to
  `/auth/signin` (existing behaviour).

## 6. Implementation Notes (non-binding)

- **Route:**
  `apps/web/app/[locale]/client/settings/danger-zone/page.tsx`,
  mirroring the shape of
  `apps/web/app/[locale]/client/settings/security/page.tsx`
  (back link, page header with icon + title + subtitle, content
  area).
- **Entry point:** add a new `SettingsSection` labelled
  "Danger Zone" at the bottom of
  `apps/web/app/[locale]/client/settings/settings-content.tsx`.
  Use a red icon container instead of the page's default
  `theme-primary` tint (e.g. `bg-red-50 dark:bg-red-950/30`,
  `text-red-600 dark:text-red-400`) on the section's
  `SettingsCard` only — do not alter the existing `SettingsCard`
  primitive.
- **Delete-account card:** new component under
  `apps/web/components/settings/danger-zone/`. Renders the card
  surface from the existing settings visual language plus a
  destructive CTA. Owns the confirmation modal state locally.
- **Confirmation modal:** reuse the existing modal primitive (the
  one wrapping `SettingsModal` and the security flow). Form uses
  `react-hook-form` + Zod with the same constraints as the existing
  `deleteAccountSchema` (`password.min(PASSWORD_MIN_LENGTH).max(100)`).
  On submit, call the imported `deleteAccount` server action; on
  error, show a `sonner` error toast; on success, the action itself
  performs the redirect.
- **i18n:** add keys under `settings.DANGER_ZONE.*` in
  `apps/web/messages/en/settings.json`:
    - `TITLE` ("Danger Zone")
    - `SUBTITLE` (one-line description)
    - `BACK_TO_SETTINGS` (reuse the security page's pattern)
    - `DELETE_ACCOUNT.TITLE` ("Delete account")
    - `DELETE_ACCOUNT.DESCRIPTION` (one paragraph spelling out what
      gets removed: account, profile, submissions, sponsorships)
    - `DELETE_ACCOUNT.CTA` ("Delete account")
    - `DELETE_ACCOUNT.CONFIRM_MODAL.TITLE`
    - `DELETE_ACCOUNT.CONFIRM_MODAL.WARNING`
    - `DELETE_ACCOUNT.CONFIRM_MODAL.PASSWORD_LABEL`
    - `DELETE_ACCOUNT.CONFIRM_MODAL.CONFIRM_CTA`
    - `DELETE_ACCOUNT.CONFIRM_MODAL.CANCEL_CTA`
    - `DELETE_ACCOUNT.ERRORS.INCORRECT_PASSWORD`
    - `DELETE_ACCOUNT.ERRORS.UNKNOWN`
      Mirror the same key set into every other locale's
      `settings.json` with the English fallback string.
- **Accessibility:** the destructive CTA must have a non-colour
  affordance (icon + explicit verb in the label) so colour-blind
  users still see it as destructive. The confirmation modal must
  trap focus, close on Esc, and announce its title via
  `aria-labelledby`.
- **Performance:** the modal and its form are dynamically imported
  from the card so the bundle weight is only paid on click.
- **Testing manually:** sign in as a non-admin, navigate to
  `/client/settings`, scroll to Danger Zone, click into the
  sub-page, click Delete account, submit with wrong password
  (expect error), then with correct password (expect sign-out +
  redirect). Verify the user is `soft-deleted` in the DB and the
  activity log row was written.

## 7. Out-of-Scope Follow-ups

- **Export-then-delete (GDPR takeout).** Add a "Download my data"
  action above "Delete account" that produces a JSON / CSV archive
  before the delete fires. Likely needs a background job.
- **OAuth-only deletion path.** Replace the password challenge with
  an email-typing confirmation for users without a password hash.
- **Account deactivation.** A reversible soft-pause that hides the
  profile and disables submissions without triggering soft-delete.
- **Admin restore.** Surface soft-deleted accounts in the admin
  area with a time-bounded restore action.
- **Shared `DangerZoneCard` primitive.** Extract once a second
  destructive action lands in the section.
