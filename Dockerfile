# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=26-alpine
ARG PNPM_VERSION=10.31.0
ARG COREPACK_VERSION=0.36.0
ARG TURBO_VERSION=2.9.14

# ---- base ------------------------------------------------------------------

FROM node:${NODE_VERSION} AS base
# Node.js 25+ no longer bundles corepack, so the node:26 images ship without it. Install a
# pinned corepack from npm first; everything after it is unchanged.
ARG COREPACK_VERSION
RUN npm install -g corepack@${COREPACK_VERSION} && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate && \
    npm install -g turbo@${TURBO_VERSION}

ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

# ---- pruner ----------------------------------------------------------------

FROM base AS pruner
WORKDIR /app

COPY . .

RUN turbo prune @ever-works/web --docker

# ---- installer / builder ---------------------------------------------------

FROM base AS installer
WORKDIR /app

ENV NODE_ENV=build
ENV STANDALONE_BUILD=true
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN apk add --no-cache git libc6-compat python3 make g++ pkgconfig

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Configure the npm registry: prefer the internal Verdaccio cache (VERDACCIO_REGISTRY
# build-arg, anonymous) so CI installs pull through our in-cluster mirror instead of
# public npm. Empty (e.g. a fork, or any build that doesn't set it) → public npm,
# leaving existing behavior unchanged. The pnpm-lock.yaml rewrite is best-effort
# (non-fatal): a path mismatch degrades to public downloads rather than breaking the
# build, and pnpm still verifies integrity hashes, so Verdaccio (a transparent proxy)
# resolves to byte-identical tarballs.
# A bounded reachability probe (busybox wget against Verdaccio's /-/ping) guards the
# redirect (wget -T 3 caps network ops, the outer busybox timeout 5 caps total
# runtime): if the cache is down or unreachable from this builder, warn and keep
# the public registry (i.e. simply don't write the registry line / rewrite the
# lockfile) instead of letting a Verdaccio outage fail every image build.
ARG VERDACCIO_REGISTRY=""
RUN if [ -n "$VERDACCIO_REGISTRY" ]; then \
        if timeout 5 wget -q -T 3 -O /dev/null "${VERDACCIO_REGISTRY%/}/-/ping"; then \
            echo "registry=${VERDACCIO_REGISTRY}" >> /app/.npmrc && \
            { sed -i "s|https://registry.npmjs.org|${VERDACCIO_REGISTRY%/}|g" /app/pnpm-lock.yaml 2>/dev/null || true; }; \
        else \
            echo "WARNING: Verdaccio registry ${VERDACCIO_REGISTRY} unreachable within 3s; falling back to the public npm registry" >&2; \
        fi; \
    fi

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

ARG DATA_REPOSITORY=""
ENV DATA_REPOSITORY=${DATA_REPOSITORY}

# Optional public canonical origin of THIS site (apps/web/lib/utils/url-cleaner.ts
# getCanonicalOrigin), e.g. a brand domain when the same deployment also answers
# on a platform host. Every URL the site publishes (canonical, hreflang, og:url,
# sitemap, robots, feeds, JSON-LD) then names it; functional round trips keep
# NEXT_PUBLIC_APP_URL. `next build` inlines NEXT_PUBLIC_* values, so it has to be
# a build-arg. It names no host here: .github/workflows/k8s-build.yml passes the
# repository's own SITE_CANONICAL_URL Actions variable. Empty = not pinned, and
# it is then UNSET for the build so nothing (not even '') gets inlined.
ARG NEXT_PUBLIC_CANONICAL_URL=""

RUN --mount=type=secret,id=gh_token \
    sh -c 'if [ -s /run/secrets/gh_token ]; then export GH_TOKEN=$(cat /run/secrets/gh_token); fi; \
           if [ -z "$NEXT_PUBLIC_CANONICAL_URL" ]; then unset NEXT_PUBLIC_CANONICAL_URL; fi; \
           pnpm exec turbo build --filter=@ever-works/web...'

# ---- runner ----------------------------------------------------------------

FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ARG GITHUB_REPOSITORY=""
ARG GITHUB_SHA=""

LABEL org.opencontainers.image.source="https://github.com/${GITHUB_REPOSITORY}"
LABEL org.opencontainers.image.revision="${GITHUB_SHA}"
LABEL org.opencontainers.image.title="${GITHUB_REPOSITORY}"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The same canonical origin at runtime, for any server-side read the build did
# not inline. Empty = not pinned (lib/utils/url-cleaner.ts ignores '').
ARG NEXT_PUBLIC_CANONICAL_URL=""
ENV NEXT_PUBLIC_CANONICAL_URL=${NEXT_PUBLIC_CANONICAL_URL}

RUN apk add --no-cache libc6-compat && \
    mkdir -p /app/apps/web/.next/cache/images && \
    chown -R node:node /app

COPY --from=installer --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=installer --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=installer --chown=node:node /app/apps/web/messages ./apps/web/messages

VOLUME /app/apps/web/.next/cache

USER node
WORKDIR /app/apps/web

EXPOSE 3000

CMD ["node", "server.js"]
