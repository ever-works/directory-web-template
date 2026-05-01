---
id: index
title: Directory Web Template
sidebar_label: Home
sidebar_position: 0
slug: /
---

# Directory Web Template

The Directory Web Template is a modern, full-stack directory website solution built with Next.js 16 and organized as a **Turborepo monorepo**. It's designed to help you create professional directory websites for tools, services, products, or any other type of listing platform.

## Key Features

- **Modern Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS, HeroUI React
- **Turborepo Monorepo**: pnpm workspaces with shared configs, web app, e2e tests, and docs
- **Flexible Authentication**: NextAuth.js v5, Supabase Auth, OAuth providers (Google, GitHub, Facebook, Twitter, Microsoft)
- **Payment Integration**: Stripe, LemonSqueezy, Polar, subscription management
- **Internationalization**: Multiple languages supported with full RTL support via next-intl
- **Git-based CMS**: Content synchronization from Git repositories with YAML-based structure
- **Theming System**: Built-in themes with dynamic color generation
- **Maps & Location**: Mapbox / Google Maps abstraction with marker clustering, auto-geocoding from YAML addresses, and an opt-in [Map view](features/map-view.md) for listings (sidebar + map, Zillow / Airbnb style)
- **Analytics & Monitoring**: PostHog, Sentry, performance monitoring
- **Admin Dashboard**: Content management, user management, and analytics
- **SEO Optimized**: Sitemap generation, structured data (JSON-LD), meta tags

## Quick Start

```bash
# Clone the monorepo
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install dependencies (pnpm required)
pnpm install

# Set up environment for the web app
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your configuration

# Start development server
pnpm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your site!

## Next Steps

- [Installation Guide](/getting-started/installation) -- Complete setup instructions
- [Quick Start Guide](/getting-started/quick-start) -- Get up and running in under 10 minutes
- [Architecture Overview](/architecture/overview) -- Understand the system design
- [Deployment Guide](/deployment/deployment-introduction) -- Deploy to production

## For Contributors & AI Agents

The template uses **spec-driven development** following the
[GitHub Spec Kit](https://github.com/github/spec-kit) convention. Every
non-trivial change goes through a spec → plan → tasks trio.

- [`AGENTS.md`](https://github.com/ever-works/directory-web-template/blob/develop/AGENTS.md) -- Cross-cutting rules for any AI agent operating in this monorepo.
- [`.specify/README.md`](https://github.com/ever-works/directory-web-template/blob/develop/.specify/README.md) -- Spec Kit workflow.
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/blob/develop/.specify/memory/constitution.md) -- Ten durable principles every plan must respect.
- [Spec Index](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec) -- Per-feature spec/plan/tasks documents under `docs/spec/`.
- [Change Log](https://github.com/ever-works/directory-web-template/blob/develop/docs/log.md) -- Running log of doc and spec changes.
- [Open Questions](https://github.com/ever-works/directory-web-template/blob/develop/docs/questions.md) -- Open questions with chosen defaults.
- [Plugin System (Architecture)](https://github.com/ever-works/directory-web-template/blob/develop/docs/architecture/plugin-system.md) -- The pluggable, modular core (see [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)).
- [Authoring a Plugin](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/authoring-a-plugin.md) -- Walk-through for authoring your first plugin.
- [Plugin Lifecycle](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/lifecycle.md) -- Boot, validation, enable/disable, and teardown semantics every plugin must cooperate with.
- [Testing a Plugin](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/testing-a-plugin.md) -- Unit-test the manifest, register through `createTestRegistry`, render slots in isolation, and add a Playwright smoke spec.
- [Plugin Capabilities Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/capabilities.md) -- Complete `auth` / `payment` / `analytics` / `search` / `content-source` / `maps` / `newsletter` / `notifications` / `ai` / `ui-slot` capability surface, with lookup-style and provider-resolution rules.
- [Plugin Slots Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/slots.md) -- Per-slot contract for every canonical slot id (`header.left`, `home.before-listing`, `admin.dashboard.widgets`, …) with composition rules and the checklist for adding a new slot.
- [Plugin Loader Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/loader.md) -- Per-API reference for `loadPlugins` / `mergeConfigSources` paired with `packages/plugin-runtime/src/loader.ts`: env / DB / override precedence, the failure matrix, and how to test the loader directly.
- [Plugin Registry Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/registry.md) -- Per-API reference for the `PluginRegistry` class paired with `packages/plugin-runtime/src/registry.ts`: `register` / `enable` / `disable` / `get` / `list` / `slotsFor` / `list_all` semantics, the read-vs-write surface summary, and the duplicate-name / unregistered / throwing-teardown failure matrix.
- [Plugin SlotHost Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/slot-host.md) -- Per-component reference for `<SlotHost slotId registry fallback? />` paired with `packages/plugin-runtime/src/SlotHost.tsx`: the `slotId` / `registry` / `fallback` props, the empty-vs-non-empty rules, server-friendliness, the composition rules that follow from `slotsFor`, and the failure matrix that anchors stable React keys on the registry's duplicate-name guarantee.
- [Plugin Testing Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/testing.md) -- Per-helper reference for `createTestRegistry({ plugins })` paired with `packages/plugin-runtime/src/testing.ts`: the four-step internal flow over `new PluginRegistry()` + `loadPlugins`, the read / write surface summary, the failure matrix that distinguishes silent Zod drops from propagated duplicate-name throws, the dual import surface (`@ever-works/plugin-runtime` barrel and `@ever-works/plugin-runtime/testing` sub-path), the three worked Vitest examples (happy path, config-required, disable round-trip), the five anti-patterns, and the explicit non-goals that point at [`loadPlugins`](./plugins/loader.md) and [`new PluginRegistry()`](./plugins/registry.md) for non-default config, persistence-callback assertions, and rejection inspection.
- [Plugin Manifest Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/manifest.md) -- Per-field reference for `PluginManifest<C>` paired with `packages/plugin-sdk/src/manifest.ts`: every manifest field (`name`, `version`, `description`, `templateRange`, `capabilities`, `config`, `defaultEnabled`, `adminToggleable`, `homepage`) with its type, default, semantics, and authoring guidance; the `PluginConfig<C>` type alias; the failure matrix that maps `templateRange` and `config` failures onto `LoadPluginsResult.rejected[name].reason`, distinguishes the duplicate-name throw as the only manifest-level propagated failure, and clarifies that `adminToggleable` is a UI hint (not an authorization check); plus the checklist for adding a new manifest field that pairs the SDK source change with the `docs/log.md` entry.
- [Plugin Definition Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/plugin.md) -- Per-export reference for `defineDirectoryPlugin` paired with `packages/plugin-sdk/src/plugin.ts`: the factory's role in inferring `C extends z.ZodTypeAny` from `manifest.config`; the `DirectoryPlugin<C>` shape (`manifest`, optional `setup` / `teardown` hooks, `slots`, `providers`); the `PluginContext<TConfig>` runtime context handed to `setup` and every slot component (`config`, `name`, `enabled`, optional `logger`); the `SlotComponentProps<TConfig>` slot-component contract that limits the props surface to a single `ctx` field; the `PluginProviders` map keyed on `Capability` (with `'ui-slot'` typed as `never`) and the `PluginSlots<TConfig>` map keyed on `SlotId`; the read / write surface summary that maps every caller (plugin author, `loadPlugins`, `PluginRegistry.register`, `PluginRegistry.disable`, `<SlotHost />`, `createTestRegistry`, slot components) to the fields they touch; and the failure matrix that surfaces every observable failure in the loader / registry / `<SlotHost />` layers the plugin returns into (hand-rolled plugin loses `C` inference, duplicate `name` throws via `register`, `manifest.config` / `templateRange` rejections route through `LoadPluginsResult.rejected`, throwing `setup` is plugin-local, throwing `teardown` is swallowed by `disable`, slot components throw through React, and TypeScript catches `'ui-slot'` provider attempts and unknown slot ids at compile time).
- [Plugin Providers Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/providers.md) -- Per-export reference for the nine concrete capability-provider interfaces paired with `packages/plugin-sdk/src/providers.ts`: one section per `AuthProvider`, `PaymentProvider`, `AnalyticsProvider`, `SearchProvider`, `ContentSource`, `MapsProvider`, `NewsletterProvider`, `NotificationsProvider`, `AIProvider`, with every member's type, nullability, and per-member type-system notes (the `(string & {})` literal-with-fallback trick on `PaymentProvider.id` that keeps the union open without giving up autocomplete, the `Promise<unknown[]>` widening contract on `SearchProvider.search` that defers `Item`-shape assertion to the host, the `Promise<unknown | undefined>` absent-vs-error distinction on `ContentSource.getItem`, the `void | Promise<void>` sync-or-async pattern on optional hooks, the `{ ok; reason? }` result envelope on `NewsletterProvider` that surfaces provider-specific failures as data); the `CapabilityProviderMap` mapped type that binds each `Capability` member to its interface and types `PluginRegistry.get<C>` / `list<C>` and `PluginProviders` generically; the `'ui-slot' = never` lockout that turns `providers: { 'ui-slot': anything }` into a TypeScript compile error; the read / write surface that maps every caller (plugin author, `defineDirectoryPlugin`, `PluginRegistry.register`, `get<C>`, `list<C>`, `<SlotHost />`, host code under `apps/web/lib/<capability>/**`) to the fields they touch; and the failure matrix that maps every observable failure (compile-time mis-typing, throwing `setup` → `LoadPluginsResult.rejected[name].reason: 'setup'`, fan-out swallow vs. single-lookup propagation, runtime malformed shape, two enabled plugins on the same single-lookup capability) onto the layer that surfaces it.
- [Plugin Packages](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/packages.md) -- SDK, runtime, and demo packages overview.
- [Reference Plugin (`@ever-works/plugin-demo`)](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/plugin-demo.md) -- Per-source-file reference for the bundled reference / demo plugin paired with `packages/plugin-demo/src/index.tsx`, `config.ts`, and `Header.tsx`: the at-a-glance manifest summary (name `'demo'`, `templateRange '>=0.1 <1.0'`, `'ui-slot'` capability, `'header.right'` slot, `defaultEnabled: true`, `adminToggleable: true`); the file map (config → manifest schema, Header → slot component, index → `defineDirectoryPlugin` composition); the per-line walk-through of `ConfigSchema` and `DemoConfig` (Zod defaults that make the inferred type non-optional, the `enabled` / `greeting` two-key surface); the `DemoHeaderBadge` props / render contract / disabled-config short-circuit and the stable `data-plugin="demo"` / `data-testid="demo-plugin-badge"` test hooks; the `defineDirectoryPlugin` invocation broken down by manifest field and slot binding with the type-inference path that ties `ConfigSchema` to `SlotComponentProps<DemoConfig>`; the three call sites (loader Zod parse + register, registry key, slot host render); the failure matrix that maps demo-plugin manifestations onto the loader / registry / slot-host failure surfaces (Zod-rejected config, `templateRange` mismatch, admin override flipping `enabled`, duplicate-name throw); the replace-the-demo-plugin recipe that exercises the slot ordering guarantee + admin toggle + `defaultEnabled: false` lever without removing the reference package from tree; and the evolution checklist that pairs every source-file change with the matching SDK reference page and `docs/log.md` entry.
- [Plugin SDK Public Surface Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/sdk-public-surface.md) -- Per-source-file reference for the SDK barrel paired with `packages/plugin-sdk/src/index.ts`: every public name the barrel re-exports (`CAPABILITIES`, `isCapability`, `Capability`, `SLOT_IDS`, `isSlotId`, `SlotId`, `PluginManifest<C>`, `PluginConfig<C>`, the nine capability-provider interfaces and `CapabilityProviderMap`, `defineDirectoryPlugin`, and the five plugin-shape types) split by kind (value vs. type-only) with one row per export and a link to the per-source-file reference that owns its shape; the `package.json#exports` sub-path map (`.`, `./capabilities`, `./slots`) and the rationale for keeping `manifest`, `providers`, `plugin`, `loader`, `registry`, and `SlotHost` reachable only through the barrel; the per-line walkthrough of `index.ts` that pins each line to a documentation impact (the JSDoc preamble's framework-agnostic / React-as-peer / architecture-cross-link invariants, the capability re-exports, the slot re-exports, the manifest type re-exports, the provider type re-exports, the `defineDirectoryPlugin` value re-export, and the plugin-shape type re-exports); the value-vs-type contract that calls out moving a name across the boundary as a breaking change and points at `@typescript-eslint/consistent-type-exports` as the lint rule; the failure matrix that maps barrel-level mistakes (non-public sub-path import, value-vs-type mis-import, lost `C` inference when authors skip `defineDirectoryPlugin`, capability not added to `CAPABILITIES`, dropped `sideEffects` flag) onto the layer that surfaces them; and the public-surface change checklist that ties any addition / removal back to Spec Kit, the `docs/log.md` entry, and the `pnpm tsc --noEmit` / Playwright verification step.
- [Plugin Runtime Public Surface Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/runtime-public-surface.md) -- Per-source-file reference for the runtime barrel paired with `packages/plugin-runtime/src/index.ts`: every public name the barrel re-exports (`PluginRegistry`, `loadPlugins`, `mergeConfigSources`, `PluginConfigSources`, `LoadPluginsResult`, `SlotHost`, `SlotHostProps`, `createTestRegistry`) split by kind (value vs. type-only) and grouped by the three concerns the runtime owns -- the host-app boot pipeline (`PluginRegistry` + `loadPlugins` + `mergeConfigSources` + `PluginConfigSources` + `LoadPluginsResult`), the React render surface (`SlotHost` + `SlotHostProps`), and the unit-test helper (`createTestRegistry`); the `package.json#exports` sub-path map (`.`, `./registry`, `./SlotHost`, `./loader`, `./testing`) and the rationale for keeping the four narrowed sub-paths so a server action can import `PluginRegistry` from `@ever-works/plugin-runtime/registry` without dragging React into the server bundle, a test file can import `createTestRegistry` from `@ever-works/plugin-runtime/testing` without spinning up a JSDOM environment, and a host layout can import `<SlotHost />` from `@ever-works/plugin-runtime/SlotHost` to keep the React boundary explicit in bundle reports; the per-line walkthrough of `index.ts` that pins each line to a documentation impact (the JSDoc preamble's React-aware-only-in-`SlotHost` / owns-registry-loader-host / cross-link invariants, the registry value re-export, the loader value and type re-exports, the slot-host value and props re-exports, and the testing-helper value re-export with the explicit no-`export type` companion line because the helper's options object is an inline anonymous type); the value-vs-type contract that locks moving a name across the boundary as a breaking change and points at `@typescript-eslint/consistent-type-exports` as the lint rule; the failure matrix that maps barrel-level mistakes (non-public sub-path import, value-vs-type mis-import on `LoadPluginsResult`, treeshake-stripped `PluginRegistry` constructor, registry-instance mismatch between `loadPlugins` and `<SlotHost />`, dropped `sideEffects` flag pulling the entire runtime into a `mergeConfigSources`-only consumer, React leaking into a server bundle when a host action imports from the barrel instead of the narrowed `./registry` sub-path) onto the layer that surfaces them; and the public-surface change checklist that ties any addition / removal back to Spec Kit, the `docs/log.md` entry, and the `pnpm tsc --noEmit` / Playwright verification step.
- [`@ever-works/plugin-sdk`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk) -- Capability interfaces, slot ids, manifest types, and the `defineDirectoryPlugin` factory.
- [`@ever-works/plugin-runtime`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime) -- `PluginRegistry`, config loader, and the `<SlotHost />` React component.
- [`@ever-works/plugin-demo`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo) -- Reference plugin used by the test suite and as a teaching example.

## Use Cases

This template project is perfect for:

- **Tool directories** (like ProductHunt for tools)
- **Service marketplaces**
- **Resource catalogs**
- **Professional directories**
- **Product showcases**
- **Community platforms**

## Ever Works Platform

The Template can be used standalone or paired with the **Ever Works Platform** for AI-powered content generation. For Platform documentation, visit [docs.ever.works](https://docs.ever.works). See [Platform vs Template](/comparison) for a detailed comparison.

## Need Help?

- Check our [documentation](/docs) for general information
- Join our [Discord community](https://discord.gg/ever) for support
- Visit the [demo site](https://demo.ever.works) to see it in action
- Contact [support](/support) for technical assistance
