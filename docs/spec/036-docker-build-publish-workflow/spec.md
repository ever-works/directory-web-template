---
id: spec-036-docker-build-publish-workflow
title: Spec 036 — Docker Build and Publish Workflow
sidebar_label: 036 Docker Build Publish
---

# Feature spec — `036-docker-build-publish-workflow`

## 1. Summary

Add branch-specific GitHub Actions workflows that build the existing
standalone Next.js Docker image and publish it to container registries on
`develop`, `stage`, and `main`.

## 2. Motivation

Template maintainers and generated-work owners need a registry-only Docker
publish path that matches the broader Ever Works repository convention without
also deploying to Kubernetes. The sibling `../ever-works` repo already ships
branch-specific Docker publish workflows for GHCR, Docker Hub, and DigitalOcean
Container Registry; this template needs the same capability against its single
root `Dockerfile`.

## 3. Goals

- Publish Docker images automatically from separate dev, stage, and prod
  workflows on pushes to `develop`, `stage`, and `main`.
- Always publish to GHCR using the workflow `GITHUB_TOKEN`.
- Optionally publish the same image to Docker Hub and DigitalOcean Container
  Registry when their secrets are configured.
- Preserve the Dockerfile's GHCR source/revision labels and BuildKit secret
  handling for `GH_TOKEN`.
- Document required secrets and branch-to-image naming.

## 4. Non-Goals

- No deployment rollout or Kubernetes manifest changes.
- No changes to the Dockerfile build stages.
- No new application runtime behaviour.

## 5. User Stories

```text
As a template maintainer, I want branch pushes to publish Docker images, so
that downstream environments can deploy an already-built image.
```

```text
As an operator, I want optional Docker Hub and DigitalOcean pushes, so that I
can use the registry my cluster or hosting provider already pulls from.
```

## 6. Acceptance Criteria

- [x] AC-1: Branch-specific GitHub Actions workflows exist for Docker build
  and publish.
- [x] AC-2: The workflow triggers on `develop`, `stage`, `main`, and manual
  dispatch.
- [x] AC-3: GHCR is always configured as the primary registry.
- [x] AC-4: Docker Hub and DigitalOcean tags are included only when their
  credentials are present.
- [x] AC-5: Docker docs describe image names, tags, and secrets.

## 7. Out-of-Scope Considerations

- Multi-architecture images are deferred until there is a runtime consumer that
  needs `linux/arm64`.
- Registry-specific retention and cleanup policies remain outside this repo.

## 8. UX Notes

Not applicable; this is a CI/CD workflow only.

## 9. Data & API Surface

No data model or API changes.

## 10. Plugin / Adapter Impact

No plugin or adapter impact. This is repository infrastructure.

## 11. Risks & Open Questions

- Risk: Docker builds need the same content-repository credentials as the
  existing Kubernetes deploy workflow when static content is fetched at build
  time.
- Open questions: none. The chosen default is GHCR-first with optional
  secondary registries.

## 12. Acceptance Test Plan

Static verification covers workflow syntax and changed-file review. The live
acceptance test is a manual `workflow_dispatch` or branch push in GitHub
Actions, because publishing requires registry credentials not available in the
local workspace.

## 13. References

- Constitution articles invoked: III, IV, V, VIII.
- Related workflow: `.github/workflows/deploy_k8s.yaml`.
- Prior art: `../ever-works/.github/workflows/docker-build-publish-*.yml`.
