# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the Ever Works website template (Next.js + pnpm
# monorepo). Produces a small image suitable for Kubernetes deployment via
# the `@ever-works/k8s-plugin`.
#
# Layout:
#   - `deps`     → install all workspace dependencies (with build deps).
#   - `builder`  → run `pnpm --filter @ever-works/web run build` to produce
#                  the Next.js standalone output (apps/web/.next/standalone).
#   - `runner`   → minimal Node runtime that serves the standalone bundle.
#
# Build expectations:
#   * The platform deploy service injects `DATA_REPOSITORY` as a build-arg /
#     env so the prebuild content clone (`apps/web/scripts/clone.cjs`) can
#     fetch the work's data repo while building.
#   * `apps/web/next.config.ts` has `output: 'standalone'`, so this Dockerfile
#     does NOT need the full node_modules at runtime.
#   * Image is published as `<registry>/<owner>/<work-slug>:<sha>` by the
#     accompanying `.github/workflows/deploy_k8s.yaml`.

ARG NODE_VERSION=22-alpine

# Passed in from the workflow as `${{ github.repository }}` (e.g.
# `ever-works/awesome-compliance-automation-website`). The
# `org.opencontainers.image.source` label below tells GHCR to auto-link
# this package to that repo on push, which is what enables per-repo
# fine-grained PAT permissions to actually grant pull access. Without
# the link, a fine-grained PAT can have Repository → Packages: Read on
# the repo and still get 403 from kubelet (the package is treated as a
# top-level org package and falls back to the package's own
# "Manage access" list, which is empty).
ARG GITHUB_REPOSITORY=""
ARG GITHUB_SHA=""

# ---- deps ------------------------------------------------------------------

FROM node:${NODE_VERSION} AS deps
WORKDIR /work
RUN corepack enable
# Required by some native deps on alpine (sharp, bcryptjs, …).
RUN apk add --no-cache libc6-compat

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/docs/package.json ./apps/docs/package.json
COPY apps/web-e2e/package.json ./apps/web-e2e/package.json
COPY packages ./packages

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@ever-works/web..."

# ---- builder ---------------------------------------------------------------

FROM node:${NODE_VERSION} AS builder
WORKDIR /work
RUN corepack enable
RUN apk add --no-cache git

COPY --from=deps /work/node_modules ./node_modules
COPY --from=deps /work/apps/web/node_modules ./apps/web/node_modules

COPY . .

# Optional: pre-fetch the data repo content during build so the Next.js
# build can statically render content pages. The clone script is a no-op
# when DATA_REPOSITORY is unset — in that case the deploy will rely on
# runtime cloning instead.
#
# DATA_REPOSITORY is a URL (no credentials) so it's safe as a build-arg.
# GH_TOKEN is a credential — it's mounted as a BuildKit secret only for
# the duration of the build step that needs it, so it never lands in the
# image, the build cache, or the Buildx export. The build script reads
# the secret from /run/secrets/gh_token at build time.
ARG DATA_REPOSITORY=""
ENV DATA_REPOSITORY=${DATA_REPOSITORY}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Required so apps/web/next.config.ts emits `.next/standalone`, which the
# runner stage copies. Without this the runner COPY fails with:
#   "/work/apps/web/.next/standalone": not found
# Vercel builds leave this unset so they keep their serverless output mode.
ENV STANDALONE_BUILD=true

RUN --mount=type=secret,id=gh_token \
    sh -c 'if [ -s /run/secrets/gh_token ]; then export GH_TOKEN=$(cat /run/secrets/gh_token); fi; \
           pnpm --filter @ever-works/web run build'

# ---- runner ----------------------------------------------------------------

FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# Re-declare for this stage (ARGs scope to the FROM that introduced them).
ARG GITHUB_REPOSITORY=""
ARG GITHUB_SHA=""

# OCI image labels — `image.source` is the magic one: GHCR sees this on
# push and auto-links the package to the repo URL it points at, which
# is what makes fine-grained PAT Repository → Packages permissions
# actually grant pull access for kubelet. Without the link, the package
# is treated as a top-level org-owned package and falls back to its own
# Manage Access list.
LABEL org.opencontainers.image.source="https://github.com/${GITHUB_REPOSITORY}"
LABEL org.opencontainers.image.revision="${GITHUB_SHA}"
LABEL org.opencontainers.image.title="${GITHUB_REPOSITORY}"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Standalone output places everything in apps/web/.next/standalone with
# the runtime's flat structure. Static assets and public/ need to be
# placed alongside the server.js entry point.
COPY --from=builder --chown=nextjs:nodejs /work/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /work/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /work/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

# server.js is the entry point produced by `next build` with output:'standalone'.
CMD ["node", "apps/web/server.js"]
