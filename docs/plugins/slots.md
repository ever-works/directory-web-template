---
id: plugin-slots
title: Plugin Slots Reference
sidebar_label: Slots Reference
sidebar_position: 7
---

# Plugin Slots Reference

> **Status.** Authoritative reference for the v1 slot surface defined
> in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The canonical slot id list is locked by [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts);
> when the SDK adds, removes, or renames a slot id, update **this**
> page in the same change so the doc and the SDK cannot drift.

A **slot** is a named extension point the template's layouts hand to
the runtime. A plugin attaches a React component to a slot id; the
runtime's [`<SlotHost />`](./packages.md#ever-worksplugin-runtime)
renders every contributed component for that slot in registration
order.

Slot ids are **stable identifiers** — renaming one is a breaking
change for every plugin that uses it. Adding a new slot is a small
spec under [`docs/spec/`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec)
that updates both the SDK and this page.

## At a glance

| Slot id                       | Where it renders                              | Surface  |
| ----------------------------- | --------------------------------------------- | -------- |
| `header.left`                 | Public header, left side                      | Public   |
| `header.right`                | Public header, right side                     | Public   |
| `footer.center`               | Public footer middle column                   | Public   |
| `home.before-listing`         | Above the home page item grid                 | Public   |
| `home.after-listing`          | Below the home page item grid                 | Public   |
| `item.detail.sidebar`         | Right-hand sidebar on the item detail page    | Public   |
| `item.detail.actions`         | Action row on the item detail page            | Public   |
| `item.detail.afterFooter`     | Below the item detail content footer          | Public   |
| `admin.layout.header.right`   | Right side of the admin app header            | Admin    |
| `admin.settings.section`      | Inside the admin Settings accordion           | Admin    |
| `admin.dashboard.widgets`     | Admin dashboard widget grid                   | Admin    |
| `admin.items.row.actions`     | Per-row action menu in the admin items table  | Admin    |
| `admin.items.toolbar`         | Toolbar above the admin items table           | Admin    |
| `client.dashboard.widgets`    | Client dashboard widget grid                  | Client   |
| `client.settings.section`     | Inside the client Settings accordion          | Client   |

`SLOT_IDS` from [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts)
is `as const`, so every slot id is also a TypeScript literal type.
The SDK's `isSlotId(value)` type guard is a runtime parity check that
adopters can use when accepting slot ids from external configuration.

## The component contract

Every slot component is a React component that takes a single
`{ ctx }` prop. The runtime injects the contributing plugin's own
[`PluginContext`](./lifecycle.md#runtime-context-pluginContext) so
the component can read its **own** typed config:

```tsx
import type { SlotComponentProps } from '@ever-works/plugin-sdk';

interface MyConfig {
  message: string;
  level: 'info' | 'warn';
}

export function Banner({ ctx }: SlotComponentProps<MyConfig>) {
  return (
    <div role="region" aria-label="welcome banner" data-level={ctx.config.level}>
      {ctx.config.message}
    </div>
  );
}
```

Rules of the road:

- **Props are fixed at `{ ctx }`.** The runtime never passes anything
  else. If a slot component needs request-scoped data, read it via a
  hook the host app already exposes, or surface a new shared hook
  through a follow-up spec.
- **Render an accessible region.** Slot consumers (and the e2e
  smoke specs) target slots via `getByRole('region', { name: /…/ })`
  or `data-testid` — never on copy. See the
  [Testing a Plugin](./testing-a-plugin.md#5-end-to-end-with-playwright)
  guide for the rationale.
- **Keep it server-friendly.** Slot components MAY be server components
  unless they call browser-only APIs. The runtime's `<SlotHost />`
  renders without an extra client boundary, so making your component
  `"use client"` opts the entire slot host into client rendering.
- **Localise via `next-intl`.** Plugin messages live alongside the
  plugin and are merged into the `next-intl` namespace keyed by plugin
  name (`mything.title`, `mything.cta`). Don't hard-code English.

## Composition rules

- **Order is registration order.** `slotsFor(slotId)` returns
  contributions in the order their plugins registered. To force a
  specific order, register plugins in that order in
  `apps/web/lib/plugins/registry.ts`.
- **Multiple plugins per slot are supported.** Two banners stack;
  two header badges sit side by side. The host layout decides the
  horizontal vs vertical layout via CSS — the runtime only emits a
  flat list of children.
- **Disabled plugins disappear immediately.** Calling
  `registry.disable(name)` removes that plugin's contributions from
  every slot on the next render — no reload required.
- **Fallback when empty.** `<SlotHost slotId="…" fallback={<Default />} />`
  renders `fallback` when no plugin contributes to the slot. Use this
  to keep a built-in widget while still offering a plugin extension
  point.
- **`<SlotHost />` is a Fragment.** It does not wrap children in any
  DOM element. The hosting layout is responsible for the container
  semantics.

## Slot-by-slot reference

### Public surface

#### `header.left`

The left side of the public header — typically reserved for a logo
or a brand link. Use this slot for **brand-adjacent** widgets such
as a "What's new" announcement pill that should appear next to the
logo.

#### `header.right`

The right side of the public header — typically next to sign-in /
sign-out controls and the locale switcher. Most third-party plugins
that contribute a header widget land here. The bundled `plugin-demo`
package contributes a "Demo plugin loaded" badge to this slot as the
worked end-to-end example.

#### `footer.center`

The middle column of the public footer. Common uses: newsletter
signup CTAs, status badges (uptime, build, deployment region), small
inline disclaimers. Plugins that render large interactive widgets
should consider `home.after-listing` instead so the slot does not
push critical footer links below the fold on mobile.

#### `home.before-listing`

Renders **above** the home page item grid, between the hero and the
listing. Use this slot for above-the-fold call-to-action banners,
seasonal promo bars, or onboarding prompts.

#### `home.after-listing`

Renders **below** the home page item grid. Good for sponsorship CTAs,
newsletter subscriptions targeting visitors who scrolled the full
listing, or "submit your tool" widgets.

#### `item.detail.sidebar`

The right-hand sidebar on `/items/[slug]` pages. Use this slot for
contextual widgets keyed off the current item — related-item lists,
"made by" cards, or affiliate-link CTAs. Sidebar plugins should be
data-light: the listing renders server-side and waterfalled fetches
in this slot push Time-to-Interactive past the
[Spec 018](../spec/018-performance-budget/spec.md) budget.

#### `item.detail.actions`

The action row on the item detail page (favourite, share, copy
link). Plugins land additional action buttons here. The host already
provides favourite, share, and copy buttons — plugin contributions
appear after those.

#### `item.detail.afterFooter`

Renders below the item detail page's content footer. Lower priority
than the sidebar and the action row, but useful for long-form
follow-up content (related articles, "people also liked", embedded
support widgets).

### Admin surface

The admin slots are reachable only from `/admin/**` pages, which are
behind the admin guard (see
[`apps/web/middleware.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/middleware.ts)
and the admin auth contract).

#### `admin.layout.header.right`

The right side of the admin app header. Use for admin-only widgets
that should be visible across every admin page (alerts, environment
indicators, "switch tenant" pickers).

#### `admin.settings.section`

Adds a new accordion section to the admin Settings page. The host
already supplies sections for general / appearance / SEO / payments
/ analytics; plugin contributions appear after those. The component
typically renders a settings form bound to the plugin's own config.

#### `admin.dashboard.widgets`

The admin dashboard widget grid. Use for read-only KPI cards that
surface plugin-specific metrics (e.g. "Newsletter signups this
week", "Sponsor revenue this month"). The host lays the grid out
responsively — your component should be a single self-contained card.

#### `admin.items.row.actions`

The per-row action menu in the admin items table (the "…" dropdown
on each item row). Plugin contributions appear after the built-in
view / edit / delete entries. Each contribution renders one menu
item; chained sub-menus aren't supported in v1.

#### `admin.items.toolbar`

The toolbar **above** the admin items table. Use for batch-action
controls (export, bulk-tag, bulk-categorise) or alternative-view
toggles. Plugin contributions appear after the built-in search and
filter controls.

### Client (signed-in user) surface

The client slots render only for users signed into the public
listing — they live under `/client/**` (also gated by middleware).

#### `client.dashboard.widgets`

The client dashboard widget grid. Mirrors `admin.dashboard.widgets`
but scoped to the signed-in user's own data ("Your favourites this
week", "Items you submitted").

#### `client.settings.section`

Adds a new accordion section to the client Settings page. Use for
plugin-specific user preferences (notification frequency, theme
overrides, etc.).

## Adding a new slot

A new slot id is a Spec 002-style amendment because the slot list is
public SDK surface. The minimal change set is:

1. Add the id to [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts).
2. Add a section to **this** page describing where it renders, the
   intended use case, and any composition caveats.
3. Add a row to the at-a-glance table.
4. Wire `<SlotHost slotId="…" registry={…} />` into the layout that
   should host the slot. The host MUST treat zero contributions as
   "render nothing" or supply a `fallback`.
5. Append a line to [`docs/log.md`](../log.md) and reference the
   feature spec under `docs/spec/<NNN>-<slug>/`.

Do **not** rename an existing slot id. If a slot's purpose drifts,
add a new id, deprecate the old one in this reference, and remove
it only when no bundled plugin still contributes to it (Article VIII
of the [constitution](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)).

## See also

- [Plugin System (Architecture)](../architecture/plugin-system.md)
- [Authoring a Plugin](./authoring-a-plugin.md)
- [Plugin Lifecycle](./lifecycle.md)
- [Testing a Plugin](./testing-a-plugin.md)
- [Plugin Capabilities Reference](./capabilities.md) — the parallel
  reference for the capability surface (auth, payment, analytics, …).
- [Plugin Loader Reference](./loader.md) — the per-API reference for
  `loadPlugins` / `mergeConfigSources` paired with `loader.ts`.
- [Plugin Registry Reference](./registry.md) — the per-API reference
  for `PluginRegistry` paired with `registry.ts`; documents the
  `slotsFor` return shape that `<SlotHost />` consumes.
- [Plugin SlotHost Reference](./slot-host.md) — the per-component
  reference paired with `SlotHost.tsx`; documents the `fallback`
  semantics, the empty-vs-non-empty rules, and how the Fragment-only
  output keeps layouts in control of surrounding markup.
- [Plugin Testing Reference](./testing.md) — the per-helper
  reference paired with `testing.ts`; documents how
  `createTestRegistry` produces the registry that
  `registry.slotsFor("…")` reads in slot-composition tests, and the
  three worked examples (happy path, config-required, disable
  round-trip) that mirror the Playwright slot specs in
  `apps/web-e2e/tests/plugins/slots.spec.ts`.
- [Plugin Manifest Reference](./manifest.md) — the per-field
  reference paired with `manifest.ts`; documents the `ui-slot`
  capability that every slot-contributing plugin must declare in
  `manifest.capabilities` and the `manifest.name` field used as
  the React key for every contribution rendered through
  `<SlotHost />`.
- [Plugin Packages](./packages.md)
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts) — the source of truth.
