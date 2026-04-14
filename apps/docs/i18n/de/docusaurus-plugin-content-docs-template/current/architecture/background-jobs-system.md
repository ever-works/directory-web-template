---
id: background-jobs-system
title: Hintergrundjobsystem
sidebar_label: Hintergrundjobs
sidebar_position: 38
---

# Hintergrundjobsystem

Die Vorlage umfasst ein erweiterbares Hintergrundjobsystem mit drei austauschbaren Implementierungen: einen lokalen `setInterval`-basierten Manager für die Entwicklung, eine Trigger.dev-Integration für die Produktion und einen No-Op-Manager zum vollständigen Deaktivieren von Jobs.

## Dateistruktur

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

## Die `BackgroundJobManager` Schnittstelle

Alle Implementierungen haben eine gemeinsame Schnittstelle:

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

### Status- und Metriktypen

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

## Jobfabrik (`job-factory.ts`)

Die Fabrik erstellt je nach Umgebung den entsprechenden Manager:

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

### Auswahllogik

Die Fabrik befolgt diese Prioritätsreihenfolge:

1. **NoOpJobManager** – Wenn `DISABLE_AUTO_SYNC=true` in der Entwicklung
2. **TriggerDevJobManager** – Wenn Trigger.dev vollständig konfiguriert und in der Produktion aktiviert ist
3. **LocalJobManager** – Fallback für alle anderen Umgebungen

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

Verwendet `setInterval` für die Planung. Ideal für Entwicklung und selbst gehostete Bereitstellungen:

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

### Cron-in-Intervall-Konvertierung

Der `LocalJobManager` wandelt gängige Cron-Ausdrücke in ungefähre Intervalle um:

|Cron-Muster|Intervall|
|-------------|----------|
| `*/30 * * * * *` |30 Sekunden|
| `*/2 * * * *` |2 Minuten|
| `*/5 * * * *` |5 Minuten|
| `*/10 * * * *` |10 Minuten|
| `*/15 * * * *` |15 Minuten|
| `0 * * * *` |1 Stunde|
| `0 9 * * *` |24 Stunden|
|Andere|1 Minute (Standard)|

### Hinrichtungswächter

Der lokale Manager verhindert überlappende Ausführungen. Wenn ein Job zum Zeitpunkt der Auslösung seines Intervalls bereits ausgeführt wird, wird die Ausführung übersprungen:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Registriert Jobs beim Trigger.dev SDK für die cloudbasierte Ausführung. In der Produktion wird die eigentliche Planung und Ausführung vom Trigger.dev-Worker und nicht von lokalen Timern übernommen.

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

### Wie es funktioniert

1. `scheduleJob` konvertiert das Intervall in einen Cron-Ausdruck
2. `registerTask` lädt langsam `@trigger.dev/sdk` und ruft `schedules.task()` auf
3. Der Ausführungshandler zeichnet Metriken auf, wenn er vom Trigger.dev-Worker ausgeführt wird
4. `stopJob` löscht nur den lokalen Status (Remote-Zeitpläne werden über das Trigger.dev-Dashboard verwaltet)

## NoOpJobManager

Alle Operationen sind No-Ops. Wird verwendet, wenn Hintergrundjobs deaktiviert sind:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Konfiguration (`config.ts`)

### Trigger.dev-Konfiguration

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

### Planungsmodus

Die Funktion `getSchedulingMode` bestimmt, welches System verwendet werden soll:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Prioritätsreihenfolge:

1. **deaktiviert** - `DISABLE_AUTO_SYNC` ist wahr
2. **trigger-dev** – Vollständig konfiguriert und in der Produktion aktiviert
3. **vercel** – Läuft auf der Vercel-Plattform
4. **lokal** – Fallback

## Jobregistrierung (`initialize-jobs.ts`)

Alle Hintergrundjobs werden zentral über `initializeBackgroundJobs` registriert:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Registrierte Jobs

|Job-ID|Name|Zeitplan|Beschreibung|
|--------|------|----------|-------------|
|`repository-sync`|Repository-Synchronisierung|Alle 5 Minuten|Synchronisiert den Git-basierten CMS-Inhalt|
|`subscription-renewal-reminder`|Erinnerung zur Abonnementverlängerung|Täglich um 9:00 Uhr|Sendet Erinnerungen für auslaufende Abonnements|
|`subscription-expired-cleanup`|Bereinigung des Abonnementablaufs|Täglich um Mitternacht|Verarbeitet überfällige Abonnements und lässt sie ablaufen|

### Singleton-Wache

Die Initialisierungsfunktion umfasst einen Singleton-Schutz, um eine Doppelregistrierung zu verhindern:

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

Dynamische Importe innerhalb von Jobrückrufen verhindern, dass das Webpack zur Erstellungszeit die gesamte Abhängigkeitskette analysiert.

## Umgebungsvariablen

|Variabel|Erforderlich|Beschreibung|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|Für Trigger.dev|API-Schlüssel für Trigger.dev|
|`TRIGGER_DEV_API_URL`|Nein|Benutzerdefinierte API-URL (Standard: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|Nein|Trigger.dev aktivieren (Standard: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|Nein|Umgebungsname (Standard: `development`)|
|`DISABLE_AUTO_SYNC`|Nein|Auf `true` setzen, um alle Hintergrundjobs zu deaktivieren|
|`VERCEL`|Automatisch eingestellt|Von der Vercel-Plattform auf `1` gesetzt|

## Verwandte Dateien

- `lib/background-jobs/index.ts` – Öffentliche API-Exporte
- `lib/background-jobs/types.ts` – Schnittstellen- und Typdefinitionen
- `lib/background-jobs/config.ts` – Konfigurationshelfer
- `lib/background-jobs/job-factory.ts` – Factory und Singleton
- `lib/background-jobs/local-job-manager.ts` – Lokale Implementierung
- `lib/background-jobs/trigger-dev-job-manager.ts` – Trigger.dev-Implementierung
- `lib/background-jobs/noop-job-manager.ts` – No-Op-Implementierung
- `lib/background-jobs/initialize-jobs.ts` - Jobregistrierung
- `lib/services/sync-service.ts` – Repository-Synchronisierungsdienst
- `lib/services/subscription-jobs.ts` – Implementierungen von Abonnementjobs
