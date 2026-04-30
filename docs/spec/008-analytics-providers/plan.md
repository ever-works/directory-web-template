---
id: plan-008-analytics-providers
title: 'Plan 008 — Analytics Providers'
sidebar_label: '008 Analytics Plan'
---

# Implementation Plan — `008-analytics-providers`

> **Spec:** [`spec.md`](./spec.md)
>
> **Status.** Retroactive. The multi-provider analytics layer with
> typed events and the admin Analytics Settings panel is shipped.

## 1. High-Level Approach

Analytics is a layered abstraction:

1. A **typed event API** under [`apps/web/lib/analytics/`](../../apps/web/lib/analytics) emits Zod-validated events.
2. **Per-provider modules** (`posthog/`, `google-analytics/`,
   `plausible/`, `datafast/`, `jitsu/`, `segment/`) translate events into
   provider-specific calls.
3. **Configuration deep-merge** (env baseline + DB overrides + explicit
   override) determines which providers are active. Only enabled
   providers' scripts are injected into `<head>`, and the CSP is
   constructed accordingly.
4. **Admin Analytics Settings** UI surfaces toggles & provider-specific
   fields; saving persists a JSON blob to `analytics_settings`.

Migration to plugins (per spec 002) turns each provider module into a
package, registered through the SDK and toggleable from the existing
admin UI without code changes.

## 2. Architecture Diagram

```mermaid
flowchart LR
  Code[track('item.viewed', {...})] --> EventAPI[lib/analytics/events.ts]
  EventAPI --> Bus[providers bus]
  Bus --> PostHog
  Bus --> GA[Google Analytics]
  Bus --> Plausible
  Bus --> DataFast
  Bus --> Jitsu
  Bus --> Segment
  Settings[admin Settings] --> DB[(analytics_settings)]
  ENV[.env*] -. baseline .-> Merge[deep merge]
  DB --> Merge
  Merge --> Bus
  Merge --> CSP[CSP builder]
```

## 3. Affected Packages & Files

| Path                                                  | Change      | Notes                                       |
| ----------------------------------------------------- | ----------- | ------------------------------------------- |
| `apps/web/lib/analytics/**`                           | maintain    | Event API + per-provider modules.           |
| `apps/web/lib/db/schema/analytics-settings.ts`        | maintain    | Settings table.                             |
| `apps/web/components/admin/settings/analytics/**`     | maintain    | Admin UI.                                   |
| `apps/web/messages/{en,fr,…}.json`                    | maintain    | i18n keys for analytics labels.             |
| `apps/web/lib/csp.ts`                                 | maintain    | Provider host allow-list.                   |
| `apps/web-e2e/tests/admin/settings.spec.ts`           | maintain    | Settings UI smoke.                          |
| `apps/web-e2e/tests/public/analytics-emission.spec.ts`| **future**  | Lands per spec 010 AC-5.                    |
| `packages/plugin-analytics-{posthog,ga,plausible,datafast,jitsu,segment}/` | future | Migration target (002). |
| `docs/spec/008-analytics-providers/{plan,tasks}.md`   | **this PR** | Catch up Spec Kit artefacts.                |

## 4. Public API / Plugin Manifest

Today's typed event API:

```ts
// apps/web/lib/analytics/events.ts
export const Events = {
  'item.viewed': z.object({ id: z.string(), slug: z.string() }),
  'item.upvoted': z.object({ id: z.string() }),
  'comment.posted': z.object({ itemId: z.string(), commentId: z.string() }),
  // ...
} satisfies Record<string, z.ZodTypeAny>;

export function track<E extends keyof typeof Events>(
  event: E,
  payload: z.infer<(typeof Events)[E]>
): void;
```

Future plugin manifest:

```ts
// packages/plugin-analytics-posthog/src/index.ts
export default defineDirectoryPlugin({
  manifest: {
    name: 'analytics-posthog',
    capabilities: ['analytics'],
    config: z.object({
      enabled: z.boolean().default(false),
      apiKey: z.string().min(1),
      apiHost: z.string().url().default('https://app.posthog.com'),
    }),
    defaultEnabled: false,
    adminToggleable: true,
  },
  providers: { analytics: { /* AnalyticsProvider impl */ } },
});
```

## 5. Data Model

- `analytics_settings(id, json, updatedAt)`.
- Deep-merge: `env baseline ⊆ DB row ⊆ explicit override`.

## 6. UX & A11y Plan

- Each provider section is collapsible.
- Toggles state the data each provider collects.
- Disabled providers grey out their fields.
- All copy localised via `next-intl`.

## 7. Performance Plan

- Provider scripts loaded with `defer`.
- Disabled providers do not ship JS to the client.
- Event emission uses `requestIdleCallback` where available.

## 8. Security Plan

- CSP allow-list constructed dynamically from enabled providers.
- Server-only provider secrets (`*_SECRET`, `*_API_KEY`) never reach
  the client.
- Zod-validated events prevent malformed payloads from leaking.

## 9. Test Plan

- E2E (existing): `tests/admin/settings.spec.ts`.
- E2E (planned, per 010 AC-5):
  `tests/public/analytics-emission.spec.ts`.
- Manual: enable PostHog → emit event → see entry in PostHog dashboard.

## 10. Rollout & Migration Plan

- Retroactive plan.
- Plugin migration sequenced behind 002.

## 11. Constitution Check

- [x] **I — Plugin-First** — analytics is the **reference migration**
  target for spec 002.
- [x] **II — TypeScript Everywhere** — TS event API.
- [x] **III — Spec Before Code** — spec exists.
- [x] **IV — Documentation First-Class** — `docs/integrations/`.
- [x] **V — Performance Budget** — deferred scripts.
- [x] **VI — Latest Stable Frameworks** — current SDKs.
- [x] **VII — Reuse Before Build** — provider SDKs.
- [x] **VIII — No Removal Without Migration** — additive.
- [x] **IX — Test Coverage Bar** — settings e2e present, emission
  spec planned.
- [x] **X — Modular Packages** — future plugin packages outlined.

## 12. Complexity Tracking

None.

## 13. Open Questions

Mirrored to [`docs/questions.md`](../../questions.md):

- `Q-008a` Consent banner integration — **default: future plugin**.

## 14. References

- Spec: `./spec.md`
- PRs: #685, #686, #691, #692.
- Constitution Articles: I, IV, V, VI, VII, IX.
