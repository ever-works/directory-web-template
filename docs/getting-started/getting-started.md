---
id: getting-started
title: Getting Started with the Template
sidebar_label: Overview
sidebar_position: 0
---

# Getting Started with the Template

Welcome to the Ever Works Directory Website Template. This section walks you through every step required to go from a fresh clone to a running application -- locally and in production.

## What Is the Ever Works Template?

The Ever Works template is a full-featured **Next.js directory website** built with TypeScript, React 19, and the App Router. It ships with authentication, payments, an admin dashboard, internationalization, a Git-based CMS, and more. The template is designed so that you can clone it, point it at your own data repository, and have a production-ready directory site without writing everything from scratch.

Key facts from the project manifest:

| Detail | Value |
|---|---|
| **Package name** | `ever-works-website-template` |
| **License** | AGPL-3.0 |
| **Node.js requirement** | >= 20.19.0 |
| **Package manager** | pnpm (lockfile: `pnpm-lock.yaml`) |
| **Framework** | Next.js 16 with React 19 |
| **Database ORM** | Drizzle ORM with PostgreSQL (or SQLite for local dev) |
| **Authentication** | NextAuth.js v5 (beta) with multiple providers |

## What You Will Learn

This getting-started section is organized into four sequential guides plus a reference card. By the end you will be able to:

1. **Install the template** and all of its dependencies on your machine.
2. **Configure your environment** with the required secrets, database connection, and content repository.
3. **Run the application locally** and verify that the dev server, database, and content pipeline all work.
4. **Deploy to production** on Vercel, Docker, or a self-hosted server.
5. **Look up commands quickly** using the quick-reference cheat sheet.

## Section Roadmap

Work through the guides in order. Each one builds on the previous step.

### 1. Installation

Set up Node.js, pnpm, and clone the repository. The installation guide covers system requirements, dependency installation, and initial project structure orientation.

**Read next:** [Installation](/docs/getting-started/installation)

### 2. Environment Setup

Create your `.env.local` file and configure every required and optional variable. The template ships with a `scripts/check-env.js` utility that validates your configuration before the dev server starts, so you will know immediately if something is missing.

Topics covered:

- Core variables (`AUTH_SECRET`, `COOKIE_SECRET`, `DATABASE_URL`)
- Content repository (`DATA_REPOSITORY` and the `scripts/clone.cjs` pipeline)
- Authentication providers (Google, GitHub, credentials)
- Payment integrations (Stripe, Polar, LemonSqueezy, Solidgate)
- Email, analytics, and monitoring services

**Read next:** [Environment Setup](/docs/getting-started/environment-setup)

### 3. Quick Start

Once your environment is configured, the quick-start guide gets the application running in under ten minutes. You will start the dev server, seed the database, and explore the site at `http://localhost:3000`.

**Read next:** [Quick Start](/docs/getting-started/quick-start)

### 4. First Deployment

Take your locally verified setup and deploy it to a live environment. The deployment guide covers Vercel (recommended), Docker standalone builds, and manual hosting. It includes a pre-deployment checklist so nothing is missed.

**Read next:** [First Deployment](/docs/getting-started/first-deployment)

### 5. Quick Reference

A single-page cheat sheet of the most common commands, file paths, and conventions. Keep it open in a tab while you develop.

**Read next:** [Quick Reference](/docs/getting-started/quick-reference)

## Prerequisites

Before starting the installation guide, make sure you have the following tools available:

- **Node.js 20.19.0 or higher** -- the `engines` field in `package.json` enforces this minimum.
- **pnpm** -- the project uses pnpm as its package manager. Install it globally with `npm install -g pnpm`.
- **Git** -- required both for cloning the template and for the Git-based CMS content pipeline.
- **A code editor** -- VS Code is recommended; the repository includes workspace settings.
- **PostgreSQL** (optional for local dev) -- you can use SQLite locally by setting `DATABASE_URL=file:./dev.db`, but production deployments require PostgreSQL.

## Essential Commands at a Glance

These are the commands you will use most often. Each is explained in detail in the relevant guide.

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Database operations (Drizzle)
pnpm db:generate    # Generate migration files
pnpm db:migrate     # Apply migrations
pnpm db:seed        # Seed initial data
pnpm db:studio      # Open Drizzle Studio UI

# Production build and start
pnpm build
pnpm start

# End-to-end tests (Playwright)
pnpm test:e2e
```

## How the Dev Server Starts

When you run `pnpm dev`, several things happen behind the scenes:

1. **`scripts/clone.cjs`** runs as a `predev` hook and clones (or updates) the Git-based CMS content into the `.content/` directory.
2. **`scripts/check-env.js`** validates that your `.env.local` file contains all required variables.
3. **`scripts/generate-openapi.ts`** generates OpenAPI documentation from your JSDoc-annotated API routes.
4. **Next.js dev server** starts with the `--max-old-space-size=8192` flag to handle the large content set.

Understanding this pipeline will save you debugging time if the dev server fails to start.

## Where to Go After Getting Started

Once your application is running, the rest of the documentation will help you customize and extend it:

- **[Architecture Overview](/docs/architecture)** -- understand the project structure, data flow, and design patterns before making changes.
- **[Guides and Tutorials](/docs/guides)** -- step-by-step instructions for customization, theming, admin features, and more.

---

Ready to begin? Head to the [Installation](/docs/getting-started/installation) guide and follow the steps from there.
