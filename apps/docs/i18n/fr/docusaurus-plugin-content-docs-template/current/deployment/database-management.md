---
id: database-management
title: Gestion de la base de données
sidebar_label: Gestion BDD
sidebar_position: 4
---

# Gestion de la base de données

Le Template Ever Works utilise PostgreSQL avec Drizzle ORM pour toutes les opérations de base de données.

## Architecture

| Couche | Fichier | Responsabilité |
|--------|---------|----------------|
| **Configuration** | `drizzle.config.ts` | Chemin du schéma, sortie des migrations, dialecte |
| **Connexion** | `lib/db/drizzle.ts` | Connection pooling, instance singleton, init paresseuse |
| **Schéma** | `lib/db/schema.ts` | Définitions des tables, index, contraintes |
| **Migrations** | `lib/db/migrate.ts` | Runner de migration idempotent |
| **Initialisation** | `lib/db/initialize.ts` | Auto-migrate, seed, verrous consultatifs |
| **Peuplement** | `lib/db/seed.ts` | Données initiales : rôles, permissions, admin |

## Gestion des connexions

La connexion de base de données est créée à la première utilisation et mise en cache via `globalThis` :

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,       // Par défaut : 20 en production
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
```

Contrôlez la taille du pool avec la variable d'environnement :

```bash
DB_POOL_SIZE=20  # Valeur par défaut, max 50
```

## Commandes de migration

```bash
cd apps/web

# Générer de nouvelles migrations depuis les changements de schéma
pnpm db:generate

# Appliquer les migrations en attente
pnpm db:migrate

# Peupler les données de base
pnpm db:seed

# Inspecter la base de données visuellement
pnpm db:studio
```

## Déploiement de production

Les migrations s'exécutent automatiquement pendant le processus de construction de Vercel via `build-migrate.ts`. Pour bypasser :

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Recommandations pour la production

- Utilisez un fournisseur PostgreSQL géré (Neon, Supabase, AWS RDS)
- Activez SSL pour les connexions de base de données
- Configurez la mise en veille des connexions via PgBouncer pour les déploiements serverless
- Sauvegardez régulièrement avec `pg_dump`
