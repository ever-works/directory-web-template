---
id: spec-002-plugin-architecture
title: 'Spec 002 — Plugin Architecture'
sidebar_label: '002 Plugin Architecture'
---

# Feature spec — `002-plugin-architecture`

> **Status:** Proposed.
> **Owner:** Template maintainers.
> **Constitution articles invoked:** I (Plugin-First), II (TypeScript), III
> (Spec Before Code), IV (Documentation), VII (Reuse Before Build), X
> (Modular Packages).

## 1. Summary

Introduce a first-class **plugin and adapter system** for the Directory Web
Template so that authentication, payments, analytics, search, theming,
content sources, maps, newsletter, notifications, AI, admin features, and
UI extensions all live in self-contained packages under `packages/<name>/`
that can be enabled, disabled, swapped, and configured without touching the
core code in `apps/web/`.

This spec defines the **public plugin SDK**, the **runtime registry**, the
**configuration surface**, and the **conventions** that every plugin must
follow. It does not implement specific plugins — those come in dedicated
follow-up specs (one per provider) that already exist in shipped form
(`003-auth-providers`, `004-payment-providers`, `008-analytics-providers`,
…). Those provider implementations will be **incrementally migrated** to
this new architecture as the system stabilises.

## 2. Motivation

- The codebase has grown several integration surfaces (auth, payments,
  analytics, maps, newsletter) that all solve the same meta-problem:
  *“how do I plug a third-party provider into the template?”*. Today each
  one has its own ad-hoc shape, which makes the codebase harder to learn,
  harder to test, and harder to fork.
- Forks of the template need a way to **add their own integrations** without
  modifying core files (which makes upstream merges painful).
- The constitution (Article I) makes plugins the default pattern; we need a
  spec that establishes the contract so that every future feature can be
  evaluated against it.
- Most user-visible features (e.g. comments, votes, surveys, sponsorships,
  reports, share button, scroll-to-top) should be **toggleable** so that
  template adopters can pick the surface area they want.

## 3. Goals

- Provide a single TypeScript package (`@ever-works/plugin-sdk`) that exports
  every interface, type, and helper a plugin author needs.
- Provide a runtime registry (`@ever-works/plugin-runtime`) loaded at app
  boot that resolves enabled plugins, validates their config, and exposes
  capability lookups (`getAuthProvider()`, `getAnalyticsProviders()`, etc.).
- Provide a typed configuration surface so users enable plugins via
  `directory.config.ts` and / or environment variables and / or admin UI.
- Provide UI **slots** so plugins can render React fragments in well-known
  layout positions (e.g. `header.right`, `item.detail.sidebar`,
  `admin.settings.section`, `home.before-listing`) without editing layouts.
- Provide a **kill switch** so any plugin can be disabled at runtime via
  config without breaking the app.
- Establish ESLint boundaries that prevent core code from importing from
  plugin packages.

## 4. Non-Goals

- Implementing every existing integration as a plugin in one go — that is
  scoped to the per-provider specs and will be sequenced as separate work.
- Replacing Next.js’s extension mechanisms (middleware, route groups, server
  actions). Plugins compose **with** Next.js, not around it.
- Hot-reload of plugins at runtime (plugins are resolved at boot).
- A plugin marketplace / installer UI. That is a future spec.

## 5. User Stories

```text
As a template adopter, I want to add Stripe support without editing core
files, so that future template updates merge cleanly.

As a fork maintainer, I want to ship my organisation’s SSO as a plugin, so
that I can keep it private while staying upstream-compatible.

As a site admin, I want to disable the Comments plugin from the admin UI,
so that I can run a directory without UGC.

As a plugin author, I want a typed manifest and a Zod-validated config, so
that misconfigurations fail at boot, not in production.

As a maintainer, I want lint rules to forbid core → plugin imports, so that
the architecture cannot regress through casual refactors.
```

## 6. Acceptance Criteria

- [ ] AC-1: A package `@ever-works/plugin-sdk` exists and exports
  `defineDirectoryPlugin`, `definePluginManifest`, the `AuthProvider`,
  `PaymentProvider`, `AnalyticsProvider`, `SearchProvider`, `ContentSource`,
  `MapsProvider`, `NewsletterProvider`, `NotificationsProvider`,
  `AIProvider`, and `UISlotComponent` interfaces.
- [ ] AC-2: A package `@ever-works/plugin-runtime` exists and exposes a
  registry instance with `register(plugin)`, `get(capability)`,
  `list(capability)`, `isEnabled(name)`, and `disable(name)` methods.
- [ ] AC-3: `apps/web/` boots the runtime once at startup and reads the list
  of enabled plugins from `directory.config.ts` and / or env vars
  (precedence documented).
- [ ] AC-4: Plugins declare a Zod schema for their config; the runtime
  rejects invalid configs at boot with a human-readable error pointing to
  the offending key.
- [ ] AC-5: At least one **slot host** is wired into the public layout
  (`header.right`) and one **slot host** is wired into the admin layout
  (`admin.settings.section`) and a **demo plugin** under
  `packages/plugin-demo/` renders into both, gated by config.
- [ ] AC-6: Disabling the demo plugin via `directory.config.ts` removes its
  output without breaking the rest of the app (verified by an e2e spec).
- [ ] AC-7: ESLint enforces that nothing under `apps/web/lib/core/**` may
  `import` from `packages/<plugin-name>/` directly.
- [ ] AC-8: Documentation pages exist:
  `docs/architecture/plugin-system.md`,
  `docs/plugins/authoring-a-plugin.md`,
  `docs/plugins/lifecycle.md`, with full code samples.
- [ ] AC-9: An e2e spec under
  `apps/web-e2e/tests/plugins/registry.spec.ts` verifies that disabled
  plugins do not render and enabled plugins do.

## 7. Out-of-Scope Considerations

- Plugin sandboxing / security model. The current model trusts plugins
  fully (they are workspace packages). A future spec will explore loading
  third-party plugins with reduced privileges.
- Versioned plugin marketplace and per-plugin upgrade flows.
- Plugin dependencies on other plugins (only basic ordering for now).

## 8. UX Notes

- Admin → Settings → **Plugins** section lists every registered plugin with
  a name, version, description, capability tags, and an **Enabled** toggle
  (subject to the plugin opting in to admin-toggleability).
- Disabling a plugin shows a confirmation modal that lists the surface it
  will remove.
- All strings localised via `next-intl`.

## 9. Data & API Surface

- New table `plugin_settings` keyed by plugin name, stores the
  enabled/disabled flag and a JSON config blob, validated against the
  plugin’s Zod schema before write.
- New API: `GET /api/admin/plugins`, `POST /api/admin/plugins/:name/enable`,
  `POST /api/admin/plugins/:name/disable`,
  `PUT /api/admin/plugins/:name/config`.

## 10. Plugin / Adapter Impact

This is the foundational plugin spec; it defines the contracts that every
other plugin spec implements.

## 11. Risks & Open Questions

- **Risk:** existing integrations (analytics, payments) have to be migrated
  carefully; a big-bang refactor is forbidden by Article VIII.
  *Mitigation:* migrate one provider at a time, behind a flag.
- **Risk:** slot-based UI composition can hurt LCP if not lazy-loaded.
  *Mitigation:* slots default to React Server Components; client slots are
  opt-in and use `next/dynamic`.
- **Open question:** name of the SDK package — `@ever-works/plugin-sdk` vs
  `@ever-works/plugins`? Default chosen: **`@ever-works/plugin-sdk`** (the
  `-sdk` suffix is common in the ecosystem). Tracked in
  [`docs/questions.md`](../../questions.md#q-002-plugin-sdk-name).
- **Open question:** should we support plugin-to-plugin extension (a plugin
  exposing its own slots to other plugins)? Default chosen: **yes, via
  re-exporting from the SDK**, but the v1 API stays minimal.

## 12. Acceptance Test Plan

- New e2e specs under `apps/web-e2e/tests/plugins/`:
  - `registry.spec.ts` — disabled plugin not visible; enabled plugin
    visible.
  - `slots.spec.ts` — known slots render in the expected DOM positions.
  - `admin-toggle.spec.ts` — admin can enable/disable a plugin from the UI.

## 13. References

- Constitution: [`../../../.specify/memory/constitution.md`](../../../.specify/memory/constitution.md)
- Spec Kit: <https://github.com/github/spec-kit>
- Related shipped specs: `003-auth-providers`, `004-payment-providers`,
  `008-analytics-providers`, `011-maps-providers`,
  `012-newsletter-providers`.
