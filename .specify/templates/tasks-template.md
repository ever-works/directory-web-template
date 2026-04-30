---
id: tasks-template
title: Tasks Template
sidebar_label: Tasks Template
---

<!--
Copy this file to `docs/spec/NNN-feature-slug/tasks.md` and fill in.
Tasks are the *executable* breakdown of the plan. Each task should produce a
verifiable outcome (a passing test, a successful lint, a working demo).
-->

# Tasks — `<NNN-feature-slug>`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions:

- `[P]` after a task ID means it can be done in parallel with other `[P]`
  tasks (no shared dependencies).
- `[seq]` means the task must be done after the previous numbered task.
- Each task ends with a **Verification** line: how to know it is done.

## Task list

### T-001 [P] — Scaffold package

- Files: `packages/<plugin-name>/{package.json,tsconfig.json,src/index.ts}`
- Steps:
  1. Create the package skeleton.
  2. Wire it into the workspace (`pnpm-workspace.yaml`).
  3. Add ESLint and TS config inheriting from `packages/eslint-config` and
     `packages/tsconfig`.
- Verification: `pnpm --filter <plugin-name> typecheck` succeeds.

### T-002 [seq] — Define adapter interface

- Files: `packages/plugin-sdk/src/<adapter-name>.ts`
- Steps:
  1. Author the interface and Zod config schema.
  2. Re-export from `packages/plugin-sdk/src/index.ts`.
- Verification: types compile and are consumed without `as any` casts.

### T-003 [seq] — Implement adapter

- Files: `packages/<plugin-name>/src/index.ts`
- Steps:
  1. Implement the interface.
  2. Validate config at boot using the Zod schema.
- Verification: unit test under `packages/<plugin-name>/__tests__/` passes.

### T-004 [P] — Wire into runtime

- Files: `apps/web/lib/plugins/registry.ts`
- Steps:
  1. Register the plugin behind a feature flag / config gate.
  2. Provide a kill switch that disables the plugin at runtime.
- Verification: removing the env flag disables the plugin without breaking
  the app.

### T-005 [P] — UI integration

- Files: `apps/web/components/<area>/`
- Steps:
  1. Render the plugin’s slot output in the appropriate layout location.
  2. Localise any new strings via `next-intl`.
- Verification: visual diff against the spec’s wireframes; a11y axe pass.

### T-006 [P] — E2E coverage

- Files: `apps/web-e2e/tests/<area>/<spec>.spec.ts`
- Steps:
  1. Cover happy path and one edge case.
  2. Reuse `auth.fixture.ts` for authenticated flows.
- Verification: `pnpm --filter @ever-works/web-e2e exec playwright test <file>` passes.

### T-007 [seq] — Documentation

- Files: `docs/features/<feature>.md`, `docs/index.md`, `docs/log.md`
- Steps:
  1. Add a feature page describing usage and configuration.
  2. Link it from `docs/index.md`.
  3. Append a `docs/log.md` line.
- Verification: docs lint clean (no broken links, frontmatter present).

### T-008 [seq] — Ship

- Files: this `tasks.md`
- Steps:
  1. Tick every task above.
  2. Confirm Constitution Check still holds.
  3. Open a PR linking spec, plan, and tasks.
- Verification: CI green; Spec/Plan/Tasks linked from the PR description.

## Acceptance Criteria → Task Map

| AC    | Tasks         |
| ----- | ------------- |
| AC-1  | T-003, T-006  |
| AC-2  | T-005, T-006  |
| AC-3  | T-007         |

## Notes

- Mark tasks completed in this file as you go (`- [x]` checkboxes are fine).
- If a task balloons in scope, split it; do not silently expand a task.
- New tasks discovered during implementation must be appended here, not
  squirrelled away in scratch files.
