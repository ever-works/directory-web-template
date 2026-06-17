---
id: spec-040-k8s-deploy-runtime-env
title: Spec 040 — k8s deploy provisions Work runtime env
sidebar_label: 040 K8s Deploy Runtime Env
---

# Feature spec — `040-k8s-deploy-runtime-env`

## 1. Summary

Make `deploy_k8s.yaml` materialize a `${WORK_SLUG}-runtime-env` Kubernetes
Secret from the app runtime env the platform pushes on a k8s deploy, and mount
it on the Deployment via `envFrom`. This is the template half of the
platform-side `WorkRuntimeEnvService` (ever-works `DeployService.ensureRuntimeEnv`).

## 2. Motivation

A freshly-built directory site deployed to k8s **500s** at first render —
`[auth] AUTH_SECRET must be set in production` — because the Deployment only
carried `NODE_ENV/PORT/HOSTNAME`. On Vercel these came from project env + the
Neon Marketplace integration; k8s had no equivalent. The platform now pushes
`AUTH_SECRET`/`COOKIE_SECRET`/`COOKIE_SECURE`/`DATABASE_URL` as repo secrets on
a k8s deploy; this wires them into the running container.

## 3. Goals

- Deployed Works boot and serve real pages (not just `/api/health`).
- `NEXT_PUBLIC_APP_URL`/`COOKIE_DOMAIN` derived from the ingress host.
- Graceful when secrets are absent (`optional: true` on the secretRef; the
  provision step skips when nothing is present).

## 4. Approach

- `deploy_k8s.yaml`: new **Provision runtime-env secret** step (after the
  image-pull-secret step) builds `--from-literal` args from the present
  `AUTH_SECRET`/`COOKIE_SECRET`/`COOKIE_SECURE`/`DATABASE_URL` secrets (+
  `NEXT_PUBLIC_APP_URL`/`COOKIE_DOMAIN` from `K8S_INGRESS_HOST`) and
  `kubectl apply`s a `${WORK_SLUG}-runtime-env` Secret.
- `deployment.yaml`: container gains `envFrom: [{ secretRef: { name:
  ${WORK_SLUG}-runtime-env, optional: true } }]` (explicit `env` —
  NODE_ENV/PORT/HOSTNAME — still wins for those keys).

## 5. Acceptance criteria

- A k8s-deployed Work with `AUTH_SECRET` (+ `DATABASE_URL`) provisioned serves
  `/` with HTTP 200.
- No change when the secrets are absent (Secret skipped, `envFrom` optional).

## 6. Status

in-progress — ships with the platform PR (ever-works) that pushes the secrets,
and propagates to the `awesome-*` website repos.
