---
id: background-jobs-system
title: Système de tâches en arrière-plan
sidebar_label: Travaux en arrière-plan
sidebar_position: 38
---

# Système de tâches en arrière-plan

Le modèle comprend un système de tâches en arrière-plan extensible avec trois implémentations interchangeables : un gestionnaire local basé sur `setInterval` pour le développement, une intégration Trigger.dev pour la production et un gestionnaire sans opération pour désactiver complètement les tâches.

## Structure du fichier

```
lib/background-jobs/
  index.ts                      # Public API - exports types, factory, config
  types.ts                      # BackgroundJobManager interface, types
  config.ts                     # Trigger.dev configuration, scheduling mode
  job-factory.ts                # Factory function and singleton management
  local-job-manager.ts          # Local setInterval-based implementation
  trigger-dev-job-manager.ts    # Trigger.dev SDK integration
  noop-job-manager.ts           # No-op implementation for disabled mode
  initialize-jobs.ts            # Centralized job registration
  triggers/                     # Job-specific trigger definitions
    analytics.ts
    reports.ts
    subscriptions.ts
    sync.ts
```

## L'interface `BackgroundJobManager`

Toutes les implémentations partagent une interface commune :

```ts
export interface BackgroundJobManager {
  // Schedule by interval (milliseconds)
  scheduleJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    interval: number
  ): void;

  // Schedule by cron expression
  scheduleCronJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    cronExpression: string
  ): void;

  // Manually trigger a job
  triggerJob(id: string): Promise<void>;

  // Stop a specific job
  stopJob(id: string): void;

  // Stop all jobs
  stopAllJobs(): void;

  // Get status of a specific job
  getJobStatus(id: string): JobStatus | undefined;

  // Get all job statuses
  getAllJobStatuses(): JobStatus[];

  // Get execution metrics
  getJobMetrics(): JobMetrics;
}
```

### Types de statuts et de mesures

```ts
type JobStatusType = 'running' | 'completed' | 'failed' | 'scheduled' | 'stopped';

interface JobStatus {
  id: string;
  name: string;
  status: JobStatusType;
  lastRun: Date | null;
  nextRun: Date | null;
  duration: number;
  error?: string;
}

interface JobMetrics {
  totalExecutions: number;
  successfulJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  lastCleanup: Date;
}
```

## Usine d'emplois (`job-factory.ts`)

L'usine crée le gestionnaire approprié en fonction de l'environnement :

```ts
import { getJobManager, resetJobManager } from '@/lib/background-jobs';

// Get the singleton manager (created on first call)
const manager = getJobManager();

// Register a job
manager.scheduleJob(
  'cleanup',
  'Daily Cleanup',
  async () => { /* ... */ },
  24 * 60 * 60 * 1000 // 24 hours
);

// Reset (useful for testing)
resetJobManager();
```

### Logique de sélection

L'usine suit cet ordre de priorité :

1. **NoOpJobManager** - Si `DISABLE_AUTO_SYNC=true` en développement
2. **TriggerDevJobManager** - Si Trigger.dev est entièrement configuré et activé en production
3. **LocalJobManager** – Repli pour tous les autres environnements

```ts
export function createJobManager(): BackgroundJobManager {
  if (coreConfig.NODE_ENV === 'development' && process.env.DISABLE_AUTO_SYNC === 'true') {
    return new NoOpJobManager();
  }

  if (shouldUseTriggerDev()) {
    return new TriggerDevJobManager(getTriggerDevConfig());
  }

  return new LocalJobManager();
}
```

## LocalJobManager

Utilise `setInterval` pour la planification. Idéal pour le développement et les déploiements auto-hébergés :

```ts
const manager = new LocalJobManager();

// Interval-based scheduling
manager.scheduleJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, 5 * 60 * 1000); // Every 5 minutes

// Cron-based scheduling (converted to interval internally)
manager.scheduleCronJob('cleanup', 'Nightly Cleanup', async () => {
  await runCleanup();
}, '0 0 * * *'); // Daily at midnight
```

### Conversion Cron en intervalle

Le `LocalJobManager` convertit les expressions cron courantes en intervalles approximatifs :

|Modèle Cron|Intervalle|
|-------------|----------|
| `*/30 * * * * *` |30 secondes|
| `*/2 * * * *` |2 minutes|
| `*/5 * * * *` |5 minutes|
| `*/10 * * * *` |10 minutes|
| `*/15 * * * *` |15 minutes|
| `0 * * * *` |1 heure|
| `0 9 * * *` |24 heures|
|Autre|1 minute (par défaut)|

### Gardes d'exécution

Le gestionnaire local évite le chevauchement des exécutions. If a job is already running when its interval fires, the execution is skipped:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Enregistre les tâches avec le SDK Trigger.dev pour une exécution basée sur le cloud. En production, la planification et l'exécution réelles sont gérées par le travailleur Trigger.dev, et non par les minuteurs locaux.

```ts
const config: TriggerDevConfig = {
  enabled: true,
  apiKey: 'tr_dev_...',
  apiUrl: 'https://api.trigger.dev',
  environment: 'production',
  isFullyConfigured: true,
  isPartiallyConfigured: false,
};

const manager = new TriggerDevJobManager(config);

// Jobs are registered with Trigger.dev schedules
manager.scheduleCronJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, '*/5 * * * *');
```

### Comment ça marche

1. `scheduleJob` convertit l'intervalle en expression cron
2. `registerTask` charge paresseusement `@trigger.dev/sdk` et appelle `schedules.task()`
3. Le gestionnaire d'exécution enregistre les métriques lorsqu'il est exécuté par le travailleur Trigger.dev
4. `stopJob` efface uniquement l'état local (les plannings à distance sont gérés via le tableau de bord Trigger.dev)

## NoOpJobManager

Toutes les opérations sont sans opération. Utilisé lorsque les tâches en arrière-plan sont désactivées :

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Configuration (`config.ts`)

### Configuration de Trigger.dev

```ts
import { getTriggerDevConfig, shouldUseTriggerDev } from '@/lib/background-jobs';

const config = getTriggerDevConfig();
// => {
//   enabled: boolean,
//   apiKey: string | undefined,
//   apiUrl: string,           // default: 'https://api.trigger.dev'
//   environment: string,      // default: 'development'
//   isFullyConfigured: boolean, // apiKey AND apiUrl present
//   isPartiallyConfigured: boolean,
// }

if (shouldUseTriggerDev()) {
  // Use Trigger.dev (fully configured + enabled + production)
}
```

### Mode de planification

La fonction `getSchedulingMode` détermine quel système utiliser :

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Ordre prioritaire :

1. **désactivé** - `DISABLE_AUTO_SYNC` est véridique
2. **trigger-dev** - Entièrement configuré et activé en production
3. **vercel** - Fonctionner sur la plateforme Vercel
4. **local** – Retour

## Inscription à l'emploi (`initialize-jobs.ts`)

Toutes les tâches d'arrière-plan sont enregistrées de manière centralisée via `initializeBackgroundJobs` :

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Emplois enregistrés

|ID de travail|Nom|Calendrier|Descriptif|
|--------|------|----------|-------------|
|`repository-sync`|Synchronisation du référentiel|Toutes les 5 minutes|Synchronise le contenu du CMS basé sur Git|
|`subscription-renewal-reminder`|Rappel de renouvellement d'abonnement|Tous les jours à 9h00|Envoie des rappels pour les abonnements expirés|
|`subscription-expired-cleanup`|Nettoyage après expiration des abonnements|Tous les jours à minuit|Traite et expire les abonnements en souffrance|

### Garde Singleton

La fonction d'initialisation comprend une protection singleton pour éviter le double enregistrement :

```ts
let isInitialized = false;

export async function initializeBackgroundJobs(): Promise<void> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (isInitialized) return;
  isInitialized = true;

  const { getJobManager } = await import('@/lib/background-jobs');
  const manager = getJobManager();

  // Register jobs with dynamic imports to prevent webpack bundling issues
  manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
    const { syncManager } = await import('@/lib/services/sync-service');
    await syncManager.performSync();
  }, 5 * 60 * 1000);

  // ... more jobs
}
```

Les importations dynamiques dans les rappels de tâches empêchent Webpack d'analyser la chaîne de dépendance complète au moment de la construction.

## Variables d'environnement

|Variable|Obligatoire|Descriptif|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|Pour Trigger.dev|Clé API pour Trigger.dev|
|`TRIGGER_DEV_API_URL`|Non|URL d'API personnalisée (par défaut : `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|Non|Activer Trigger.dev (par défaut : `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|Non|Nom de l'environnement (par défaut : `development`)|
|`DISABLE_AUTO_SYNC`|Non|Définissez sur `true` pour désactiver toutes les tâches en arrière-plan|
|`VERCEL`|Réglage automatique|Réglé sur `1` par la plateforme Vercel|

## Fichiers associés

- `lib/background-jobs/index.ts` - Exportations d'API publiques
- `lib/background-jobs/types.ts` - Définitions d'interface et de type
- `lib/background-jobs/config.ts` - Aides à la configuration
- `lib/background-jobs/job-factory.ts` - Usine et singleton
- `lib/background-jobs/local-job-manager.ts` - Implémentation locale
- `lib/background-jobs/trigger-dev-job-manager.ts` - Implémentation de Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - Implémentation sans opération
- `lib/background-jobs/initialize-jobs.ts` - Inscription à l'emploi
- `lib/services/sync-service.ts` - Service de synchronisation du référentiel
- `lib/services/subscription-jobs.ts` - Implémentations de tâches d'abonnement
