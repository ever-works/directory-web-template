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
- [x] AC-3: Reports moderation flow with status tabs.
- [x] AC-4: Notifications bell visible in admin header.
- [x] AC-5: Settings accordion with sections including the analytics
  toggle (per
  [`008`](../008-analytics-providers/spec.md)).
- [x] AC-6: E2E coverage for every section above.

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

## 13. References

- Constitution articles invoked: I (future), II, III, IV, V, IX.
