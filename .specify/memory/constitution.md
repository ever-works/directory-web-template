---
id: constitution
title: Directory Web Template Constitution
sidebar_label: Constitution
---

# Directory Web Template — Constitution

> **Status:** Living document. Amendments require a spec under
> `docs/spec/NNN-constitution-amendment-…/` and an entry in [`docs/log.md`](../../docs/log.md).
> **Last amended:** 2026-04-30.

The constitution captures the **non-negotiable, durable principles** that
govern every change to the Directory Web Template. Plans (`plan.md`) must
include a **Constitution Check** section that explicitly evaluates each
principle below.

This is a [GitHub Spec Kit](https://github.com/github/spec-kit) constitution.
Read [`.specify/README.md`](../README.md) first if you are new to the workflow.

---

## Article I — Plugin-First Architecture

**Principle.** Almost everything in the template is a **plugin or adapter**.
Only a small, intentionally minimal core is permitted in `apps/web/lib/core/**`.
Every other concern — authentication providers, payment providers, analytics
providers, search, theming, content sources, newsletter, notifications, AI,
admin features, UI widgets — ships as a package under `packages/<name>/` and is
loaded through a documented extension point.

**What this means in practice.**

- A **plugin** is a self-contained package in `packages/<name>/` that exports
  a manifest (`plugin.json` or a `defineDirectoryPlugin({...})` factory) plus
  TypeScript source. The manifest declares: name, version, semver-compatible
  template version range, capabilities, configuration schema (Zod), and any
  React entry points.
- An **adapter** is a plugin that implements a well-known interface (e.g.
  `AuthProvider`, `PaymentProvider`, `AnalyticsProvider`, `SearchProvider`,
  `ContentSource`, `MapsProvider`, `NewsletterProvider`,
  `NotificationsProvider`).
- Core code **must not import from** plugin packages. Core defines interfaces
  in `packages/plugin-sdk/`; plugins implement them; the runtime registry wires
  them up. This is enforced by ESLint boundaries.
- Every UI feature should be expressible as a plugin slot (e.g. `header.right`,
  `item.detail.sidebar`, `admin.settings.section`). New surface area requires
  a slot, not direct edits to a layout component.
- Users must be able to **enable, disable, swap, and configure** plugins via
  the admin UI and via environment / configuration. Disabling a plugin must
  not break the rest of the application.

**When this is allowed to be violated.** Only when the function is genuinely
core: routing shell, request lifecycle, theme provider, i18n message loader,
CMS schema, plugin registry itself. Each violation must be documented in the
plan’s Complexity Tracking section.

---

## Article II — TypeScript Everywhere

**Principle.** All production source is **TypeScript**. No plain JavaScript,
no Python, no Bash beyond simple CI glue. Even scripts under `apps/web/scripts/`
should migrate to `.ts` (run via `tsx`) over time.

- New files must be `.ts` or `.tsx`.
- New scripts use `tsx` and live in `scripts/*.ts`.
- Type-check (`pnpm tsc --noEmit`) is part of the “tests pass” bar.
- `any` is allowed only with an inline comment explaining why and a TODO link
  to a follow-up spec.

---

## Article III — Spec Before Code

**Principle.** Implementation work begins **only after** a spec, plan, and
tasks exist for it.

- The bar for “spec exists” is: a markdown file under `docs/spec/NNN-slug/spec.md`
  describing the user-visible behaviour and acceptance criteria.
- The bar for “plan exists” is: a `plan.md` next to the spec listing the files
  to change, the packages affected, the constitutional check, and any open
  questions copied to `docs/questions.md`.
- The bar for “tasks exist” is: a `tasks.md` with discrete, testable items.
- Trivial fixes (typos, broken links, dependency bumps without API changes)
  may skip directly to a task in `docs/log.md`.

---

## Article IV — Documentation as a First-Class Citizen

**Principle.** Every feature, plugin, and adapter has documentation in
[`docs/`](../../docs/) that is **discoverable from `docs/index.md`** and is
**focused on the template**, not the broader Ever Works platform.

- New plugins ship with a `README.md` inside their package and a feature page
  under `docs/features/` or `docs/plugins/`.
- Architectural decisions live in `docs/architecture/` and link back to the
  relevant `docs/spec/` folder.
- Anything that is unclear or has multiple valid options must be raised in
  [`docs/questions.md`](../../docs/questions.md). The agent picks a default and
  proceeds; the maintainer reviews later.
- Significant changes append a line to [`docs/log.md`](../../docs/log.md) so
  there is one place to read “what changed and when”.
- Docs are **lint-clean**: no broken internal links, no orphan files, every
  page has frontmatter (`id`, `title`, `sidebar_label`).

---

## Article V — Performance Budget

**Principle.** The template targets **best-in-class** Core Web Vitals on the
public surface and snappy admin interactions.

- LCP ≤ 2.5s on a representative item-detail page (Lighthouse desktop).
- INP ≤ 200ms.
- CLS ≤ 0.1.
- Public listing pages must be statically renderable or rely on Partial
  Prerendering / cache components when supported.
- Admin pages must virtualize lists ≥ 200 rows.
- Bundle budget per route: ≤ 250 KB gzip first-load JS for public routes.
- Database access goes through a repository in `lib/repositories/**`; N+1
  queries are not acceptable in code review.

Plans that introduce heavy runtime work must include a **performance impact**
subsection.

---

## Article VI — Latest Stable Frameworks

**Principle.** Top-level frameworks track the latest **stable** release.

- Next.js, React, TypeScript, Tailwind CSS, ESLint, Drizzle, Playwright,
  Docusaurus, HeroUI, Auth.js, next-intl, Turborepo, pnpm.
- Major version upgrades land via a spec under `docs/spec/NNN-upgrade-<framework>/`
  with a migration plan.
- Dependabot / Renovate is the source of truth for minor and patch upgrades.
- Pinning a dependency below latest requires a documented reason in
  `docs/architecture/dependency-policy.md` (created on first violation).

---

## Article VII — Reuse Before Build

**Principle.** Prefer **popular, well-maintained** libraries over bespoke
implementations whenever the dependency is healthy and licence-compatible.

- Before authoring a utility, check `packages/` for an internal package that
  already does this.
- Before adding an internal package, check the npm ecosystem for a popular
  library with active maintenance and a permissive licence.
- When two libraries are comparable, prefer the one with TypeScript-native
  types and tree-shakable ESM builds.
- When introducing a dependency, document the choice in the relevant `plan.md`
  (alternatives considered, why this one was selected).

---

## Article VIII — No Removal Without Migration

**Principle.** Features, specs, and docs are **not deleted** unless a spec
documents an explicit migration path.

- Renaming, moving, or improving content is allowed.
- Hard-deleting a feature requires a `docs/spec/NNN-deprecate-<feature>/spec.md`
  describing impact, replacement, deprecation timeline, and migration steps.
- Dead code with a clear, completed deprecation timeline may be removed in a
  cleanup task referenced from `docs/log.md`.
- Any e2e test that documents existing behaviour must remain (it can be
  re-skinned, never deleted) until the corresponding deprecation spec lands.

---

## Article IX — Test Coverage Bar

**Principle.** The template ships with **end-to-end coverage** in
`apps/web-e2e/` for every user-visible feature.

- New user-visible behaviour must include at least one Playwright spec under
  `apps/web-e2e/tests/<area>/`.
- New API routes must include at least one Playwright API spec under
  `apps/web-e2e/tests/api/`.
- Authenticated flows reuse the storage states produced by `global-setup.ts`.
- Tests should be **resilient to content drift**: assert on roles, labels,
  data-test-ids — not on specific copy from the seeded CMS.
- The full e2e suite runs in CI and must be green before a release tag.

---

## Article X — Modular Packages

**Principle.** Code lives in **small, focused packages** under
`packages/<name>/` so it can be reasoned about, replaced, and (eventually)
published.

- A package should fit in a developer’s head — typically ≤ ~2k lines.
- Packages must declare their public surface via `package.json#exports`.
- Internal coupling between packages must go through their public exports.
- Cross-cutting concerns (logging, telemetry, errors) live in dedicated
  packages, not duplicated.

---

## Amendments

- Every amendment lands as a spec under
  `docs/spec/NNN-constitution-amendment-<slug>/`.
- Bump the **Last amended** date at the top of this file.
- Append a line to `docs/log.md` of the form:
  `YYYY-MM-DD constitution: <one-line summary>`.
