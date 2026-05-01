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
- [Plugin Packages](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/packages.md) -- SDK, runtime, and demo packages overview.
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
