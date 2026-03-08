---
id: index
title: Ever Works Website Template
sidebar_label: Home
sidebar_position: 0
slug: /
---

# Ever Works Website Template

The Ever Works Website Template is a modern, full-stack directory website solution built with Next.js 15, React 19, TypeScript, and Tailwind CSS. It is designed to help you create professional directory websites for tools, services, products, or any other type of listing platform.

## Key Features

- **Modern Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, HeroUI React
- **Flexible Authentication**: NextAuth.js v5, Supabase Auth, OAuth providers (Google, GitHub, Facebook, Twitter, Microsoft)
- **Payment Integration**: Stripe, LemonSqueezy, Polar with subscription management
- **Internationalization**: Multiple languages supported with full RTL support via next-intl
- **Git-based CMS**: Content synchronization from Git repositories with YAML-based structure
- **Theming System**: Built-in themes with dynamic color generation
- **Analytics & Monitoring**: PostHog, Sentry, performance monitoring
- **Admin Dashboard**: Content management, user management, and analytics
- **SEO Optimized**: Sitemap generation, structured data (JSON-LD), meta tags

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ever-works/ever-works-website-template.git
cd ever-works-website-template

# Install dependencies (pnpm is required)
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your site!

## Next Steps

- [Installation Guide](/docs/getting-started/installation) -- Complete setup instructions
- [Quick Start Guide](/docs/getting-started/quick-start) -- Get up and running in under 10 minutes
- [Architecture Overview](/docs/architecture/overview) -- Understand the system design
- [Deployment Guide](/docs/deployment/deployment-introduction) -- Deploy to production

## Use Cases

This template is perfect for:

- **Tool directories** (like ProductHunt for tools)
- **Service marketplaces**
- **Resource catalogs**
- **Professional directories**
- **Product showcases**
- **Community platforms**

## Ever Works Platform

The Template can be used standalone or paired with the **Ever Works Platform** for AI-powered content generation. For Platform documentation, visit [docs.ever.works](https://docs.ever.works). See [Platform vs Template](/docs/comparison) for a detailed comparison.

## Need Help?

- Browse the [documentation](/docs) for guides and references
- Join our [Discord community](https://discord.gg/ever) for support
- Visit the [demo site](https://demo.ever.works) to see it in action
- Check the [Support page](/docs/support) for all support channels
