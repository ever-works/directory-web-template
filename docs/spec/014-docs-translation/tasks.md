---
id: tasks-014-docs-translation
title: 'Tasks 014 — Documentation Translation'
sidebar_label: '014 Docs Translation Tasks'
---

# Tasks — `014-docs-translation`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Locale list in Docusaurus config

- Files: `apps/docs/docusaurus.config.ts`.
- Verification: `pnpm --filter @ever-works/docs build` succeeds for
  each declared locale.

### T-002 [done] — Initial translation drops

- Files: `apps/docs/i18n/<locale>/**`,
  `docs/{getting-started,advanced-guide,features,payment,api,architecture}/**`.
- Verification: PRs #672, #677, #680, #681 merged.

### T-003 [done] — CI split: English on PR, full builds on release

- Files: `.github/workflows/docs.yml`.
- Verification: PRs do not block on per-locale builds.

### T-004 [seq] — Coverage table

- Files: `docs/internationalization/coverage.md`,
  `apps/web/scripts/i18n-coverage.ts`.
- Verification: running the script generates a table listing each docs
  page and the locales that have a translated body.

### T-005 [P] — Translate docs/spec/* index headings

- Files: `apps/docs/i18n/<locale>/docusaurus-plugin-content-docs/current/spec/**`.
- Verification: `apps/docs build --locale fr` produces translated
  sidebar entries for the spec section.

### T-006 [seq] — Diff alerts (future)

- Files: future `.github/workflows/docs-translation-diff.yml`.
- Verification: spec lands; not part of this plan.

### T-007 [seq] — Move to Crowdin (future, gated by `Q-014a`)

- Files: future `docs/spec/NNN-docs-crowdin/`.
- Verification: spec lands.

## Acceptance Criteria → Task Map

| AC    | Tasks               |
| ----- | ------------------- |
| AC-1  | T-002, T-005        |
| AC-2  | T-001               |
| AC-3  | T-003               |
| AC-4  | T-004               |

## Notes

- Translation work is incremental; per-feature folders ship as ready.
- Per `Q-014a`, translations stay in the repo for now.
