---
id: docker
title: Déploiement Docker
sidebar_label: Docker
sidebar_position: 2
---

# Déploiement Docker

Déployez votre site web de répertoire Ever Works en utilisant des conteneurs Docker.

## Prérequis

- Docker installé sur votre système
- Docker Compose (optionnel mais recommandé)

## Démarrage rapide avec Docker

### 1. Construire l'image Docker

```bash
# Cloner le dépôt
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Construire l'image Docker
docker build -t ever-works-website .
```

### 2. Exécuter le conteneur

```bash
docker run -p 3000:3000 ever-works-website
```

Votre site sera disponible sur `http://localhost:3000`.

## Configuration Docker Compose

Créez un fichier `docker-compose.yml` :

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://votre-domaine.com
      - AUTH_SECRET=votre-secret
      - DATABASE_URL=postgresql://user:password@postgres:5432/db
      - DATA_REPOSITORY=https://github.com/votre/data-repo
    volumes:
      - ./.content:/app/.content
    restart: unless-stopped
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: everworks
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Démarrez les services :

```bash
docker-compose up -d
```

## Dockerfile

La construction utilise une approche multi-étapes :

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```
