---
id: plugin-capabilities
title: Plugin Capabilities Reference
sidebar_label: Capabilities Reference
sidebar_position: 6
---

# Plugin Capabilities Reference

> **Status.** Authoritative reference for the v1 capability surface
> defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The capability list is locked by [`packages/plugin-sdk/src/capabilities.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/capabilities.ts);
> each interface is locked by [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts).
> When the SDK adds a new capability, append a section here so this
> page and the SDK cannot drift.

A **capability** is what a plugin can do. The SDK ships ten canonical
capability ids; each one (apart from `ui-slot`) has a matching
TypeScript interface that a plugin attaches to its `providers` map.

The runtime registry exposes two lookup styles:

- **Single-provider lookup** — `registry.get('payment')` returns the
  first enabled provider, `undefined` if none. Use this when the host
  app expects exactly one provider for the capability (auth, payment,
  search, content-source, maps, AI).
- **Fan-out lookup** — `registry.list('analytics')` returns every
  enabled provider in registration order. Use this for capabilities
  where each provider observes the same event (analytics, newsletter,
  notifications).

Both lookups are **synchronous reads** so layouts and server components
can call them without paying for an async hop.

## At a glance

| Capability ID       | TypeScript interface       | Lookup style    | UI slot only |
| ------------------- | -------------------------- | --------------- | ------------ |
| `auth`              | `AuthProvider`             | single          | no           |
| `payment`           | `PaymentProvider`          | single          | no           |
| `analytics`         | `AnalyticsProvider`        | fan-out         | no           |
| `search`            | `SearchProvider`           | single          | no           |
| `content-source`    | `ContentSource`            | single          | no           |
| `maps`              | `MapsProvider`             | single          | no           |
| `newsletter`        | `NewsletterProvider`       | fan-out         | no           |
| `notifications`     | `NotificationsProvider`    | fan-out         | no           |
| `ai`                | `AIProvider`               | single          | no           |
| `ui-slot`           | *(no provider interface)*  | n/a — slots only | yes         |

Plugins may declare multiple capabilities. A plugin that exposes a
header badge **and** ships an analytics provider declares
`['ui-slot', 'analytics']` in its manifest.

## `auth` — `AuthProvider`

Signs users in / out via an external identity provider (OAuth, SSO,
magic link, …). Single-provider per session in v1; routing rules are
[Q-004a](../questions.md#q-004a-allow-multiple-active-providers-per-checkout)-style
follow-up work tracked under [Spec 003](../spec/003-auth-providers/spec.md).

```ts
export interface AuthProvider {
  id: string;
  displayName: string;
  signIn?: () => Promise<void> | void;
  signOut?: () => Promise<void> | void;
}
```

- `id` is the stable identifier used by the host app (`'google'`,
  `'github'`, …). Renaming is a breaking change.
- `displayName` is the label shown on sign-in buttons; localise via
  the plugin's `messages/<locale>.json` instead of hard-coding.
- `signIn` / `signOut` are optional because Auth.js providers are
  declared declaratively; the runtime treats their absence as "delegate
  to the host's NextAuth handler".

## `payment` — `PaymentProvider`

Creates a checkout session with a third-party provider (Stripe,
LemonSqueezy, Polar, Solidgate) and verifies the provider's webhooks.

```ts
export interface PaymentProvider {
  id: 'stripe' | 'lemonsqueezy' | 'polar' | (string & {});
  createCheckoutSession(input: {
    userId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ url: string; sessionId: string }>;
  verifyWebhook(req: Request): Promise<{ type: string; payload: unknown }>;
}
```

- Implementations live under [`apps/web/lib/payment/<provider>/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/payment)
  today and migrate to `packages/plugin-payment-<provider>/` per
  [Spec 004 — Payment Providers](../spec/004-payment-providers/spec.md).
- The `id` union allows custom strings via the `(string & {})` trick
  so adopters can ship adapters for providers we have not seen.
- `verifyWebhook` returns a typed `{ type, payload }` envelope — the
  host calls `registry.get('payment')` once at boot and dispatches all
  `*/webhook` route handlers through the same provider.

## `analytics` — `AnalyticsProvider`

Forwards a typed event to a backing analytics tool. Fan-out: every
enabled provider receives every event. See [Spec 016 — Typed Analytics
Events](../spec/016-typed-analytics-events/spec.md) for the event
catalogue.

```ts
export interface AnalyticsProvider {
  id: string;
  forward(
    name: string,
    payload: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): void | Promise<void>;
}
```

- `id` is the analytics backend (`'posthog'`, `'plausible'`,
  `'segment'`, …).
- `forward` MUST be safe to call from the request path; the host
  wraps it in `try/catch` and logs but never re-throws.
- Implementations should batch / debounce internally; the runtime
  does not.

## `search` — `SearchProvider`

Returns ranked items for a query. Single-provider in v1 — the host
falls back to its in-memory search when no provider is registered.

```ts
export interface SearchProvider {
  id: string;
  search(
    query: string,
    opts?: { limit?: number; filters?: Record<string, unknown> },
  ): Promise<unknown[]>;
}
```

- `unknown[]` is the runtime contract; the host re-asserts the result
  shape against its own `Item` type before rendering. A future spec
  can tighten this to a generic `SearchProvider<TItem = Item>`.
- Implementations under `packages/plugin-search-*/` should respect a
  default `limit` of 50 to keep responses bounded.

## `content-source` — `ContentSource`

Sources directory items from somewhere other than the bundled Git
CMS. The default `apps/web` content layer is itself a `ContentSource`
implementation that reads from `apps/web/.content/`. See
[Spec 006 — Git CMS](../spec/006-git-cms/spec.md) and the open
question on Hygraph adapters
([Q-006a](../questions.md#q-006a-hygraph-adapter-as-built-in-plugin)).

```ts
export interface ContentSource {
  id: string;
  bootstrap?(): Promise<void> | void;
  listItems(filter?: Record<string, unknown>): Promise<unknown[]>;
  getItem(slug: string): Promise<unknown | undefined>;
}
```

- `bootstrap` runs once at boot — clone repos, prime caches, etc.
- `listItems` MUST honour the optional filter (`category`, `tags`,
  pagination cursor) so consumers never have to fetch everything.
- `getItem` returns `undefined` for unknown slugs; the host calls
  `notFound()` on the route page.

## `maps` — `MapsProvider`

Owns the runtime loading of the maps SDK (Mapbox, Google Maps, …).
Single-provider per session because two map runtimes cannot
coexist on the same page. See [Spec 011 — Maps Providers](../spec/011-maps-providers/spec.md).

```ts
export interface MapsProvider {
  id: string;
  loadScript(): Promise<void>;
}
```

- `loadScript` is idempotent — repeated calls resolve immediately.
- The provider is responsible for selecting the correct API key,
  reading from its own validated config block.
- UI components (markers, sidebar, autocomplete) live in the host
  layer (`apps/web/components/maps/**`) because they are shared
  across providers.

## `newsletter` — `NewsletterProvider`

Subscribes / unsubscribes an email address with a third-party list
manager. Fan-out: each provider can mirror the same address. See
[Spec 012 — Newsletter Providers](../spec/012-newsletter-providers/spec.md)
and [Q-012a](../questions.md#q-012a-persist-subscribers-in-our-db).

```ts
export interface NewsletterProvider {
  id: string;
  subscribe(email: string, source?: string): Promise<{ ok: boolean; reason?: string }>;
  unsubscribe(email: string): Promise<{ ok: boolean; reason?: string }>;
}
```

- Returning `{ ok: false, reason: '...' }` lets the host surface
  provider-specific failures (rate limit, invalid email, opt-in
  pending) without throwing.
- The optional `source` param flows through to the provider's metadata
  so the team can tell newsletter signups from product-listing
  signups.

## `notifications` — `NotificationsProvider`

In-app notifications backend (Novu, custom DB queue, …). Fan-out
because some adopters mirror to multiple sinks (push + email + Slack).
See [Spec 013 — Notifications System](../spec/013-notifications-system/spec.md)
and [Q-013a](../questions.md#q-013a-notifications-source-of-truth).

```ts
export interface NotificationsProvider {
  id: string;
  send(input: {
    userId: string;
    kind: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
  list(userId: string, opts?: { limit?: number; cursor?: string }): Promise<unknown[]>;
  markRead(userId: string, ids: string[]): Promise<void>;
  unreadCount(userId: string): Promise<number>;
}
```

- `kind` is a stable string the host uses to route to a template
  (`'comment.reply'`, `'item.approved'`, …); plugins do not invent
  their own.
- `markRead` accepts a batch — the host always sends the full
  visible-on-screen ids array, so providers should treat empty arrays
  as a no-op.

## `ai` — `AIProvider`

A single provider for LLM completions (Anthropic, OpenAI, an
internally-hosted model). Used by the AI-powered listing import,
auto-categorisation, and other content tooling.

```ts
export interface AIProvider {
  id: string;
  complete(input: {
    prompt: string;
    system?: string;
    max_tokens?: number;
  }): Promise<{ text: string }>;
}
```

- The interface is intentionally minimal in v1; streaming /
  tool-use / multi-modal lands in a follow-up spec.
- Implementations should respect a sensible default `max_tokens`
  (1024) when the caller does not pass one.

## `ui-slot`

`ui-slot` is the only capability that has **no** provider interface.
A plugin declares `['ui-slot']` to say "I contribute slot components
only" — for instance a banner above the home listing, an admin row
action, or a settings tab.

```ts
import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';

export default defineDirectoryPlugin({
  manifest: {
    name: 'demo-banner',
    version: '0.1.0',
    templateRange: '>=0.1 <1.0',
    capabilities: ['ui-slot'],
    config: z.object({ message: z.string().default('Hi 👋') }),
  },
  slots: {
    'home.before-listing': Banner,
  },
});
```

The canonical slot id list lives in
[`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts);
the [architecture page](../architecture/plugin-system.md#slots) tracks
which slot ids ship in which release.

## How the runtime resolves multiple providers

When two enabled plugins both declare the same capability:

- **Single-lookup capabilities** (`auth`, `payment`, `search`,
  `content-source`, `maps`, `ai`) — `registry.get('<cap>')` returns
  the **first** enabled provider in registration order. Adopters who
  need conditional routing (e.g. payment by country) wrap the runtime
  registry with their own selection logic; the v1 contract is "first
  wins".
- **Fan-out capabilities** (`analytics`, `newsletter`,
  `notifications`) — `registry.list('<cap>')` returns **every**
  enabled provider in registration order. Consumers iterate and call
  `forward` / `subscribe` / `send` on each.

`registry.list_all()` returns every plugin (enabled and disabled) for
admin-side surfaces such as the plugin manager UI.

## Adding a new capability

A new capability is a Spec 002-style amendment because it grows the
public SDK surface. The minimal change set is:

1. Add the id to [`packages/plugin-sdk/src/capabilities.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/capabilities.ts).
2. Declare the interface in [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts)
   and extend `CapabilityProviderMap`.
3. Add a section to **this** page documenting the contract, lookup
   style, and any open questions.
4. Add a row to the at-a-glance table.
5. Append a line to [`docs/log.md`](../log.md) and reference the
   feature spec under `docs/spec/<NNN>-<slug>/`.

The host app does not need to change — the registry's generic
`get<C extends keyof CapabilityProviderMap>` and `list<C>` lookups pick
up the new entry automatically.

## See also

- [Plugin System (Architecture)](../architecture/plugin-system.md)
- [Authoring a Plugin](./authoring-a-plugin.md)
- [Plugin Lifecycle](./lifecycle.md)
- [Testing a Plugin](./testing-a-plugin.md)
- [Plugin Slots Reference](./slots.md) — the parallel reference for
  the slot surface (`header.right`, `home.before-listing`, …).
- [Plugin Loader Reference](./loader.md) — the per-API reference for
  `loadPlugins` / `mergeConfigSources` paired with `loader.ts`.
- [Plugin Registry Reference](./registry.md) — the per-API reference
  for `PluginRegistry` paired with `registry.ts`; covers `get` /
  `list` / `slotsFor` semantics in full.
- [Plugin SlotHost Reference](./slot-host.md) — the per-component
  reference paired with `SlotHost.tsx`; the production consumer of
  `slotsFor` and the host that decides whether a `ui-slot` capability
  contribution is rendered or replaced by a `fallback`.
- [Plugin Testing Reference](./testing.md) — the per-helper reference
  paired with `testing.ts`; the canonical way to construct a
  registry that exercises `get` / `list` capability lookups in unit
  tests, with the failure matrix that distinguishes Zod-rejected
  capability providers (silent drop) from duplicate-name conflicts
  (propagated throw).
- [Plugin Packages](./packages.md)
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`packages/plugin-sdk/src/capabilities.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/capabilities.ts)
- [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts)
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md) — Article I (Plugin-First).
