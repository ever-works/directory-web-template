---
id: tasks-054-per-site-git-token
title: Tasks 054 — Per-site git token (platform broker)
sidebar_label: 054 Tasks
---

# Tasks — `054-per-site-git-token`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

## Task list

- [x] T-001: `lib/git/site-git-token.ts` resolver (broker, cache, backoff,
      fallback) and `siteGitAuthCallbacks` (one refresh per operation,
      github.com only), with unit tests.
- [x] T-002: route every isomorphic-git call through it (item / category /
      collection / tag services, `repository.ts`, `config-manager.ts`).
- [x] T-003: `GH_TOKEN` gates use `hasSiteGitCredentials()`.
- [x] T-004: `scripts/site-git-token.cjs` + `clone.cjs`, with unit tests.
- [x] T-005: `deploy_vercel.yaml` reconciles the broker variables; Docker
      builds pass them as BuildKit secrets.
- [ ] T-006: after the platform turns the broker on, confirm a deployed site
      logs no `[site-git-token] broker refresh failed` and its data repo syncs
      for more than an hour (rollout, platform side).
