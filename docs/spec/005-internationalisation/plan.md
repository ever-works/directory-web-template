---
id: plan-005-internationalisation
title: 'Plan 005 — Internationalisation'
sidebar_label: '005 i18n Plan'
---

# Implementation Plan — `005-internationalisation`

> **Spec:** [`spec.md`](./spec.md)
>
> **Status.** Retroactive. Documents the shipped i18n topology and the
> plugin-side translation merging that will land with spec 002.

## 1. High-Level Approach

The web app uses **`next-intl`** with locale-prefixed routes under
`apps/web/app/[locale]/**`. UI strings live in
`apps/web/messages/<locale>.json`. RTL is handled by the layout setting
`dir="rtl"` for Arabic / Hebrew / Persian based on a static map. The
Docusaurus docs site translates per-locale via the `i18n` config key,
sourcing translated content from `docs/<feature>/<locale>/**` (when
present) and falling back to English.

Plugins will be able to ship their own `messages/<locale>.json` and
register it through a new SDK helper (deep-merged into the global message
catalog at boot). That helper lands with spec 002.

## 2. Architecture Diagram

```mermaid
flowchart LR
  Req[(HTTP request)] --> MW[middleware: detect locale]
  MW --> RouteShell[app/[locale]/layout.tsx]
  RouteShell --> Provider[NextIntlClientProvider]
  Provider --> Page[app/[locale]/...]
  subgraph Messages
    En[messages/en.json]
    Fr[messages/fr.json]
    Es[messages/es.json]
    De[messages/de.json]
    Ar[messages/ar.json]
    Zh[messages/zh.json]
  end
  Provider -->|locale| Messages
  subgraph Future["packages/<plugin>/messages/<locale>.json"]
    PluginMsgs
  end
  PluginMsgs -. "future merge" .-> Messages
```

## 3. Affected Packages & Files

| Path                                              | Change      | Notes                                    |
| ------------------------------------------------- | ----------- | ---------------------------------------- |
| `apps/web/app/[locale]/**`                        | maintain    | Localised routes.                        |
| `apps/web/messages/{en,fr,es,de,ar,zh}.json`      | maintain    | Translation source files.                |
| `apps/web/i18n/**`                                | maintain    | next-intl request config + helpers.      |
| `apps/web/lib/constants.ts`                       | maintain    | `Locale` type and RTL list.              |
| `apps/web-e2e/tests/i18n/{locale,locale-depth}.spec.ts` | maintain | Locale routing coverage.            |
| `apps/web-e2e/tests/public/language-switcher.spec.ts`   | maintain | UI switcher coverage.               |
| `apps/docs/i18n/**`                               | maintain    | Per-locale Docusaurus translations.      |
| `docs/internationalization/**`                    | maintain    | Feature documentation.                   |
| `docs/spec/005-internationalisation/{plan,tasks}.md` | **this PR** | Catch up Spec Kit artefacts.          |
| Future: `@ever-works/plugin-sdk` `addPluginMessages()` | future | Merge plugin messages at boot.       |

## 4. Public API / Plugin Manifest

Future SDK helper signature:

```ts
// packages/plugin-sdk/src/i18n.ts
export interface PluginMessages { [locale: string]: Record<string, unknown> }
export function addPluginMessages(messages: PluginMessages): void;
```

Plugins ship their `messages/` folder under their own package and call
`addPluginMessages` from their `setup` hook.

## 5. Data Model

No DB tables are added. Translation JSONs are shipped at build time.

## 6. UX & A11y Plan

- Switcher is a keyboard-accessible dropdown.
- Selected locale persists via cookie + URL prefix.
- RTL locales render with `dir="rtl"` and Tailwind `rtl:` utilities.
- Number / currency / date formatting through `Intl.*` APIs.

## 7. Performance Plan

- Messages shipped per-locale; no client downloads other than the active
  locale.
- Server components render translated copy; client components hydrate
  with the provider already populated.

## 8. Security Plan

- Translations are static JSON at build time — no runtime injection.
- Locale switcher does not expose internal route metadata.

## 9. Test Plan

- E2E:
  - `tests/i18n/locale.spec.ts` (routing).
  - `tests/i18n/locale-depth.spec.ts` (each locale loads).
  - `tests/public/language-switcher.spec.ts` (UI).
- Manual: switch to Arabic, verify mirrored layout.

## 10. Rollout & Migration Plan

- This plan is retroactive.
- Plugin-side message merging lands with spec 002.

## 11. Constitution Check

- [x] **I — Plugin-First** — locale is core; plugin merge path documented.
- [x] **II — TypeScript Everywhere** — typed messages + JSON.
- [x] **III — Spec Before Code** — spec exists.
- [x] **IV — Documentation First-Class** — `docs/internationalization/`.
- [x] **V — Performance Budget** — per-locale messages only.
- [x] **VI — Latest Stable Frameworks** — next-intl on latest.
- [x] **VII — Reuse Before Build** — next-intl + Docusaurus i18n.
- [x] **VIII — No Removal Without Migration** — additive.
- [x] **IX — Test Coverage Bar** — three i18n e2e specs.
- [x] **X — Modular Packages** — translations per package (future).

## 12. Complexity Tracking

None.

## 13. Open Questions

Mirrored to [`docs/questions.md`](../../questions.md):

- `Q-005a` Automated translation pipeline — **default: stay manual**.

## 14. References

- Spec: `./spec.md`
- next-intl: <https://next-intl.dev>
- Docusaurus i18n: <https://docusaurus.io/docs/i18n/introduction>
- Constitution Articles: II, IV, V, VI, IX.
