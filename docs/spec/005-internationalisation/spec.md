---
id: spec-005-internationalisation
title: 'Spec 005 — Internationalisation'
sidebar_label: '005 i18n'
---

# Feature spec — `005-internationalisation`

> **Status:** Shipped (next-intl, six core locales, RTL support).
> Retroactive spec.

## 1. Summary

Make the entire user-facing surface of the template translatable using
`next-intl`, with full RTL support for languages such as Arabic and
Hebrew. The Docusaurus docs site (`apps/docs`) follows the same locale
list with its own translation pipeline.

## 2. Motivation

- Directories often serve multilingual audiences and a polished
  multilingual experience is a key differentiator.
- RTL is non-negotiable for serving Arabic / Hebrew / Persian audiences.
- Decoupling translation strings from JSX makes maintenance and
  contribution simpler.

## 3. Goals

- All UI strings live in `apps/web/messages/<locale>.json`.
- Routes are localised under `apps/web/app/[locale]/**` with a default
  locale prefix policy.
- `dir="rtl"` applied automatically for RTL locales.
- Locale detection respects `Accept-Language` and a saved cookie.
- Docs site translated via Docusaurus’s i18n features sourced from
  `docs/<feature>/` with locale subdirectories.

## 4. Non-Goals

- Per-tenant runtime locale overrides (future spec).
- Translating user-generated content (future, plugin-based).

## 5. User Stories

```text
As a French-speaking user, I want the site in French so I can read it
comfortably.

As an Arabic-speaking user, I want a properly mirrored RTL layout so my
reading flow is natural.

As a maintainer, I want a single JSON file per locale so adding a new
language is a copy-paste operation.
```

## 6. Acceptance Criteria

- [x] AC-1: Routes nested under `app/[locale]/`.
- [x] AC-2: `messages/<locale>.json` exists for at least: en, fr, es, de,
  ar, zh.
- [x] AC-3: Language switcher visible in the header switches locale.
- [x] AC-4: RTL locales render with `dir="rtl"`.
- [x] AC-5: Documentation builds per-locale via Docusaurus.
- [x] AC-6: E2E specs:
  `apps/web-e2e/tests/i18n/locale.spec.ts`,
  `apps/web-e2e/tests/i18n/locale-depth.spec.ts`,
  `apps/web-e2e/tests/public/language-switcher.spec.ts`.

## 7. Out-of-Scope Considerations

- Currency / number formatting is partially covered by `Intl.NumberFormat`
  but a per-tenant override is out of scope.

## 8. UX Notes

- Switcher is keyboard-accessible.
- Selected locale persisted via cookie + URL.

## 9. Data & API Surface

- No DB tables added.
- Translation JSON shape is type-safe via `next-intl`’s typed messages.

## 10. Plugin / Adapter Impact

Locale is a core concern; not a plugin. Plugins, however, should ship
their own translation JSONs and merge into the global namespace through
the SDK helper (future enhancement under
[`002`](../002-plugin-architecture/spec.md)).

## 11. Risks & Open Questions

- **Risk:** missing translation keys at build time. Mitigated by typed
  messages.
- **Open:** automated translation pipeline (DeepL / OpenAI). Tracked in
  `docs/questions.md`.

## 12. Acceptance Test Plan

E2E specs above; manual check by switching locales.

## 13. References

- `next-intl`: <https://next-intl-docs.vercel.app>
- Docs i18n: <https://docusaurus.io/docs/i18n/introduction>
- Constitution: II (TypeScript), IV (Docs), VI (Latest).
