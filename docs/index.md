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
