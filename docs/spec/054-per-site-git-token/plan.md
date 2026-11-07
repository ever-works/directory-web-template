---
id: plan-054-per-site-git-token
title: Plan 054 — Per-site git token (platform broker)
sidebar_label: 054 Plan
---

# Plan — `054-per-site-git-token`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

One resolver module, `apps/web/lib/git/site-git-token.ts`, owns the data-repo
credential. Every isomorphic-git network call gets its `onAuth` /
`onAuthFailure` from `siteGitAuthCallbacks(staticToken)`, so the token is
resolved when GitHub asks for it (a long-running process always presents a
current one) instead of being captured once at service init. The build-time
clone (`scripts/clone.cjs`, CommonJS) uses the twin `scripts/site-git-token.cjs`.

## Why a pull from the platform, not a mounted Secret

A tenant-namespace CronJob rewriting a mounted Secret would need its own
credential, RBAC to write the Secret, and k8s-only plumbing; it would not cover
Vercel or the GitHub Actions builds. Asking the platform with a per-site secret
works the same on every host and for builds.

## Constraints kept

- No new dependency; Node `fetch` only.
- Without the two broker variables, every path behaves exactly as before.
- No secret or token in logs, image layers or build records (BuildKit secrets).
- Plugin-first / no-removal: nothing removed; `GH_TOKEN` stays the fallback.
