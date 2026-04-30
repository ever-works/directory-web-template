---
id: spec-readme
title: docs/spec — Feature Specifications
sidebar_label: Spec Index
---

# `docs/spec/` — Feature Specifications

This directory holds the per-feature outputs of the
[Spec Kit](../../.specify/README.md) workflow. Each subdirectory
contains the **spec → plan → tasks** trio for one feature, refactor,
or architectural change.

> **Why does this live in `docs/spec/` instead of `specs/`?**
> Specs are part of the documentation set — humans and AI agents read
> them via the docs site. Keeping them in `docs/spec/` lets Docusaurus
> render them, while `.specify/` stays at the repo root per the
> [GitHub Spec Kit](https://github.com/github/spec-kit) convention.

## Index

| ID  | Slug                                                       | Status        | Summary                                                                                       |
| --- | ---------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| 001 | [`monorepo-conversion`](001-monorepo-conversion/spec.md) ([plan](001-monorepo-conversion/plan.md), [tasks](001-monorepo-conversion/tasks.md))   | shipped       | Move single Next.js app into a Turborepo + pnpm monorepo with `apps/` and `packages/`         |
| 002 | [`plugin-architecture`](002-plugin-architecture/spec.md)   | in-progress   | Introduce a first-class plugin/adapter system so almost every feature is an installable plugin |
| 003 | [`auth-providers`](003-auth-providers/spec.md)             | shipped       | Auth.js v5 plus Supabase + OAuth providers (Google, GitHub, Facebook, Twitter, Microsoft)    |
| 004 | [`payment-providers`](004-payment-providers/spec.md)       | shipped       | Stripe, LemonSqueezy, and Polar payment adapters with subscription management                |
| 005 | [`internationalisation`](005-internationalisation/spec.md) | shipped       | next-intl-based i18n with RTL support and Docusaurus i18n for the docs site                  |
| 006 | [`git-cms`](006-git-cms/spec.md)                           | shipped       | Git-repo-as-CMS with YAML front-matter and incremental clone via `scripts/clone.cjs`         |
| 007 | [`theming-system`](007-theming-system/spec.md)             | shipped       | Themes with dynamic colour generation and admin-configurable palette                         |
| 008 | [`analytics-providers`](008-analytics-providers/spec.md)   | shipped       | Multi-provider analytics: PostHog, Google Analytics, Plausible, DataFast, Jitsu, Segment     |
| 009 | [`admin-dashboard`](009-admin-dashboard/spec.md)           | shipped       | Admin app for content, users, and analytics management                                        |
| 010 | [`e2e-test-coverage`](010-e2e-test-coverage/spec.md)       | in-progress   | End-to-end Playwright coverage for every user-visible feature                                 |
| 011 | [`maps-providers`](011-maps-providers/spec.md)             | shipped       | Map UI components with provider abstraction (Google Maps, optional alternatives)             |
| 012 | [`newsletter-providers`](012-newsletter-providers/spec.md) | shipped       | Newsletter integrations (e.g. Resend) behind an adapter interface                            |
| 013 | [`notifications-system`](013-notifications-system/spec.md) | proposed      | Unified notifications system (Novu adapter + in-app)                                          |
| 014 | [`docs-translation`](014-docs-translation/spec.md)         | in-progress   | Per-locale Docusaurus docs translation pipeline                                               |
| 015 | [`docs-spec-kit`](015-docs-spec-kit/spec.md)               | in-progress   | Adopt GitHub Spec Kit (`.specify/`, `docs/spec/`) as the project's SDD methodology           |
| 016 | [`typed-analytics-events`](016-typed-analytics-events/spec.md) | shipped   | Typed, Zod-validated central event API on top of the multi-provider analytics plumbing       |
| 017 | [`map-view`](017-map-view/spec.md) ([plan](017-map-view/plan.md), [tasks](017-map-view/tasks.md)) | in-progress   | Listing map view with synchronised sidebar + dedicated `/map` route + header nav link        |

> **Status legend:**
> *proposed* = spec drafted, not yet planned/approved.
> *planned* = plan and tasks exist, no code yet.
> *in-progress* = some tasks completed, more remain.
> *shipped* = all tasks completed and merged to `develop`/`main`.
> *deprecated* = retained but scheduled for removal per Article VIII of the constitution.

## Conventions

- Each folder is named `NNN-slug` where `NNN` is a zero-padded sequence number.
- Each folder contains at minimum a `spec.md`. Once the work is planned and
  implemented it also contains `plan.md` and `tasks.md`.
- For shipped features that pre-date Spec Kit, `spec.md` may be a
  retroactive description and `plan.md`/`tasks.md` may be omitted with a
  one-line note pointing to the relevant docs. Where the trio is
  retroactively reconstructed for parity (as for Spec 001), the
  reconstructed `plan.md` / `tasks.md` are marked as such in their
  preamble and the original plan documents under `docs/plans/` remain
  authoritative for historical sequencing.
- Constitutional principles for every spec live in
  [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md).

## Adding a new feature

1. Pick the next available `NNN`.
2. Copy [`.specify/templates/spec-template.md`](../../.specify/templates/spec-template.md)
   into `docs/spec/NNN-slug/spec.md` and fill it in.
3. Add a row to the index table above.
4. Append a line to [`docs/log.md`](../log.md).
5. Open any open questions in [`docs/questions.md`](../questions.md)
   with a chosen default so work can proceed without blocking.
