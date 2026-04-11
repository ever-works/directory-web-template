---
id: local-setup
title: Lokale Ontwikkelingsopzet
sidebar_label: Lokaal Setup
---

# Lokale Ontwikkelingsopzet

Deze handleiding helpt u een volledige lokale ontwikkelomgeving voor Ever Works in te stellen.

## Vereisten

Zorg dat het volgende is geïnstalleerd:

- **Node.js 20.x of hoger** – [Downloaden](https://nodejs.org/)
- **pnpm** – [Installeren](https://pnpm.io/installation) (de monorepo-pakketbeheerder)
- **Git** – [Downloaden](https://git-scm.com/)
- **PostgreSQL** (optioneel) – [Downloaden](https://postgresql.org/)
- **Docker** (optioneel) – [Downloaden](https://docker.com/)

## Ontwikkelomgeving instellen

### 1. Klonen en installeren

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install
```

### 2. Omgevingsconfiguratie

```bash
cp apps/web/.env.example apps/web/.env.local
```

Configureer uw `apps/web/.env.local`:

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

### 3. Database instellen (Optioneel)

#### Optie A: Lokale PostgreSQL

```bash
createdb everworks_dev
cd apps/web
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
```

#### Optie B: Docker PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=your_database_name \
  -p 5432:5432 \
  -d postgres:15
```

### 4. Contentrepository instellen

1. Bezoek [awesome-data](https://github.com/ever-works/awesome-data) en fork het
2. Werk `DATA_REPOSITORY` bij in `apps/web/.env.local`
3. Genereer een GitHub-token met `repo`, `read:user`, `user:email` rechten

### 5. Ontwikkelingsserver starten

```bash
pnpm run dev
```

Uw applicatie is beschikbaar op [http://localhost:3000](http://localhost:3000).

## Ontwikkelingsscripts

### Kernscripts (vanuit monorepo root)

```bash
pnpm run dev
pnpm run build
pnpm run type-check
pnpm run lint
pnpm run format
```

### Databasescripts (uitvoeren vanuit `apps/web/`)

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:reset
pnpm run db:seed
pnpm run db:studio
```
