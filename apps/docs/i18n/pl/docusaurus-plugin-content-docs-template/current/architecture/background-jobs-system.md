---
id: background-jobs-system
title: System zadań w tle
sidebar_label: Zadania w tle
sidebar_position: 38
---

# System zadań w tle

Szablon zawiera rozszerzalny system zadań w tle z trzema wymiennymi implementacjami: lokalnego menedżera ds. rozwoju opartego na `setInterval`, integracji Trigger.dev na potrzeby produkcyjne oraz menedżera no-op do całkowitego wyłączania zadań.

## Struktura pliku

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

## Interfejs `BackgroundJobManager`

Wszystkie implementacje mają wspólny interfejs:

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

### Typy stanu i metryk

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

## Fabryka Pracy (`job-factory.ts`)

Fabryka tworzy odpowiedniego menedżera w oparciu o środowisko:

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

### Logika wyboru

W fabryce obowiązuje następująca kolejność priorytetów:

1. **NoOpJobManager** - Jeśli `DISABLE_AUTO_SYNC=true` jest w fazie rozwoju
2. **TriggerDevJobManager** — jeśli Trigger.dev jest w pełni skonfigurowany i włączony w środowisku produkcyjnym
3. **LocalJobManager** — rozwiązanie awaryjne dla wszystkich innych środowisk

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

## Lokalny menadżer zadań

Do planowania używa `setInterval`. Idealny do zastosowań programistycznych i wdrożeń hostowanych samodzielnie:

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

### Konwersja Cron-interwał

`LocalJobManager` konwertuje popularne wyrażenia cron na przybliżone interwały:

|Wzór Crona|Interwał|
|-------------|----------|
| `*/30 * * * * *` |30 sekund|
| `*/2 * * * *` |2 minuty|
| `*/5 * * * *` |5 minut|
| `*/10 * * * *` |10 minut|
| `*/15 * * * *` |15 minut|
| `0 * * * *` |1 godzina|
| `0 9 * * *` |24 godziny|
|Inne|1 minuta (domyślnie)|

### Strażnicy egzekucyjni

Lokalny menedżer zapobiega nakładaniu się wykonań. Jeśli zadanie jest już uruchomione w momencie uruchomienia jego interwału, wykonanie zostanie pominięte:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Rejestruje zadania w zestawie SDK Trigger.dev do wykonywania w chmurze. W środowisku produkcyjnym faktycznym planowaniem i wykonaniem zajmuje się proces roboczy Trigger.dev, a nie lokalne liczniki czasu.

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

### Jak to działa

1. `scheduleJob` konwertuje interwał na wyrażenie cron
2. `registerTask` leniwie ładuje `@trigger.dev/sdk` i wywołuje `schedules.task()`
3. Procedura obsługi uruchamiania rejestruje metryki po wykonaniu przez proces roboczy Trigger.dev
4. `stopJob` czyści tylko stan lokalny (zdalne harmonogramy są zarządzane poprzez pulpit nawigacyjny Trigger.dev)

## NoOpJobManager

Wszystkie operacje są nieoperacyjne. Używane, gdy zadania w tle są wyłączone:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Konfiguracja (`config.ts`)

### Konfiguracja Trigger.dev

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

### Tryb planowania

Funkcja `getSchedulingMode` określa, jakiego systemu użyć:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Kolejność priorytetowa:

1. **wyłączone** - `DISABLE_AUTO_SYNC` jest zgodne z prawdą
2. **trigger-dev** – W pełni skonfigurowany i włączony w środowisku produkcyjnym
3. **vercel** - Działa na platformie Vercel
4. **lokalny** – rezerwa

## Rejestracja pracy (`initialize-jobs.ts`)

Wszystkie zadania w tle są rejestrowane centralnie za pośrednictwem `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Zarejestrowane oferty pracy

|Identyfikator zadania|Imię|Harmonogram|Opis|
|--------|------|----------|-------------|
|`repository-sync`|Synchronizacja repozytorium|Co 5 minut|Synchronizuje zawartość CMS opartą na Git|
|`subscription-renewal-reminder`|Przypomnienie o odnowieniu subskrypcji|Codziennie o godzinie 9:00|Wysyła przypomnienia o wygasających subskrypcjach|
|`subscription-expired-cleanup`|Czyszczenie wygaśnięcia subskrypcji|Codziennie o północy|Przetwarza i wygasa zaległe subskrypcje|

### Strażnik Singletona

Funkcja inicjalizacji zawiera osłonę singletonu, która zapobiega podwójnej rejestracji:

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

Dynamiczne importy wewnątrz wywołań zwrotnych zadań uniemożliwiają pakietowi internetowemu analizę pełnego łańcucha zależności w czasie kompilacji.

## Zmienne środowiskowe

|Zmienna|Wymagane|Opis|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|Dla Trigger.dev|Klucz API dla Trigger.dev|
|`TRIGGER_DEV_API_URL`|Nie|Niestandardowy adres URL interfejsu API (domyślny: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|Nie|Włącz Trigger.dev (domyślnie: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|Nie|Nazwa środowiska (domyślnie: `development`)|
|`DISABLE_AUTO_SYNC`|Nie|Ustaw na `true`, aby wyłączyć wszystkie zadania w tle|
|`VERCEL`|Automatyczne ustawianie|Ustaw na `1` przez platformę Vercel|

## Powiązane pliki

- `lib/background-jobs/index.ts` - Eksport publicznych API
- `lib/background-jobs/types.ts` - Definicje interfejsów i typów
- `lib/background-jobs/config.ts` - Pomoce konfiguracyjne
- `lib/background-jobs/job-factory.ts` - Fabryka i singleton
- `lib/background-jobs/local-job-manager.ts` - Implementacja lokalna
- `lib/background-jobs/trigger-dev-job-manager.ts` - Implementacja Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - Implementacja bez operacji
- `lib/background-jobs/initialize-jobs.ts` - Rejestracja pracy
- `lib/services/sync-service.ts` - Usługa synchronizacji repozytorium
- `lib/services/subscription-jobs.ts` - Wdrożenia zadań w ramach subskrypcji
