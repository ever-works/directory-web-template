---
id: changelog
title: Changelog & Versioning
sidebar_label: Changelog
---

# Changelog & Versioning

This page explains how the Directory Web Template manages versioning, releases, and upgrade paths.

## Semantic Versioning

The Template follows [Semantic Versioning (SemVer)](https://semver.org/). Version numbers use the format **MAJOR.MINOR.PATCH**:

| Component | When to increment                                    |
| --------- | ---------------------------------------------------- |
| **MAJOR** | Breaking changes that require migration steps        |
| **MINOR** | New features added in a backward-compatible manner   |
| **PATCH** | Backward-compatible bug fixes and minor improvements |

Pre-release versions may use suffixes like `-alpha.1`, `-beta.2`, or `-rc.1` for early testing.

## Database Migrations

The Template uses **Drizzle ORM** with PostgreSQL. Database schema changes are managed through Drizzle Kit:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

Migration files are stored in the `lib/db/migrations/` directory. Each migration is a SQL file generated from changes to the Drizzle schema definitions in `lib/db/schema/`.

## Upgrading the Template

When upgrading to a newer version:

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### Handling Conflicts During Upgrades

If you have customized the Template, you may encounter merge conflicts when pulling updates. The recommended approach:

1. **Keep customizations in separate files** when possible (custom components, new routes, additional services).
2. **Use the Git-based CMS** for content changes rather than modifying core files.
3. **Review release notes** before upgrading to understand what files have changed.
4. **Test thoroughly** after resolving conflicts by running `pnpm lint`, `pnpm tsc --noEmit`, and `pnpm build`.

## Tracking Releases

### GitHub Releases

Releases are published on GitHub at [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

Each release includes:

- A version tag (e.g., `v0.1.0`)
- Release notes describing changes, new features, bug fixes, and breaking changes
- Links to relevant pull requests and issues

### Commit History

The repository uses [Conventional Commits](https://www.conventionalcommits.org/), making it easy to scan the commit history for changes:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## Breaking Changes Policy

Breaking changes are taken seriously. The project follows these principles:

1. **Advance notice.** Breaking changes are announced at least one minor release before they take effect, when possible.
2. **Migration guides.** Every breaking change includes a migration guide in the release notes.
3. **Minimize disruption.** Breaking changes are batched into major releases rather than spread across multiple minor releases.
4. **Database backward compatibility.** Migrations are designed to be non-destructive. Column additions and table creations are preferred over removals or renames.

### Examples of Breaking Changes

- Removing or renaming a public API endpoint
- Changing the shape of API request or response bodies
- Removing or renaming database columns or tables
- Changing required environment variables
- Dropping support for a Node.js version
- Changing authentication or authorization behavior
- Removing or renaming exported TypeScript types or interfaces

### Examples of Non-Breaking Changes

- Adding new API endpoints
- Adding new optional fields to request or response bodies
- Adding new database columns with default values
- Adding new environment variables with sensible defaults
- Adding new features or integrations
- Performance improvements
- Bug fixes

## Changelog Format

Release notes follow this structure:

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

This format follows [Keep a Changelog](https://keepachangelog.com/) conventions.
