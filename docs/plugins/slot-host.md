---
id: plugin-slot-host
title: Plugin SlotHost Reference
sidebar_label: SlotHost Reference
sidebar_position: 10
---

# Plugin SlotHost Reference

> **Status.** Authoritative reference for the v1 `<SlotHost />`
> React component defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The component contract is locked by [`packages/plugin-runtime/src/SlotHost.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/SlotHost.tsx);
> when the runtime adds, removes, or renames a prop update **this**
> page in the same change so the doc and the component cannot drift.

`<SlotHost />` is the **only** public rendering surface the plugin
runtime hands to host-app layouts. It takes a slot id, asks the
[`PluginRegistry`](./registry.md) for every enabled plugin that has
attached a component to that slot, and renders them — in
[registration order](./slots.md#composition-rules), each with its own
[`PluginContext`](./lifecycle.md#runtime-context-plugincontext).

`<SlotHost />` is intentionally tiny so that adding a slot to a
layout is a one-line change. Every detail layouts care about
(`fallback` semantics, the empty case, key stability, server-friendliness)
is documented here so layout authors do not need to read the
component source.

## At a glance

| Surface             | Kind            | Throws? | Notes                                                          |
| ------------------- | --------------- | ------- | -------------------------------------------------------------- |
| `<SlotHost />`      | React component | no\*    | Server-friendly. Renders a Fragment.                           |
| `SlotHostProps`     | type            | —       | `{ slotId: SlotId; registry: PluginRegistry; fallback?: ReactNode }` |

\* `<SlotHost />` itself never throws. Errors thrown by **contributed
slot components** propagate through React's normal rendering tree —
host apps should wrap the slot in an `<ErrorBoundary>` when isolation
is required (see [Failure matrix](#failure-matrix)).

The component is exported through both the runtime barrel and the
`SlotHost` sub-path:

```tsx
// Preferred — barrel import (matches every other runtime export).
import { SlotHost } from '@ever-works/plugin-runtime';

// Sub-path import — useful when a layout file only needs SlotHost
// and wants to keep the import surface narrow for tree-shaking
// observability. Both forms resolve to the same component.
import { SlotHost } from '@ever-works/plugin-runtime/SlotHost';
```

## `<SlotHost slotId registry fallback? />`

```tsx
interface SlotHostProps {
  slotId: SlotId;
  registry: PluginRegistry;
  fallback?: ReactNode;
}

function SlotHost({ slotId, registry, fallback }: SlotHostProps): ReactNode;
```

The component does exactly four things, in order:

1. Calls `registry.slotsFor(slotId)`. The registry filters disabled
   plugins and returns one `{ component, ctx, pluginName }` row per
   contribution.
2. If the array is empty, renders `fallback ?? null` and returns. The
   fallback is **only** rendered when no plugin contributes — it is
   not appended to existing contributions.
3. Otherwise, wraps every contribution in a React `Fragment` keyed by
   `pluginName` and passes `ctx={ctx}` to the component.
4. Returns the resulting fragment list with no extra DOM wrapper. The
   layout owns the surrounding markup.

```tsx
// apps/web/app/[locale]/layout.tsx
import { SlotHost } from '@ever-works/plugin-runtime';
import { registry } from '@/lib/plugins/registry';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <header>
          <Logo />
          <nav>{/* … */}</nav>
          <SlotHost slotId="header.right" registry={registry} />
        </header>
        {children}
      </body>
    </html>
  );
}
```

### `slotId` — which slot to render

The `slotId` prop is typed as `SlotId` from
[`@ever-works/plugin-sdk`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts).
Because `SlotId` is a string literal union, TypeScript catches typos
at compile time:

```tsx
<SlotHost slotId="header.right" registry={registry} />     // ok
<SlotHost slotId="header.rigth" registry={registry} />     // type error
```

If a slot id is read from external configuration (e.g. a CMS row or a
user-supplied environment variable), use the SDK's `isSlotId(value)`
type guard before passing it down — see
[Slots Reference § The component contract](./slots.md#the-component-contract).

The full canonical slot id list lives in the
[Slots Reference](./slots.md#at-a-glance) — that page is the source
of truth for what each id renders.

### `registry` — which registry to read

Every host app constructs **one** `PluginRegistry` at boot
(typically in `apps/web/instrumentation.ts` or
`apps/web/lib/plugins/registry.ts`) and shares the same instance
across every render. Passing a different registry per render means
plugins enabled in one tree are invisible in another, which is almost
never what layouts want.

In tests it is fine — and expected — to pass a synthetic registry
built from [`createTestRegistry({ plugins })`](./testing-a-plugin.md#3-with-the-runtime-a-real-pluginregistry).
The component contract is identical.

### `fallback` — optional default content

The `fallback` prop lets layouts default to non-empty content when no
plugin contributes to a slot. It is **not** a placeholder during
render: the registry call is synchronous, so the empty / non-empty
decision happens immediately.

```tsx
<SlotHost
  slotId="home.before-listing"
  registry={registry}
  fallback={<DefaultAnnouncement />}
/>
```

Two important rules:

- **Fallback is mutually exclusive with contributions.** As soon as
  one plugin contributes to the slot, the fallback is hidden. There
  is no "fallback merges with plugin output" mode — that pattern
  belongs to the host-app composition layer, not the runtime.
- **Fallback is `null` by default.** Layouts that omit `fallback`
  render nothing for an empty slot, which keeps the slot truly opt-in
  and avoids surprise layout shifts when a plugin is disabled at
  runtime.

## What `<SlotHost />` is **not**

| Anti-pattern                                | Why not                                                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| A wrapper element (`<div>`, `<section>`)    | The host renders a Fragment so layouts keep full control over markup, ARIA roles, and Tailwind utility classes. Wrap the host yourself.              |
| A client component                          | The host is server-friendly. Marking it `"use client"` would opt every layout that uses it into client rendering — see [Server-friendliness](#server-friendliness). |
| A reactivity boundary                       | The host re-renders only when its props change, like any React component. Plugin enable / disable mutations must come from a request-scoped action.  |
| A way to pass extra props to slot components | Slot components have a fixed `{ ctx }` contract. Need request data? Use a hook the host app already exposes. See [Slots § rules of the road](./slots.md#the-component-contract). |
| An error boundary                           | The host re-throws whatever its children throw. Wrap the host (or the layout region) in `<ErrorBoundary>` when isolation matters.                    |

## Server-friendliness

`<SlotHost />` is a server component by default. The implementation
in [`SlotHost.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/SlotHost.tsx)
deliberately:

- has no `"use client"` directive;
- does not call any client-only React hooks (no `useState`,
  `useEffect`, `useRef`);
- does not import from `react-dom` or any DOM-only API;
- only reads from a synchronous `registry.slotsFor(slotId)`.

That means a layout that uses `<SlotHost />` stays a server component
even if the layout itself is server-rendered, and contributed slot
components MAY be either server or client components. The boundary
is decided per contribution, not by the host.

If a contributed component declares `"use client"`, React serialises
the host's children up to that point and continues rendering on the
client — the host itself never crosses the boundary.

## Composition rules

These follow directly from `registry.slotsFor` (see
[Registry Reference § `slotsFor`](./registry.md#slotsforslotid--slot-component-lookup)):

- **Order is registration order.** To force a specific order, register
  plugins in that order in `apps/web/lib/plugins/registry.ts`. The
  host does not sort.
- **Disabled plugins are skipped.** `slotsFor` filters `enabled: false`
  rows before returning, so disabling a plugin makes its slot
  contribution disappear without touching layout code.
- **Multiple contributors are appended.** All enabled contributors
  render — there is no "first wins" rule. If you want at most one
  visible contribution, use a [single-lookup capability](./capabilities.md#how-the-runtime-resolves-multiple-providers)
  instead of a slot.
- **Keys are stable across renders.** The host uses `pluginName` as
  the React key, which is also unique by registry invariant
  (`PluginRegistry.register` throws on duplicates — see
  [Registry Reference § Failure matrix](./registry.md#failure-matrix)).

## Testing

The host can be rendered against a test registry exactly like in
production:

```tsx
import { render, screen } from '@testing-library/react';
import { SlotHost } from '@ever-works/plugin-runtime';
import { createTestRegistry } from '@ever-works/plugin-runtime/testing';
import myPlugin from '@ever-works/plugin-demo';

it('renders the demo plugin in header.right', async () => {
  const registry = await createTestRegistry({ plugins: [myPlugin] });

  render(<SlotHost slotId="header.right" registry={registry} />);

  expect(screen.getByRole('region', { name: /demo/i })).toBeVisible();
});
```

To exercise the empty-slot path:

```tsx
it('renders fallback when no plugin contributes', async () => {
  const registry = await createTestRegistry({ plugins: [] });

  render(
    <SlotHost
      slotId="header.right"
      registry={registry}
      fallback={<span>default</span>}
    />,
  );

  expect(screen.getByText('default')).toBeVisible();
});
```

To exercise the disable-then-empty path:

```tsx
it('drops a contribution when its plugin is disabled', async () => {
  const registry = await createTestRegistry({ plugins: [myPlugin] });
  await registry.disable(myPlugin.manifest.name);

  render(<SlotHost slotId="header.right" registry={registry} fallback={<span>empty</span>} />);

  expect(screen.getByText('empty')).toBeVisible();
});
```

For end-to-end coverage of the rendered DOM, see
[Testing a Plugin § End-to-end with Playwright](./testing-a-plugin.md#5-end-to-end-with-playwright)
and the smoke specs under `apps/web-e2e/tests/plugins/`.

## Failure matrix

| Outcome                                           | What `<SlotHost />` does                              | Where it surfaces                                                                |
| ------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Slot id has no contributors                       | renders `fallback ?? null`                            | The layout's surrounding markup decides whether the empty slot is visible.       |
| Slot id has contributors, all plugins disabled    | renders `fallback ?? null`                            | Same as above — `slotsFor` already filters disabled rows.                        |
| Slot id has one or more enabled contributors      | renders each in registration order, keyed by plugin  | The layout owns ARIA roles and visual styling around the host.                   |
| Contributed component throws during render        | error propagates through React rendering              | Wrap the host in an `<ErrorBoundary>` in the layout to isolate failure per slot. |
| Same plugin name registered twice                 | n/a — `PluginRegistry.register` already threw at boot | See [Registry Reference § Failure matrix](./registry.md#failure-matrix).         |
| Unknown `slotId` (typo, cast through `any`)       | `slotsFor` returns `[]` → renders `fallback ?? null`  | TypeScript catches the typo at compile time; `isSlotId` catches it at runtime.   |

The host itself never throws. The Fragment-only output and the
synchronous registry read are what make the failure modes shallow
and easy to reason about — every other failure mode lives one layer
up (in the registry) or one layer down (in the contributed component).

## How to add a new prop to `<SlotHost />`

Per [Article I (Plugin-First)](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
the host's surface is intentionally tiny. Adding a new prop should be
rare and follows the same five-step pattern as new slot ids:

1. **Open a spec under [`docs/spec/`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec)**
   describing the use case, the prop name, and why it cannot live in
   the contributed component.
2. **Update [`packages/plugin-runtime/src/SlotHost.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/SlotHost.tsx)**
   — add the prop to `SlotHostProps` and wire it through.
3. **Re-export the new prop type** from `packages/plugin-runtime/src/index.ts`
   if external code needs to type the prop.
4. **Update this page** — the `At a glance` table, the
   `<SlotHost slotId registry fallback? />` heading, the failure
   matrix, and at least one usage example.
5. **Update [Spec 002 / T-010](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md)**
   to flag the doc as updated for this change so the doc-and-runtime
   anti-drift bullet is preserved.

## See also

- [Plugin Slots Reference](./slots.md) — per-slot contract, where each
  slot id renders, composition rules, and the checklist for adding a
  new slot id.
- [Plugin Registry Reference](./registry.md) — `slotsFor` semantics,
  the read / write surface summary, and the duplicate-name failure
  matrix that guarantees stable React keys.
- [Plugin Loader Reference](./loader.md) — env / DB / override
  precedence, the failure matrix, and the testing checklist.
- [Plugin Capabilities Reference](./capabilities.md) — when to use a
  single-lookup capability instead of a slot.
- [Plugin Lifecycle](./lifecycle.md) — how the runtime context
  passed via `ctx` is built and what it contains.
- [Authoring a Plugin](./authoring-a-plugin.md) — how a plugin
  attaches a component to a slot id in the first place.
- [Testing a Plugin](./testing-a-plugin.md) — `createTestRegistry`,
  React Testing Library patterns, and Playwright smoke specs.
- [Plugin Testing Reference](./testing.md) — per-helper reference
  paired with `testing.ts`; documents the
  `createTestRegistry({ plugins })` factory used inside the three
  worked Vitest examples on this page (happy-path render,
  empty-fallback path, disable-then-empty round-trip), the failure
  matrix that distinguishes the helper's silent Zod-drop from the
  duplicate-name throw, and the explicit non-goals for the cases
  where a `<SlotHost />` test must build the registry by hand.
- [Plugin Manifest Reference](./manifest.md) — per-field reference
  paired with `manifest.ts`; documents `manifest.name` (the key
  `<SlotHost />` uses for the React `key` of every contributed
  Fragment) and the `ui-slot` capability that gates which plugins
  this host accepts contributions from.
- [Plugin Packages — SDK, Runtime, Demo](./packages.md) — package
  boundaries and which package exports `<SlotHost />`.
- [Plugin System (Architecture)](../architecture/plugin-system.md) —
  high-level diagram showing where `<SlotHost />` sits in the request
  pipeline.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md) — Article I (Plugin-First).
