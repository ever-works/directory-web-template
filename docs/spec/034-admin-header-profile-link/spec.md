# Feature spec — `034-admin-header-profile-link`

> Jira: [EWW-5](https://evertech.atlassian.net/browse/EWW-5)

## 1. Summary

The admin area's header is a static `Admin Panel` text bar with no profile
control. An admin therefore has no way to reach their own profile from the
admin UI. This spec renders the existing shared `ProfileButton` (avatar +
dropdown) in the admin header, and adds the missing "Your Profile" link to the
admin branch of the profile dropdown so the admin can navigate to their own
profile.

## 2. Motivation

- Why: the admin layout header (`app/[locale]/admin/layout-client.tsx`) shows
  only the text `Admin Panel`. There is no avatar, no account menu, and no link
  to the admin's own profile.
- Compounding problem: the shared `ProfileButton` dropdown
  (`components/profile-button/menu-items.tsx`) has an **admin-only branch** that
  lists management links (clients, companies, categories, settings, …) but
  **omits the "Your Profile" entry** that the regular-user branch includes. So
  even where the button is shown elsewhere, an admin's menu never links to their
  profile.
- Primary user: an admin signed into the admin panel.

## 3. Goals

- The admin header renders the shared `ProfileButton`, right-aligned.
- The admin profile dropdown includes a "Your Profile" link to the admin's own
  profile path (`/client/profile/<username>`).
- Reuse existing components, hooks, and i18n keys — no new dependencies, no new
  API surface.

## 4. Non-Goals

- Redesigning the admin header or adding further navigation.
- Adding a dedicated admin-specific profile page (admins reuse the existing
  `/client/profile/<username>` route).
- Changing the regular-user (non-admin) menu, which already has the link.

## 5. User Stories

```text
As an admin, I want a profile control in the admin header, so that I can open
my account menu and reach my own profile without leaving the admin panel.
```

## 6. Acceptance Criteria

- [ ] AC-1: When an admin is on any `/admin/*` page (non-auth), the header shows
      the `ProfileButton` avatar on the right.
- [ ] AC-2: Opening the dropdown shows a "Your Profile" item that navigates to
      the admin's profile path (`/client/profile/<username>`).
- [ ] AC-3: The non-admin dropdown is unchanged.
- [ ] AC-4: No hard-coded English strings are introduced; the new item uses the
      existing `common.YOUR_PROFILE` / `common.YOUR_PROFILE_DESC` keys.

## 7. Out-of-Scope Considerations

- A full admin top-nav / breadcrumb system — deferred; this spec only restores
  profile access.

## 8. UX Notes

- The header is a flex row with the `ProfileButton` right-aligned (no text
  label). `ProfileButton` already handles its own avatar, admin crown badge,
  dropdown, keyboard semantics (`aria-haspopup`, `aria-expanded`), and logout
  overlay.
- Localisation: no new strings; reuses keys already present in `messages/*`.

## 9. Data & API Surface

- None. No schema, endpoint, or event changes.

## 10. Plugin / Adapter Impact

- None.

## 11. Risks & Open Questions

- Risk: `ProfileButton` relies on the session via `useCurrentUser`. The admin
  layout already wraps children in `SessionProvider`, so the hook resolves.
- Open questions: none.

## 12. Acceptance Test Plan

- Manual: sign in as an admin, open `/admin`, confirm the avatar appears in the
  header and the dropdown contains "Your Profile" linking to the admin profile.
- Optional e2e (future): extend `apps/web-e2e/tests` admin coverage to assert
  the header avatar and the profile link.

## 13. References

- Related specs: [`009-admin-dashboard`](../009-admin-dashboard/spec.md),
  [`022-profile-ux-polish`](../022-profile-ux-polish/spec.md).
- Files: `apps/web/app/[locale]/admin/layout-client.tsx`,
  `apps/web/components/profile-button/menu-items.tsx`.
