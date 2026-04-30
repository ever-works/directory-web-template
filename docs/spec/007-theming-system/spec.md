---
id: spec-007-theming-system
title: 'Spec 007 — Theming System'
sidebar_label: '007 Theming'
---

# Feature spec — `007-theming-system`

> **Status:** Shipped. Retroactive spec.

## 1. Summary

A built-in **theming system** with light / dark modes, dynamic colour
generation from a base palette, and admin-configurable settings (logo,
primary colour, font, header layout). Powered by HeroUI tokens, Tailwind
CSS, and a small set of helpers in
[`apps/web/lib/themes.tsx`](../../apps/web/lib/themes.tsx) and
[`apps/web/lib/color-generator.ts`](../../apps/web/lib/color-generator.ts).

## 2. Motivation

- Adopters want their directory to look distinctive without rebuilding.
- Dark mode is table-stakes; an admin colour picker is a strong upsell.

## 3. Goals

- Light / dark / system theme toggle.
- Admin can pick a primary colour; secondary palette derived from it.
- Persists theme choice (cookie + localStorage).
- Themes apply across both public and admin surfaces.

## 4. Non-Goals

- Per-user themes.
- Custom CSS injection (potential future plugin).

## 5. User Stories

```text
As an admin, I want to set the primary colour of my directory from
Settings without editing CSS.

As an end-user, I want my dark-mode preference to persist across visits.
```

## 6. Acceptance Criteria

- [x] AC-1: Theme toggle in header.
- [x] AC-2: `dark` class applied to `<html>` for dark mode.
- [x] AC-3: Admin can set primary colour and see palette generated.
- [x] AC-4: HeroUI components honour the active palette.
- [x] AC-5: E2E spec: `apps/web-e2e/tests/public/theme-toggle.spec.ts`.

## 7. Out-of-Scope Considerations

- Per-route theme overrides.
- Full design tokens schema (covered by Tailwind / HeroUI today).

## 8. UX Notes

- Toggle is a dropdown with light / dark / system options.
- a11y: each option has an explicit `aria-checked` state.

## 9. Data & API Surface

- Admin settings stored in DB; theme tokens generated server-side from
  the admin’s primary colour.
- Theme state lives in a `ThemeContext` provider mounted in
  `apps/web/lib/themes.tsx`.

## 10. Plugin / Adapter Impact

The current theming system is part of core. A future plugin extension
might let plugins register additional CSS variables they require.

## 11. Risks & Open Questions

- **Risk:** WCAG contrast violations from poorly chosen primary colours.
  Mitigation: clamp lightness range in `color-generator.ts`.
- **Open:** allow uploading a logo asset directly from admin? Default:
  **yes, future plugin**.

## 12. Acceptance Test Plan

- `theme-toggle.spec.ts` for client.
- Manual: change primary colour in Settings; confirm propagation.

## 13. References

- HeroUI theming: <https://heroui.com/docs/customization>
- Tailwind v4: <https://tailwindcss.com>
- Constitution: II, IV, V.
