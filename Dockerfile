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
ARG DATA_REPOSITORY=""
ARG GH_TOKEN=""
ENV DATA_REPOSITORY=${DATA_REPOSITORY}
ENV GH_TOKEN=${GH_TOKEN}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN pnpm --filter @ever-works/web run build

# ---- runner ----------------------------------------------------------------

FROM node:${NODE_VERSION} AS runner
WORKDIR /app

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
