---
id: spec-038-k8s-deploy-probes
title: Spec 038 — Kubernetes Deploy Health Probes
sidebar_label: 038 K8s Deploy Probes
---

# Feature spec — `038-k8s-deploy-probes`

## 1. Summary

Harden the Kubernetes deploy manifest template
(`.deploy/k8s-platform/deployment.yaml`) so that a deployed Work's pod is
not crash-looped by overly aggressive default health-probe timeouts. Add an
explicit `startupProbe` and set `timeoutSeconds` / `failureThreshold` on the
`readinessProbe` and `livenessProbe`.

## 2. Motivation

The template's `readinessProbe` and `livenessProbe` both `httpGet` `/` with
no `timeoutSeconds`, so each inherits Kubernetes' **1-second default**. A
server-rendered `/` on a small shared node routinely takes longer than one
second to respond (cold start, data fetch, memory pressure). The liveness
probe therefore fails its default 3 attempts and kubelet kills the
container — permanently, on a loop.

This is not hypothetical: the first Work deployed to `k8s-works`
(`awesome-compliance-automation-website`, served at
`compliance-automation.ever.works`) accumulated **460+ restarts** over ~4
days with `Exit Code: 143` (SIGTERM from a failed liveness probe) and events
`Liveness probe failed: ... context deadline exceeded` — never an OOM. As we
migrate more Works to Kubernetes via the deploy plugin, every one of them
would hit the same trap because each Work repo carries its own copy of this
template (there is no template-sync step).

## 3. Goals

- A freshly deployed Work becomes `Ready` and stays `Running` without
  liveness-induced restarts, even when first paint on `/` is slow.
- Slow cold starts are tolerated by a dedicated `startupProbe` rather than by
  inflating `initialDelaySeconds`.
- Probe behaviour is explicit (no reliance on Kubernetes defaults for
  `timeoutSeconds` / `failureThreshold`).

## 4. Non-goals

- No change to application code, the Docker image, or the rendered
  `Service` / `Ingress`.
- No change to CPU/memory requests or limits (tracked separately under
  cluster capacity work).
- Does not introduce a dedicated `/healthz` endpoint; probes continue to use
  `/` (a follow-up may add a lightweight health route).

## 5. Approach

In `.deploy/k8s-platform/deployment.yaml`, the single container `app`:

- **Add `startupProbe`** — `httpGet /`, `periodSeconds: 10`,
  `timeoutSeconds: 5`, `failureThreshold: 30` (≈5 min budget for first
  successful response before liveness/readiness apply).
- **`readinessProbe`** — `httpGet /`, `periodSeconds: 10`,
  `timeoutSeconds: 5`, `failureThreshold: 3`.
- **`livenessProbe`** — `httpGet /`, `periodSeconds: 15`,
  `timeoutSeconds: 5`, `failureThreshold: 6` (≈90 s of sustained
  unresponsiveness before a restart).

`initialDelaySeconds` is dropped from readiness/liveness because the
`startupProbe` now gates them.

## 6. Acceptance criteria

- `deploy_k8s.yaml` renders a Deployment whose container defines all three
  probes with the values above.
- A deployed Work reaches `1/1 Running` and does not restart due to
  `Liveness probe failed` under normal slow-SSR conditions.
- The fix is propagated to existing per-repo copies in the `awesome-*`
  website repos (tracked in the migration runbook, not this template PR).

## 7. Status

in-progress — template fix authored; propagation to existing Work repos and
redeploy verification tracked alongside the Vercel→k8s migration.
