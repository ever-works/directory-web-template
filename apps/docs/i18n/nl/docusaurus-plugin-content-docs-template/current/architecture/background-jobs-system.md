---
id: background-jobs-system
title: Achtergrondbanensysteem
sidebar_label: Achtergrond banen
sidebar_position: 38
---

# Achtergrondbanensysteem

De sjabloon bevat een uitbreidbaar achtergrondtaaksysteem met drie uitwisselbare implementaties: een lokale `setInterval`-gebaseerde manager voor ontwikkeling, een Trigger.dev-integratie voor productie en een no-op-manager voor het volledig uitschakelen van taken.

## Bestandsstructuur

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

## De `BackgroundJobManager`-interface

Alle implementaties delen een gemeenschappelijke interface:

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

### Status- en metrische typen

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

## Baanfabriek (`job-factory.ts`)

De fabriek creëert de juiste manager op basis van de omgeving:

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

### Selectielogica

De fabriek volgt deze prioriteitsvolgorde:

1. **NoOpJobManager** - Als `DISABLE_AUTO_SYNC=true` in ontwikkeling is
2. **TriggerDevJobManager** - Als Trigger.dev volledig is geconfigureerd en ingeschakeld in productie
3. **LocalJobManager** - Terugval voor alle andere omgevingen

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

Gebruikt `setInterval` voor planning. Ideaal voor ontwikkeling en zelfgehoste implementaties:

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

### Cron-naar-Interval-conversie

De `LocalJobManager` converteert algemene cron-expressies naar geschatte intervallen:

|Cron-patroon|Interval|
|-------------|----------|
| `*/30 * * * * *` |30 seconden|
| `*/2 * * * *` |2 minuten|
| `*/5 * * * *` |5 minuten|
| `*/10 * * * *` |10 minuten|
| `*/15 * * * *` |15 minuten|
| `0 * * * *` |1 uur|
| `0 9 * * *` |24 uur|
|Anders|1 minuut (standaard)|

### Executiewachters

De lokale manager voorkomt overlappende uitvoeringen. Als een taak al actief is wanneer het interval ervan wordt geactiveerd, wordt de uitvoering overgeslagen:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Registreert taken bij de Trigger.dev SDK voor uitvoering in de cloud. In productie wordt de daadwerkelijke planning en uitvoering afgehandeld door de Trigger.dev-werker, niet door lokale timers.

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

### Hoe het werkt

1. `scheduleJob` converteert het interval naar een cron-expressie
2. `registerTask` laadt lui `@trigger.dev/sdk` en belt `schedules.task()`
3. De uitvoeringshandler registreert metrische gegevens wanneer deze wordt uitgevoerd door de Trigger.dev-werker
4. `stopJob` wist alleen de lokale status (schema's op afstand worden beheerd via het Trigger.dev-dashboard)

## GeenOpJobManager

Alle operaties zijn no-ops. Gebruikt wanneer achtergrondtaken zijn uitgeschakeld:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Configuratie (`config.ts`)

### Trigger.dev-configuratie

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

### Planningsmodus

De functie `getSchedulingMode` bepaalt welk systeem moet worden gebruikt:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Prioriteitsvolgorde:

1. **uitgeschakeld** - `DISABLE_AUTO_SYNC` is waar
2. **trigger-dev** - Volledig geconfigureerd en ingeschakeld in productie
3. **vercel** - Draait op het Vercel-platform
4. **lokaal** - Terugval

## Taakregistratie (`initialize-jobs.ts`)

Alle achtergrondbanen worden centraal geregistreerd via `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Geregistreerde vacatures

|Taak-ID|Naam|Schema|Beschrijving|
|--------|------|----------|-------------|
|`repository-sync`|Synchronisatie van opslagplaatsen|Elke 5 minuten|Synchroniseert de op Git gebaseerde CMS-inhoud|
|`subscription-renewal-reminder`|Herinnering voor abonnementsverlenging|Dagelijks om 9.00 uur|Verstuurt herinneringen voor aflopende abonnementen|
|`subscription-expired-cleanup`|Opschoning van de vervaldatum van abonnementen|Dagelijks om middernacht|Verwerkt en laat verlopen abonnementen verlopen|

### Singleton Garde

De initialisatiefunctie omvat een singleton-guard om dubbele registratie te voorkomen:

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

Dynamische import binnen job callbacks voorkomt dat webpack de volledige afhankelijkheidsketen analyseert tijdens het bouwen.

## Omgevingsvariabelen

|Variabel|Vereist|Beschrijving|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|Voor Trigger.dev|API-sleutel voor Trigger.dev|
|`TRIGGER_DEV_API_URL`|Nee|Aangepaste API-URL (standaard: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|Nee|Trigger.dev inschakelen (standaard: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|Nee|Omgevingsnaam (standaard: `development`)|
|`DISABLE_AUTO_SYNC`|Nee|Stel in op `true` om alle achtergrondtaken uit te schakelen|
|`VERCEL`|Automatisch ingesteld|Ingesteld op `1` door Vercel-platform|

## Gerelateerde bestanden

- `lib/background-jobs/index.ts` - Openbare API-exports
- `lib/background-jobs/types.ts` - Interface- en typedefinities
- `lib/background-jobs/config.ts` - Configuratiehelpers
- `lib/background-jobs/job-factory.ts` - Fabriek en singleton
- `lib/background-jobs/local-job-manager.ts` - Lokale implementatie
- `lib/background-jobs/trigger-dev-job-manager.ts` - Trigger.dev-implementatie
- `lib/background-jobs/noop-job-manager.ts` - Implementatie zonder operationele activiteiten
- `lib/background-jobs/initialize-jobs.ts` - Taakregistratie
- `lib/services/sync-service.ts` - Synchronisatieservice voor opslagplaatsen
- `lib/services/subscription-jobs.ts` - Implementaties van abonnementstaken
