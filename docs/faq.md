---
id: faq
title: Frequently Asked Questions
sidebar_label: FAQ
---

# Frequently Asked Questions

## General

### What is the Directory Web Template?

The Directory Web Template is a production-ready, full-stack directory website solution built with Next.js, React, TypeScript, and Tailwind CSS. You can clone, customize, and deploy it to create professional directory websites.

### Can I use the Template without the Ever Works Platform?

Yes. The Template works independently as a self-contained Next.js application with its own API routes, authentication, database, and payment processing. The Platform is a separate product that can optionally power content generation via AI. See [docs.ever.works](https://docs.ever.works) for Platform documentation.

### What is Pinler.com?

[Pinler.com](https://pinler.com) is a production SaaS directory service built on top of the Ever Works ecosystem, demonstrating a real-world deployment.

## Tech Stack

### What technologies does the Template use?

- **Framework:** Next.js 15, React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4, HeroUI React, Radix UI
- **ORM:** Drizzle ORM with PostgreSQL
- **Auth:** NextAuth.js v5, Supabase Auth
- **Payments:** Stripe, LemonSqueezy, Polar

### Which authentication providers are supported?

Google, GitHub, Facebook, Twitter, and Microsoft via NextAuth.js v5, plus Supabase Auth as an alternative authentication backend.

### Which payment providers are supported?

Stripe, LemonSqueezy, and Polar, all with subscription management support.

## Deployment

### How do I deploy the Template?

The recommended deployment target is **Vercel** for zero-configuration Next.js hosting. Docker is also supported as an alternative. See the [Deployment Guide](/deployment/deployment-introduction) for detailed instructions.

### What database should I use?

PostgreSQL is the primary database, typically provided through **Supabase** (managed) or a direct PostgreSQL instance. The Template uses Drizzle ORM for type-safe database access.

## Content

### How does the Git-based CMS work?

The Template reads directory content (items, categories, metadata) from structured files (YAML, Markdown) stored in a Git repository. At build time, content is cloned into the `.content/` directory and rendered by Next.js. You can manage content by editing files directly or by using the Ever Works Platform for automated AI-powered content generation.

### Can I add items manually?

Yes. You can create and edit YAML and Markdown files in the CMS data repository without needing the Platform. Community contributions can also be submitted as pull requests.

## Support

### Where can I get help?

See the [Support page](/support) for community channels, professional support options, and troubleshooting guides.
