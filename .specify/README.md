---
id: specify-readme
title: .specify — Spec-Driven Development for the Directory Web Template
sidebar_label: .specify Overview
---

# `.specify/` — Spec-Driven Development

This directory follows the [GitHub Spec Kit](https://github.com/github/spec-kit)
convention for **spec-driven development**: every meaningful feature, refactor,
or architectural change lands in this monorepo via a structured trio of
documents — a **specification** (`spec.md`), an **implementation plan**
(`plan.md`), and a **task list** (`tasks.md`) — before any production code is
written or modified.

The Directory Web Template uses Spec Kit because:

- Many AI agents (Claude Code, Cursor, Copilot, Codex, etc.) work in this
  repository in parallel. Specs give them a shared, durable contract.
- The template ships to many downstream users who fork it. Specs let those
  users understand *why* a piece of code exists, not just what it does.
- The architecture is intentionally **modular, plugin-first**. Plugins must be
  introduced through specs so each one is reviewed against the same
  constitutional principles.

## Directory layout

```
.specify/
├── README.md            ← you are here
├── memory/
│   └── constitution.md  ← non-negotiable, durable principles for the template
├── templates/
│   ├── spec-template.md ← copy when describing a new feature / change
│   ├── plan-template.md ← copy when designing the implementation
│   └── tasks-template.md← copy when breaking work into discrete tasks
└── scripts/
    └── new-feature.sh   ← (optional) helper to scaffold docs/spec/<id>-<slug>/
```

Active feature specs live in **[`docs/spec/`](../docs/spec/)** so they ship
with the documentation site, one folder per feature:

```
docs/spec/
├── 001-monorepo-conversion/
│   └── spec.md
├── 002-plugin-architecture/
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
└── …
```

> **Why two roots?** `.specify/` holds the *methodology* (constitution,
> templates, helper scripts) and stays at the repository root per Spec Kit
> convention. `docs/spec/` holds the *outputs* — the actual per-feature
> spec/plan/tasks documents — alongside the rest of the documentation so the
> Docusaurus site renders them. Keeping them separate lets us version and
> review the methodology independently from the feature backlog.

## Workflow

For every non-trivial change to the template:

1. **`/specify`** — copy `templates/spec-template.md` into a new
   `docs/spec/NNN-feature-slug/spec.md`. Describe *what* and *why*. No code.
2. **`/plan`** — copy `templates/plan-template.md` into `plan.md` next to the
   spec. Describe *how*: architecture, files, packages, constitutional
   compliance check.
3. **`/tasks`** — copy `templates/tasks-template.md` into `tasks.md`. Break the
   plan into discrete, testable, parallelizable tasks. Mark tasks `[P]` when
   they can be done in parallel.
4. **Implement** — work the task list one item at a time. Every task should
   produce a verifiable outcome (a passing test, a successful lint, a working
   demo).
5. **Document** — when a feature ships, link its spec/plan/tasks from the
   relevant pages in [`docs/`](../docs/) and append a one-line entry to
   [`docs/log.md`](../docs/log.md).

## Constitutional compliance

Every plan must include a **Constitution Check** section that confirms it does
not violate any principle in [`memory/constitution.md`](memory/constitution.md).
Examples of principles:

- **Plugin-First** — net-new functionality lands as a plugin/adapter package
  unless it is part of the inarguable core (auth primitives, rendering shell,
  i18n loader, CMS loader).
- **TypeScript-Only** — no plain JS, no Python, no shell scripts in production
  paths.
- **No Removals Without Migration** — existing features and specs must not be
  deleted without a documented migration path.
- **Performance Budget** — Core Web Vitals targets are non-negotiable.
- **Latest Dependencies** — Next.js, React, and other top-level frameworks
  track their latest stable releases unless a spec documents the exception.

If a plan has to violate a principle, it must list the violation in a
**Complexity Tracking** subsection along with the justification and the
alternative that was rejected.

## See also

- [`docs/index.md`](../docs/index.md) — end-user home page
- [`docs/agents-and-contributors.md`](../docs/agents-and-contributors.md) —
  agent onboarding + per-source-file / spec / plugin reference index.
  Link new spec / plugin / config reference pages from here, not from
  `docs/index.md`.
- [`docs/spec/README.md`](../docs/spec/README.md) — index of every feature spec
- [`docs/log.md`](../docs/log.md) — running log of changes to docs and specs
- [`docs/questions.md`](../docs/questions.md) — open questions and chosen
  defaults awaiting maintainer review
- [`AGENTS.md`](../AGENTS.md) — cross-cutting rules for any AI agent working in
  this repository
