---
id: background-jobs-system
title: Sistema di lavori in background
sidebar_label: Lavori in background
sidebar_position: 38
---

# Sistema di lavori in background

Il modello include un sistema di lavoro in background estensibile con tre implementazioni intercambiabili: un manager locale basato su `setInterval` per lo sviluppo, un'integrazione Trigger.dev per la produzione e un manager no-op per disabilitare completamente i lavori.

## Struttura dei file

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

## L'interfaccia `BackgroundJobManager`

Tutte le implementazioni condividono un'interfaccia comune:

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

### Tipi di stato e metriche

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

## Fabbrica del lavoro (`job-factory.ts`)

La fabbrica crea il manager appropriato in base all'ambiente:

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

### Logica di selezione

La fabbrica segue questo ordine di priorità:

1. **NoOpJobManager** - Se `DISABLE_AUTO_SYNC=true` in fase di sviluppo
2. **TriggerDevJobManager** - Se Trigger.dev è completamente configurato e abilitato in produzione
3. **LocalJobManager** - Fallback per tutti gli altri ambienti

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

Utilizza `setInterval` per la pianificazione. Ideale per lo sviluppo e le distribuzioni self-hosted:

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

### Conversione da cron a intervallo

`LocalJobManager` converte le espressioni cron comuni in intervalli approssimativi:

|Modello Cron|Intervallo|
|-------------|----------|
| `*/30 * * * * *` |30 secondi|
| `*/2 * * * *` |2 minuti|
| `*/5 * * * *` |5 minuti|
| `*/10 * * * *` |10 minuti|
| `*/15 * * * *` |15 minuti|
| `0 * * * *` |1 ora|
| `0 9 * * *` |24 ore|
|Altro|1 minuto (predefinito)|

### Guardie dell'esecuzione

Il manager locale impedisce la sovrapposizione delle esecuzioni. Se un lavoro è già in esecuzione quando viene attivato l'intervallo, l'esecuzione viene saltata:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Registra i lavori con l'SDK Trigger.dev per l'esecuzione basata su cloud. In produzione, la pianificazione e l'esecuzione effettive sono gestite dal lavoratore Trigger.dev, non dai timer locali.

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

### Come funziona

1. `scheduleJob` converte l'intervallo in un'espressione cron
2. `registerTask` carica pigramente `@trigger.dev/sdk` e chiama `schedules.task()`
3. Il gestore di esecuzione registra le metriche quando viene eseguito dal lavoratore Trigger.dev
4. `stopJob` cancella solo lo stato locale (le pianificazioni remote sono gestite tramite il dashboard Trigger.dev)

## NoOpJobManager

Tutte le operazioni sono no-op. Utilizzato quando i processi in background sono disabilitati:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Configurazione (`config.ts`)

### Configurazione Trigger.dev

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

### Modalità di pianificazione

La funzione `getSchedulingMode` determina quale sistema utilizzare:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Ordine di priorità:

1. **disabilitato** - `DISABLE_AUTO_SYNC` è vero
2. **trigger-dev** - Completamente configurato e abilitato in produzione
3. **vercel** - In esecuzione sulla piattaforma Vercel
4. **locale** - Fallback

## Registrazione lavoro (`initialize-jobs.ts`)

Tutti i lavori in background vengono registrati centralmente tramite `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Lavori registrati

|ID lavoro|Nome|Programma|Descrizione|
|--------|------|----------|-------------|
|`repository-sync`|Sincronizzazione dell'archivio|Ogni 5 minuti|Sincronizza il contenuto CMS basato su Git|
|`subscription-renewal-reminder`|Promemoria per il rinnovo dell'abbonamento|Tutti i giorni alle 9:00|Invia promemoria per gli abbonamenti in scadenza|
|`subscription-expired-cleanup`|Pulizia della scadenza dell'abbonamento|Tutti i giorni a mezzanotte|Elabora e fa scadere gli abbonamenti scaduti|

### Guardia Singleton

La funzione di inizializzazione include una protezione singleton per impedire la doppia registrazione:

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

Le importazioni dinamiche all'interno delle richiamate dei lavori impediscono al webpack di analizzare l'intera catena di dipendenze in fase di creazione.

## Variabili d'ambiente

|Variabile|Obbligatorio|Descrizione|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|Per Trigger.dev|Chiave API per Trigger.dev|
|`TRIGGER_DEV_API_URL`|No|URL API personalizzata (impostazione predefinita: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|No|Abilita Trigger.dev (predefinito: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|No|Nome dell'ambiente (predefinito: `development`)|
|`DISABLE_AUTO_SYNC`|No|Impostare su `true` per disabilitare tutti i processi in background|
|`VERCEL`|Impostazione automatica|Impostato su `1` dalla piattaforma Vercel|

## File correlati

- `lib/background-jobs/index.ts` - Esportazioni API pubbliche
- `lib/background-jobs/types.ts` - Definizioni di interfaccia e tipo
- `lib/background-jobs/config.ts` - Aiutanti per la configurazione
- `lib/background-jobs/job-factory.ts` - Fabbrica e singleton
- `lib/background-jobs/local-job-manager.ts` - Implementazione locale
- `lib/background-jobs/trigger-dev-job-manager.ts` - Implementazione di Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - Implementazione senza operazioni
- `lib/background-jobs/initialize-jobs.ts` - Registrazione del lavoro
- `lib/services/sync-service.ts` - Servizio di sincronizzazione del repository
- `lib/services/subscription-jobs.ts` - Implementazioni di lavori in abbonamento
