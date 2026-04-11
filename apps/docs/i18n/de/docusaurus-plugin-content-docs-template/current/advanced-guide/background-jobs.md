---
id: background-jobs
title: Hintergrundjobs
sidebar_label: Hintergrundjobs
sidebar_position: 4
---

# Hintergrundjobs

Die Ever Works-Vorlage umfasst ein robustes Hintergrundjobsystem mit einer steckbaren Architektur, die mehrere Planungs-Backends unterstützt. Jobs für Aufgaben wie Repository-Synchronisierung, Abonnementverwaltung und Analyse-Cache-Erwärmung werden automatisch ausgeführt.

## Architekturübersicht

Das Hintergrundjobsystem folgt einem **Strategiemuster** mit einer gemeinsamen `BackgroundJobManager` -Schnittstelle und drei austauschbaren Implementierungen:

| Komponente | Datei | Zweck |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Schnittstellenvertrag für alle Führungskräfte |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | `setInterval` -basierte Planung für die Entwicklung |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Trigger.dev SDK v4-Integration für die Produktion |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | Stilles No-Op für behindertengerechte Umgebungen |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Factory + Singleton-Erstellungslogik |
| `config.ts` | `lib/background-jobs/config.ts` | Auflösung im Planungsmodus |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Zentralisierte Stellenregistrierung |

### Auflösung im Planungsmodus

Das System bestimmt anhand der Umgebungskonfiguration, welcher Manager verwendet werden soll, und folgt dabei einer strengen Prioritätsreihenfolge:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

Die Auflösungslogik lebt in `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## Die BackgroundJobManager-Schnittstelle

Alle Manager implementieren dieselbe in `lib/background-jobs/types.ts` definierte Schnittstelle:

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

### Schlüsseltypen

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

## Job Factory und Singleton

Die Fabrik in `lib/background-jobs/job-factory.ts` erstellt den entsprechenden Manager und stellt einen Singleton bereit:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

Der Singleton stellt sicher, dass pro Prozess nur eine Managerinstanz vorhanden ist. Verwenden Sie `resetJobManager()` in Tests, um die Instanz zu löschen.

## LocalJobManager (Entwicklung)

Der `LocalJobManager` nutzt `setInterval` und `setTimeout` für die Planung. Es bietet:

- **Überlappungsverhinderung**: Überspringt die Ausführung, wenn noch eine vorherige Ausführung desselben Jobs ausgeführt wird.
- **Metrikverfolgung**: Verfolgt die Gesamtausführungen, Erfolgs-/Fehlerzahlen und die durchschnittliche Dauer.
- **Cron-in-Intervall-Konvertierung**: Konvertiert gängige Cron-Ausdrücke in Millisekundenintervalle für eine ungefähre lokale Planung.
- **Leiser Entwicklungsmodus**: Reduziert Protokollierungsgeräusche bei `NODE_ENV=development` .

Unterstützte Cron-Konvertierungen:

| Cron-Ausdruck | Intervall |
|---|---|
| `*/30 * * * * *` | 30 Sekunden |
| `*/2 * * * *` | 2 Minuten |
| `*/5 * * * *` | 5 Minuten |
| `*/15 * * * *` | 15 Minuten |
| `0 * * * *` | 1 Stunde |
| `0 9 * * *` | 24 Stunden |

## TriggerDevJobManager (Produktion)

Der `TriggerDevJobManager` registriert Zeitpläne mit dem Trigger.dev SDK v4. Wichtige Verhaltensweisen:

- **Keine lokalen Timer**: Wird nicht ausgeführt `setInterval` – die tatsächliche Ausführung wird vom Trigger.dev-Workerprozess übernommen.
- **Verzögertes SDK-Laden**: Importiert `@trigger.dev/sdk` dynamisch, um Bündelungsprobleme zu vermeiden.
- **Intervall-zu-Cron-Konvertierung**: Konvertiert Millisekundenintervalle in Cron-Ausdrücke für die Trigger.dev-API.
- **Metrikaufzeichnung**: Zeichnet Ausführungsmetriken auf, wenn der Worker den Ausführungshandler aufruft.

### Konfiguration

Legen Sie die folgenden Umgebungsvariablen fest, um Trigger.dev zu aktivieren:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

Der Manager wird nur aktiviert, wenn alle folgenden Bedingungen erfüllt sind:
1. `TRIGGER_DEV_API_KEY` und `TRIGGER_DEV_API_URL` sind beide eingestellt ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` ist `true` 3. `NODE_ENV` ist `production` ## NoOpJobManager (Deaktiviert)

Wenn `DISABLE_AUTO_SYNC=true` in der Entwicklung festgelegt ist, ignoriert `NoOpJobManager` stillschweigend alle Planungsaufrufe. Jede Methode ist ein No-Op und die Metriken bleiben auf Null. Dies ist nützlich für:

- Ausführen des Entwicklungsservers ohne Hintergrundgeräusche
- Debuggen von reinen Frontend-Funktionen
- Reduzierung des Ressourcenverbrauchs während der UI-Entwicklung

## Registrierte Jobs

Stellen werden im `lib/background-jobs/initialize-jobs.ts` zentral erfasst. Dieses Modul wird während des Anwendungsstarts über den Instrumentierungs-Hook ausgeführt.

### Kernjobs

| Job-ID | Name | Zeitplan | Beschreibung |
|---|---|---|---|
| `repository-sync` | Repository-Synchronisierung | Alle 5 Minuten | Synchronisiert Inhalte aus dem Git-basierten CMS-Repository |
| `subscription-renewal-reminder` | Erinnerung zur Abonnementverlängerung | Täglich um 9:00 Uhr | Sendet E-Mail-Erinnerungen für Abonnements, die in 7 Tagen ablaufen |
| `subscription-expired-cleanup` | Bereinigung des Abonnementablaufs | Täglich um Mitternacht | Verarbeitet und läuft Abonnements nach ihrem Enddatum ab |

### Analytics-Jobs

Registriert von `AnalyticsBackgroundProcessor` im Jahr `lib/services/analytics-background-processor.ts` :

| Job-ID | Name | Intervall |
|---|---|---|
| `analytics-user-growth` | Aggregation des Benutzerwachstums | 10 Minuten |
| `analytics-activity-trends` | Aggregation von Aktivitätstrends | 5 Minuten |
| `analytics-top-items` | Ranking der Top-Artikel | 15 Minuten |
| `analytics-recent-activity` | Aktuelles Aktivitätsupdate | 2 Minuten |
| `analytics-performance-metrics` | Aktualisierung der Leistungsmetriken | 30 Sekunden |
| `analytics-cache-cleanup` | Cache-Bereinigung | 1 Stunde |

### Aufgaben-ID-Definitionen auslösen

Aufgaben-IDs und Cron-Zeitpläne werden in `lib/background-jobs/triggers/` definiert:

| Datei | Aufgaben-IDs | Zweck |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Aufwärmen und Bereinigen des Analytics-Cache |
| `sync.ts` | `SyncTaskIds` | Repository-Synchronisierung |
| `subscriptions.ts` | `SubscriptionTaskIds` | Abonnement-Lebenszyklusverwaltung |
| `reports.ts` | `ReportTaskIds` | Geplante Berichtserstellung |

## Vercel Cron-Integration

Bei der Bereitstellung in Vercel können Hintergrundjobs auch über in `vercel.json` konfigurierte Vercel Cron Jobs ausgelöst werden:

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

Diese Endpunkte treffen auf API-Routen, die dieselbe Joblogik ausführen und so einen plattformnativen Planungsmechanismus auf Vercel bereitstellen.

## Einen neuen Hintergrundjob hinzufügen

### Schritt 1: Aufgaben-IDs definieren (optional)

Erstellen oder aktualisieren Sie eine Datei in `lib/background-jobs/triggers/` :

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

### Schritt 2: Implementieren Sie die Job-Funktion

Erstellen Sie die Joblogik in `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Schritt 3: Registrieren Sie sich in initialize-jobs.ts

Fügen Sie den Job zu `lib/background-jobs/initialize-jobs.ts` hinzu:

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

**Wichtig**: Verwenden Sie dynamisches `import()` innerhalb des Job-Callbacks, um zu verhindern, dass Webpack Node.js-Module während der Build-Phase bündelt.

### Schritt 4: Vercel Cron hinzufügen (optional)

Wenn Sie auf Vercel bereitstellen, fügen Sie einen Cron-Endpunkt zu `vercel.json` hinzu und erstellen Sie die entsprechende API-Route:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Überwachung und Debugging

### Jobstatus prüfen

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Manuelle Jobauslösung

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Jobs in der Entwicklung deaktivieren

Legen Sie die Umgebungsvariable so fest, dass alle Hintergrundjobs übersprungen werden:

```bash
DISABLE_AUTO_SYNC=true
```

Dadurch wird der `NoOpJobManager` aktiviert, der alle Planungsaufrufe stillschweigend ignoriert.

## Best Practices

1. **Verwenden Sie immer dynamische Importe** in in `initialize-jobs.ts` registrierten Jobrückrufen, um Probleme bei der Webpack-Bündelung zu vermeiden.
2. **Jobfunktionen idempotent halten** – Jobs werden möglicherweise mehr als einmal ausgeführt, wenn es zeitliche Überschneidungen oder Wiederholungsversuche gibt.
3. **Verwenden Sie strukturierte Protokollierung** mit einem `[JobName]` -Präfix für eine einfachere Protokollfilterung.
4. **Ergebnisobjekte zurückgeben** von Jobfunktionen (wie `JobResult` in `subscription-jobs.ts` ) zur Beobachtbarkeit.
5. **Fehler elegant behandeln** – der Manager fängt Fehler ab und protokolliert sie, aber Ihre Joblogik sollte Teilfehler verarbeiten.
6. **Testen Sie mit dem LocalJobManager** in der Entwicklung, bevor Sie es auf Trigger.dev bereitstellen.
