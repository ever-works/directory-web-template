---
id: drizzle-config
title: Configuration Drizzle ORM
sidebar_label: Config Drizzle
sidebar_position: 9
---

# Configuration Drizzle ORM

Cette page documente la configuration Drizzle ORM utilisée par le template pour la gestion du schéma de base de données, les migrations et la construction de requêtes typées. La configuration se trouve dans `drizzle.config.ts` à la racine du projet.

## Vue d'ensemble

Le template utilise [Drizzle ORM](https://orm.drizzle.team/) avec PostgreSQL comme dialecte de base de données. Drizzle fournit un accès à la base de données avec typage sécurisé, la génération automatique de migrations et un studio visuel pour inspecter votre base de données.

## Fichier de configuration

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## Propriétés de configuration

### `schema`

- **Valeur :** `"./lib/db/schema.ts"`
- **Objectif :** Pointe vers le fichier contenant toutes les définitions de tables Drizzle.

### `out`

- **Valeur :** `"./lib/db/migrations"`
- **Objectif :** Répertoire où sont stockés les fichiers SQL de migration générés.

### `dialect`

- **Valeur :** `"postgresql"`
- **Objectif :** Spécifie le moteur de base de données. Le template cible PostgreSQL pour les déploiements en production.

### `dbCredentials`

- **Valeur :** `{ url: databaseUrl }`
- **Objectif :** Chaîne de connexion à la base de données. Lue depuis la variable d'environnement `DATABASE_URL`.

## Commandes Drizzle

```bash
# Générer des migrations depuis les changements de schéma
pnpm db:generate

# Appliquer les migrations en attente
pnpm db:migrate

# Ouvrir Drizzle Studio pour inspecter la base de données
pnpm db:studio

# Peupler avec les données de base
pnpm db:seed
```

## Variable d'environnement

```bash
# SQLite pour développement local
DATABASE_URL=file:./dev.db

# PostgreSQL pour production
DATABASE_URL=postgresql://user:password@host:5432/dbname
```
