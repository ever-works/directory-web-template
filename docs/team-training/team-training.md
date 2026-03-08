---
id: team-training-overview
title: Team Training Overview
sidebar_label: Training Overview
sidebar_position: 2
---

# Team Training Overview

This page provides a structured overview of the Ever Works Template training program. It covers the training structure, learning paths for different roles, required knowledge, the recommended onboarding timeline, and links to detailed training modules.

## Training Structure

The training program is organized into four progressive modules. Each module builds on the previous one, starting with environment setup and ending with hands-on implementation exercises.

### Module 1: Onboarding (Days 1-2)

**Goal**: Set up the development environment and understand the project architecture.

Key topics:

- Installing Node.js 20.19.0 or higher and pnpm
- Cloning the repository and running `pnpm install`
- Configuring `.env.local` with required variables
- Understanding the project structure (App Router, `lib/`, `components/`, `hooks/`)
- Running the dev server with `pnpm dev`
- Running linting and type checking with `pnpm lint` and `pnpm tsc --noEmit`

The minimum environment variables needed for local development:

```bash
NODE_ENV=development
AUTH_SECRET=<openssl rand -base64 32>
COOKIE_SECRET=<openssl rand -base64 32>
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
DATA_REPOSITORY=https://github.com/ever-works/awesome-time-tracking-data
```

The `scripts/check-env.js` validates the environment on every `dev`, `build`, and `start` command, catching misconfiguration early.

### Module 2: API Documentation (Days 3-4)

**Goal**: Learn the API documentation system and Swagger annotation conventions.

The template uses Swagger/JSDoc annotations on API routes, with automatic OpenAPI spec generation via `scripts/generate-openapi.ts`. API documentation is served through the Scalar UI at `/api/reference`.

Key topics:

- Writing Swagger annotations for `app/api/` route handlers
- Understanding the standardized tag conventions
- Running `pnpm generate-docs` to regenerate the OpenAPI spec
- Using `pnpm docs:watch` for live documentation updates during development

### Module 3: Best Practices (Day 5)

**Goal**: Learn coding standards and architectural patterns.

The template follows specific patterns:

- **TypeScript everywhere** -- no plain `.js` files in application code
- **Business logic in `lib/services/`** -- components stay presentational
- **Data access in `lib/repositories/`** -- all database queries go through repositories
- **Validation with Zod** -- see existing schemas in `lib/validations/`
- **Forms with react-hook-form + Zod** -- following patterns in auth/profile forms
- **Internationalization** -- use `next-intl` messages instead of hardcoded English strings

Code formatting follows the Prettier configuration in `package.json`:

```json
{
  "printWidth": 120,
  "singleQuote": true,
  "semi": true,
  "useTabs": true,
  "tabWidth": 4,
  "arrowParens": "always",
  "trailingComma": "none"
}
```

### Module 4: Hands-On Exercises (Week 2)

**Goal**: Apply knowledge through practical implementation tasks.

Exercises progress from simple to complex:

1. **Simple GET route** -- create a new API route, query the database, return JSON
2. **POST route with validation** -- accept input, validate with Zod, insert into database
3. **Full feature implementation** -- new page, API route, database table, admin panel integration
4. **Code review exercise** -- review a pull request using the team's standards

## Learning Paths by Role

### Frontend Developer

| Priority | Topic | Resources |
|----------|-------|-----------|
| High | React components and patterns | `components/` directory, HeroUI library |
| High | Next.js App Router and server components | `app/[locale]/` pages |
| High | Internationalization with next-intl | `i18n/`, `messages/` directories |
| Medium | Tailwind CSS and theming | `tailwind.config.ts`, theme utilities |
| Medium | React Query data fetching | `hooks/` directory |
| Lower | API route development | `app/api/` routes |

### Backend Developer

| Priority | Topic | Resources |
|----------|-------|-----------|
| High | Database schema and Drizzle ORM | `lib/db/schema.ts`, `drizzle.config.ts` |
| High | API route handlers | `app/api/` directory |
| High | Service and repository layers | `lib/services/`, `lib/repositories/` |
| Medium | Authentication (NextAuth) | `auth.config.ts`, `lib/auth/` |
| Medium | Payment integrations | `lib/payment/`, Stripe/Polar/LemonSqueezy |
| Lower | Deployment and CI/CD | `scripts/`, `vercel.json` |

### Full-Stack Developer

Follow both paths above, starting with the backend track in Week 1 and the frontend track in Week 2.

### DevOps / Infrastructure

| Priority | Topic | Resources |
|----------|-------|-----------|
| High | Deployment architecture | `next.config.ts` (standalone output) |
| High | Environment variable management | `scripts/check-env.js`, `.env.example` |
| High | Database migrations | `scripts/build-migrate.ts`, `lib/db/migrate.ts` |
| Medium | Monitoring (Sentry, PostHog) | `sentry.config.ts`, `instrumentation.ts` |
| Medium | Cron job configuration | `vercel.json`, `app/api/cron/` |
| Lower | Background jobs (Trigger.dev) | `lib/background-jobs/` |

## Required Knowledge

### Must-Have Skills

- **TypeScript**: Comfortable with types, interfaces, generics, and utility types
- **React**: Hooks, functional components, context, server components vs. client components
- **Next.js**: App Router, server actions, middleware, API routes
- **Git**: Branching, rebasing, pull request workflow
- **REST APIs**: HTTP methods, status codes, JSON request/response patterns

### Recommended Skills

- **PostgreSQL**: Basic SQL (SELECT, INSERT, JOIN), indexes
- **Tailwind CSS**: Utility-first styling approach
- **Drizzle ORM**: Type-safe queries, schema definition, migrations
- **OAuth 2.0**: Authorization code flow, tokens, callback handling
- **Zod**: Schema validation, type inference

### Tools to Install

Before starting the training:

- **Node.js** 20.19.0 or higher (use nvm for version management)
- **pnpm** (the project uses `pnpm-lock.yaml`)
- **PostgreSQL** 14 or higher (for database features)
- **Git** (for version control and content repository clone)
- **VS Code** or equivalent editor

Recommended VS Code extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- Error Lens
- REST Client

## Onboarding Timeline

### New Team Members: 2-Week Plan

**Week 1: Foundation**

| Day | Activity | Module |
|-----|----------|--------|
| 1 | Environment setup, project tour, first `pnpm dev` | Onboarding |
| 2 | Architecture walkthrough, code organization deep dive | Onboarding |
| 3 | API documentation system, Swagger annotations | API Documentation |
| 4 | Practice documenting existing routes, review standards | API Documentation |
| 5 | Coding standards, TypeScript patterns, Prettier/ESLint config | Best Practices |

**Week 2: Practice**

| Day | Activity | Module |
|-----|----------|--------|
| 1 | Simple GET route exercise | Exercises |
| 2 | POST route with Zod validation | Exercises |
| 3 | Full feature implementation exercise | Exercises |
| 4 | First real task with mentor pairing | On-the-job |
| 5 | Code review of first task, feedback session | On-the-job |

### Existing Team Members: 3-Day Refresher

| Day | Activity |
|-----|----------|
| 1 | Review updated best practices and coding standards |
| 2 | API documentation updates and new patterns |
| 3 | Practice exercises on new features |

## Key Codebase Entry Points

New developers should familiarize themselves with these files first:

| File | Why It Matters |
|------|----------------|
| `package.json` | Available scripts, dependencies, Node.js version |
| `next.config.ts` | Build configuration, security headers, plugins |
| `app/[locale]/layout.tsx` | Root layout with providers, i18n, settings |
| `lib/db/schema.ts` | Database schema (the data model) |
| `auth.config.ts` | Authentication provider configuration |
| `i18n/routing.ts` | Locale routing configuration |
| `lib/constants.ts` | Shared constants (locales, API URLs, keys) |
| `instrumentation.ts` | Startup initialization (DB, Sentry) |

## Completion Criteria

After completing the training, team members should be able to:

- [ ] Set up the development environment independently
- [ ] Run `pnpm dev`, `pnpm lint`, and `pnpm build` without errors
- [ ] Create and document API endpoints following project standards
- [ ] Implement features using the service/repository pattern
- [ ] Write type-safe database queries with Drizzle ORM
- [ ] Add translations using the next-intl message system
- [ ] Debug issues using Sentry, PostHog, and browser dev tools
- [ ] Pass code reviews consistently

## Additional Resources

### Internal Documentation

- [Architecture Overview](/docs/architecture/overview)
- [Quick Reference](/docs/getting-started/quick-reference)
- [Database Guide](/docs/database/overview)
- [Authentication Guide](/docs/authentication/overview)
- [Deployment Guide](/docs/deployment/overview)

### External Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Getting Help

- Ask your assigned mentor or team lead
- Check the [Quick Reference](/docs/getting-started/quick-reference) for common commands
- Review the `CLAUDE.md` file in the repository root for AI-assisted development guidelines
- Use `pnpm db:studio` to visually inspect the database
- Use Sentry and PostHog dashboards for production debugging
