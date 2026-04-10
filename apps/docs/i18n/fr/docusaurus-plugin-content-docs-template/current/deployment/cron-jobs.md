---
id: cron-jobs
title: Configuration des Cron Jobs
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Guide de configuration des Cron Jobs

## Vue d'ensemble

Ce modèle prend en charge **trois mécanismes de planification** pour les tâches en arrière-plan :

1. **Local** – `LocalJobManager` utilisant `setInterval` (développement)
2. **Vercel Crons** – Système cron intégré de Vercel (production sur Vercel)
3. **Trigger.dev** – Service tiers (optionnel, pour les répertoires à grande échelle)

### Ordre de priorité (détection automatique)

Le système sélectionne automatiquement le mode de planification en fonction de l'environnement :

```typescript
// Depuis lib/background-jobs/config.ts
export function getSchedulingMode(): SchedulingMode {
  // 1. Vérifier si désactivé
  if (DISABLE_AUTO_SYNC === 'true') return 'disabled';
  
  // 2. Trigger.dev (si entièrement configuré en production)
  if (shouldUseTriggerDev()) return 'trigger-dev';
  
  // 3. Vercel (si VERCEL=1)
  if (isVercelEnvironment()) return 'vercel';
  
  // 4. Local (fallback)
  return 'local';
}
```

---

## Tâches en arrière-plan enregistrées

### 1. Synchronisation du dépôt

**ID de tâche :** `repository-sync`  
**Planification :** Toutes les 5 minutes (`*/5 * * * *`)  
**Description :** Synchronise le contenu depuis le dépôt CMS basé sur Git

- **Endpoint Vercel :** `/api/cron/sync`
- **Intervalle local :** `5 * 60 * 1000` ms (5 minutes)
- **Fonction :** `syncManager.performSync()`

### 2. Rappels de renouvellement d'abonnement

**ID de tâche :** `subscription-renewal-reminder`  
**Planification :** Quotidien à 9h00 (`0 9 * * *`)  
**Description :** Envoie des rappels par email aux utilisateurs dont les abonnements expirent dans 7 jours

- **Endpoint Vercel :** `/api/cron/subscription-reminders`
- **Cron local :** `0 9 * * *`
- **Fonction :** `subscriptionRenewalReminderJob()`

### 3. Nettoyage des abonnements expirés

**ID de tâche :** `subscription-expired-cleanup`  
**Planification :** Quotidien à minuit (`0 0 * * *`)  
**Description :** Traite les abonnements expirés et envoie des notifications d'expiration

- **Endpoint Vercel :** `/api/cron/subscription-expiration`
- **Cron local :** `0 0 * * *`
- **Fonction :** `subscriptionService.processExpiredSubscriptions()`

---

## Configuration du déploiement Vercel

### vercel.json

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

### Variables d'environnement

**Obligatoire pour les Crons Vercel :**

```bash
CRON_SECRET=votre-secret-sécurisé-aléatoire
```

Vercel envoie automatiquement ce secret dans l'en-tête `Authorization: Bearer <CRON_SECRET>` lors de l'appel des endpoints cron.

**Optionnel (pour désactiver Trigger.dev) :**

```bash
# Ne PAS définir ces valeurs si vous souhaitez utiliser Vercel Crons :
# TRIGGER_SECRET_KEY=
# TRIGGER_API_KEY=
# TRIGGER_API_URL=
```

---

## Vérification des Cron Jobs sur Vercel

Consultez le guide [Vérification des Cron Jobs](./cron-verification) pour les instructions étape par étape.
