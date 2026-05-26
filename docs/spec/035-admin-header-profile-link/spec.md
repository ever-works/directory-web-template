# Feature spec — `035-admin-header-profile-link`

> Jira: [EWW-5](https://evertech.atlassian.net/browse/EWW-5)

## 1. Summary

An admin had no link to their own profile from the account dropdown. The shared
`ProfileButton` dropdown (`components/profile-button/menu-items.tsx`) renders an
**admin-only branch** that lists management links (clients, companies,
categories, settings, …) but **omitted the "Your Profile" entry** the
regular-user branch has. This spec adds that "Your Profile" link to the admin
branch so an admin can reach their own profile.

## 2. Motivation

- Why: the admin branch of the profile dropdown never linked to the admin's own
  profile — only the non-admin branch did.
- Primary user: an admin who wants to view/manage their own profile.

## 3. Goals

- The admin profile dropdown includes a "Your Profile" link to the admin's own
  profile path (`/client/profile/<username>`).
- Reuse existing components, hooks, and i18n keys — no new dependencies, no new
  API surface, no new strings.

## 4. Non-Goals

- Adding a profile control to the `/admin` panel header chrome
  (`admin/layout-client.tsx`). That header keeps its existing `Admin Panel`
  label unchanged.
- Adding a dedicated admin-specific profile page (admins reuse the existing
  `/client/profile/<username>` route).
- Changing the regular-user (non-admin) menu, which already has the link.

## 5. User Stories

```text
As an admin, I want a "Your Profile" entry in my account dropdown, so that I can
reach my own profile instead of only management screens.
```

## 6. Acceptance Criteria

- [ ] AC-1: When an admin opens the shared profile dropdown, it shows a "Your
      Profile" item that navigates to the admin's profile path
      (`/client/profile/<username>`).
- [ ] AC-2: The non-admin dropdown is unchanged.
- [ ] AC-3: No hard-coded English strings are introduced; the new item uses the
      existing `common.YOUR_PROFILE` / `common.YOUR_PROFILE_DESC` keys.

## 7. Out-of-Scope Considerations

- Placing a profile button directly in the `/admin` panel header — deferred;
  the shared site-header dropdown already exposes the link to admins.

## 8. UX Notes

- The new item sits at the top of the admin branch, matching the icon/label
  pattern of the existing admin items (`User` icon, `common.YOUR_PROFILE` title).
- Localisation: no new strings; reuses keys already present in `messages/*`.

## 9. Data & API Surface

- None. No schema, endpoint, or event changes.

## 10. Plugin / Adapter Impact

- None.

## 11. Risks & Open Questions

- Risk: minimal — single menu entry reusing existing `profilePath` and keys.
- Open questions: none.

## 12. Acceptance Test Plan

- Manual: sign in as an admin, open the profile dropdown, confirm "Your Profile"
  appears and links to the admin's profile.

## 13. References

- Related specs: [`009-admin-dashboard`](../009-admin-dashboard/spec.md),
  [`022-profile-ux-polish`](../022-profile-ux-polish/spec.md).
- Files: `apps/web/components/profile-button/menu-items.tsx`.
