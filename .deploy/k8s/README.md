# Standalone Kubernetes deployment

These manifests deploy this template to a Kubernetes cluster **without the Ever Works platform** — straight from a clone of the template repo. Use them if you've forked the repo, want to host the site yourself, and don't want or need the SaaS plumbing.

> **Heads-up.** A separate folder, [`.deploy/k8s-platform/`](../k8s-platform/README.md), holds the manifests the Ever Works SaaS platform applies via its own deploy workflow. Those use `${VAR}` placeholders that the platform substitutes at deploy time. The files here are the manual, self-contained equivalent.

## What you get

- `namespace.yaml` — a dedicated namespace (`ever-works`) for the workloads.
- `deployment.yaml` — the Next.js standalone container (`output: 'standalone'`) with rolling updates, probes, and resource limits.
- `service.yaml` — `ClusterIP` Service on port 80 → containerPort 3000.
- `ingress.yaml` — example Ingress with cert-manager / nginx annotations. Edit the host and TLS issuer for your cluster.
- `kustomization.yaml` — convenience wrapper so you can `kubectl apply -k .deploy/k8s`.

## Prerequisites

1. A Kubernetes cluster (kind / k3s / EKS / GKE / AKS / on-prem — anything ≥ 1.27).
2. `kubectl` configured to talk to that cluster.
3. A built and pushed container image of this repo. There's a `Dockerfile` at the repo root; build and push with whatever registry you use:

   ```bash
   # Replace ghcr.io/your-user with your registry / owner
   docker build -t ghcr.io/your-user/my-site:v1 .
   docker push ghcr.io/your-user/my-site:v1
   ```

4. *(Optional)* An Ingress controller installed in the cluster (ingress-nginx is what the example annotations target).
5. *(Optional)* `cert-manager` with a `ClusterIssuer` if you want automatic TLS.

## Quick start

1. Edit [`deployment.yaml`](deployment.yaml) — replace `IMAGE_PLACEHOLDER` with the image tag you pushed.
2. *(Optional)* Edit [`ingress.yaml`](ingress.yaml) — replace `example.com` with your domain and `letsencrypt-prod` with your cert-manager `ClusterIssuer` name (or remove the TLS section + `cert-manager.io/cluster-issuer` annotation if you're not using cert-manager).
3. Apply everything:

   ```bash
   kubectl apply -k .deploy/k8s
   ```

4. Watch the rollout:

   ```bash
   kubectl -n ever-works rollout status deployment/web
   ```

5. Once the Deployment is `Available`, point your DNS at the cluster's ingress load balancer:

   ```bash
   kubectl -n ever-works get ingress web
   ```

## Pulling private images

If your registry is private, create a `docker-registry` Secret in the namespace and uncomment the `imagePullSecrets` block in `deployment.yaml`:

```bash
kubectl -n ever-works create secret docker-registry regcred \
    --docker-server=ghcr.io \
    --docker-username=YOUR_USER \
    --docker-password=YOUR_TOKEN
```

## Customising

Everything here is plain YAML — fork it, edit it, commit it. Common tweaks:

| What | Where |
| ---- | ----- |
| Replicas | `deployment.yaml` → `spec.replicas` |
| Resources | `deployment.yaml` → `containers[0].resources` |
| Ingress class | `ingress.yaml` → `spec.ingressClassName` |
| Domain | `ingress.yaml` → `spec.rules[0].host` and `spec.tls[0].hosts` |
| Environment vars | `deployment.yaml` → add to `containers[0].env` |
| Namespace | `namespace.yaml` + `kustomization.yaml.namespace` |

## Differences from `.deploy/k8s-platform/`

| | This folder (`.deploy/k8s/`) | Platform folder (`.deploy/k8s-platform/`) |
| - | --- | --- |
| Audience | Manual users / self-hosters | Ever Works SaaS platform |
| Image tag | Hard-coded by you | Substituted by the deploy workflow |
| Apply | `kubectl apply -k .deploy/k8s` | `.github/workflows/deploy_k8s.yaml` |
| Placeholders | None | `${WORK_SLUG}`, `${IMAGE}`, `${NAMESPACE}`, etc. |
| Customisation | Edit the YAML | Set platform plugin settings |

If you start with this folder and later want to onboard onto the SaaS platform, the platform-applied resources will sit alongside (or replace, by name + namespace) your manual ones. There's no automatic migration — clean up your manual deploy first if you're switching.
