---
id: spec-015-docs-spec-kit
title: 'Spec 015 — Adopt GitHub Spec Kit'
sidebar_label: '015 Adopt Spec Kit'
---

# Feature spec — `015-docs-spec-kit`

> **Status:** In progress.
> **Constitution articles invoked:** III, IV, VIII.

## 1. Summary

Adopt the [GitHub Spec Kit](https://github.com/github/spec-kit) workflow
inside this monorepo: a `.specify/` directory at the repo root holds
the methodology (constitution + templates), a `docs/spec/` directory
holds per-feature spec/plan/tasks documents (so they ship with the
docs site), and the `docs/` site is updated to point at those
resources for both human and AI contributors.

## 2. Motivation

- The template is worked on by many AI agents (Claude, Cursor, Copilot,
  Codex, Gemini Code Assist, …) and many human contributors. A single
  documented methodology keeps them aligned.
- New features should not land without a spec, plan, and task list.
- The existing `docs/plans/` directory captured this informally; Spec
  Kit standardises it.

## 3. Goals

- `.specify/` exists and contains: `README.md`, `memory/constitution.md`,
  `templates/{spec,plan,tasks}-template.md`.
- `docs/spec/` exists and contains an `README.md` index plus folders
  for the shipped and proposed features (one per major feature).
- `AGENTS.md`, `CLAUDE.md`, and the docs index reference Spec Kit and
  describe the workflow.
- `docs/log.md` and `docs/questions.md` exist as the running log and
  open-questions register described in the constitution.

## 4. Non-Goals

- Migrating `docs/plans/` content out — those plans are kept as
  historical references per Article VIII.
- Switching the entire team to Spec-Kit immediately for tiny fixes —
  trivial fixes can still be one-shot.

## 5. User Stories

```text
As an AI agent, I want a single file (`.specify/memory/constitution.md`)
that tells me the rules, so my output stays in line with the project.

As a maintainer, I want every PR to point to a spec/plan/tasks trio so I
can review the why before scrutinising the what.
```

## 6. Acceptance Criteria

- [x] AC-1: `.specify/README.md`, `.specify/memory/constitution.md`,
  `.specify/templates/spec-template.md`,
  `.specify/templates/plan-template.md`,
  `.specify/templates/tasks-template.md` exist.
- [x] AC-2: `docs/spec/README.md` indexes every feature.
- [x] AC-3: A spec exists for every major feature already shipped
  (specs 001–014).
- [x] AC-4: `AGENTS.md` cross-cuts the rules and points to Spec Kit.
- [x] AC-5: `docs/log.md` and `docs/questions.md` exist.
- [x] AC-6: `docs/index.md` links to `.specify/README.md`,
  `docs/spec/README.md`, `docs/log.md`, and `docs/questions.md`.

## 7. Out-of-Scope Considerations

- A bespoke validator script that lints all specs for required
  sections — future enhancement (`scripts/lint-specs.ts`).

## 8. UX Notes

None.

## 9. Data & API Surface

None.

## 10. Plugin / Adapter Impact

None — this is documentation methodology, not a runtime change.

## 11. Risks & Open Questions

- **Risk:** specs going stale. Mitigation: every PR checklist includes
  “Linked spec exists and is up to date”.
- **Open:** automate a spec-coverage report (which packages lack
  specs)? Default: **manual for now, automate later**.

## 12. Acceptance Test Plan

- Manual review.

## 13. References

- Spec Kit: <https://github.com/github/spec-kit>
- Constitution: `.specify/memory/constitution.md`.
