---
id: vercel
title: Déploiement Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# Déploiement Vercel

Déployez votre site web de répertoire Ever Works sur Vercel pour une distribution rapide et mondiale.

## Prérequis

- Compte Vercel
- Dépôt GitHub avec votre projet Ever Works

## Déploiement rapide

### 1. Connecter le dépôt

1. Visitez [vercel.com](https://vercel.com)
2. Cliquez sur "New Project"
3. Importez votre dépôt GitHub
4. Sélectionnez la racine du monorepo

### 2. Configurer les paramètres de construction

Vercel détectera automatiquement Next.js. Vérifiez ces paramètres :

- **Framework Preset** : Next.js
- **Root Directory** : `apps/web`
- **Build Command** : `pnpm build`
- **Output Directory** : `.next`

### 3. Variables d'environnement

Ajoutez vos variables d'environnement dans le tableau de bord Vercel :

```bash
# Requis
AUTH_SECRET=votre-clé-secrète              # openssl rand -base64 32
COOKIE_SECRET=votre-secret-cookie
DATA_REPOSITORY=https://github.com/votre/data-repo
DATABASE_URL=votre-url-postgres

# Application
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app
NODE_ENV=production
```

### 4. Déployer

Cliquez sur "Deploy" et Vercel construira et déploiera votre site automatiquement.

## Domaine personnalisé

### Ajouter un domaine

1. Dans les paramètres du projet Vercel, allez dans l'onglet **Domains**
2. Ajoutez votre domaine personnalisé
3. Configurez les enregistrements DNS chez votre registraire :
   - Type `A` pointant vers `76.76.21.21`
   - Ou un enregistrement `CNAME` vers `cname.vercel-dns.com`

### SSL automatique

Vercel provisionne automatiquement les certificats SSL via Let's Encrypt. Aucune configuration supplémentaire n'est nécessaire.

## Cron Jobs Vercel

La configuration des cron jobs se trouve dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Définissez `CRON_SECRET` dans les variables d'environnement pour sécuriser les endpoints cron.
