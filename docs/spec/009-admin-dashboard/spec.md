---
id: spec-009-admin-dashboard
title: 'Spec 009 — Admin Dashboard'
sidebar_label: '009 Admin Dashboard'
---

# Feature spec — `009-admin-dashboard`

> **Status:** Shipped. Retroactive spec.

## 1. Summary

A first-class **admin area** at `apps/web/app/[locale]/admin/(dashboard)/`
covering item moderation, categories, tags, collections, featured items,
companies, surveys, sponsorships, comments, reports, roles, clients,
notifications, settings, and bulk-actions / data-export utilities.

## 2. Motivation

- A directory is operationally heavy (moderation, categorisation, user
  reviews). A capable admin avoids the “fork everything” trap.

## 3. Goals

- Sectioned admin layout with sidebar navigation.
- CRUD across all primary entities.
- Multi-step item creation form.
- Bulk actions on items (approve, reject, delete, set featured).
- CSV export of key tables.
- Localised UI.

## 4. Non-Goals

- A separate admin app (`apps/admin`) — kept inside `apps/web` for now.
- Plugin marketplace (future spec, depends on
  [`002`](../002-plugin-architecture/spec.md)).

## 5. User Stories

```text
As an admin, I want a single dashboard to triage submissions, so I can
keep up with content moderation efficiently.

As an admin, I want to bulk-approve items so I am not clicking 50 times
when many submissions queue up.
```

## 6. Acceptance Criteria

- [x] AC-1: Admin sidebar with the 17 primary sections per
  `apps/web-e2e/tests/admin/`.
- [x] AC-2: CRUD on items, tags, collections, companies, sponsorships,
  surveys, roles, clients.
- [x] AC-3: Reports moderation flow with status tabs. Saving a resolution
  runs its moderation action first; retrying after a failed report save
  finishes the save without warning, removing or notifying twice, using
  the `moderation_history` rows the report wrote
  (`apps/web/lib/services/report-moderation.ts`,
  [reports endpoints](../../api/reports-endpoints.md); open case: Q-009a).
- [x] AC-4: Notifications bell visible in admin header.
- [x] AC-5: Settings accordion with sections including the analytics
  toggle (per
  [`008`](../008-analytics-providers/spec.md)).
- [x] AC-6: E2E coverage for every section above.
- [x] AC-7: The admin client detail page and the server-side page
  guards authorize on the live admin role, `isAdmin(userId)` from
  `apps/web/lib/db/roles.ts`, not the session's `isAdmin` claim (set
  at sign-in and kept for the JWT's 30-day lifetime), and fail
  closed. The client detail page
  (`apps/web/app/[locale]/admin/clients/[id]/page.tsx`) awaits the
  lookup before any client query: signed out goes to sign-in, a
  signed-in user without the admin role (for example one whose role
  was removed while signed in) goes to `/unauthorized`, and a failed
  lookup throws to the error page, so no client data is rendered.
  `requireAdmin()` and `checkIsAdmin()` (`apps/web/lib/auth/guards.ts`)
  use the same lookup and treat a missing user id or a failed lookup
  as not admin (`requireAdmin()` then redirects to `/unauthorized`,
  `checkIsAdmin()` returns `false`). T-2637 (#1148).
- [x] AC-8: The admin survey edit, preview and responses pages
  (`apps/web/app/[locale]/admin/surveys/[slug]/{edit,preview,responses}/page.tsx`)
  await `requireAdmin()` on the server before they read the survey,
  in the page and, for preview and responses, in `generateMetadata`:
  signed out (including a session ended after a password change) goes
  to admin sign-in, a user without the live admin role or with a
  failed lookup goes to `/unauthorized`, and the survey is never
  queried for either. T-2645 (#1154).

## 7. Out-of-Scope Considerations

- Multi-admin RBAC granularity finer than current role.

## 8. UX Notes

- HeroUI components throughout.
- Tables virtualised for ≥ 200 rows (per Constitution Article V).
- Empty states present and helpful.

## 9. Data & API Surface

- REST endpoints under `apps/web/app/api/admin/**`.
- Drizzle tables for each managed entity.

## 10. Plugin / Adapter Impact

Each admin section is a candidate plugin slot
(`admin.<section>.<placement>`) once the plugin runtime ships
(per [`002`](../002-plugin-architecture/spec.md)).

## 11. Risks & Open Questions

- **Risk:** admin perf on very large content sets. Mitigation:
  virtualisation + server-side pagination.

## 12. Acceptance Test Plan

`apps/web-e2e/tests/admin/*.spec.ts` (19 spec files at last count).

AC-7: the source guard `apps/web/lib/auth/__tests__/admin-claim-pages.spec.ts`
(the page awaits the live role before any client query and does not
catch a failed lookup; the guards never read the claim and answer
"not admin" for a missing id or a failed lookup) and the Playwright
spec `apps/web-e2e/tests/admin/admin-client-detail-live-role.spec.ts`
(a signed-in client ends on `/unauthorized`).

AC-8: `apps/web/lib/auth/__tests__/admin-survey-pages.spec.ts` loads
the three survey pages with the session, the role lookup and the
survey service stubbed, so the real `requireAdmin()` runs: every
refused session is redirected and the survey is not read; an admin
gets the page.

## 13. References

- Constitution articles invoked: I (future), II, III, IV, V, IX.
