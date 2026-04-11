---
id: background-jobs
title: Trabajos en segundo plano
sidebar_label: Trabajos en segundo plano
sidebar_position: 4
---

# Trabajos en segundo plano

La plantilla Ever Works incluye un sólido sistema de trabajo en segundo plano con una arquitectura conectable que admite múltiples servidores de programación. Los trabajos se ejecutan automáticamente para tareas como la sincronización del repositorio, la gestión de suscripciones y el calentamiento de la caché de análisis.

## Descripción general de la arquitectura

El sistema de trabajo en segundo plano sigue un **patrón de estrategia** con una interfaz `BackgroundJobManager` común y tres implementaciones intercambiables:

| Componente | Archivo | Propósito |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Contrato de interfaz para todos los directivos |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | Programación basada en `setInterval` para el desarrollo |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Integración de Trigger.dev SDK v4 para producción |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | No operativo silencioso para entornos discapacitados |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Lógica de creación de fábrica + singleton |
| `config.ts` | `lib/background-jobs/config.ts` | Resolución del modo de programación |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Registro de empleo centralizado |

### Resolución del modo de programación

El sistema determina qué administrador utilizar según la configuración del entorno, siguiendo un estricto orden de prioridad:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

La lógica de resolución vive en `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## La interfaz de BackgroundJobManager

Todos los administradores implementan la misma interfaz definida en `lib/background-jobs/types.ts` :

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

### Tipos de claves

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

## Fábrica de trabajos y Singleton

La fábrica en `lib/background-jobs/job-factory.ts` crea el administrador apropiado y expone un singleton:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

El singleton garantiza que solo exista una instancia de administrador por proceso. Utilice `resetJobManager()` en las pruebas para borrar la instancia.

## LocalJobManager (Desarrollo)

El `LocalJobManager` usa `setInterval` y `setTimeout` para programar. Proporciona:

- **Prevención de superposición**: omite la ejecución si todavía hay una ejecución anterior del mismo trabajo en curso.
- **Seguimiento de métricas**: realiza un seguimiento de las ejecuciones totales, los recuentos de éxito/fracaso y la duración promedio.
- **Conversión de cron a intervalo**: convierte expresiones cron comunes a intervalos de milisegundos para una programación local aproximada.
- **Modo de desarrollo silencioso**: Reduce el ruido de registro cuando `NODE_ENV=development` .

Conversiones cron admitidas:

| Expresión cron | Intervalo |
|---|---|
| `*/30 * * * * *` | 30 segundos |
| `*/2 * * * *` | 2 minutos |
| `*/5 * * * *` | 5 minutos |
| `*/15 * * * *` | 15 minutos |
| `0 * * * *` | 1 hora |
| `0 9 * * *` | 24 horas |

## TriggerDevJobManager (Producción)

El `TriggerDevJobManager` registra horarios con Trigger.dev SDK v4. Comportamientos clave:

- **Sin temporizadores locales**: no se ejecuta `setInterval` ; la ejecución real la maneja el proceso de trabajo Trigger.dev.
- **Carga diferida del SDK**: importa dinámicamente `@trigger.dev/sdk` para evitar problemas de agrupación.
- **Conversión de intervalo a cron**: convierte intervalos de milisegundos en expresiones cron para la API Trigger.dev.
- **Registro de métricas**: registra las métricas de ejecución cuando el trabajador invoca el controlador de ejecución.

### Configuración

Configure las siguientes variables de entorno para habilitar Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

El administrador solo se activa cuando se cumplen todas estas condiciones:
1. `TRIGGER_DEV_API_KEY` y `TRIGGER_DEV_API_URL` están configurados ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` es `true` 3. `NODE_ENV` es `production` ## NoOpJobManager (deshabilitado)

Cuando `DISABLE_AUTO_SYNC=true` está en desarrollo, `NoOpJobManager` ignora silenciosamente todas las llamadas de programación. Todos los métodos no son operativos y las métricas permanecen en cero. Esto es útil para:

- Ejecutar el servidor de desarrollo sin ruido de fondo.
- Depuración de funciones exclusivas del frontend
- Reducir el uso de recursos durante el desarrollo de la interfaz de usuario.

## Trabajos registrados

Los trabajos se registran centralmente en `lib/background-jobs/initialize-jobs.ts` . Este módulo se ejecuta durante el inicio de la aplicación a través del enlace de instrumentación.

### Trabajos principales

| ID de trabajo | Nombre | Horario | Descripción |
|---|---|---|---|
| `repository-sync` | Sincronización del repositorio | Cada 5 minutos | Sincroniza contenido del repositorio CMS basado en Git |
| `subscription-renewal-reminder` | Recordatorio de renovación de suscripción | Todos los días a las 9:00 a. m. | Envía recordatorios por correo electrónico para suscripciones que vencen en 7 días |
| `subscription-expired-cleanup` | Limpieza de vencimiento de suscripción | Todos los días a medianoche | Procesa y vence las suscripciones después de su fecha de finalización |

### Trabajos de análisis

Registrado por `AnalyticsBackgroundProcessor` en `lib/services/analytics-background-processor.ts` :

| ID de trabajo | Nombre | Intervalo |
|---|---|---|
| `analytics-user-growth` | Agregación de crecimiento de usuarios | 10 minutos |
| `analytics-activity-trends` | Agregación de tendencias de actividad | 5 minutos |
| `analytics-top-items` | Clasificación de artículos principales | 15 minutos |
| `analytics-recent-activity` | Actualización de actividad reciente | 2 minutos |
| `analytics-performance-metrics` | Actualización de métricas de rendimiento | 30 segundos |
| `analytics-cache-cleanup` | Limpieza de caché | 1 hora |

### Definiciones de ID de tarea de activación

Los ID de tarea y los cronogramas cron se definen en `lib/background-jobs/triggers/` :

| Archivo | ID de tarea | Propósito |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Calentamiento y limpieza de caché de análisis |
| `sync.ts` | `SyncTaskIds` | Sincronización del repositorio |
| `subscriptions.ts` | `SubscriptionTaskIds` | Gestión del ciclo de vida de la suscripción |
| `reports.ts` | `ReportTaskIds` | Generación de informes programados |

## Integración Vercel Cron

Cuando se implementan en Vercel, los trabajos en segundo plano también se pueden activar a través de Vercel Cron Jobs configurado en `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

Estos puntos finales acceden a rutas API que ejecutan la misma lógica de trabajo, lo que proporciona un mecanismo de programación nativo de la plataforma en Vercel.

## Agregar un nuevo trabajo en segundo plano

### Paso 1: Definir ID de tarea (opcional)

Cree o actualice un archivo en `lib/background-jobs/triggers/` :

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

### Paso 2: Implementar la función laboral

Cree la lógica del trabajo en `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Paso 3: Regístrese en inicializar-jobs.ts

Agregue el trabajo a `lib/background-jobs/initialize-jobs.ts` :

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

**Importante**: Utilice la dinámica `import()` dentro de la devolución de llamada del trabajo para evitar que el paquete web agrupe módulos de Node.js durante la fase de compilación.

### Paso 4: Agregar Vercel Cron (opcional)

Si realiza la implementación en Vercel, agregue un punto final cron a `vercel.json` y cree la ruta API correspondiente:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Monitoreo y depuración

### Comprobando el estado del trabajo

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Activación manual de trabajos

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Deshabilitar trabajos en desarrollo

Configure la variable de entorno para omitir todos los trabajos en segundo plano:

```bash
DISABLE_AUTO_SYNC=true
```

Esto activa el `NoOpJobManager` , que ignora silenciosamente todas las llamadas programadas.

## Mejores prácticas

1. **Utilice siempre importaciones dinámicas** en las devoluciones de llamada de trabajos registradas en `initialize-jobs.ts` para evitar problemas de agrupación de paquetes web.
2. **Mantener las funciones de trabajo idempotentes**: los trabajos pueden ejecutarse más de una vez si hay superposiciones de tiempos o reintentos.
3. **Utilice registro estructurado** con un prefijo `[JobName]` para facilitar el filtrado de registros.
4. **Devolver objetos de resultados** de funciones de trabajo (como `JobResult` en `subscription-jobs.ts` ) para su observabilidad.
5. **Maneje los errores con elegancia**: el administrador detecta y registra los errores, pero la lógica de su trabajo debe manejar fallas parciales.
6. **Pruebe con LocalJobManager** en desarrollo antes de implementarlo en Trigger.dev.
