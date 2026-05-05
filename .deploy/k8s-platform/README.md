# Kubernetes manifests

This directory contains the Kubernetes manifests applied by
[`.github/workflows/deploy_k8s.yaml`](../.github/workflows/deploy_k8s.yaml)
when a work targets the [`@ever-works/k8s-plugin`](https://github.com/ever-works/ever-works/tree/develop/packages/plugins/k8s).

The manifests use plain `${VAR}` placeholders that the workflow substitutes
with `envsubst` before piping into `kubectl apply`. This avoids a Helm/
Kustomize dependency on the runner — the workflow is the only consumer.

## Files

| File              | Always applied? | Notes                                                           |
| ----------------- | --------------- | --------------------------------------------------------------- |
| `deployment.yaml` | yes             | Single Deployment, ports 3000 → 80, rolling update, probes.     |
| `service.yaml`    | yes             | ClusterIP service. External access requires an Ingress.         |
| `ingress.yaml`    | only when `K8S_INGRESS_HOST` is set | networking.k8s.io/v1; nginx/traefik/generic strategies. |
| `pull-secret.yaml`| only for private registries (Docker Hub, generic) | dockerconfigjson Secret. |

## Variables substituted by the workflow

| Variable                | Source                        |
| ----------------------- | ----------------------------- |
| `${IMAGE}`              | `docker/build-push-action` output (`<registry>/<owner>/<repo>:<sha>`) |
| `${WORK_SLUG}`          | `${{ github.event.repository.name }}` |
| `${WORK_ID}`            | `${{ secrets.TENANT_ID }}`    |
| `${NAMESPACE}`          | `${{ secrets.K8S_NAMESPACE }}` (defaults to `ever-works`) |
| `${REPLICAS}`           | `${{ secrets.K8S_REPLICAS }}` (defaults to `1`) |
| `${INGRESS_HOST}`       | `${{ secrets.K8S_INGRESS_HOST }}` |
| `${INGRESS_CLASS}`      | `${{ secrets.K8S_INGRESS_CLASS }}` |
| `${TLS_ISSUER}`         | `${{ secrets.K8S_TLS_ISSUER }}` |
| `${PULL_SECRET_NAME}`   | computed: `${WORK_SLUG}-pull` |

## Labels

All resources carry these labels (matching what `@ever-works/k8s-plugin`
itself emits, so the platform's deploy facade can list / lookup managed
deployments):

```yaml
ever-works.io/managed: "true"
ever-works.io/work-id: "${WORK_ID}"
app.kubernetes.io/name: "${WORK_SLUG}"
app.kubernetes.io/managed-by: ever-works-k8s-plugin
```

The `app.kubernetes.io/managed-by` value matches the SSA field manager
used by the plugin so server-side apply conflicts behave consistently.
