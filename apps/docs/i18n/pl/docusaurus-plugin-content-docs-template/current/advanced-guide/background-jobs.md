---
id: background-jobs
title: Zadania w tle
sidebar_label: Zadania w tle
sidebar_position: 4
---

# Zadania w tle

Szablon Ever Works zawiera solidny system zadań w tle z wymienną architekturą, która obsługuje wiele backendów planowania. Zadania są uruchamiane automatycznie w przypadku zadań takich jak synchronizacja repozytoriów, zarządzanie subskrypcjami i podgrzewanie pamięci podręcznej analiz.

## Przegląd architektury

System zadań w tle opiera się na **wzorze strategii** ze wspólnym interfejsem `BackgroundJobManager` i trzema wymiennymi implementacjami:

| Składnik | Plik | Cel |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Umowa interfejsowa dla wszystkich menadżerów |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | Planowanie rozwoju oparte na `setInterval` |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Integracja Trigger.dev SDK v4 dla produkcji |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | Cichy zakaz dla środowisk niepełnosprawnych |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Fabryka + logika tworzenia singletonu |
| `config.ts` | `lib/background-jobs/config.ts` | Rozdzielczość trybu planowania |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Scentralizowana rejestracja stanowisk pracy |

### Rozwiązanie trybu planowania

System określa, którego menedżera użyć w oparciu o konfigurację środowiska, zgodnie ze ścisłą kolejnością priorytetów:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

Logika rozdzielczości żyje w `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## Interfejs menedżera tłaJobManager

Wszyscy menedżerowie wdrażają ten sam interfejs zdefiniowany w `lib/background-jobs/types.ts` :

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

### Typy kluczy

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

## Fabryka Pracy i Singleton

Fabryka w `lib/background-jobs/job-factory.ts` tworzy odpowiedniego menadżera i wystawia singleton:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

Singleton zapewnia, że ​​na proces istnieje tylko jedna instancja menedżera. Użyj `resetJobManager()` w testach, aby wyczyścić instancję.

## LocalJobManager (programowanie) `LocalJobManager` wykorzystuje `setInterval` i `setTimeout` do planowania. Zapewnia:

- **Zapobieganie nakładaniu się**: Pomija wykonywanie, jeśli poprzednie uruchomienie tego samego zadania jest nadal w toku.
- **Śledzenie wskaźników**: śledzi łączną liczbę wykonań, liczbę sukcesów/porażek i średni czas trwania.
- **Konwersja cron-to-interval**: Konwertuje typowe wyrażenia cron na interwały milisekundowe w celu przybliżonego planowania lokalnego.
- **Cichy tryb programistyczny**: Redukuje hałas logowania przy `NODE_ENV=development` .

Obsługiwane konwersje cron:

| Wyrażenie Crona | Interwał |
|---|---|
| `*/30 * * * * *` | 30 sekund |
| `*/2 * * * *` | 2 minuty |
| `*/5 * * * *` | 5 minut |
| `*/15 * * * *` | 15 minut |
| `0 * * * *` | 1 godzina |
| `0 9 * * *` | 24 godziny |

## TriggerDevJobManager (produkcja) `TriggerDevJobManager` rejestruje harmonogramy za pomocą pakietu Trigger.dev SDK v4. Kluczowe zachowania:

- **Brak lokalnych liczników**: Nie działa `setInterval` — faktyczne wykonanie jest obsługiwane przez proces roboczy Trigger.dev.
- **Lazy SDK loading**: Dynamicznie importuje `@trigger.dev/sdk` , aby zapobiec problemom z łączeniem.
- **Konwersja interwału na cron**: Konwertuje interwały milisekundowe na wyrażenia cron dla interfejsu API Trigger.dev.
- **Zapis metryk**: Rejestruje metryki wykonania, gdy proces roboczy wywołuje procedurę obsługi uruchamiania.

### Konfiguracja

Ustaw następujące zmienne środowiskowe, aby włączyć Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

Menedżer aktywuje się tylko wtedy, gdy spełnione są wszystkie poniższe warunki:
1. `TRIGGER_DEV_API_KEY` i `TRIGGER_DEV_API_URL` są ustawione ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` to `true` 3. `NODE_ENV` to `production` ## NoOpJobManager (wyłączone)

Gdy `DISABLE_AUTO_SYNC=true` jest w fazie rozwoju, `NoOpJobManager` po cichu ignoruje wszystkie zaplanowane połączenia. Każda metoda jest nieskuteczna, a wskaźniki pozostają na poziomie zerowym. Jest to przydatne dla:

- Uruchamianie serwera deweloperskiego bez hałasu w tle
- Debugowanie funkcji dostępnych wyłącznie na interfejsie
- Zmniejszenie zużycia zasobów podczas opracowywania interfejsu użytkownika

## Zarejestrowane oferty pracy

Rejestracja stanowisk pracy odbywa się centralnie w `lib/background-jobs/initialize-jobs.ts` . Moduł ten działa podczas uruchamiania aplikacji za pośrednictwem haka oprzyrządowania.

### Podstawowe zadania

| Identyfikator stanowiska | Imię | Harmonogram | Opis |
|---|---|---|---|
| `repository-sync` | Synchronizacja repozytorium | Co 5 minut | Synchronizuje zawartość z repozytorium CMS opartego na Git |
| `subscription-renewal-reminder` | Przypomnienie o odnowieniu subskrypcji | Codziennie o 9:00 | Wysyła przypomnienia e-mailem o subskrypcjach wygasających za 7 dni |
| `subscription-expired-cleanup` | Czyszczenie wygaśnięcia subskrypcji | Codziennie o północy | Przetwarza i wygasa subskrypcje po dacie końcowej |

### Zadania analityczne

Zarejestrowany przez `AnalyticsBackgroundProcessor` w `lib/services/analytics-background-processor.ts` :

| Identyfikator stanowiska | Imię | Interwał |
|---|---|---|
| `analytics-user-growth` | Agregacja wzrostu liczby użytkowników | 10 minut |
| `analytics-activity-trends` | Agregacja trendów aktywności | 5 minut |
| `analytics-top-items` | Ranking najlepszych przedmiotów | 15 minut |
| `analytics-recent-activity` | Ostatnia aktualizacja aktywności | 2 minuty |
| `analytics-performance-metrics` | Aktualizacja wskaźników wydajności | 30 sekund |
| `analytics-cache-cleanup` | Czyszczenie pamięci podręcznej | 1 godzina |

### Definicje identyfikatorów zadań wyzwalacza

Identyfikatory zadań i harmonogramy cron są zdefiniowane w `lib/background-jobs/triggers/` :

| Plik | Identyfikatory zadań | Cel |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Podgrzewanie i czyszczenie pamięci podręcznej Analytics |
| `sync.ts` | `SyncTaskIds` | Synchronizacja repozytorium |
| `subscriptions.ts` | `SubscriptionTaskIds` | Zarządzanie cyklem życia subskrypcji |
| `reports.ts` | `ReportTaskIds` | Zaplanowane generowanie raportu |

## Integracja z Vercelem i Cronem

Po wdrożeniu w Vercel zadania w tle można również uruchomić za pomocą zadań Vercel Cron skonfigurowanych w `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

Te punkty końcowe trafiają na trasy API, które wykonują tę samą logikę zadania, zapewniając natywny dla platformy mechanizm planowania w Vercel.

## Dodawanie nowego zadania w tle

### Krok 1: Zdefiniuj identyfikatory zadań (opcjonalnie)

Utwórz lub zaktualizuj plik w `lib/background-jobs/triggers/` :

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

### Krok 2: Zaimplementuj funkcję zadania

Utwórz logikę zadania w `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Krok 3: Zarejestruj się w pliku inicjalizacji-jobs.ts

Dodaj zadanie do `lib/background-jobs/initialize-jobs.ts` :

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

**Ważne**: Użyj dynamicznego `import()` wewnątrz wywołania zwrotnego zadania, aby uniemożliwić pakietowi internetowemu łączenie modułów Node.js w fazie kompilacji.

### Krok 4: Dodaj Vercel Cron (opcjonalnie)

Jeśli wdrażasz w Vercel, dodaj punkt końcowy cron do `vercel.json` i utwórz odpowiednią trasę API:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Monitorowanie i debugowanie

### Sprawdzanie stanu zadania

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Ręczne wyzwalanie zadania

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Wyłączanie zadań w fazie rozwoju

Ustaw zmienną środowiskową tak, aby pomijała wszystkie zadania w tle:

```bash
DISABLE_AUTO_SYNC=true
```

Aktywuje to funkcję `NoOpJobManager` , która cicho ignoruje wszystkie zaplanowane połączenia.

## Najlepsze praktyki

1. **Zawsze używaj importu dynamicznego** w wywołaniach zwrotnych zadań zarejestrowanych w `initialize-jobs.ts` , aby zapobiec problemom z pakowaniem pakietów internetowych.
2. **Zachowaj idempotentność funkcji zadań** — zadania mogą być uruchamiane więcej niż raz, jeśli czasy się pokrywają lub występują ponowne próby.
3. **Użyj rejestrowania strukturalnego** z przedrostkiem `[JobName]` dla łatwiejszego filtrowania logów.
4. **Zwróć obiekty wynikowe** z funkcji zadania (np. `JobResult` w `subscription-jobs.ts` ) w celu zapewnienia ich obserwowalności.
5. **Bezpiecznie obsługuj błędy** — menedżer wychwytuje i rejestruje błędy, ale logika zadania powinna obsługiwać częściowe awarie.
6. **Przetestuj za pomocą LocalJobManager** w fazie rozwoju przed wdrożeniem w Trigger.dev.
