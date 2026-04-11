---
id: admin-analytics
title: Análisis de administración
sidebar_label: Análisis de administración
sidebar_position: 32
---

# Análisis de administración

El sistema de análisis de administración proporciona estadísticas de toda la plataforma, métricas de participación, seguimiento del crecimiento de los usuarios y procesamiento de datos en segundo plano. Combina consultas de bases de datos en tiempo real, agregaciones en caché e integración opcional de PostHog para un análisis integral.

## Descripción general de la arquitectura

| Módulo | Camino | Propósito |
|--------|------|---------|
| Repositorio de estadísticas de administración | `lib/repositories/admin-stats.repository.ts` | Estadísticas del panel central |
| Consultas del panel | `lib/db/queries/dashboard.queries.ts` | Consultas de agregación de participación |
| Consultas de participación | `lib/db/queries/engagement.queries.ts` | Métricas por artículo |
| Procesador en segundo plano de análisis | `lib/services/analytics-background-processor.ts` | Programador de trabajos en segundo plano |
| Cliente de análisis | `lib/analytics/index.ts` | Integración PostHog/Sentry del lado del cliente |
| Servicio API PostHog | `lib/services/posthog-api.service.ts` | Consultas PostHog del lado del servidor |
| Exportación de análisis | `lib/services/analytics-export.service.ts` | Funcionalidad de exportación de datos |
| Informes programados | `lib/services/analytics-scheduled-reports.service.ts` | Generación automatizada de informes |

## Estadísticas del panel de administración

El `AdminStatsRepository` agrega cuatro categorías de estadísticas utilizando `Promise.allSettled` para una carga de datos resiliente:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### Estadísticas de usuario

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

Las consultas utilizan límites de fechas normalizadas en UTC para garantizar resultados consistentes independientemente de la zona horaria del servidor:

```ts
async getUserStats(): Promise<UserStats> {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStartUtc = new Date(todayUtc);
  // Monday-start week
  weekStartUtc.setUTCDate(
    todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7)
  );
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [total, today, week, month] = await Promise.all([
    db.select({ count: count() }).from(users)
      .where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc))),
    // ... week and month queries
  ]);
  // ...
}
```

### Estadísticas de envío

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Obtenido del método `ItemRepository.getStats()` ya que los elementos se encuentran en el CMS basado en Git.

### Estadísticas de actividad

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

Las vistas provienen de PostHog cuando se configuran y vuelven a cero:

```ts
const [totalVotesResult, totalCommentsResult, totalViews] =
  await Promise.all([
    db.select({ count: count() }).from(votes),
    db.select({ count: count() }).from(comments)
      .where(isNull(comments.deletedAt)),
    postHogApiService.isConfigured()
      ? postHogApiService.getTotalPageViews()
      : Promise.resolve(0),
  ]);
```

### Estadísticas del boletín

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Procesamiento de análisis en segundo plano

El `AnalyticsBackgroundProcessor` programa seis trabajos recurrentes:

```ts
const JOB_INTERVALS = {
  USER_GROWTH: 10 * 60 * 1000,      // 10 minutes
  ACTIVITY_TRENDS: 5 * 60 * 1000,    // 5 minutes
  TOP_ITEMS: 15 * 60 * 1000,        // 15 minutes
  RECENT_ACTIVITY: 2 * 60 * 1000,   // 2 minutes
  PERFORMANCE_METRICS: 30 * 1000,    // 30 seconds
  CACHE_CLEANUP: 60 * 60 * 1000,    // 1 hour
};
```

| Trabajo | Intervalo | Propósito |
|-----|----------|---------|
| Agregación de crecimiento de usuarios | 10 minutos | Actualiza las tendencias de crecimiento de usuarios |
| Agregación de tendencias de actividad | 5 minutos | Actualiza la serie temporal de participación |
| Clasificación de artículos principales | 15 minutos | Recalcula las clasificaciones de popularidad de los artículos |
| Actualización de actividad reciente | 2 minutos | Actualiza el feed de actividades más reciente |
| Actualización de métricas de rendimiento | 30 segundos | Actualiza datos de rendimiento en tiempo real |
| Limpieza de caché | 1 hora | Elimina agregaciones almacenadas en caché obsoletas |

Los trabajos se pueden desactivar configurando `DISABLE_AUTO_SYNC=true` .

Cada trabajo rastrea su propio estado:

```ts
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

## Métricas de participación

### Métricas por artículo

La función `getEngagementMetricsPerItem` recupera todas las métricas en paralelo:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Se ejecutan cuatro consultas paralelas:

1. Ver recuentos desde `item_views` 2. Puntajes netos de votos de `votes` (voto a favor = +1, voto en contra = -1)
3. Favorito cuenta desde `favorites` 4. Recuento de comentarios y calificaciones promedio de `comments` (excluidos los eliminados temporalmente)

### Puntuación de popularidad

Los ítems se puntúan mediante un algoritmo logarítmico:

```ts
// Approximate max scores at 1M interactions:
// Featured: 10,000 points (base boost)
// Views: ~6,000 points (weight: 1000)
// Votes: ~7,200 points (weight: 1200)
// Rating: 0-2,500 points (linear, 500 per star)
// Favorites: ~6,600 points (weight: 1100)
// Comments: ~6,000 points (weight: 1000)
// Recency: 0-1,750 points (decay over 180 days)
```

## Análisis del lado del cliente

La clase singleton `Analytics` en `lib/analytics/index.ts` gestiona el seguimiento del lado del cliente:

```ts
export class Analytics {
  init()                                    // Initialize PostHog
  identify(userId, properties?)             // Identify user
  track(eventName, properties?)             // Custom events
  trackPageView(url, properties?)           // Page views
  isFeatureEnabled(flagKey, defaultValue?)  // Feature flags
  captureException(error, context?)         // Error tracking
  setUserProperties(properties)             // User attributes
  setSuperProperties(properties)            // Global event properties
}
```

### Proveedores de seguimiento de excepciones

El módulo de análisis admite tres configuraciones de seguimiento de excepciones:

| Proveedor | Descripción |
|----------|-------------|
| `posthog` | Errores enviados sólo a PostHog |
| `sentry` | Errores enviados sólo a Sentry |
| `both` | Errores enviados tanto a PostHog como a Sentry |

El proveedor se determina a partir de `EXCEPTION_TRACKING_PROVIDER` con respaldo automático si el proveedor configurado no está disponible.

### Configuración de PostHog

```ts
const config = {
  api_host: POSTHOG_HOST,
  debug: POSTHOG_DEBUG,
  capture_pageview: POSTHOG_AUTO_CAPTURE,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-mask]",
    sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  },
};
```

Las tasas de muestreo controlan el porcentaje de sesiones de las que se realiza un seguimiento, configuradas mediante variables de entorno.

## Consultas de datos del panel

### Tendencias de participación semanales

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Utiliza PostgreSQL `to_char(date, 'IYYY-IW')` para agrupar semanas ISO.

### Desglose de actividad diaria

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string;
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

### Artículos con mejor rendimiento

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Los elementos se clasifican según la participación total (votos más comentarios).

## Carga de datos resistente

El método `getAllStats` utiliza `Promise.allSettled` para garantizar que las fallas parciales no rompan el tablero:

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);

  // Each section falls back to zero values on rejection
  const users =
    u.status === 'fulfilled'
      ? u.value
      : {
          totalUsers: 0,
          registeredUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
        };
  // ... similar for submissions, activity, newsletter
}
```

## Requisitos de permiso

Las funciones de análisis están controladas por el sistema de permisos:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Acceso a funciones basadas en planes:

| Característica | Gratis | Estándar | Prémium |
|---------|------|----------|---------|
| Ver estadísticas | No | Sí | Sí |
| Análisis avanzado | No | No | Sí |

## Documentación relacionada

- [Antecedentes de Analytics](/docs/template/services/analytics-background) -- Detalles del procesamiento en segundo plano
- [Servicio PostHog](/docs/template/services/posthog-service) -- API del lado del servidor de PostHog
- [Servicio de exportación](/docs/template/services/export-service) -- Exportación de datos
- [Servicio de actividad](/docs/template/services/activity-service) -- Seguimiento de la actividad del usuario
- [Servicio de participación](/docs/template/services/engagement-services) -- Puntuación de popularidad
