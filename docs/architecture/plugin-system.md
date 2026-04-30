---
id: plugin-system
title: Plugin System (Architecture)
sidebar_label: Plugin System
---

# Plugin System (Architecture)

> **Status.** Spec [`002-plugin-architecture`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
> is **in-progress**. Phase A — package scaffolding for
> [`@ever-works/plugin-sdk`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk),
> [`@ever-works/plugin-runtime`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime),
> and [`@ever-works/plugin-demo`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo)
> — landed in commit `8b68d29a` (`feat(plugins): scaffold plugin-sdk,
> plugin-runtime, plugin-demo`). The packages type-check cleanly and
> are wired into the workspace; Phase B (host-app boot, admin UI,
> per-feature migrations) is the active track. This page describes the
> **target architecture** every shipped feature is being migrated
> toward. Where existing code still pre-dates this design (for example
> `apps/web/lib/payment/`, `apps/web/lib/analytics/`), it is kept as
> the source of truth until its dedicated migration spec lands.

## Why a plugin system?

The Directory Web Template is built to be **forked, extended, and
operated** by many different teams. Each team has a different mix of
auth providers, payment providers, analytics tools, content sources,
and UI customisations. A plugin system gives them a clean extension
surface that:

- keeps **upstream merges painless** — third-party features live in
  their own packages, not patched into core.
- enforces a **uniform shape** for every integration, so reading the
  codebase scales as the matrix of providers grows.
- lets adopters **enable / disable / swap / replace** features at
  runtime without code edits.
- makes the codebase friendly to **AI agents**: every contract is one
  TypeScript interface, declared once.

## The three packages

```
packages/
├── plugin-sdk/        ← types, interfaces, defineDirectoryPlugin()
├── plugin-runtime/    ← registry, slot host, config loader (React-aware)
└── plugin-demo/       ← reference plugin (header-right badge slot)
```

The third package (`plugin-demo`) is **not** required for the runtime
to operate. It is a teaching example that the docs and tests can
import as a stable, real plugin without coupling them to a future
production plugin's surface.

- `@ever-works/plugin-sdk` is **framework-agnostic**. Any plugin —
  even one written in another framework — can implement the
  interfaces it exports.
- `@ever-works/plugin-runtime` is **React-aware**. It mounts the
  registry, exposes capability lookups, and provides the
  `<SlotHost />` component used by layouts.

## Capabilities

A capability is the **kind of thing** a plugin contributes. The v1 set
is:

| Capability      | Interface                | Examples                                  |
| --------------- | ------------------------ | ----------------------------------------- |
| `auth`          | `AuthProvider`           | Google, GitHub, Microsoft, SSO            |
| `payment`       | `PaymentProvider`        | Stripe, LemonSqueezy, Polar               |
| `analytics`     | `AnalyticsProvider`      | PostHog, GA, Plausible, DataFast, Jitsu   |
| `search`        | `SearchProvider`         | Algolia, Typesense, Postgres FTS          |
| `content-source`| `ContentSource`          | Git CMS (default), Hygraph, Sanity        |
| `maps`          | `MapsProvider`           | Google Maps (default), Mapbox, MapLibre   |
| `newsletter`    | `NewsletterProvider`     | Resend (default), Mailchimp, Loops        |
| `notifications` | `NotificationsProvider`  | Novu (default), Knock, Courier            |
| `ai`            | `AIProvider`             | Anthropic, OpenAI, OpenRouter             |
| `ui-slot`       | `UISlotComponent`        | Header widgets, admin panels, banners     |

A single plugin can declare multiple capabilities (e.g. an auth plugin
that also exposes an admin UI panel via `ui-slot`).

## Slots

Every layout exposes named **slots**. Plugins register React components
into a slot id; the runtime renders them when that slot is hosted in
the page tree.

| Slot id                       | Where it renders                       |
| ----------------------------- | -------------------------------------- |
| `header.left`                 | Public header, left side               |
| `header.right`                | Public header, right side              |
| `footer.center`               | Public footer middle column            |
| `home.before-listing`         | Above the home page item grid          |
| `home.after-listing`          | Below the home page item grid          |
| `item.detail.sidebar`         | Right-hand sidebar on item detail      |
| `item.detail.afterFooter`     | Below the item detail content footer   |
| `item.detail.actions`         | Action row on the item detail page     |
| `admin.layout.header.right`   | Right side of the admin app header     |
| `admin.settings.section`      | Inside the admin Settings accordion    |
| `admin.dashboard.widgets`     | Admin dashboard widget grid            |
| `admin.items.row.actions`     | Per-row action menu in admin items table |
| `admin.items.toolbar`         | Toolbar above the admin items table    |
| `client.dashboard.widgets`    | Client dashboard widget grid           |
| `client.settings.section`     | Inside the client Settings accordion   |

> The canonical, authoritative list lives in
> [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts);
> the runtime imports `SLOT_IDS` from there. Update both this table
> and that file together when adding a new slot.

Slot ids are **stable identifiers**, owned by the template. Adding a
new slot is a small spec under
[`docs/spec/`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec).

## Lifecycle

1. **Boot.** `apps/web/instrumentation.ts` (or a dedicated boot file)
   imports the canonical list of bundled plugins from
   `apps/web/lib/plugins/registry.ts`.
2. **Validate.** Each plugin’s Zod config schema is run against the
   merged config (env + DB). Boot fails loudly on the first invalid
   plugin.
3. **Register.** Plugins are added to a singleton `PluginRegistry`.
4. **Setup.** If the plugin defines `setup(ctx)`, it runs once with
   the validated config.
5. **Render.** `<SlotHost slotId="…">` looks up registered components
   for the slot and renders them.
6. **Enable / disable.** The admin UI calls
   `POST /api/admin/plugins/:name/enable`, persists the choice in the
   `plugin_settings` DB row, and triggers a registry refresh
   (per-request cache bust + cache tag invalidation).

## Configuration precedence

`env` < `DB row` < `explicit override`. In code:

```ts
const merged = {
  ...envConfig,
  ...dbConfig,
  ...overrideConfig,
};
const validated = manifest.config.parse(merged);
```

This matches how analytics is already configured (see
[Spec 008](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/008-analytics-providers))
and is the model future plugins should follow.

## Boundaries (ESLint)

Once the SDK ships, an ESLint boundary rule will forbid:

- `apps/web/lib/core/**` from importing `packages/plugin-*`.
- `packages/plugin-runtime/**` from importing `apps/web/**`.
- `packages/plugin-<name>/**` from importing `apps/web/**`.

Plugins talk to core through interfaces in `@ever-works/plugin-sdk`,
not by reaching into `apps/web/`.

## Testing

Every plugin owns its tests. The runtime provides a
`createTestRegistry({ plugins })` helper so plugin authors can mount a
slot host with a synthetic registry in unit tests without touching the
real DB.

End-to-end coverage of the plugin system itself lives under
`apps/web-e2e/tests/plugins/` (specs to be added per
[Spec 002 / Tasks](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md)).

## See also

- [`docs/spec/002-plugin-architecture/spec.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/spec.md)
- [`docs/spec/002-plugin-architecture/plan.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/plan.md)
- [`docs/spec/002-plugin-architecture/tasks.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md)
- [`/docs/plugins/authoring-a-plugin`](/plugins/authoring-a-plugin) — author’s guide.
- [`/docs/plugins/lifecycle`](/plugins/lifecycle) — boot, validation, enable/disable.
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md) — Article I.
