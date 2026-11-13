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
git call (clone, pull, push; items, categories, tags, collections, `works.yml`)
asks `lib/git/site-git-token.ts` for the token, and the build-time clone asks its
CommonJS twin `scripts/site-git-token.cjs`. Without
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

- **Broker on** (both variables set, and the URL is `https:`, or `http:` on
  `localhost` / `127.0.0.1` only; any other URL counts as unset, so the site keeps
  `GH_TOKEN` and never sends its secret in clear text): `POST $EVER_WORKS_SITE_GIT_TOKEN_URL` with
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
- `scripts/clone.cjs` (build) fetches one broker token through `scripts/site-git-token.cjs`, else uses `GH_TOKEN`,
  and hands it only to `https://github.com` (the same `isGitHubRemote` rule as the runtime callbacks, checked on the
  remote isomorphic-git calls): an `http://` or non-GitHub `DATA_REPOSITORY` is cloned without it.
- `deploy_vercel.yaml` copies the two broker secrets into the Vercel project env
  when the platform pushed them, removing the old value first (`vercel env add`
  refuses an existing name, which used to freeze a project's first `GH_TOKEN`).
  It rewrites `GH_TOKEN` the same way when the job has one; a job without a
  `GH_TOKEN` secret leaves the project's `GH_TOKEN` as it is and the deploy goes on.
  `deploy_k8s.yaml` already forwards every repo secret into the runtime-env
  Secret.
- Docker builds (`deploy_k8s.yaml`, `docker-build-publish-*.yml`, `Dockerfile`)
  pass the broker URL and secret as BuildKit secrets next to `gh_token`, so a
  build long after the last deploy still clones with a fresh token. Secrets are
  not part of BuildKit's cache key: a rebuild with the same pruned source and
  `DATA_REPOSITORY` and a warm cache reuses that step (no broker call, the earlier
  clone's prerendered pages), as it did with `gh_token` alone. The running site
  still syncs its data repo itself (`lib/repository.ts`, runtime token) and ISR
  re-renders the pages. `k8s-build.yml`, which builds the deployed images, passes
  neither `DATA_REPOSITORY` nor these secrets, so its builds clone nothing.
- `onAuthFailure` refreshes at most once per git operation, reuses a newer cached
  token when another request already refreshed, never settles for an in-flight
  answer GitHub just rejected, and neither callback answers for a remote that is
  not `https://github.com` (`isGitHubRemote`: `https:`, host exactly `github.com`,
  no port other than 443, no credentials in the URL; `github.com.evil.com` and
  `github.com@evil.com` are refused).
- Nothing logs the secret or a token.

## 4. Out of scope

The platform side (minting, the per-site secret, which repo a site may get) is
`ever-co/ever-works` `docs/runbooks/WORK_RUNTIME_ENV.md`, section "Per-site git
tokens (the broker)".

## 5. Acceptance

- Unit: `apps/web/lib/git/__tests__/site-git-token.spec.ts` and
  `apps/web/scripts/site-git-token.spec.ts` (`pnpm --filter @ever-works/web test:unit`).
- A site deployed with the broker on serves content, and the platform API log
  shows `site git token issued for <org>/<slug>-data` about once an hour per site process (a ~1h token refreshed 5 minutes before expiry).
