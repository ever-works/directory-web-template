---
id: cron-api-endpoints
title: "Points de terminaison API Cron"
sidebar_label: "API Cron"
sidebar_position: 59
---

# Points de terminaison API Cron

L'API Cron fournit des points de terminaison pour les tâches planifiées déclenchées par Vercel Cron, des planificateurs externes ou le `BackgroundJobManager` interne. Tous les points de terminaison cron nécessitent une authentification via la variable d'environnement `CRON_SECRET` en utilisant un token `Bearer` dans l'en-tête `Authorization`.

**Répertoire source :** `template/app/api/cron/`

---

## Authentification

Les points de terminaison cron utilisent un secret partagé pour l'autorisation :

- **Production :** La variable d'environnement `CRON_SECRET` doit être définie. Les requêtes doivent inclure `Authorization: Bearer <CRON_SECRET>`.
- **Développement :** Si `CRON_SECRET` n'est pas configuré, l'accès est autorisé sans authentification pour faciliter le développement local.
- **Sécurité :** Tous les points de terminaison cron utilisent `crypto.timingSafeEqual()` pour une comparaison en temps constant afin de prévenir les attaques par timing.

**Réponse non autorisée (401) :**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Configuration Vercel Cron

Le calendrier cron est défini dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
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

| Tâche | Planification | Description |
|-------|---------------|-------------|
| Synchronisation du contenu | Tous les jours à 3h00 UTC | Synchronise le contenu depuis le CMS Git |
| Rappels d'abonnement | Tous les jours à 9h00 UTC | Envoie des e-mails de rappel de renouvellement |
| Expiration d'abonnement | Tous les jours à minuit UTC | Traite les abonnements expirés |

---

## Synchronisation du contenu

Déclenche une synchronisation du contenu depuis le dépôt CMS basé sur Git.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/cron/sync` |
| **Auth** | `CRON_SECRET` (token Bearer) |
| **Source** | `cron/sync/route.ts` |

### Réponse

**Statut 200** -- Synchronisation réussie.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Statut 500** -- Échec de la synchronisation.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Indique si la synchronisation a réussi |
| `timestamp` | `string` (ISO 8601) | Horodatage de fin de synchronisation |
| `duration` | `number` | Durée en millisecondes |
| `message` | `string` | Message de statut lisible |
| `details` | `string` (optionnel) | Détails supplémentaires en cas d'échec |

### En-têtes de réponse

Toutes les réponses incluent `Cache-Control: no-cache, no-store, must-revalidate` pour empêcher la mise en cache des résultats de synchronisation.

### Exemple curl

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Expiration des abonnements

Recherche et traite les abonnements expirés en mettant à jour leur statut de `active` à `expired` et en envoyant des e-mails de notification.

| Propriété | Valeur |
|-----------|--------|
| **Méthodes** | `GET`, `POST` |
| **Chemin** | `/api/cron/subscription-expiration` |
| **Auth** | `CRON_SECRET` (token Bearer) |
| **Source** | `cron/subscription-expiration/route.ts` |

### Réponse

**Statut 200** -- Traitement réussi.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `data.processed` | `number` | Nombre d'abonnements mis à jour comme expirés |
| `data.affectedUsers` | `array` | Liste des abonnements affectés (sans données personnelles) |
| `data.errors` | `string[]` | Erreurs non fatales (ex. : échecs d'envoi d'e-mail) |
| `data.timestamp` | `string` | Horodatage du traitement |

### Étapes de traitement

1. Recherche les abonnements actifs dépassant leur date de fin.
2. Met à jour le statut de `active` à `expired`.
3. Envoie des e-mails de notification d'expiration via le service e-mail.
4. Retourne un résumé -- les échecs d'e-mail ne font pas échouer l'ensemble de la tâche.

### Exemple curl

```bash
# Via GET
curl -s http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"

# Via POST (également supporté pour les déclenchements manuels)
curl -s -X POST http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Rappels d'abonnement

Envoie des e-mails de rappel de renouvellement aux utilisateurs dont les abonnements approchent de leur date de renouvellement.

| Propriété | Valeur |
|-----------|--------|
| **Méthodes** | `GET`, `POST` |
| **Chemin** | `/api/cron/subscription-reminders` |
| **Auth** | `CRON_SECRET` (token Bearer) |
| **Source** | `cron/subscription-reminders/route.ts` |

### Réponse

**Statut 200** -- Tâche terminée avec succès.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Statut 207** -- Tâche terminée avec des erreurs partielles (Multi-Statut).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

### Exemple curl

```bash
curl -s http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Initialisation des tâches en arrière-plan

Le module de tâches en arrière-plan (`cron/jobs/background-jobs-init.ts`) n'est pas un point de terminaison API, mais un module d'initialisation singleton utilisé pour configurer le mode de planification au démarrage de l'application.

**Source :** `cron/jobs/background-jobs-init.ts`

### Modes de planification

| Mode | Description |
|------|-------------|
| `vercel` | Tâches gérées par Vercel Cron via les points de terminaison `/api/cron/*` |
| `local` | Planificateur interne (pour les déploiements auto-hébergés) |
| `trigger-dev` | Intégration Trigger.dev pour les tâches en arrière-plan gérées |
| `disabled` | Synchronisation automatique désactivée (`DISABLE_AUTO_SYNC=true`) |

### Utilisation

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Appelé une fois depuis layout.tsx -- peut être appelé plusieurs fois sans problème
await ensureBackgroundJobsInitialized();
```

### Fonctionnalités clés

- Utilise `globalThis` pour l'état singleton, garantissant que l'initialisation ne s'exécute qu'une seule fois par processus.
- Ignore l'initialisation pendant les tests (`NODE_ENV=test`) et les builds (`NEXT_PHASE=phase-production-build`).
- En cas d'échec, l'initialisation réinitialise l'état pour permettre une nouvelle tentative automatique.

---

## Utilisation TypeScript

```typescript
// Déclencher la synchronisation du contenu de manière programmatique
async function triggerSync(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/sync', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();

  if (data.success) {
    console.log(`Sync completed in ${data.duration}ms`);
  } else {
    console.error('Sync failed:', data.message, data.details);
  }
}

// Vérifier l'expiration des abonnements
async function processExpirations(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/subscription-expiration', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();
  console.log(`Processed ${data.data.processed} expirations`);

  if (data.data.errors.length > 0) {
    console.warn('Non-fatal errors:', data.data.errors);
  }
}
```

## Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `CRON_SECRET` | Production : Oui, Développement : Non | Secret partagé pour l'authentification des points de terminaison cron |
| `DISABLE_AUTO_SYNC` | Non | Définir à `true` pour désactiver la synchronisation automatique du contenu |
