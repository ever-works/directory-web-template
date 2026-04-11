---
id: scripts-overview
title: Vue d'ensemble des scripts
sidebar_label: Vue d'ensemble des scripts
sidebar_position: 8
---

# Vue d'ensemble des scripts

Le répertoire `scripts/` contient des scripts d'automatisation qui gèrent le pipeline de construction, le cycle de vie de la base de données, la synchronisation du contenu, la qualité du code et l'infrastructure de déploiement.

## Structure du répertoire

```
scripts/
├── build-migrate.ts          # Migrations de base de données au moment de la construction
├── check-env.js              # Validation des variables d'environnement
├── check-env-ci.js           # Validation env spécifique CI
├── clean-database.js         # Utilitaire de réinitialisation de la base de données
├── cli-migrate.ts            # CLI de migration manuelle
├── cli-seed.ts               # CLI de peuplement manuel
├── clone.cjs                 # Clonage de contenu CMS basé sur Git
├── generate-openapi.ts       # Génération de spec OpenAPI
├── lint.js                   # Script wrapper ESLint
├── seed.ts                   # Semeur complet de base de données
├── seed-stripe-products.ts   # Configuration du catalogue produits Stripe
├── sync-translations.js      # Synchronisation des traductions i18n
├── update-cron.ts            # Gestion des cron jobs Vercel
```

## Catégories de scripts

### Construction et déploiement

| Script | Commande | Objectif |
|--------|---------|---------|
| `build-migrate.ts` | `pnpm db:migrate` | Runner de migration au moment de la construction |
| `check-env.js` | Automatique via `pnpm build` | Valide les variables d'environnement requises |
| `update-cron.ts` | `tsx scripts/update-cron.ts` | Met à jour la configuration cron Vercel |

### Base de données

| Script | Commande | Objectif |
|--------|---------|---------|
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Migration interactive manuelle |
| `cli-seed.ts` | `pnpm db:seed` | Point d'entrée CLI pour le peuplement |
| `seed.ts` | Exécution directe | Semeur complet de base de données |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Configuration du catalogue produits Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | Réinitialisation complète (supprime tout) |

### Contenu et i18n

| Script | Commande | Objectif |
|--------|---------|---------|
| `sync-translations.js` | `pnpm sync-translations` | Synchronise les fichiers de locale depuis en.json |
| `clone.cjs` | Automatique via `pnpm build` | Clone le dépôt CMS Git dans `.content/` |
| `generate-openapi.ts` | `tsx scripts/generate-openapi.ts` | Génère la spec OpenAPI depuis les annotations |

### Qualité du code

| Script | Commande | Objectif |
|--------|---------|---------|
| `lint.js` | `pnpm lint` | Lint ESLint de tous les fichiers |
| `codeql-setup.js` | CI uniquement | Configure l'analyse de sécurité CodeQL |

## Référence des scripts de base de données

### Commandes pnpm

```bash
# Depuis apps/web/
cd apps/web

pnpm db:generate    # Générer des migrations depuis les changements de schéma
pnpm db:migrate     # Appliquer les migrations en attente
pnpm db:seed        # Peupler la base de données avec des données de départ
pnpm db:studio      # Ouvrir Drizzle Studio
```
