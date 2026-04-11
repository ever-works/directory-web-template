---
id: background-jobs
title: Lavori in background
sidebar_label: Lavori in background
sidebar_position: 4
---

# Lavori in background

Il modello Ever Works include un robusto sistema di lavoro in background con un'architettura collegabile che supporta più backend di pianificazione. I processi vengono eseguiti automaticamente per attività quali la sincronizzazione del repository, la gestione delle sottoscrizioni e il riscaldamento della cache di analisi.

## Panoramica dell'architettura

Il sistema di lavoro in background segue un **modello strategico** con un'interfaccia `BackgroundJobManager` comune e tre implementazioni intercambiabili:

| Componente | File | Scopo |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Contratto di interfaccia per tutti i dirigenti |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | Pianificazione basata su `setInterval` per lo sviluppo |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Integrazione Trigger.dev SDK v4 per la produzione |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | Silent no-op per ambienti disabili |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Fabbrica + logica di creazione singleton |
| `config.ts` | `lib/background-jobs/config.ts` | Risoluzione della modalità di pianificazione |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Registrazione centralizzata del lavoro |

### Risoluzione della modalità di pianificazione

Il sistema determina quale gestore utilizzare in base alla configurazione dell'ambiente, seguendo un rigoroso ordine di priorità:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

La logica di risoluzione risiede in `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## L'interfaccia BackgroundJobManager

Tutti i manager implementano la stessa interfaccia definita in `lib/background-jobs/types.ts` :

```typescript
interface BackgroundJobManager {
  scheduleJob(id: string, name: string, job: () => void | Promise<void>, interval: number): void;
  scheduleCronJob(id: string, name: string, job: () => void | Promise<void>, cronExpression: string): void;
  triggerJob(id: string): Promise<void>;
  stopJob(id: string): void;
  stopAllJobs(): void;
  getJobStatus(id: string): JobStatus | undefined;
  getAllJobStatuses(): JobStatus[];
  getJobMetrics(): JobMetrics;
}
```

### Tipi di chiavi

```typescript
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

## Fabbrica del lavoro e Singleton

La factory in `lib/background-jobs/job-factory.ts` crea il manager appropriato ed espone un singleton:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

Il singleton garantisce che esista una sola istanza del manager per processo. Usa `resetJobManager()` nei test per cancellare l'istanza.

## LocalJobManager (Sviluppo) `LocalJobManager` utilizza `setInterval` e `setTimeout` per la pianificazione. Fornisce:

- **Prevenzione della sovrapposizione**: salta l'esecuzione se un'esecuzione precedente dello stesso lavoro è ancora in corso.
- **Tracciamento delle metriche**: tiene traccia delle esecuzioni totali, dei conteggi di successi/fallimenti e della durata media.
- **Conversione da cron a intervallo**: converte le espressioni cron comuni in intervalli di millisecondi per una pianificazione locale approssimativa.
- **Modalità di sviluppo silenzioso**: riduce il rumore di registrazione quando `NODE_ENV=development` .

Conversioni cron supportate:

| Espressione Cron | Intervallo |
|---|---|
| `*/30 * * * * *` | 30 secondi |
| `*/2 * * * *` | 2 minuti |
| `*/5 * * * *` | 5 minuti |
| `*/15 * * * *` | 15 minuti |
| `0 * * * *` | 1 ora |
| `0 9 * * *` | 24 ore |

## TriggerDevJobManager (produzione) `TriggerDevJobManager` registra le pianificazioni con Trigger.dev SDK v4. Comportamenti chiave:

- **Nessun timer locale**: non viene eseguito `setInterval` -- l'esecuzione effettiva è gestita dal processo di lavoro Trigger.dev.
- **Caricamento lento dell'SDK**: importa dinamicamente `@trigger.dev/sdk` per evitare problemi di raggruppamento.
- **Conversione da intervallo a cron**: converte intervalli di millisecondi in espressioni cron per l'API Trigger.dev.
- **Registrazione metrica**: registra le metriche di esecuzione quando il lavoratore richiama il gestore di esecuzione.

### Configurazione

Imposta le seguenti variabili di ambiente per abilitare Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

Il gestore si attiva solo quando tutte queste condizioni sono soddisfatte:
1. `TRIGGER_DEV_API_KEY` e `TRIGGER_DEV_API_URL` sono entrambi impostati ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` è `true` 3. `NODE_ENV` è `production` ## NoOpJobManager (disabilitato)

Quando `DISABLE_AUTO_SYNC=true` è impostato in sviluppo, `NoOpJobManager` ignora silenziosamente tutte le chiamate pianificate. Ogni metodo è una no-op e le metriche rimangono a zero. Questo è utile per:

- Esecuzione del server di sviluppo senza rumore di fondo
- Debug delle funzionalità solo frontend
- Riduzione dell'utilizzo delle risorse durante lo sviluppo dell'interfaccia utente

## Lavori registrati

I lavori vengono registrati centralmente in `lib/background-jobs/initialize-jobs.ts` . Questo modulo viene eseguito durante l'avvio dell'applicazione tramite il hook della strumentazione.

### Lavori principali

| ID lavoro | Nome | Programma | Descrizione |
|---|---|---|---|
| `repository-sync` | Sincronizzazione del repository | Ogni 5 minuti | Sincronizza il contenuto dal repository CMS basato su Git |
| `subscription-renewal-reminder` | Promemoria rinnovo abbonamento | Tutti i giorni alle 9:00 | Invia promemoria via email per gli abbonamenti con scadenza tra 7 giorni |
| `subscription-expired-cleanup` | Pulizia della scadenza dell'abbonamento | Tutti i giorni a mezzanotte | Elabora e fa scadere gli abbonamenti oltre la data di fine |

### Lavori di analisi

Registrato da `AnalyticsBackgroundProcessor` in `lib/services/analytics-background-processor.ts` :

| ID lavoro | Nome | Intervallo |
|---|---|---|
| `analytics-user-growth` | Aggregazione crescita utenti | 10 minuti |
| `analytics-activity-trends` | Aggregazione delle tendenze delle attività | 5 minuti |
| `analytics-top-items` | Classifica degli articoli migliori | 15 minuti |
| `analytics-recent-activity` | Aggiornamento attività recente | 2 minuti |
| `analytics-performance-metrics` | Aggiornamento delle metriche delle prestazioni | 30 secondi |
| `analytics-cache-cleanup` | Pulizia della cache | 1 ora |

### Attiva le definizioni dell'ID attività

Gli ID attività e le pianificazioni cron sono definiti in `lib/background-jobs/triggers/` :

| File | ID attività | Scopo |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Riscaldamento e pulizia della cache di Analytics |
| `sync.ts` | `SyncTaskIds` | Sincronizzazione del repository |
| `subscriptions.ts` | `SubscriptionTaskIds` | Gestione del ciclo di vita dell'abbonamento |
| `reports.ts` | `ReportTaskIds` | Generazione di report pianificati |

## Integrazione Vercel Cron

Quando distribuiti su Vercel, i processi in background possono essere attivati anche tramite Vercel Cron Jobs configurati in `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

Questi endpoint raggiungono percorsi API che eseguono la stessa logica di lavoro, fornendo un meccanismo di pianificazione nativo della piattaforma su Vercel.

## Aggiunta di un nuovo lavoro in background

### Passaggio 1: definire gli ID attività (facoltativo)

Crea o aggiorna un file in `lib/background-jobs/triggers/` :

```typescript
// lib/background-jobs/triggers/my-feature.ts
export const MyFeatureTaskIds = {
  cleanup: 'my-feature-cleanup',
  notify: 'my-feature-notify',
} as const;

export const MyFeatureCrons: Record<keyof typeof MyFeatureTaskIds, string> = {
  cleanup: '0 2 * * *',   // Daily at 2 AM
  notify: '*/30 * * * *', // Every 30 minutes
};
```

### Passaggio 2: implementare la funzione lavorativa

Creare la logica del lavoro in `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Passaggio 3: registrati su inizializza-jobs.ts

Aggiungi il lavoro a `lib/background-jobs/initialize-jobs.ts` :

```typescript
manager.scheduleCronJob(
  'my-feature-cleanup',
  'My Feature Cleanup',
  async () => {
    const { myFeatureCleanupJob } = await import('@/lib/services/my-feature-jobs');
    await myFeatureCleanupJob();
  },
  '0 2 * * *'
);
```

**Importante**: utilizza il `import()` dinamico all'interno del callback del lavoro per impedire al webpack di raggruppare i moduli Node.js durante la fase di compilazione.

### Passaggio 4: aggiungi Vercel Cron (facoltativo)

Se esegui la distribuzione su Vercel, aggiungi un endpoint cron a `vercel.json` e crea il percorso API corrispondente:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Monitoraggio e debug

### Controllo dello stato del lavoro

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Attivazione manuale dei lavori

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Disattivazione dei lavori in fase di sviluppo

Imposta la variabile di ambiente per saltare tutti i processi in background:

```bash
DISABLE_AUTO_SYNC=true
```

Ciò attiva `NoOpJobManager` , che ignora silenziosamente tutte le chiamate pianificate.

## Migliori pratiche

1. **Utilizza sempre le importazioni dinamiche** nelle richiamate dei lavori registrate in `initialize-jobs.ts` per evitare problemi di raggruppamento dei pacchetti web.
2. **Mantieni le funzioni lavorative idempotenti**: i lavori possono essere eseguiti più di una volta in caso di sovrapposizioni temporali o nuovi tentativi.
3. **Utilizza la registrazione strutturata** con un prefisso `[JobName]` per filtrare più facilmente i registri.
4. **Restituisce oggetti risultato** dalle funzioni lavorative (come `JobResult` in `subscription-jobs.ts` ) per l'osservabilità.
5. **Gestisci gli errori con garbo**: il gestore rileva e registra gli errori, ma la logica del tuo lavoro dovrebbe gestire gli errori parziali.
6. **Testare con LocalJobManager** in fase di sviluppo prima della distribuzione su Trigger.dev.
