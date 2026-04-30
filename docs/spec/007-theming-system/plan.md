---
id: plan-007-theming-system
title: 'Plan 007 — Theming System'
sidebar_label: '007 Theming Plan'
---

# Implementation Plan — `007-theming-system`

> **Spec:** [`spec.md`](./spec.md)
>
> **Status.** Retroactive. The light/dark/system theme toggle and
> admin-configurable primary colour are shipped today.

## 1. High-Level Approach

Theme state is held by a `ThemeContext` provider mounted in
`apps/web/lib/themes.tsx`. The provider syncs a cookie + `localStorage`
key, and toggles the `dark` class on `<html>`. Tailwind classes plus
HeroUI tokens both honour the active theme. The admin can pick a primary
colour from Settings; `apps/web/lib/color-generator.ts` derives a full
palette (hue ramp + foreground contrast clamp) and persists it to the
DB. The runtime layout reads the stored palette and emits CSS variables
on the root element so styles cascade everywhere — including admin.

## 2. Architecture Diagram

```mermaid
flowchart LR
  Settings[admin Settings UI] --> DB[(theme_settings)]
  DB --> Layout[app/[locale]/layout.tsx]
  Layout --> CSSVars[":root { --theme-primary: ...; }"]
  Provider[ThemeContext] --> HtmlClass["<html class=dark>"]
  Provider --> Cookie["cookie + localStorage"]
  CSSVars --> Tailwind[tailwind utilities]
  CSSVars --> HeroUI[HeroUI tokens]
```

## 3. Affected Packages & Files

| Path                                                | Change      | Notes                                       |
| --------------------------------------------------- | ----------- | ------------------------------------------- |
| `apps/web/lib/themes.tsx`                           | maintain    | `ThemeContext` provider.                    |
| `apps/web/lib/color-generator.ts`                   | maintain    | Palette derivation.                         |
| `apps/web/components/theme-toggle/**`               | maintain    | UI dropdown.                                |
| `apps/web/app/[locale]/layout.tsx`                  | maintain    | Emits CSS variables.                        |
| `apps/web/app/[locale]/admin/(dashboard)/settings/**` | maintain  | Theme settings section.                     |
| `apps/web-e2e/tests/public/theme-toggle.spec.ts`    | maintain    | E2E coverage.                               |
| `docs/architecture/theming.md`                      | maintain    | Architecture doc.                           |
| `docs/spec/007-theming-system/{plan,tasks}.md`      | **this PR** | Catch up Spec Kit artefacts.                |
| Future: `packages/plugin-themes-<name>/`            | future      | Brand themes as plugins.                    |

## 4. Public API / Plugin Manifest

Future-direction shape:

```ts
// packages/plugin-themes-<name>/src/index.ts
export default defineDirectoryPlugin({
  manifest: {
    name: 'theme-<name>',
    capabilities: ['ui-slot'],
    config: z.object({ enabled: z.boolean().default(false) }),
  },
  // exposes additional CSS tokens via setup()
});
```

## 5. Data Model

- `theme_settings(id, primary, mode, generatedAt, …)`.
- Fed by the admin Settings → Theming form.

## 6. UX & A11y Plan

- Toggle is a dropdown with light / dark / system options. Each option
  has explicit `aria-checked`.
- Primary-colour picker uses an accessible HSL slider with a contrast
  warning when foreground/background contrast falls below 4.5:1.

## 7. Performance Plan

- Palette derivation runs server-side; client receives CSS variables
  inline.
- No flash-of-unstyled-content: a small inline script before hydration
  reads the cookie and applies the `dark` class.

## 8. Security Plan

- Admin endpoints behind the `admin` middleware.
- Persisted palette validated against a Zod schema before write.

## 9. Test Plan

- E2E: `tests/public/theme-toggle.spec.ts` (light/dark/system toggle).
- Manual: change primary in Settings; verify HeroUI buttons reflect new
  primary.

## 10. Rollout & Migration Plan

- Retroactive plan; theme system is opt-out only via re-styling.

## 11. Constitution Check

- [x] **I — Plugin-First** — themes can be plugins (future).
- [x] **II — TypeScript Everywhere** — TS provider + helpers.
- [x] **III — Spec Before Code** — spec exists.
- [x] **IV — Documentation First-Class** — `docs/architecture/theming.md`.
- [x] **V — Performance Budget** — server-side palette, no FOUC.
- [x] **VI — Latest Stable Frameworks** — Tailwind + HeroUI on latest.
- [x] **VII — Reuse Before Build** — HeroUI tokens reused.
- [x] **VIII — No Removal Without Migration** — additive.
- [x] **IX — Test Coverage Bar** — toggle e2e present.
- [x] **X — Modular Packages** — future themes packages.

## 12. Complexity Tracking

None.

## 13. Open Questions

Mirrored to [`docs/questions.md`](../../questions.md):

- `Q-007a` Logo upload from admin? — **default: future plugin**.

## 14. References

- Spec: `./spec.md`
- HeroUI: <https://heroui.com>
- Tailwind v4: <https://tailwindcss.com>
- Constitution Articles: I, IV, V, VI, IX.
