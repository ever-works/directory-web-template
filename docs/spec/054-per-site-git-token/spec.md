---
id: spec-054-per-site-git-token
title: Spec 054 — Per-site git token (platform broker)
sidebar_label: 054 Per-site git token
---

# Feature spec — `054-per-site-git-token`

## 1. Summary

A deployed site reads and writes its data repository (`DATA_REPOSITORY`) with
a short-lived GitHub token scoped to **that one repository**, fetched from the
Ever Works platform, instead of a long-lived `GH_TOKEN`. When the platform sets
`EVER_WORKS_SITE_GIT_TOKEN_URL` and `EVER_WORKS_SITE_GIT_TOKEN_SECRET`, every
git call (clone, pull, push; items, categories, tags, collections, `works.yml`,
the build-time clone) asks `lib/git/site-git-token.ts` for the token. Without
those two variables nothing changes: the site uses `GH_TOKEN` as before.

## 2. Motivation

Security audit 2026-11-07 found the site pods holding the site owner's OAuth
token (`repo`, `workflow`, `delete_repo`). The first fix (Ever Works
`ever-co/ever-works#3109`) switched sites to one platform token per GitHub org,
but such a token reaches **every** data repo in the org: one compromised site
could rewrite every other site's data, and in `ever-works-cloud` (one repo per
customer) that is cross-tenant. A token that the platform mints per site, per
hour, for one repository closes both problems, and covers new sites with no
manual token edits.

## 3. Behaviour

- **Broker on** (both variables set): `POST $EVER_WORKS_SITE_GIT_TOKEN_URL` with
  `Authorization: Bearer $EVER_WORKS_SITE_GIT_TOKEN_SECRET` returns
  `{ token, expiresAt, repository }`. The token is cached in memory and refreshed
  five minutes before `expiresAt`. Concurrent callers share one request.
- **Broker failure**: a cached token that has not expired yet is used; else
  `GH_TOKEN` (the platform sets it to a first one-repo token at deploy). After a
  failure the broker is not called again for 30 seconds, except on a 401 from
  GitHub.
- **GitHub says 401**: isomorphic-git's `onAuthFailure` forces one broker refresh
  and retries only with a different token, so a revoked token cannot loop.
- **No token at all**: `onAuth` answers nothing (no pointless retry); the gates
  that used to test `GH_TOKEN` now test `hasSiteGitCredentials()`, which is true
  for the broker alone, so a site whose bootstrap token is missing still starts.
- `scripts/clone.cjs` (build) fetches one broker token, else uses `GH_TOKEN`.
- `deploy_vercel.yaml` copies the two broker secrets into the Vercel project env
  when the platform pushed them. `deploy_k8s.yaml` already forwards every repo
  secret into the runtime-env Secret.
- Nothing logs the secret or a token.

## 4. Out of scope

The platform side (minting, the per-site secret, which repo a site may get) is
`ever-co/ever-works` `docs/runbooks/WORK_RUNTIME_ENV.md`, section "Per-site git
tokens (the broker)".

## 5. Acceptance

- Unit: `apps/web/lib/git/__tests__/site-git-token.spec.ts` (`pnpm --filter
@ever-works/web test:unit`).
- A site deployed with the broker on serves content, and the platform API log
  shows `site git token issued for <org>/<slug>-data` about every 40 minutes.
