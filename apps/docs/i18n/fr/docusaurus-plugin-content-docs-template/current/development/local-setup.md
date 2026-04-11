---
id: local-setup
title: Configuration de l'environnement de développement local
sidebar_label: Configuration locale
---

# Configuration de l'environnement de développement local

Ce guide vous aidera à configurer un environnement de développement local complet pour Ever Works.

## Prérequis

Assurez-vous d'avoir les éléments suivants installés :

- **Node.js 20.x ou supérieur** — [Télécharger](https://nodejs.org/)
- **pnpm** — [Installer](https://pnpm.io/installation) (le gestionnaire de paquets du monorepo)
- **Git** — [Télécharger](https://git-scm.com/)
- **PostgreSQL** (optionnel) — [Télécharger](https://postgresql.org/)
- **Docker** (optionnel) — [Télécharger](https://docker.com/)

## Configuration de l'environnement de développement

### 1. Cloner et installer

```bash
# Cloner le dépôt
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Installer toutes les dépendances depuis la racine du monorepo
pnpm install
```

### 2. Configuration de l'environnement

Copiez le fichier d'environnement exemple dans le répertoire de l'application web :

```bash
cp apps/web/.env.example apps/web/.env.local
```

Configurez votre fichier `apps/web/.env.local` :

```bash
# Configuration de développement de base
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentification
AUTH_SECRET="générez-une-clé-secrète-sécurisée"
NEXTAUTH_URL="http://localhost:3000"

# Intégration GitHub (Requis)
GH_TOKEN="votre-token-d-accès-personnel-github"
DATA_REPOSITORY="https://github.com/votre-nom/awesome-data"

# Base de données (Optionnel)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### 3. Configuration de la base de données (Optionnel)

#### Option A : PostgreSQL local

```bash
# Créer la base de données
createdb everworks_dev

# Depuis le répertoire de l'app web
cd apps/web

# Exécuter les migrations
pnpm run db:generate
pnpm run db:migrate

# Peupler avec des données exemples
pnpm run db:seed
```

#### Option B : PostgreSQL Docker

```bash
docker run -d \
  --name everworks-postgres \
  -e POSTGRES_DB=everworks_dev \
  -e POSTGRES_USER=everworks \
  -e POSTGRES_PASSWORD=password123 \
  -p 5432:5432 \
  postgres:15
```

### 4. Démarrer le serveur de développement

```bash
# Depuis la racine du monorepo — démarre toutes les apps
pnpm run dev

# Pour l'application web uniquement
pnpm run --filter @ever-works/web dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

## Vérification

Pour vérifier que votre configuration fonctionne :

```bash
# Lint
pnpm lint

# Vérification des types TypeScript
pnpm tsc --noEmit

# Construction (pour les changements plus importants)
pnpm build
```
