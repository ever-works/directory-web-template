---
id: deployment-introduction
title: Introduction au déploiement
sidebar_label: Introduction au déploiement
sidebar_position: 1
---

# Introduction au déploiement

Ce guide fournit une vue d'ensemble complète du déploiement du Template Ever Works dans des environnements de production.

## Architecture générale

Le Template Ever Works produit une **construction Next.js standalone** qui regroupe toutes les dépendances en une seule unité déployable. Cela est configuré dans `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

Le paramètre `output: "standalone"` crée un artefact de déploiement autonome incluant uniquement les fichiers `node_modules` nécessaires, réduisant considérablement la taille du déploiement.

## Plateformes supportées

### Recommandé : Vercel

Vercel est la plateforme de déploiement recommandée pour le template. Elle offre :

- Déploiement sans configuration pour les applications Next.js
- Provisionnement automatique des certificats SSL
- Planification intégrée des cron jobs via `vercel.json`
- Support des fonctions serverless pour les routes API
- Déploiements de prévisualisation pour les pull requests

Le template inclut une configuration `vercel.json` avec des planifications cron prédéfinies :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

### Alternative : Docker

Pour les déploiements auto-hébergés, le template peut être conteneurisé et déployé dans n'importe quel environnement compatible Docker.

### Alternative : Cloud (AWS, GCP, Azure)

Les plateformes cloud majeures supportent les applications Next.js standalone.

## Prérequis

Avant le déploiement, assurez-vous d'avoir :

1. Un dépôt Git contenant votre projet
2. Un accès à une base de données PostgreSQL de production
3. Les variables d'environnement requises configurées
4. Un dépôt CMS Git pour le contenu du répertoire (variable `DATA_REPOSITORY`)
