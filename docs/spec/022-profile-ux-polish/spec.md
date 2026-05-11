---
id: spec-022-profile-ux-polish
title: 'Spec 022 — Profile UX Polish (avatar, interests, skills, portfolio persistence)'
sidebar_label: '022 Profile UX'
---

# Feature spec — `022-profile-ux-polish`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

The client profile area (`/client/settings/profile/basic-info`,
`/client/settings/profile/portfolio`, `/client/profile/<username>`)
ships with a visually complete UI but **no persistence**. The
basic-info form discards on submit (`void { ...data, skills }`) and
shows a "not connected to persistence yet" banner. The portfolio page
keeps projects in `useState` only and tells the user so. The public
profile view ignores the saved `avatar` column, throws away
interests/skills, and never receives the saved bio/location/company
back from the API.

Spec 022 wires the whole loop end-to-end: avatars persist as data
URLs in the existing `client_profiles.avatar` column, the form saves
all basic-info fields including new `interests` and `skills` columns,
portfolio projects gain a real table with full CRUD, and the public
profile page renders the persisted data.

## 2. Motivation

- A self-hosted user signing up sees a profile screen that promises
  to save their data and silently drops it. This is one of the first
  flows new users hit and it currently undermines trust in the rest
  of the template.
- Several of the surface bugs are paper-thin (e.g. the public profile
  hardcoding `avatar: ''`) and only persist because nothing exercises
  the save → reload → render path end-to-end.
- Fork maintainers have requested a working reference for "user
  profile with editable fields" they can extend; today there is no
  such reference in the codebase.

## 3. Goals

- Authenticated user can change their avatar via the basic-info page
  and see it on the public profile view after save.
- Basic-info form loads the user's existing values on mount and
  persists changes (displayName, username, bio, location, company,
  jobTitle, website, interests, skills) to `client_profiles`.
- Portfolio projects persist across reloads, support add/edit/delete,
  and the public profile page reads them.
- Public profile view at `/client/profile/<username>` renders the
  saved avatar, bio, location, company, jobTitle, website,
  interests, skills, and portfolio.
- The two "not connected to persistence" warning banners are removed.

## 4. Non-Goals

- Object storage for avatars. We deliberately use a base64 data URL
  in the existing `avatar TEXT` column, capped at ~2MB raw file
  (~2.7MB base64). Switching to S3 / Vercel Blob is a separate spec
  if the file-size or query-payload cost becomes a problem.
- Social links editor — the `Profile.socialLinks` field stays unused
  this round.
- Skill proficiency analytics, skill suggestions, or portfolio image
  upload. Portfolio images remain URL fields.
- Cross-tenant or admin-side profile editing. Updates are
  self-service only, scoped by `tenantId` + the authenticated user's
  `clientProfileId`.

## 5. User Stories

```text
As a signed-in user, I want to set my avatar and have it appear on
my public profile, so that other users recognise me.

As a signed-in user, I want my saved bio, location, company,
interests, and skills to load when I reopen the edit form, so that I
can make incremental changes without retyping.

As a signed-in user, I want to add and edit portfolio projects that
persist across sessions, so that I can showcase work over time.
```

## 6. Acceptance Criteria

- [ ] AC-1: `PATCH /api/user/profile` writes displayName, username,
  bio, jobTitle, company, location, website, interests, skills,
  avatar fields to `client_profiles` scoped by tenant + session.
- [ ] AC-2: `GET /api/user/profile` returns the same set of fields
  for the authenticated user.
- [ ] AC-3: `GET /api/user/profile/portfolio`, `POST`, `PATCH /:id`,
  `DELETE /:id` operate against a new `portfolio_projects` table,
  scoped by `clientProfileId` + `tenantId`.
- [ ] AC-4: Migration `0033` adds `interests text` and `skills jsonb`
  to `client_profiles` and creates the `portfolio_projects` table.
- [ ] AC-5: Basic-info page loads existing values via `GET` and
  shows the saved avatar in the preview circle.
- [ ] AC-6: Submitting the basic-info form persists changes and
  shows a success toast; reloading the page reflects the saved data.
- [ ] AC-7: Portfolio page lists saved projects on mount, persists
  add/edit/delete, no longer warns about "local session only."
- [ ] AC-8: `/client/profile/<username>` shows the saved avatar,
  bio, location, company, jobTitle, website, interests, skills, and
  portfolio.
- [ ] AC-9: Avatar uploads above 2MB are rejected client-side with a
  translated error toast.
- [ ] AC-10: `pnpm lint`, `pnpm tsc --noEmit`, and `pnpm build` pass.

## 7. Out-of-Scope Considerations

- Migrating avatars from data URL to object storage when the project
  is launched at scale. A follow-up spec will compare data-URL bloat
  on listing pages against the cost of provisioning S3 / Vercel
  Blob.
- Social link CRUD UI. The `socialLinks` field already exists on
  `Profile` but has no edit surface; out of scope here.
- Skill autocompletion / proficiency suggestions.

## 8. UX Notes

- Avatar preview circle uses `next/image` with `unoptimized` since
  the source is a data URL, not a URL the optimizer can transform.
- Skills retain the editor's `{ name, category, proficiency }` shape
  end-to-end; the public skills-section is updated to read
  `proficiency` (was `level`) and group by the persisted `category`
  rather than the hard-coded heuristic.
- Interests are stored as a comma-separated string and split into
  chips on the public view, matching the form's current single-line
  input.

## 9. Data & API Surface

### Schema additions (`apps/web/lib/db/schema.ts`)

- `client_profiles.interests text` — comma-separated free text.
- `client_profiles.skills jsonb` — array of
  `{ name: string, category: 'Frontend' | 'Backend' | 'Tools & Frameworks' | 'Other', proficiency: number }`.
- New `portfolio_projects` table:
  - `id text primary key` (uuid)
  - `client_profile_id text not null references client_profiles(id) on delete cascade`
  - `tenant_id text not null references tenant(id) on delete cascade`
  - `title text not null`
  - `description text not null`
  - `image_url text not null`
  - `external_url text not null`
  - `tags jsonb default '[]'::jsonb` (array of strings)
  - `is_featured boolean default false`
  - `position integer default 0` (sort order)
  - `created_at timestamp default now()`
  - `updated_at timestamp default now()`
  - indexes on `client_profile_id`, `tenant_id`, `is_featured`.

### API

| Method | Path                                  | Notes                                  |
| ------ | ------------------------------------- | -------------------------------------- |
| GET    | `/api/user/profile`                   | Full profile of the authenticated user |
| PATCH  | `/api/user/profile`                   | Partial update                         |
| GET    | `/api/user/profile/portfolio`         | List own portfolio projects            |
| POST   | `/api/user/profile/portfolio`         | Create new project                     |
| PATCH  | `/api/user/profile/portfolio/[id]`    | Update by id                           |
| DELETE | `/api/user/profile/portfolio/[id]`    | Delete by id                           |

All routes require an authenticated session with `clientProfileId`
in claims; responses are tenant-scoped. The existing
`/api/user/profile/location` route is untouched.

## 10. Plugin / Adapter Impact

None. This is core template work — profiles are not a plugin.

## 11. Risks & Open Questions

- **Avatar size on listing queries.** The admin client list
  (`getClientProfiles`) selects all columns including `avatar`. With
  many users storing a 2MB data URL, this query's payload could
  balloon. Mitigation: keep the 2MB client-side cap, and in a
  follow-up spec migrate to selective column projection on admin
  listing endpoints. Not blocking for AC-1 through AC-10.
- **Skills shape change.** Existing `Profile.skills` typing is
  `{ name, level }[]`. We align everything on `{ name, category,
  proficiency }`. No user-visible data exists yet to migrate (the
  field has never been persisted), so this is purely a type/UI
  refactor.

## 12. Test Plan

- Manual: signed-in user opens basic-info, uploads avatar, saves,
  reloads — avatar still shown; saves bio/company/interests/skills
  → reload reflects them; opens `/client/profile/<username>` and
  sees all fields.
- Manual: add 2 portfolio projects, mark one featured, refresh,
  delete one — both operations persist; public view shows only the
  surviving project.
- Type-check (`pnpm tsc --noEmit`) and lint (`pnpm lint`) pass.

## 13. References

- `apps/web/lib/db/schema.ts:186` — `clientProfiles` table.
- `apps/web/app/[locale]/client/settings/profile/basic-info/page.tsx` — basic-info form.
- `apps/web/app/[locale]/client/settings/profile/portfolio/page.tsx` — portfolio editor.
- `apps/web/app/[locale]/client/profile/[username]/page.tsx` — public view (hardcoded avatar bug at line 49).
- `apps/web/lib/db/queries/client.queries.ts:130` — `updateClientProfile`.
- `apps/web/app/api/user/profile/location/route.ts` — template for the new self-service routes.
