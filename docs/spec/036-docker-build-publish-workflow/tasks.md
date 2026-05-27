---
id: spec-036-docker-build-publish-workflow-tasks
title: Spec 036 Tasks — Docker Build and Publish Workflow
sidebar_label: 036 Tasks
---

# Tasks — `036-docker-build-publish-workflow`

- [x] T1: Inspect the sibling `../ever-works` Docker publish workflows and
  identify registry/tag conventions.
- [x] T2: Rewrite the root `Dockerfile` to use the sibling monorepo
  Turbo-prune build pattern for `@ever-works/web`.
- [x] T2a: Allow `STANDALONE_BUILD` through Turbo so Docker builds emit
  `.next/standalone`.
- [x] T3: Add template-specific dev, stage, and prod Docker build and publish
  workflows that use the root `Dockerfile`.
- [x] T4: Document workflow triggers, image names, tags, and optional registry
  secrets in the Docker deployment guide.
- [x] T5: Add Spec Kit records and update the spec index.
- [x] T6: Append a `docs/log.md` entry.
- [x] T7: Run static verification (`git diff --check`).
