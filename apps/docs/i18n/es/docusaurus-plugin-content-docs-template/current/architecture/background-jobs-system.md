---
id: background-jobs-system
title: Sistema de trabajos en segundo plano
sidebar_label: Trabajos en segundo plano
sidebar_position: 38
---

# Sistema de trabajos en segundo plano

La plantilla incluye un sistema de trabajos en segundo plano extensible con tres implementaciones intercambiables: un administrador local basado en `setInterval` para desarrollo, una integración Trigger.dev para producción y un administrador no operativo para deshabilitar trabajos por completo.

## Estructura de archivos

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

## La interfaz `BackgroundJobManager`

Todas las implementaciones comparten una interfaz común:

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

### Tipos de estado y métricas

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

## Fábrica de trabajos (`job-factory.ts`)

La fábrica crea el administrador adecuado según el entorno:

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

### Lógica de selección

La fábrica sigue este orden de prioridad:

1. **NoOpJobManager** - Si `DISABLE_AUTO_SYNC=true` está en desarrollo
2. **TriggerDevJobManager**: si Trigger.dev está completamente configurado y habilitado en producción
3. **LocalJobManager**: respaldo para todos los demás entornos

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

## Administrador de trabajos locales

Utiliza `setInterval` para programar. Ideal para desarrollo e implementaciones autohospedadas:

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

### Conversión de cron a intervalo

`LocalJobManager` convierte expresiones cron comunes en intervalos aproximados:

|Patrón cron|Intervalo|
|-------------|----------|
| `*/30 * * * * *` |30 segundos|
| `*/2 * * * *` |2 minutos|
| `*/5 * * * *` |5 minutos|
| `*/10 * * * *` |10 minutos|
| `*/15 * * * *` |15 minutos|
| `0 * * * *` |1 hora|
| `0 9 * * *` |24 horas|
|Otro|1 minuto (predeterminado)|

### Guardias de ejecución

El administrador local evita ejecuciones superpuestas. Si un trabajo ya se está ejecutando cuando se activa su intervalo, se omite la ejecución:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Registra trabajos con el SDK de Trigger.dev para su ejecución basada en la nube. En producción, la programación y ejecución reales las maneja el trabajador Trigger.dev, no los temporizadores locales.

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

### Cómo funciona

1. `scheduleJob` convierte el intervalo en una expresión cron
2. `registerTask` carga perezosamente `@trigger.dev/sdk` y llama a `schedules.task()`
3. El controlador de ejecución registra métricas cuando lo ejecuta el trabajador Trigger.dev
4. `stopJob` solo borra el estado local (los horarios remotos se administran a través del panel de Trigger.dev)

## NoOpJobManager

Todas las operaciones son prohibidas. Se utiliza cuando los trabajos en segundo plano están deshabilitados:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Configuración (`config.ts`)

### Configuración de Trigger.dev

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

### Modo de programación

La función `getSchedulingMode` determina qué sistema usar:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Orden de prioridad:

1. **deshabilitado** - `DISABLE_AUTO_SYNC` es veraz
2. **trigger-dev** - Completamente configurado y habilitado en producción
3. **vercel** - Ejecutándose en la plataforma Vercel
4. **local** - Reserva

## Registro de empleo (`initialize-jobs.ts`)

Todos los trabajos en segundo plano se registran centralmente a través de `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Empleos registrados

|ID de trabajo|Nombre|Horario|Descripción|
|--------|------|----------|-------------|
|`repository-sync`|Sincronización del repositorio|Cada 5 minutos|Sincroniza el contenido del CMS basado en Git|
|`subscription-renewal-reminder`|Recordatorio de renovación de suscripción|Todos los días a las 9:00 a.m.|Envía recordatorios de suscripciones vencidas|
|`subscription-expired-cleanup`|Limpieza de vencimiento de suscripción|Diariamente a medianoche|Procesa y vence las suscripciones vencidas|

### Guardia Singleton

La función de inicialización incluye una protección singleton para evitar el doble registro:

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

Las importaciones dinámicas dentro de las devoluciones de llamadas de trabajos evitan que el paquete web analice la cadena de dependencia completa en el momento de la compilación.

## Variables de entorno

|variable|Requerido|Descripción|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|Para Trigger.dev|Clave API para Trigger.dev|
|`TRIGGER_DEV_API_URL`|No|URL de API personalizada (predeterminada: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|No|Habilitar Trigger.dev (predeterminado: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|No|Nombre del entorno (predeterminado: `development`)|
|`DISABLE_AUTO_SYNC`|No|Establezca en `true` para desactivar todos los trabajos en segundo plano.|
|`VERCEL`|Configuración automática|Establecido en `1` por la plataforma Vercel|

## Archivos relacionados

- `lib/background-jobs/index.ts` - Exportaciones de API públicas
- `lib/background-jobs/types.ts` - Definiciones de interfaz y tipo
- `lib/background-jobs/config.ts` - Ayudantes de configuración
- `lib/background-jobs/job-factory.ts` - Fábrica y singleton
- `lib/background-jobs/local-job-manager.ts` - Implementación local
- `lib/background-jobs/trigger-dev-job-manager.ts` - Implementación de Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - Implementación sin operación
- `lib/background-jobs/initialize-jobs.ts` - Registro de empleo
- `lib/services/sync-service.ts` - Servicio de sincronización del repositorio
- `lib/services/subscription-jobs.ts` - Implementaciones de trabajos de suscripción
