# syntax=docker/dockerfile:1.7
# Ever Works directory-web-template — Docusaurus documentation site (apps/docs = @ever-works/docs).
# Serves docs.demo.ever.works. Mirrors the repo's OWN root Dockerfile (turbo prune) + the ever-works
# docs build. Docs content lives in the repo-root docs/ (Docusaurus `path: ../../docs`).
#   docker build -f apps/docs/Dockerfile -t ghcr.io/ever-works/directory-web-template-docs .

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.31.0
ARG TURBO_VERSION=2.9.14

# ---- base ------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
RUN corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate && \
    npm install -g turbo@${TURBO_VERSION}
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

# ---- pruner: isolate the docs workspace + its deps -------------------------
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @ever-works/docs --docker

# ---- builder: install deps + build the static site ------------------------
FROM base AS builder
WORKDIR /app
# NB: do NOT set NODE_ENV=production for the install — Docusaurus build tooling
# lives in devDependencies. NODE_OPTIONS raises the heap for the multi-locale build.
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN apk add --no-cache git libc6-compat python3 make g++ pkgconfig

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Internal Verdaccio cache override (fork-safe; empty => public npm), same as the root image.
ARG VERDACCIO_REGISTRY=""
RUN if [ -n "$VERDACCIO_REGISTRY" ]; then \
        echo "registry=${VERDACCIO_REGISTRY}" >> /app/.npmrc && \
        { sed -i "s|https://registry.npmjs.org|${VERDACCIO_REGISTRY%/}|g" /app/pnpm-lock.yaml 2>/dev/null || true; }; \
    fi

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
# Docusaurus reads content from ../../docs (the repo-root docs/); turbo prune omits
# non-workspace dirs, so copy it in explicitly (resolves to /app/docs -> apps/docs/../../docs).
COPY docs/ ./docs/

# English-only build. The full multi-locale SSG (build) renders every locale (en/es/fr/pt/…)
# of the large API docs, which on the ARC RAM-disk runner runs for ~2h and then dies with
# ENOSPC. `build:en` (docusaurus build --locale en) is a fraction of the size/time and fits.
# TODO: re-enable full-locale once the docs image builds on a disk-backed runner.
RUN pnpm --filter @ever-works/docs build:en

# ---- runtime: nginx serving the static build ------------------------------
FROM nginx:1.27-alpine
COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/apps/docs/build /usr/share/nginx/html
EXPOSE 80
