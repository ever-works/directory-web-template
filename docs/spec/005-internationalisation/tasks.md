---
id: tasks-005-internationalisation
title: 'Tasks 005 — Internationalisation'
sidebar_label: '005 i18n Tasks'
---

# Tasks — `005-internationalisation`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Locale-prefixed routing

- Files: `apps/web/app/[locale]/**`,
  `apps/web/middleware.ts`,
  `apps/web/i18n/**`.
- Verification: `/`, `/fr`, `/es`, `/de`, `/ar`, `/zh` all resolve.

### T-002 [done] — Six core message catalogs

- Files: `apps/web/messages/{en,fr,es,de,ar,zh}.json`.
- Verification: missing-key warnings absent at build.

### T-003 [done] — Language switcher

- Files: `apps/web/components/language-switcher/**`,
  `apps/web-e2e/tests/public/language-switcher.spec.ts`.
- Verification: switcher e2e passes.

### T-004 [done] — RTL layout

- Files: `apps/web/app/[locale]/layout.tsx`,
  `apps/web/lib/constants.ts` (RTL list).
- Verification: `<html dir="rtl">` for Arabic per
  `tests/i18n/locale-depth.spec.ts`.

### T-005 [done] — Docusaurus i18n

- Files: `apps/docs/docusaurus.config.ts`, `apps/docs/i18n/**`.
- Verification: `pnpm --filter @ever-works/docs build` succeeds with
  `--locale fr` (or equivalent script).

### T-006 [done] — i18n e2e suite

- Files: `apps/web-e2e/tests/i18n/{locale,locale-depth}.spec.ts`.
- Verification: i18n e2e specs are green.

### T-007 [seq] — Plugin SDK message-merge helper

- Files: `packages/plugin-sdk/src/i18n.ts`,
  `apps/web/i18n/request.ts`.
- Steps:
  1. Add `addPluginMessages()` API to the SDK.
  2. Wire the runtime to invoke each plugin's `setup` and merge messages
     into the global catalog.
  3. Document the contract under `docs/internationalization/plugins.md`.
- Verification: a plugin can ship a `messages/fr.json` that overrides a
  key for French and is honoured at runtime.

### T-008 [seq] — Coverage dashboard

- Files: `docs/internationalization/coverage.md`,
  `apps/web/scripts/i18n-coverage.ts`.
- Steps:
  1. Author a script that diffs each locale against `en.json` and
     reports missing keys.
  2. Surface the result on the docs page.
- Verification: running `pnpm tsx apps/web/scripts/i18n-coverage.ts`
  prints a non-zero exit code if any locale has missing keys.

### T-009 [seq] — Automated translation pipeline (deferred)

- Files: future `docs/spec/NNN-i18n-automation/`.
- Verification: spec lands; not part of this plan
  (per `Q-005a` default).

## Acceptance Criteria → Task Map

| AC    | Tasks                          |
| ----- | ------------------------------ |
| AC-1  | T-001                          |
| AC-2  | T-002                          |
| AC-3  | T-003                          |
| AC-4  | T-004                          |
| AC-5  | T-005                          |
| AC-6  | T-003, T-006                   |

## Notes

- Translations are reviewed via PR; no provider integration yet.
- New plugins should use `addPluginMessages()` from T-007 once it lands.
