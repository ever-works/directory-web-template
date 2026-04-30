---
id: spec-template
title: Spec Template
sidebar_label: Spec Template
---

<!--
Copy this file to `docs/spec/NNN-feature-slug/spec.md` and fill in every section.
The spec is the *what* and *why* — implementation details belong in `plan.md`.
-->

# Feature spec — `<NNN-feature-slug>`

## 1. Summary

One paragraph describing the feature in plain English. A user reading this
should immediately understand what they will gain.

## 2. Motivation

- Why does this feature need to exist?
- What problem does it solve?
- Who is the primary user (admin, end-user, fork maintainer, plugin author)?
- Link to related GitHub issues, discussions, customer requests.

## 3. Goals

- Bulleted list of explicit, testable goals.
- Each goal should map to one or more acceptance criteria below.

## 4. Non-Goals

- Bulleted list of things this spec **explicitly does not cover**, to keep
  scope honest. Things that might be follow-ups go here.

## 5. User Stories

```text
As a <persona>, I want <capability>, so that <benefit>.
```

Provide at least one story per persona that is materially affected.

## 6. Acceptance Criteria

A numbered checklist that the implementation must satisfy. Each item should
be objectively verifiable (e.g. by an e2e test, a unit test, a screenshot, or
a manual reproduction recipe).

- [ ] AC-1: …
- [ ] AC-2: …
- [ ] AC-3: …

## 7. Out-of-Scope Considerations

Things that should be considered later, in a separate spec, with a brief note
of why they are deferred.

## 8. UX Notes (if applicable)

- Wireframes / sketches / Figma links.
- Accessibility requirements (WCAG criteria, keyboard nav, screen-reader
  expectations).
- Localisation impact (new strings, RTL handling).

## 9. Data & API Surface (if applicable)

- New tables / columns (link to Drizzle schema files).
- New REST / RPC endpoints with method, path, request/response shape.
- New events emitted on the analytics or event bus.

## 10. Plugin / Adapter Impact

- Does this feature ship as a plugin? Which package?
- Does it introduce a new adapter interface or extend an existing one?
- Which extension points / slots does it use or add?

## 11. Risks & Open Questions

- Risks: anything that could derail or invalidate this spec.
- Open questions: copy these to [`docs/questions.md`](../../docs/questions.md)
  with a chosen default to proceed without blocking.

## 12. Acceptance Test Plan

How will we know this is done? Reference the e2e specs that will be added or
updated under `apps/web-e2e/tests/<area>/`.

## 13. References

- Constitution articles invoked: I, II, …
- Related specs: …
- External documentation: …
