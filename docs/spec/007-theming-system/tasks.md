---
id: tasks-007-theming-system
title: 'Tasks 007 — Theming System'
sidebar_label: '007 Theming Tasks'
---

# Tasks — `007-theming-system`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Theme provider + light/dark/system toggle

- Files: `apps/web/lib/themes.tsx`,
  `apps/web/components/theme-toggle/**`.
- Verification: e2e theme-toggle spec is green.

### T-002 [done] — Pre-hydration class application

- Files: small inline `<script>` in `apps/web/app/[locale]/layout.tsx`.
- Verification: no flash-of-unstyled-content on cold reload.

### T-003 [done] — Color generator

- Files: `apps/web/lib/color-generator.ts`.
- Verification: derived palette covers 50–950 ramp; foreground contrast
  clamp keeps WCAG AA on text.

### T-004 [done] — Admin theme settings

- Files: `apps/web/app/[locale]/admin/(dashboard)/settings/**`.
- Verification: setting a new primary updates HeroUI tokens at the next
  request.

### T-005 [P] — A11y contrast warning in admin

- Files: `apps/web/components/admin/settings/theming/**`.
- Steps:
  1. Compute contrast against typical foreground / background.
  2. Render an inline warning when < 4.5:1.
- Verification: manual axe pass.

### T-006 [seq] — Logo upload (future plugin)

- Files: future `packages/plugin-logo-upload/**`,
  `docs/spec/NNN-logo-upload/spec.md`.
- Verification: spec lands; not part of this plan
  (per `Q-007a` default).

### T-007 [seq] — Brand-themes plugin (future)

- Files: future `packages/plugin-themes-<name>/**`.
- Verification: a plugin can register additional CSS variables; admin
  can switch between bundled brand themes.

## Acceptance Criteria → Task Map

| AC    | Tasks                          |
| ----- | ------------------------------ |
| AC-1  | T-001                          |
| AC-2  | T-001, T-002                   |
| AC-3  | T-003, T-004                   |
| AC-4  | T-003, T-004                   |
| AC-5  | T-001                          |

## Notes

- Color generator clamps lightness range to keep text legibility.
- Admin settings persist via the existing `theme_settings` row.
