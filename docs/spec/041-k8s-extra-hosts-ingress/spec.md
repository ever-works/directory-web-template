---
id: spec-041-k8s-extra-hosts-ingress
title: Spec 041 — deploy_k8s.yaml multi-host Ingress (K8S_EXTRA_HOSTS)
sidebar_label: 041 K8s Extra Hosts Ingress
---

# Feature spec — `041-k8s-extra-hosts-ingress`

## 1. Summary

Make `deploy_k8s.yaml` render **one `spec.rules` entry and one `spec.tls`
block per host** instead of only the single primary `K8S_INGRESS_HOST`. The
extra hosts come from a new `K8S_EXTRA_HOSTS` repo secret the platform pushes
on every k8s deploy. This is the directory-web-template half of EW-741
(custom-domain reconciliation in the ever-works monorepo
`DeployService.applyEverWorksSubdomain` / `DeployFacadeService.addDomain`).

## 2. Motivation

EW-741 made the API push `K8S_EXTRA_HOSTS` as a deploy-time GitHub Actions
secret holding a comma-separated, lowercased, deduped list of
`WorkCustomDomain` rows for the Work — but `deploy_k8s.yaml` was still only
emitting a single Ingress rule for `K8S_INGRESS_HOST` (the primary managed
`*.ever.works` subdomain). The custom-domain rows therefore never made it
onto the cluster — adding `mydir.com` in the Deploy tab had no observable
effect after redeploy.

## 3. Goals

- Managed subdomain stays the primary, always-present host (matches the spec
  in `ever-works/ever-works docs/specs/features/cloudflare-dns-plugin/spec.md`
  §4.5 — "Managed subdomain = primary/default (persisted, always present)").
- Every entry in `K8S_EXTRA_HOSTS` becomes an additional Ingress rule on the
  same Service.
- Each host gets its own TLS block so cert-manager issues a separate
  certificate per host. We can't mix hosts into one TLS block because
  customer-supplied custom domains share no wildcard with `*.ever.works`.
- Order preserved: primary first, then extras in the order the platform
  pushed them.
- Defensive lowercase + dedupe in the workflow so a duplicated entry between
  `K8S_INGRESS_HOST` and `K8S_EXTRA_HOSTS` doesn't render two identical
  rules (kubectl would reject that with `[0].host == [1].host`).
- Backwards-compatible — when `K8S_EXTRA_HOSTS` is empty / unset the rendered
  Ingress is bit-for-bit identical to the pre-EW-741 single-host output.

### Non-goals

- Generating wildcard certs.
- DNS automation for the extra hosts. The platform's BYO Cloudflare plugin
  path (`DeployFacadeService.addDomain` calling `ensureRecord`) covers that
  on the API side. The workflow only renders the Ingress; cert-manager + the
  upstream DNS (whoever runs it) is what makes the host resolve and serve
  TLS.

## 4. Approach

`deploy_k8s.yaml`, "Render and apply manifests" step:

- New job-level env entry: `EXTRA_HOSTS: ${{ secrets.K8S_EXTRA_HOSTS }}`.
- A small `add_host` shell helper trims+lowercases each candidate and
  appends to a `HOSTS=()` array, skipping anything already in a `seen` set.
- Primary host (`K8S_INGRESS_HOST`) is added first; the comma-split
  `EXTRA_HOSTS` value is added next.
- The `spec.rules` emission loops `${HOSTS[@]}`. Each rule routes to the
  same `${WORK_SLUG}` Service on port 80.
- The `spec.tls` emission (gated on `TLS_ISSUER`) loops `${HOSTS[@]}`,
  computing the per-host `secretName` from the same
  `tr -c 'a-z0-9' '-' | sed …` collapse the original single-host path used,
  so existing managed-subdomain TLS secrets keep their name and cert-manager
  doesn't re-issue.
- The "Deployment summary" step echoes the primary URL plus one `Also
serving https://…` line per extra host so the Actions run log makes the
  reconciled list discoverable.

No change to `.deploy/k8s/ingress.yaml` (the standalone user-facing
example — single-host is fine there).

## 5. Acceptance

- Re-deploy a Work that has 0 custom domains: rendered Ingress is byte-
  identical to pre-EW-741 output (1 rule, 1 TLS block).
- Re-deploy a Work after adding a custom domain via the Deploy tab: the
  next k8s deploy produces an Ingress with 2 rules (managed + custom) and 2
  TLS blocks. cert-manager begins the HTTP-01 / DNS-01 challenge for the new
  host; the existing managed host's cert is untouched.
- Re-deploy after removing a custom domain: the rule + TLS entry for that
  host disappear; the orphan TLS secret is left in the namespace (cluster-
  side GC is out of scope for this spec).
- Workflow log line "Ingress hosts (N): host1 host2 …" appears for every
  multi-host deploy.

## 6. Open questions

- Should we eagerly delete the orphan `<host>-tls` Secret when a host is
  removed from `K8S_EXTRA_HOSTS`? Currently no — keeps the workflow purely
  additive and avoids an accidental wipe if the platform briefly pushes an
  empty value (e.g. transient failure to query `WorkCustomDomain`). Logged
  in `docs/questions.md` for follow-up.

## 7. Related

- ever-works monorepo PR #1322 (EW-734 epic + EW-741 custom-domain
  reconciliation — platform side).
- `docs/spec/040-k8s-deploy-runtime-env/spec.md` — the previous
  `deploy_k8s.yaml` extension that introduced the per-Work secret-
  provisioning pattern.
