---
id: glossary
title: Glossary of Terms
sidebar_label: Glossary
---

# Glossary of Terms

Key terms and concepts used throughout the Directory Web Template documentation.

## Core Domain Concepts

### Directory

A collection of organized listings (items) around a specific topic or niche. A directory is the top-level entity. Examples: a "SaaS Tools Directory," a "Developer Resources Directory," or a "Local Business Directory."

### Item

A single entry or listing within a directory. An item represents one entity being cataloged (a tool, business, resource, or service). Items have structured fields (name, description, URL, logo), belong to categories, and can be tagged.

### Category

A hierarchical classification used to organize items. Categories form a tree structure (parent/child relationships) and provide the primary navigation and filtering mechanism.

### Tag

A flat, non-hierarchical label attached to items for cross-cutting classification. Tags are used for secondary filtering and discovery. An item can have multiple tags such as "open-source," "freemium," or "API-available."

### Collection

A curated grouping of items, independent of categories or tags. Collections are user-defined or editorially curated sets, such as "Top 10 Picks" or "New This Month."

### Taxonomy

The overall classification system for a directory, encompassing categories, tags, and any other organizational structures.

### Slug

A URL-friendly, human-readable identifier derived from an entity's name. Slugs are used in URLs instead of numeric IDs. For example, "Visual Studio Code" becomes `visual-studio-code`.

## Architecture Patterns

### Repository

A data access layer class that encapsulates database queries and mutations for a specific entity. Repositories abstract away Drizzle ORM and provide a clean interface for services. Located in `lib/repositories/`.

### Service

A business logic layer class that orchestrates operations across repositories, external APIs, and other services. Services contain the core application logic and are called by API route handlers. Located in `lib/services/`.

### Webhook

An HTTP callback triggered by an event. The Template uses webhooks for payment provider notifications (Stripe, LemonSqueezy, Polar) and deployment status updates. Webhook endpoints validate incoming requests using signatures or shared secrets.

## Content Management

### Git-based CMS

The content management approach used by the Template. Directory data (items, categories, metadata) is stored as structured files (YAML, Markdown) in a Git repository. The Template clones this repository at build time and reads content from the local filesystem. Changes are made via commits and pull requests.

### Community PR

A pull request submitted by a community member to add or update items in a directory's Git-based CMS repository. Community PRs go through a review process before being merged.

## Database

### Drizzle ORM

The lightweight, TypeScript-first ORM used by the Template. Drizzle provides a SQL-like query builder with full type safety. Schema definitions are written as TypeScript code, and migrations are generated as plain SQL files via Drizzle Kit.

### Migration

A versioned database schema change. Migrations are generated with `pnpm db:generate` and applied with `pnpm db:migrate`. Migration files are stored in `lib/db/migrations/`.

## Authentication

### NextAuth.js

The authentication library (v5) used by the Template. It provides OAuth support for multiple providers (Google, GitHub, Facebook, Twitter, Microsoft) with session management and JWT tokens.

### Supabase Auth

An alternative authentication backend supported by the Template. Supabase Auth provides email/password authentication, magic links, and social OAuth through Supabase's managed service.

## Payments

### Subscription

A recurring payment arrangement managed through one of the supported payment providers (Stripe, LemonSqueezy, or Polar). The Template handles subscription creation, management, and webhook processing.

## Deployment

### Vercel

The primary deployment platform for the Template. Vercel provides zero-configuration deployment for Next.js applications, including automatic preview deployments, edge functions, and CDN distribution.

### Docker

An alternative deployment method. The Template can be containerized and deployed to any Docker-compatible hosting environment.
