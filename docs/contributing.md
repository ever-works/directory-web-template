---
id: contributing
title: Contributing Guide
sidebar_label: Contributing
---

# Contributing Guide

Thank you for your interest in contributing to the Ever Works Website Template. This guide covers everything you need to know to make meaningful contributions.

## Repository

The Template source code is hosted at [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

For contributions to the Ever Works Platform, see the [Platform repository](https://github.com/ever-works/ever-works) and its contributing guide at [docs.ever.works](https://docs.ever.works).

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** >= 20.19.0 (LTS recommended)
- **pnpm** >= 10.x (strictly enforced; do not use npm or yarn)
- **Git** >= 2.30
- **PostgreSQL** (for database; Supabase provides a hosted option)

### Installing pnpm

```bash
# Using corepack (recommended, ships with Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# Or via npm (one-time bootstrap)
npm install -g pnpm
```

**Important:** The repository uses `packageManager` fields and lockfiles specific to pnpm. Running `npm install` or `yarn install` will fail or produce incorrect dependency trees.

## Development Setup

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Copy environment file and configure
cp .env.example .env.local
# Edit .env.local with your values (see README for details)

pnpm dev        # Next.js dev server on port 3000
```

## Code Standards

### TypeScript

The Template uses TypeScript everywhere. Do not introduce plain `.js` files. Follow strict TypeScript practices:

- Enable and respect `strict` mode settings in `tsconfig.json`
- Prefer explicit return types on exported functions
- Use `unknown` over `any` where possible
- Validate input with **Zod** schemas

### Formatting (Prettier)

Formatting is enforced via Prettier. The configuration lives in the root `package.json`:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

Run the formatter before committing:

```bash
pnpm format          # Format all files
pnpm format:check    # Check without modifying (CI-friendly)
```

### Linting (ESLint)

The Template uses the flat ESLint config (`eslint.config.mjs`) with React, React Hooks, and TypeScript plugins:

```bash
pnpm lint
```

### Naming Conventions

| Element                    | Convention       | Example                               |
| -------------------------- | ---------------- | ------------------------------------- |
| Files                      | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Classes, Interfaces, Types | PascalCase       | `DirectoryService`, `UserProfile`     |
| Functions, Variables       | camelCase        | `getDirectoryById`, `itemCount`       |
| Constants                  | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Commit Conventions

The repository enforces [Conventional Commits](https://www.conventionalcommits.org/) via **commitlint** and **husky** pre-commit hooks.

| Prefix      | Usage                                      |
| ----------- | ------------------------------------------ |
| `feat:`     | New features                               |
| `fix:`      | Bug fixes                                  |
| `docs:`     | Documentation changes                      |
| `refactor:` | Code restructuring without behavior change |
| `test:`     | Adding or updating tests                   |
| `chore:`    | Maintenance tasks, dependency updates      |
| `style:`    | Formatting changes (no logic change)       |
| `perf:`     | Performance improvements                   |
| `ci:`       | CI/CD configuration changes                |

Example:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Branch Naming

Use descriptive branch names with a prefix:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Pull Request Process

1. **Fork** the repository (or create a branch if you have write access).
2. **Create a feature branch** from `main`.
3. **Make your changes** following the code standards above.
4. **Run quality checks** before pushing (see below).
5. **Push** your branch and open a Pull Request against `main`.
6. **Fill out the PR template** with a description, related issues, and testing notes.
7. **Wait for review.** A maintainer will review your PR and may request changes.
8. Once approved, a maintainer will merge your PR.

### Quality Checks Before Submitting a PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # TypeScript check
pnpm build          # Full production build
```

### Testing

The Template uses **Playwright** for end-to-end tests:

```bash
pnpm test:e2e
```

If your changes touch existing functionality, ensure all related tests pass. If you add new functionality, include tests for it.

## License

The Ever Works Website Template is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. By submitting a contribution, you agree that your work will be licensed under the same license.

## Code of Conduct

All contributors are expected to follow the project's Code of Conduct. Be respectful, constructive, and collaborative.

## Getting Help

If you have questions about contributing:

- Open a [GitHub Discussion](https://github.com/ever-works/directory-web-template/discussions)
- Join the [Discord community](https://discord.gg/ever) for real-time help
- Email [ever@ever.co](mailto:ever@ever.co) for private inquiries
