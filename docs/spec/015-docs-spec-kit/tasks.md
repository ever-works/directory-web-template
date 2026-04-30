---
id: tasks-015-docs-spec-kit
title: 'Tasks 015 — Adopt GitHub Spec Kit'
sidebar_label: '015 Adopt Spec Kit Tasks'
---

# Tasks — `015-docs-spec-kit`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Create `.specify/` scaffold

- Files: `.specify/README.md`, `.specify/memory/constitution.md`,
  `.specify/templates/{spec,plan,tasks}-template.md`.
- Verification: files exist and render in the docs site.

### T-002 [done] — Author `docs/spec/` index and per-feature specs

- Files: `docs/spec/README.md`, `docs/spec/NNN-*/spec.md`.
- Verification: every shipped feature has at least a `spec.md`.

### T-003 [done] — Cross-cut into agent / claude rules

- Files: `AGENTS.md`, `CLAUDE.md`.
- Verification: both link to the constitution and Spec Kit workflow.

### T-004 [done] — Running change log and questions register

- Files: `docs/log.md`, `docs/questions.md`.
- Verification: both files are linked from `docs/index.md`.

### T-005 [P] — Backfill `plan.md` for every shipped feature spec

- Files: `docs/spec/NNN-*/plan.md` for 003–015.
- Verification: every spec folder has a plan.

### T-006 [P] — Backfill `tasks.md` for every shipped feature spec

- Files: `docs/spec/NNN-*/tasks.md` for 003–015.
- Verification: every spec folder has tasks.

### T-007 [seq] — Spec-lint script

- Files: `apps/web/scripts/lint-specs.ts`,
  `.github/workflows/ci.yml` (add a spec-lint step).
- Steps:
  1. Walk `docs/spec/` and assert each folder has all three artefacts.
  2. Print a missing list and exit 1 on failure.
- Verification: running locally produces a clean report.

### T-008 [seq] — PR template requires spec link

- Files: `.github/PULL_REQUEST_TEMPLATE.md`.
- Verification: a new PR opens with the template's spec field.

### T-009 [seq] — Spec coverage report (future)

- Files: future `apps/web/scripts/spec-coverage.ts`,
  `docs/spec/coverage.md`.
- Verification: report shows packages without owning specs.

## Acceptance Criteria → Task Map

| AC    | Tasks               |
| ----- | ------------------- |
| AC-1  | T-001               |
| AC-2  | T-002, T-005, T-006 |
| AC-3  | T-002               |
| AC-4  | T-003               |
| AC-5  | T-004               |
| AC-6  | docs/index.md links |

## Notes

- This file itself is part of T-006.
- Lint automation is `Q-015a`-deferred.
