---
id: database-scripts
title: Scripts de base de données
sidebar_label: Scripts de base de données
sidebar_position: 10
---

# Scripts de base de données

Le template fournit une suite de scripts de gestion de base de données pour les migrations, le peuplement et la maintenance.

## Inventaire des scripts

| Script | Commande | Objectif |
|--------|---------|---------|
| `build-migrate.ts` | `pnpm db:migrate` | Runner de migration au moment de la construction |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Migration interactive manuelle |
| `cli-seed.ts` | `pnpm db:seed` | Point d'entrée CLI pour le peuplement |
| `seed.ts` | Exécution directe | Semeur complet de base de données |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Configuration du catalogue produits Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | Réinitialisation complète (supprime tout) |

## Scripts de migration

### Migration au moment de la construction (`build-migrate.ts`)

S'exécute automatiquement pendant `pnpm build` sur Vercel. Conçu pour les mises à jour de schéma sans temps d'arrêt.

**Comportement selon l'environnement :**

| Environnement | Échec de migration | Erreur de connexion |
|---|---|---|
| Production (`VERCEL_ENV=production`) | Construction échoue | Construction échoue |
| Prévisualisation (`VERCEL_ENV=preview`) | Construction échoue | Construction passe (avertissement) |
| CI (GitHub Actions) | Ignoré entièrement | Ignoré entièrement |
| Développement local | Construction échoue | Construction échoue |

**Variables d'environnement de contrôle :**

```bash
SKIP_BUILD_MIGRATIONS=true  # Bypasser entièrement les migrations
DATABASE_URL=               # Si non défini, migrations ignorées
```

## Scripts de peuplement

### Semeur complet (`seed.ts`)

Peuple la base de données avec :
- Utilisateur admin (depuis `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
- Rôles et permissions par défaut
- Données de configuration de base

```bash
cd apps/web
pnpm db:seed
```

Variables d'environnement requises :

```bash
DATABASE_URL=postgresql://...
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=AdminPassword123!
```

### Peuplement Stripe (`seed-stripe-products.ts`)

Configure le catalogue produits Stripe avec les plans Free/Standard/Premium.

```bash
npx tsx scripts/seed-stripe-products.ts
```

Requiert les variables Stripe (`STRIPE_SECRET_KEY`, `STRIPE_STANDARD_PRICE_ID`, etc.).

## Réinitialisation de la base de données

:::danger
`clean-database.js` supprime complètement toutes les tables et données. **Ne pas exécuter en production.**
:::

```bash
node scripts/clean-database.js
```
