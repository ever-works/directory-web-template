# syntax=docker/dockerfile:1.7

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

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

ARG DATA_REPOSITORY=""
ENV DATA_REPOSITORY=${DATA_REPOSITORY}

RUN --mount=type=secret,id=gh_token \
    sh -c 'if [ -s /run/secrets/gh_token ]; then export GH_TOKEN=$(cat /run/secrets/gh_token); fi; \
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
