---
id: plugin-providers
title: Plugin Providers Reference
sidebar_label: Providers Reference
sidebar_position: 14
---

# Plugin Providers Reference

> **Status.** Authoritative reference for the v1 capability-provider
> interface surface defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> Each interface — and the `CapabilityProviderMap` mapped type that
> binds them to capability ids — is locked by
> [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts).
> When the SDK adds, removes, or renames an interface or one of its
> members update **this** page in the same change so the doc and the
> SDK cannot drift.

`@ever-works/plugin-sdk` exports nine capability-provider interfaces
plus the `CapabilityProviderMap` mapped type that ties them to the
[`Capability`](./capabilities.md) string-literal union. A plugin
attaches concrete implementations through its
[`providers`](./plugin.md#pluginproviders) map; the runtime registry
exposes them via [`PluginRegistry.get<C>`](./registry.md#getcapability--single-provider-lookup)
and [`PluginRegistry.list<C>`](./registry.md#listcapability--enumerate-providers-by-capability).

This page is the **per-export reference** that pairs with
[`providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts)
exactly the way [`capabilities.md`](./capabilities.md) pairs with
`capabilities.ts`, [`slots.md`](./slots.md) pairs with `slots.ts`,
[`manifest.md`](./manifest.md) pairs with `manifest.ts`,
[`plugin.md`](./plugin.md) pairs with `plugin.ts`,
[`loader.md`](./loader.md) pairs with `loader.ts`,
[`registry.md`](./registry.md) pairs with `registry.ts`,
[`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`, and
[`testing.md`](./testing.md) pairs with `testing.ts`.

Where [`capabilities.md`](./capabilities.md) explains the **runtime
contract** of each capability (lookup style, fan-out vs. single,
dispatch order, host wrappers), this page documents the **TypeScript
shape** of each provider interface — every member, its type, its
nullability, and the type-system tricks (`(string & {})` literal /
fallback unions, `'ui-slot' = never` lockout, `Promise<unknown[]>`
contract widening) that the SDK uses to keep authors honest at
compile time. The two pages are deliberately complementary: read
this one when you are *implementing* a provider, the capabilities
page when you are *deciding which capability to declare*.

## At a glance

| Export                       | Kind             | Capability id    | Lookup style    | Async members?              | Read by                                                                                          |
| ---------------------------- | ---------------- | ---------------- | --------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `AuthProvider`               | interface        | `auth`           | single          | optional `Promise`s         | [`registry.get('auth')`](./registry.md#getcapability--single-provider-lookup)                     |
| `PaymentProvider`            | interface        | `payment`        | single          | yes — both members          | [`registry.get('payment')`](./registry.md#getcapability--single-provider-lookup)                  |
| `AnalyticsProvider`          | interface        | `analytics`      | fan-out         | optional — `void \| Promise` | [`registry.list('analytics')`](./registry.md#listcapability--enumerate-providers-by-capability)   |
| `SearchProvider`             | interface        | `search`         | single          | yes — `search`              | [`registry.get('search')`](./registry.md#getcapability--single-provider-lookup)                   |
| `ContentSource`              | interface        | `content-source` | single          | yes — `bootstrap` / list-IO | [`registry.get('content-source')`](./registry.md#getcapability--single-provider-lookup)           |
| `MapsProvider`               | interface        | `maps`           | single          | yes — `loadScript`          | [`registry.get('maps')`](./registry.md#getcapability--single-provider-lookup)                     |
| `NewsletterProvider`         | interface        | `newsletter`     | fan-out         | yes — both members          | [`registry.list('newsletter')`](./registry.md#listcapability--enumerate-providers-by-capability) |
| `NotificationsProvider`      | interface        | `notifications`  | fan-out         | yes — every member          | [`registry.list('notifications')`](./registry.md#listcapability--enumerate-providers-by-capability) |
| `AIProvider`                 | interface        | `ai`             | single          | yes — `complete`            | [`registry.get('ai')`](./registry.md#getcapability--single-provider-lookup)                       |
| `CapabilityProviderMap`      | mapped type      | — (binds all 10) | — (type-only)   | — (type-only)               | [`PluginRegistry.get<C>`](./registry.md#getcapability--single-provider-lookup) / [`list<C>`](./registry.md#listcapability--enumerate-providers-by-capability) / [`PluginProviders`](./plugin.md#pluginproviders) |

All ten exports are re-exported through the SDK barrel so a plugin
author never imports from `./providers` directly:

```ts
import type {
  AuthProvider,
  PaymentProvider,
  AnalyticsProvider,
  SearchProvider,
  ContentSource,
  MapsProvider,
  NewsletterProvider,
  NotificationsProvider,
  AIProvider,
  CapabilityProviderMap,
} from '@ever-works/plugin-sdk';
```

`AnalyticsProvider` is also imported by name inside
[`plugin.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/plugin.ts)
because the typed-events spec ([Spec 016](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/016-typed-analytics-events))
re-uses its shape inside `PluginContext` follow-up work; the other
interfaces are reached only through `CapabilityProviderMap[C]` lookups
in the runtime.

## `AuthProvider`

```ts
export interface AuthProvider {
  id: string;
  displayName: string;
  signIn?: () => Promise<void> | void;
  signOut?: () => Promise<void> | void;
}
```

Sign users in / out via an external identity provider (OAuth, SSO,
magic link). Single-provider per session in v1 — the host wrapper
under [`apps/web/lib/auth/**`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/auth)
calls [`registry.get('auth')`](./registry.md#getcapability--single-provider-lookup)
exactly once per request and routes every NextAuth handler through the
returned provider.

### Members

- **`id: string`** — stable identifier (`'google'`, `'github'`,
  `'supabase'`, …). Renaming is a breaking change for adopters who
  persist provider ids inside `accounts.provider`.
- **`displayName: string`** — label shown on sign-in buttons. Localise
  via the plugin's `messages/<locale>.json` rather than hard-coding,
  per the i18n rule in [Spec 005 — Internationalisation](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/005-internationalisation).
- **`signIn?: () => Promise<void> | void`** — optional. Auth.js
  declarative providers have **no** imperative entry point — the
  runtime treats `undefined` as "delegate to the host's NextAuth
  handler". Implement only when the provider needs an out-of-band
  side-effect (ex.: SDK-managed magic-link flow).
- **`signOut?: () => Promise<void> | void`** — optional, symmetric to
  `signIn`. Same delegation rule applies.

### Type-system notes

- `id` and `displayName` are intentionally `string`, not a literal
  union. New auth backends ship in third-party packages, and a
  `'google' | 'github' | …` union would force an SDK release for every
  community provider. The host re-narrows at the call site when a
  feature only supports a fixed list (e.g. social-icon mapping).
- The `Promise<void> | void` return on the optional hooks lets a
  synchronous provider declare its hook without paying for an `async`
  function wrapper.

See [Spec 003 — Auth Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/003-auth-providers/spec.md).

## `PaymentProvider`

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

Creates a checkout session with a third-party processor (Stripe,
LemonSqueezy, Polar, Solidgate) and verifies that processor's webhook
posts.

### Members

- **`id: 'stripe' | 'lemonsqueezy' | 'polar' | (string & {})`** —
  stable provider id used by the host to dispatch
  `apps/web/app/api/<provider>/webhook` route handlers. The three
  literal members are the providers shipped in the box; the
  `(string & {})` tail keeps the union open for adopters who ship
  their own adapter package without giving up autocomplete on the
  built-ins.
- **`createCheckoutSession(input): Promise<{ url; sessionId }>`** —
  mints a hosted-checkout URL. The `metadata` map is forwarded
  verbatim to the processor and is the canonical place to thread the
  internal user / order id back through the webhook payload.
- **`verifyWebhook(req: Request): Promise<{ type; payload }>`** —
  validates the inbound webhook (signature, replay window, body
  parsing) and returns a typed envelope. The host calls
  [`registry.get('payment')`](./registry.md#getcapability--single-provider-lookup)
  once at boot and dispatches every `*/webhook` route handler through
  the same provider so the signature secret never leaks.

### Type-system notes

- The `'stripe' | 'lemonsqueezy' | 'polar' | (string & {})` pattern is
  the **literal-with-fallback** trick: TypeScript treats `(string & {})`
  as assignable from any string but does **not** widen the union to
  plain `string`, so editors still suggest the three known literals
  while permitting custom ids.
- `payload: unknown` on `verifyWebhook` is intentional — every processor
  has a different webhook taxonomy, so the host re-narrows inside the
  per-event handler with its own Zod schema. Upcasting to `unknown`
  rather than `any` keeps the call site honest about the narrowing
  step.
- Both methods are unconditionally `async` — the v1 contract has no
  synchronous shortcut because every supported processor requires an
  HTTP round-trip.

See [Spec 004 — Payment Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/004-payment-providers/spec.md).

## `AnalyticsProvider`

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

Forwards a typed event to a backing analytics tool. Fan-out: every
enabled provider receives every event in registration order via
[`registry.list('analytics')`](./registry.md#listcapability--enumerate-providers-by-capability).

### Members

- **`id: string`** — analytics backend (`'posthog'`, `'plausible'`,
  `'segment'`, …). Used in admin UI and log lines; not part of the
  routing key (events fan out to **all** providers).
- **`forward(name, payload, context?): void | Promise<void>`** — fire
  a single event. The host wraps the call in `try/catch` and logs a
  failure line but never re-throws into the request path, per the
  "analytics is best-effort" rule in
  [Spec 008 — Analytics Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/008-analytics-providers).

### Type-system notes

- `name: string` rather than the
  [Spec 016 typed-event union](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/016-typed-analytics-events/spec.md)
  because v1 plugins are written against the unrestricted runtime
  shape; tightening to a union belongs in the typed-events follow-up,
  which will subtype `AnalyticsProvider<TName extends EventName>`
  rather than break the existing surface.
- `Record<string, unknown>` for both `payload` and `context` is the
  same widening contract `verifyWebhook` uses — the runtime never
  inspects the values; only the provider does.
- `void | Promise<void>` lets a synchronous backend (`window.plausible`)
  declare without an `async` wrapper while still permitting an
  `async` backend (`segment.flush()`); the host treats both
  identically.

## `SearchProvider`

```ts
export interface SearchProvider {
  id: string;
  search(
    query: string,
    opts?: { limit?: number; filters?: Record<string, unknown> },
  ): Promise<unknown[]>;
}
```

Returns ranked items for a query. Single-provider in v1 — the host
falls back to its in-memory search when no provider is registered.

### Members

- **`id: string`** — search backend (`'meilisearch'`, `'algolia'`,
  `'typesense'`, …). Used in admin UI / log lines.
- **`search(query, opts?): Promise<unknown[]>`** — return ranked
  results. The optional `limit` defaults to `50` per the convention in
  [`docs/plugins/capabilities.md#search--searchprovider`](./capabilities.md#search--searchprovider);
  `filters` is forwarded verbatim so backend-specific keys
  (`facetFilters`, `where`, …) flow through without an SDK release.

### Type-system notes

- `Promise<unknown[]>` rather than `Promise<Item[]>` because
  `Item` lives in [`apps/web/lib/types`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib)
  and is host-app concrete. The plugin SDK is framework-agnostic —
  re-asserting the result against the host `Item` type is the host's
  job, not the SDK's. A future `SearchProvider<TItem = unknown>`
  generic is non-breaking and is tracked as a follow-up to
  [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
- `filters?: Record<string, unknown>` is permissive on purpose; backends
  diverge widely on filter syntax, and a tighter shape would force the
  SDK to track every provider's grammar.

## `ContentSource`

```ts
export interface ContentSource {
  id: string;
  bootstrap?(): Promise<void> | void;
  listItems(filter?: Record<string, unknown>): Promise<unknown[]>;
  getItem(slug: string): Promise<unknown | undefined>;
}
```

Sources directory items from somewhere other than the bundled
[Git CMS](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/006-git-cms/spec.md).
The default content layer in `apps/web` is itself a `ContentSource`
implementation that reads from `apps/web/.content/`.

### Members

- **`id: string`** — content-source backend (`'git-cms'`, `'hygraph'`,
  `'sanity'`, …).
- **`bootstrap?(): Promise<void> | void`** — optional one-time work at
  boot: `git clone`, prime caches, warm DB indexes. Runs before the
  loader's `setup` hook so the source is ready by the time the host
  asks for items.
- **`listItems(filter?): Promise<unknown[]>`** — paginated list. The
  source MUST honour the optional `filter` (`category`, `tags`,
  cursor, …) so consumers never have to fetch everything; an
  unfiltered request must still return a bounded page.
- **`getItem(slug: string): Promise<unknown | undefined>`** — fetch a
  single item by slug. `undefined` means "not found"; the host calls
  Next.js `notFound()` on the route page rather than rendering an
  empty layout.

### Type-system notes

- `Promise<unknown | undefined>` (note: `unknown | undefined`) on
  `getItem` is the explicit "absent vs. error" distinction —
  `unknown` covers a successful fetch, `undefined` covers a 404, and
  a thrown error covers the third case. The host narrows accordingly
  and never confuses an empty page for a missing slug.
- `bootstrap?` is sync-or-async by the same `void | Promise<void>`
  pattern used elsewhere; the runtime always `await`s it so a
  synchronous source pays no extra microtask.

See [Q-006a (Hygraph adapter)](../questions.md#q-006a-hygraph-adapter-as-built-in-plugin).

## `MapsProvider`

```ts
export interface MapsProvider {
  id: string;
  loadScript(): Promise<void>;
}
```

Owns runtime loading of the maps SDK (Mapbox, Google Maps, MapLibre,
…). Single-provider per session because two map runtimes cannot
coexist on the same page.

### Members

- **`id: string`** — maps backend (`'mapbox'`, `'google'`,
  `'maplibre'`, …).
- **`loadScript(): Promise<void>`** — idempotent. Repeated calls MUST
  resolve immediately without re-injecting the script tag — the host
  may call `loadScript()` from multiple lazy components on the same
  page without coordinating between them.

### Type-system notes

- The interface is intentionally narrow because the *UI* layer
  (markers, sidebar, autocomplete) is shared across providers and
  lives in the host (`apps/web/components/maps/**`); the provider's
  only job is to load the right script with the right key.
- `loadScript` returns `Promise<void>` rather than the loaded SDK
  reference because the host code reaches for the SDK via its own
  `window.<sdk>` global once `loadScript` resolves; that pattern
  matches how the third-party SDKs themselves expect to be consumed.

See [Spec 011 — Maps Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/011-maps-providers/spec.md)
and [Spec 017 — Map View](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/017-map-view/spec.md).

## `NewsletterProvider`

```ts
export interface NewsletterProvider {
  id: string;
  subscribe(email: string, source?: string): Promise<{ ok: boolean; reason?: string }>;
  unsubscribe(email: string): Promise<{ ok: boolean; reason?: string }>;
}
```

Subscribes / unsubscribes an email address with a third-party list
manager (Mailchimp, ConvertKit, Resend Audiences, …). Fan-out: each
enabled provider may mirror the same address.

### Members

- **`id: string`** — list-manager backend.
- **`subscribe(email, source?): Promise<{ ok; reason? }>`** — add the
  address. The optional `source` flows through to the provider's
  metadata (UTM-style attribution: `'home-cta'`, `'item-page'`, …)
  so newsletter signups can be told apart from product-listing
  signups in the provider's reporting UI.
- **`unsubscribe(email): Promise<{ ok; reason? }>`** — symmetric
  removal.

### Type-system notes

- Returning `{ ok: false, reason: '...' }` rather than throwing is the
  v1 contract: provider-specific failures (rate-limit, invalid email,
  pending double-opt-in) are surfaced as data so the host can render
  them in the UI without a try/catch on the request path.
  `reason` is `string`, not a union — adopters write whatever the
  upstream returned and the host shows it verbatim or maps it into a
  localised message.
- The `ok` discriminant lets the host `if (result.ok)` narrow without
  touching `reason`, which is only meaningful on the `false` branch.

See [Spec 012 — Newsletter Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/012-newsletter-providers/spec.md)
and [Q-012a](../questions.md#q-012a-persist-subscribers-in-our-db).

## `NotificationsProvider`

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

In-app notifications backend (Novu, custom DB queue, …). Fan-out
because some adopters mirror to multiple sinks (push + email + Slack).

### Members

- **`id: string`** — notifications backend.
- **`send({ userId, kind, payload }): Promise<void>`** — enqueue one
  notification. `kind` is a stable, host-curated string the host uses
  to route to a template (`'comment.reply'`, `'item.approved'`,
  `'subscription.payment.failed'`, …); plugins do not invent their
  own.
- **`list(userId, opts?): Promise<unknown[]>`** — paginated history.
  The host re-asserts the result shape against its
  [`Notification`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/repositories) type
  before rendering.
- **`markRead(userId, ids: string[]): Promise<void>`** — batch-mark
  read. The host always sends the full visible-on-screen `ids`
  array; providers MUST treat an empty array as a no-op so the host
  can call `markRead` unconditionally on tab focus.
- **`unreadCount(userId): Promise<number>`** — cheap unread counter
  for the bell icon. Providers should answer this from a maintained
  counter, not by paginating `list`.

### Type-system notes

- `kind: string` — same rationale as `AnalyticsProvider.forward`'s
  `name`. Tightening to a host-curated union belongs in a follow-up.
- `markRead` taking `string[]` (rather than a single id) bakes the
  batch contract into the type; a single-id implementation has to
  iterate over the array internally, but the call site never has to
  loop.

See [Spec 013 — Notifications System](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/013-notifications-system/spec.md)
and [Q-013a](../questions.md#q-013a-notifications-source-of-truth).

## `AIProvider`

```ts
export interface AIProvider {
  id: string;
  complete(input: { prompt: string; system?: string; max_tokens?: number }): Promise<{ text: string }>;
}
```

A single LLM-completion provider (Anthropic, OpenAI, Bedrock, an
internally-hosted model). Used by the AI-powered listing import,
auto-categorisation, and other content tooling.

### Members

- **`id: string`** — model backend.
- **`complete({ prompt, system?, max_tokens? }): Promise<{ text }>`** —
  one completion. Implementations should respect a sensible default
  `max_tokens` (1024) when the caller does not pass one, per the
  convention documented on
  [`capabilities.md#ai--aiprovider`](./capabilities.md#ai--aiprovider).

### Type-system notes

- The interface is **deliberately minimal** in v1: streaming, tool-use,
  vision, and multi-modal land in a follow-up that will introduce
  `AIProvider<TStream extends boolean = false>` rather than break
  this shape.
- Returning `{ text: string }` rather than `string` keeps the surface
  open — extending the envelope (`{ text; usage; finishReason; … }`)
  is non-breaking, while extending a bare `string` would force every
  caller to migrate.

## `CapabilityProviderMap`

```ts
export interface CapabilityProviderMap {
  auth: AuthProvider;
  payment: PaymentProvider;
  analytics: AnalyticsProvider;
  search: SearchProvider;
  'content-source': ContentSource;
  maps: MapsProvider;
  newsletter: NewsletterProvider;
  notifications: NotificationsProvider;
  ai: AIProvider;
  /** UI-only slot plugin; no programmatic provider. */
  'ui-slot': never;
}
```

The mapped type that binds every member of the
[`Capability`](./capabilities.md) string-literal union to its
provider interface. It is the single source of truth that:

1. Keys [`PluginRegistry.get<C>(capability)`](./registry.md#getcapability--single-provider-lookup)
   so `registry.get('payment')` is statically typed
   `PaymentProvider | undefined` without a manual cast.
2. Keys [`PluginRegistry.list<C>(capability)`](./registry.md#listcapability--enumerate-providers-by-capability)
   so `registry.list('analytics')` returns
   `Array<AnalyticsProvider>`.
3. Keys [`PluginProviders`](./plugin.md#pluginproviders) inside
   `plugin.ts` via the mapped-type expression
   `[K in Capability]?: K extends keyof CapabilityProviderMap ? CapabilityProviderMap[K] : never;`
   — when `K = 'ui-slot'` the conditional resolves to `never`, which
   makes any attempt to attach `providers: { 'ui-slot': anything }`
   a compile-time error rather than a runtime no-op.
4. Documents the **invariant** that every member of the `Capability`
   union has a corresponding member of the map — adding a capability
   id without extending the map is a TypeScript error from the
   `K extends keyof CapabilityProviderMap` branch in
   `PluginProviders`.

### Why `'ui-slot': never`?

`'ui-slot'` is the only capability that is **not** a programmatic
provider — it signals "this plugin contributes slot components only".
The runtime never reaches into `providers['ui-slot']`, and an author
who tries to attach one is making a category error. Typing the slot
as `never` turns that category error into a TypeScript compile
error:

```ts
// ✗ compile-time error — 'ui-slot' resolves to `never`, so no value is assignable.
defineDirectoryPlugin({
  manifest: { /* … */ capabilities: ['ui-slot'] },
  providers: {
    'ui-slot': { someField: 'oops' },
  },
});
```

The same plugin written correctly attaches its UI contributions
through [`slots`](./plugin.md#slots) instead and omits `providers`
entirely.

### Why a mapped type instead of an enum?

A TypeScript `enum` would force adopters to import an SDK symbol just
to spell `'auth'`; a string-literal union plus a mapped type lets
plugin authors write the capability id as a plain string while still
getting full type inference from
[`Capability`](./capabilities.md). The runtime never reflects on the
map at runtime — `CapabilityProviderMap` is type-only, with **zero**
emitted JavaScript.

## Read / write surface

| Caller                                                                                                         | Reads                                              | Writes                                              | Async?       |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- | ------------ |
| Plugin author                                                                                                  | every interface                                    | concrete implementations attached to `providers[…]` | n/a          |
| [`defineDirectoryPlugin`](./plugin.md#definedirectorypluginplugin)                                             | `CapabilityProviderMap` via `PluginProviders`      | nothing — pure type inference                       | no           |
| [`PluginRegistry.register`](./registry.md#registerplugin-validatedconfig-opts--add-a-plugin)                   | `plugin.providers` to index by capability          | internal `providers` table                          | no           |
| [`PluginRegistry.get<C>`](./registry.md#getcapability--single-provider-lookup)                                  | first-enabled `CapabilityProviderMap[C]`           | nothing                                              | no           |
| [`PluginRegistry.list<C>`](./registry.md#listcapability--enumerate-providers-by-capability)                    | every enabled `CapabilityProviderMap[C]`           | nothing                                              | no           |
| [`<SlotHost />`](./slot-host.md)                                                                                | nothing — slots, not providers                     | nothing                                              | no           |
| Host code (`apps/web/lib/auth/**`, `apps/web/lib/payment/**`, `apps/web/lib/analytics/**`, …)                  | the provider returned by `get` / each in `list`    | nothing — providers are immutable from the host     | per-method   |

The interfaces themselves are **type-only**; reads and writes happen
on concrete implementations attached at the `plugin.providers[…]`
level. The map is consulted by the runtime registry and by
TypeScript inference inside
[`PluginProviders`](./plugin.md#pluginproviders).

## Failure matrix

The provider interfaces are pure TypeScript declarations — they have
no runtime entry points and therefore no propagated throws of their
own. Every observable failure happens in a layer that *consumes* an
implementation; the matrix below maps failure modes to the layer
that surfaces them.

| Failure mode                                                  | Where it surfaces                                                                               | Symptom                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Missing required interface member                             | TypeScript                                                                                      | compile error on `defineDirectoryPlugin({ providers: { 'auth': partial } })` |
| Extra unknown member on an interface                          | TypeScript (excess-property check)                                                              | compile error in object literals                     |
| `providers: { 'ui-slot': anything }`                          | TypeScript via `PluginProviders` mapped type                                                    | compile error — `'ui-slot'` resolves to `never`      |
| Provider attached for an undeclared capability                | TypeScript via `[K in Capability]?: …` mapped type                                              | compile error — key not in `Capability` union        |
| Provider implementation throws inside `setup`                 | [`loadPlugins`](./loader.md#loadpluginsregistry-plugins--register-a-list-of-plugins)             | plugin recorded in `LoadPluginsResult.rejected[name].reason: 'setup'` |
| Provider implementation throws on a fan-out call (`forward`)  | host wrapper at the call site                                                                   | logged but not re-thrown into the request path       |
| Provider implementation throws on a single-lookup call (`get`)| host wrapper at the call site                                                                   | propagated through normal `try/catch` ergonomics     |
| Provider returns malformed shape at runtime                   | host re-narrowing (Zod / per-call validation)                                                   | host renders an error or falls back to a default     |
| Two enabled plugins on the same single-lookup capability      | [`registry.get<C>`](./registry.md#getcapability--single-provider-lookup)                         | first-registered wins; second is reachable through `list` only |

The headline rule: **no provider interface throws on its own**. The
interfaces declare *contracts*; the runtime layers
([`loader`](./loader.md), [`registry`](./registry.md), and the host
wrappers under `apps/web/lib/<capability>/**`) are where the
propagated-throw vs. silent-rejection split documented in the other
per-source-file references actually fires.

## Adding a new provider

Adding a new capability is a Spec 002-style amendment because it
grows the public SDK surface. The minimal change set is:

1. Declare the new interface in
   [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts).
2. Extend [`CapabilityProviderMap`](#capabilityprovidermap) with a new
   member (`<id>: <NewProvider>`); a TypeScript error in `plugin.ts`
   confirms the bind is reaching `PluginProviders`.
3. Append the capability id to
   [`packages/plugin-sdk/src/capabilities.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/capabilities.ts)
   so the [`Capability`](./capabilities.md) union picks it up.
4. Add a section to **this** page (interface + members + type-system
   notes), and a section to [`capabilities.md`](./capabilities.md)
   (lookup style + runtime contract + spec link).
5. Add a row to the at-a-glance tables on both pages and to the
   [registry's failure matrix](./registry.md#failure-matrix) when the
   lookup style implies a new failure mode.
6. Append a line to [`docs/log.md`](../log.md) and reference the
   feature spec under `docs/spec/<NNN>-<slug>/`.

The host app does not need to change — the registry's generic
[`get<C extends keyof CapabilityProviderMap>`](./registry.md#getcapability--single-provider-lookup)
and [`list<C>`](./registry.md#listcapability--enumerate-providers-by-capability)
lookups pick up the new entry automatically through
`CapabilityProviderMap[C]`.

## See also

- [Plugin Capabilities Reference](./capabilities.md) — the runtime-contract
  side of the same surface (lookup style, fan-out vs. single, the
  `ui-slot` slot-only pattern).
- [Plugin Definition Reference](./plugin.md) — per-export reference paired
  with `plugin.ts`; documents the
  [`PluginProviders`](./plugin.md#pluginproviders) mapped type that
  consumes `CapabilityProviderMap` through
  `[K in Capability]?: K extends keyof CapabilityProviderMap ? CapabilityProviderMap[K] : never;`.
- [Plugin Manifest Reference](./manifest.md) — per-field reference
  paired with `manifest.ts`; documents
  [`manifest.capabilities`](./manifest.md#capabilities), the array
  every plugin signs to declare *which* providers on this page it
  contributes.
- [Plugin Registry Reference](./registry.md) — per-API reference
  paired with `registry.ts`; documents the generic
  [`get<C>`](./registry.md#getcapability--single-provider-lookup) /
  [`list<C>`](./registry.md#listcapability--enumerate-providers-by-capability)
  lookups that actually return values typed against this file's
  interfaces.
- [Plugin Loader Reference](./loader.md) — per-API reference paired
  with `loader.ts`; documents how a thrown `setup` hook on a provider
  routes to `LoadPluginsResult.rejected[name].reason: 'setup'`.
- [Plugin Slots Reference](./slots.md) — the parallel surface for the
  `ui-slot` capability that has *no* provider interface.
- [Plugin Testing Reference](./testing.md) — `createTestRegistry`
  helper that exercises `registry.get<C>` / `list<C>` lookups in unit
  tests.
- [Authoring a Plugin](./authoring-a-plugin.md) — end-to-end author
  workflow; the section on `providers` builds on the interfaces
  documented here.
- [Plugin Lifecycle](./lifecycle.md) — boot, validation, enable / disable
  semantics; the failure matrix on this page extends the lifecycle's
  `setup` rejection rules.
- [Plugin Packages](./packages.md) — overview of `@ever-works/plugin-sdk`,
  `@ever-works/plugin-runtime`, and `@ever-works/plugin-demo`.
- [Reference Plugin (`@ever-works/plugin-demo`)](./plugin-demo.md) —
  per-source-file reference paired with `packages/plugin-demo/src/`;
  the demo plugin declares **only** the `'ui-slot'` capability, so it
  attaches **no** member of any provider interface this page documents.
  The demo plugin's failure matrix is therefore the canonical worked
  example of the `'ui-slot' = never` lockout — any attempt to add
  `providers: { 'ui-slot': … }` to the demo plugin's `defineDirectoryPlugin`
  call is rejected at compile time by the same `CapabilityProviderMap`
  mapping documented above.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts)
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md) — Article I (Plugin-First).
