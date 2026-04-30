---
id: spec-014-docs-translation
title: 'Spec 014 — Documentation Translation'
sidebar_label: '014 Docs Translation'
---

# Feature spec — `014-docs-translation`

> **Status:** In progress (PRs #672, #677, #680, #681 — translations for
> sidebar, getting-started, advanced-guide, features, payment, API,
> architecture). Retroactive spec.

## 1. Summary

Translate the Docusaurus documentation site (`apps/docs`) so non-English
adopters can read the same content in their language. Locales mirror the
[i18n locale set](../005-internationalisation/spec.md): en (source), fr,
es, de, ar, zh.

## 2. Motivation

- The template targets a global audience.
- A first-pass machine translation, then human review, beats blocking
  on a perfect first translation.

## 3. Goals

- Per-locale Docusaurus folders with translated Markdown.
- Sidebar / nav translated.
- Code samples remain in source form (no translation of code).
- Visible `lang` attribute and RTL where applicable.

## 4. Non-Goals

- Inline machine-translation of arbitrary user content.
- Real-time translation API surface.

## 5. User Stories

```text
As a French-speaking developer evaluating the template, I want the docs
in French so I can understand it without context-switching.
```

## 6. Acceptance Criteria

- [ ] AC-1: Every page under `docs/` has a translation file in each
  supported locale or is explicitly marked as English-only.
- [x] AC-2: `apps/docs/docusaurus.config.ts` lists all supported
  locales.
- [x] AC-3: CI builds the English docs at minimum (per
  `.github/workflows/docs.yml`); per-locale builds gated to release
  branches to keep CI fast (per the “split docs CI” change).
- [ ] AC-4: A coverage table in `docs/internationalization/coverage.md`
  (gap, see “Open”).

## 7. Out-of-Scope Considerations

- Auto-pulling translations from Crowdin / similar at build time.
- Automated diff alerts when English source diverges from translations.

## 8. UX Notes

- Sidebar labels translated; URLs stay English to avoid breaking
  inbound links.
- Locale switcher in the docs theme.

## 9. Data & API Surface

None — Docusaurus i18n directories.

## 10. Plugin / Adapter Impact

Docs site is core infrastructure. A future plugin could automate
translation pipelines.

## 11. Risks & Open Questions

- **Open:** centralise translations in a Crowdin / Lokalise project or
  keep them in the repo? Default: **keep in repo for now**.

## 12. Acceptance Test Plan

- Manual: switch locale on the docs site, sanity-check a sample page.
- CI: docs build green per locale once enabled.

## 13. References

- PR #672, #677, #680, #681.
- Constitution Articles IV (Docs), VI (Latest Frameworks).
