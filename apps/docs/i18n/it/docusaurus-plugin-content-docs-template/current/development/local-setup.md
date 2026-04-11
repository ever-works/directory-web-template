---
id: local-setup
title: Configurazione Sviluppo Locale
sidebar_label: Setup Locale
---

# Configurazione Sviluppo Locale

Questa guida ti aiuterà a configurare un ambiente di sviluppo locale completo per Ever Works.

## Prerequisiti

Assicurati di avere installato:

- **Node.js 20.x o superiore** – [Scarica](https://nodejs.org/)
- **pnpm** – [Installa](https://pnpm.io/installation) (il gestore di pacchetti del monorepo)
- **Git** – [Scarica](https://git-scm.com/)
- **PostgreSQL** (opzionale) – [Scarica](https://postgresql.org/)
- **Docker** (opzionale) – [Scarica](https://docker.com/)

## Configurazione dell'ambiente di sviluppo

### 1. Clona e installa

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install
```

### 2. Configurazione dell'ambiente

```bash
cp apps/web/.env.example apps/web/.env.local
```

Configura `apps/web/.env.local`:

```bash
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AUTH_SECRET="generate-a-secure-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GH_TOKEN="your-github-personal-access-token"
DATA_REPOSITORY="https://github.com/your-username/awesome-data"
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### 3. Configurazione del database (Opzionale)

#### Opzione A: PostgreSQL locale

```bash
createdb everworks_dev
cd apps/web
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
```

#### Opzione B: Docker PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=your_database_name \
  -p 5432:5432 \
  -d postgres:15
```

### 4. Configurazione del repository dei contenuti

1. Visita [awesome-data](https://github.com/ever-works/awesome-data) e fai un fork
2. Aggiorna `DATA_REPOSITORY` in `apps/web/.env.local`
3. Genera un token GitHub con permessi `repo`, `read:user`, `user:email`

### 5. Avviare il server di sviluppo

```bash
pnpm run dev
```

L'applicazione sarà disponibile su [http://localhost:3000](http://localhost:3000).

## Script di sviluppo

### Script principali (dalla root del monorepo)

```bash
pnpm run dev
pnpm run build
pnpm run type-check
pnpm run lint
pnpm run format
```

### Script del database (eseguire da `apps/web/`)

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:reset
pnpm run db:seed
pnpm run db:studio
```
