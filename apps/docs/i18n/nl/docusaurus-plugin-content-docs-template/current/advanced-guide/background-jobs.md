---
id: background-jobs
title: Achtergrond banen
sidebar_label: Achtergrond banen
sidebar_position: 4
---

# Achtergrondbanen

De Ever Works-sjabloon bevat een robuust achtergrondtaaksysteem met een inplugbare architectuur die meerdere planningsbackends ondersteunt. Taken worden automatisch uitgevoerd voor taken zoals synchronisatie van opslagplaatsen, abonnementsbeheer en het opwarmen van de analytische cache.

## Architectuuroverzicht

Het achtergrondtaaksysteem volgt een **Strategiepatroon** met een gemeenschappelijke `BackgroundJobManager` -interface en drie uitwisselbare implementaties:

| Onderdeel | Bestand | Doel |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Interfacecontract voor alle managers |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | Op `setInterval` gebaseerde ontwikkelingsplanning |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Trigger.dev SDK v4-integratie voor productie |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | Stille no-op voor gehandicapte omgevingen |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Fabrieks- en singleton-creatielogica |
| `config.ts` | `lib/background-jobs/config.ts` | Resolutie planningsmodus |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Gecentraliseerde taakregistratie |

### Resolutie planningsmodus

Het systeem bepaalt welke manager moet worden gebruikt op basis van de omgevingsconfiguratie, volgens een strikte prioriteitsvolgorde:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

De resolutielogica leeft in `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## De BackgroundJobManager-interface

Alle managers implementeren dezelfde interface gedefinieerd in `lib/background-jobs/types.ts` :

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

### Sleuteltypen

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

## Jobfabriek en Singleton

De fabriek in `lib/background-jobs/job-factory.ts` creëert de juiste manager en stelt een singleton bloot:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

De singleton zorgt ervoor dat er per proces slechts één managerinstantie bestaat. Gebruik `resetJobManager()` in tests om de instantie te wissen.

## LocalJobManager (ontwikkeling)

De `LocalJobManager` gebruikt `setInterval` en `setTimeout` voor planning. Het biedt:

- **Overlappingspreventie**: slaat de uitvoering over als een eerdere uitvoering van dezelfde taak nog steeds bezig is.
- **Metrische gegevens bijhouden**: houdt het totale aantal uitvoeringen, het aantal successen/mislukkingen en de gemiddelde duur bij.
- **Cron-naar-interval-conversie**: converteert algemene cron-expressies naar millisecondenintervallen voor geschatte lokale planning.
- **Stille ontwikkelingsmodus**: Vermindert loggeluid wanneer `NODE_ENV=development` .

Ondersteunde cron-conversies:

| Cron-expressie | Interval |
|---|---|
| `*/30 * * * * *` | 30 seconden |
| `*/2 * * * *` | 2 minuten |
| `*/5 * * * *` | 5 minuten |
| `*/15 * * * *` | 15 minuten |
| `0 * * * *` | 1 uur |
| `0 9 * * *` | 24 uur |

## TriggerDevJobManager (productie)

De `TriggerDevJobManager` registreert schema's met de Trigger.dev SDK v4. Belangrijkste gedragingen:

- **Geen lokale timers**: draait niet `setInterval` -- de daadwerkelijke uitvoering wordt afgehandeld door het Trigger.dev-werkproces.
- **Lazy SDK laden**: importeert dynamisch `@trigger.dev/sdk` om bundelproblemen te voorkomen.
- **Interval-naar-cron-conversie**: Converteert millisecondenintervallen naar cron-expressies voor de Trigger.dev API.
- **Metrische registratie**: registreert uitvoeringsstatistieken wanneer de werknemer de run-handler aanroept.

### Configuratie

Stel de volgende omgevingsvariabelen in om Trigger.dev in te schakelen:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

De manager wordt alleen geactiveerd als aan al deze voorwaarden is voldaan:
1. `TRIGGER_DEV_API_KEY` en `TRIGGER_DEV_API_URL` zijn beide ingesteld ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` is `true` 3. `NODE_ENV` is `production` ## NoOpJobManager (uitgeschakeld)

Wanneer `DISABLE_AUTO_SYNC=true` in ontwikkeling is, negeert de `NoOpJobManager` stil alle geplande oproepen. Elke methode is een no-op en de statistieken blijven op nul staan. Dit is handig voor:

- De ontwikkelserver draaien zonder achtergrondgeluid
- Foutopsporing in frontend-only functies
- Vermindering van het gebruik van bronnen tijdens de ontwikkeling van de gebruikersinterface

## Geregistreerde banen

In `lib/background-jobs/initialize-jobs.ts` worden banen centraal geregistreerd. Deze module draait tijdens het opstarten van de applicatie via de instrumentatiehaak.

### Kerntaken

| Taak-ID | Naam | Schema | Beschrijving |
|---|---|---|---|
| `repository-sync` | Synchronisatie van opslagplaatsen | Elke 5 minuten | Synchroniseert inhoud uit de op Git gebaseerde CMS-repository |
| `subscription-renewal-reminder` | Herinnering voor abonnementsverlenging | Dagelijks om 9.00 uur | Stuurt e-mailherinneringen voor abonnementen die binnen 7 dagen verlopen |
| `subscription-expired-cleanup` | Opschonen van vervaldatum van abonnement | Dagelijks om middernacht | Verwerkt en laat abonnementen verlopen na de einddatum |

### Analytics-banen

Geregistreerd door `AnalyticsBackgroundProcessor` in `lib/services/analytics-background-processor.ts` :

| Taak-ID | Naam | Interval |
|---|---|---|
| `analytics-user-growth` | Aggregatie van gebruikersgroei | 10 minuten |
| `analytics-activity-trends` | Aggregatie van activiteitstrends | 5 minuten |
| `analytics-top-items` | Topitems rangschikking | 15 minuten |
| `analytics-recent-activity` | Recente activiteitsupdate | 2 minuten |
| `analytics-performance-metrics` | Update prestatiestatistieken | 30 seconden |
| `analytics-cache-cleanup` | Cache opruimen | 1 uur |

### Definities van triggertaak-ID's

Taak-ID's en cron-schema's worden gedefinieerd in `lib/background-jobs/triggers/` :

| Bestand | Taak-ID's | Doel |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Analytics-cache opwarmen en opschonen |
| `sync.ts` | `SyncTaskIds` | Synchronisatie van opslagplaatsen |
| `subscriptions.ts` | `SubscriptionTaskIds` | Beheer van de levenscyclus van abonnementen |
| `reports.ts` | `ReportTaskIds` | Geplande generatie van rapporten |

## Vercel Cron-integratie

Wanneer ze bij Vercel worden geïmplementeerd, kunnen achtergrondtaken ook worden geactiveerd via Vercel Cron Jobs die zijn geconfigureerd in `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

Deze eindpunten raken API-routes die dezelfde taaklogica uitvoeren en een platformeigen planningsmechanisme op Vercel bieden.

## Een nieuwe achtergrondtaak toevoegen

### Stap 1: Taak-ID's definiëren (optioneel)

Maak of update een bestand in `lib/background-jobs/triggers/` :

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

### Stap 2: Implementeer de taakfunctie

Creëer de takenlogica in `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Stap 3: Registreer u in initialize-jobs.ts

Voeg de taak toe aan `lib/background-jobs/initialize-jobs.ts` :

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

**Belangrijk**: gebruik dynamische `import()` in de taakaanroep om te voorkomen dat webpack Node.js-modules bundelt tijdens de bouwfase.

### Stap 4: Vercel Cron toevoegen (optioneel)

Als u implementeert op Vercel, voegt u een cron-eindpunt toe aan `vercel.json` en maakt u de bijbehorende API-route:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Monitoring en foutopsporing

### Taakstatus controleren

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Handmatige taaktriggering

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Banen in de ontwikkeling uitschakelen

Stel de omgevingsvariabele in om alle achtergrondtaken over te slaan:

```bash
DISABLE_AUTO_SYNC=true
```

Hierdoor wordt de `NoOpJobManager` geactiveerd, die alle geplande oproepen stil negeert.

## Beste praktijken

1. **Gebruik altijd dynamische import** bij het terugbellen van vacatures die zijn geregistreerd in `initialize-jobs.ts` om problemen met het bundelen van webpakketten te voorkomen.
2. **Taakfuncties idempotent houden**: taken kunnen meer dan één keer worden uitgevoerd als er timingoverlappingen of nieuwe pogingen zijn.
3. **Gebruik gestructureerde logboekregistratie** met een voorvoegsel `[JobName]` voor eenvoudiger logfilteren.
4. **Retourneer resultaatobjecten** uit functiefuncties (zoals `JobResult` in `subscription-jobs.ts` ) voor zichtbaarheid.
5. **Ga op een correcte manier om met fouten**: de manager vangt fouten op en registreert deze, maar uw taaklogica zou gedeeltelijke fouten moeten afhandelen.
6. **Test met de LocalJobManager** in ontwikkeling voordat u deze implementeert op Trigger.dev.
