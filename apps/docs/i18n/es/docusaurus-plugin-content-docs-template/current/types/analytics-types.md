---
id: analytics-types
title: Definiciones de tipos de análisis
sidebar_label: Tipos de análisis
sidebar_position: 16
---

# Definiciones de tipos de análisis

**Fuente:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Los tipos de análisis configuran proveedores de seguimiento y definen las estructuras de datos para métricas de participación, vistas de páginas y estadísticas del panel.

## Tipos de configuración de proveedor

### `AnalyticsConfig`

Configuración de análisis de nivel superior, inferida del esquema Zod.

```typescript
interface AnalyticsConfig {
  exceptionTrackingProvider: 'posthog' | 'sentry' | 'none';
  analyze: boolean;
  posthog: PostHogConfig;
  sentry: SentryConfig;
  recaptcha: RecaptchaConfig;
  vercel: VercelAnalyticsConfig;
}
```

### Configuración de PostHog

```typescript
interface PostHogConfig {
  enabled: boolean;                   // Auto-detected from key presence
  key?: string;                        // NEXT_PUBLIC_POSTHOG_KEY
  host: string;                        // Default: 'https://us.i.posthog.com'
  debug: boolean;
  sessionRecordingEnabled: boolean;    // Default: true
  autoCapture: boolean;                // Default: false
  exceptionTracking: boolean;          // Default: true
  personalApiKey?: string;             // Server-side API key for admin
  projectId?: string;                  // PostHog project identifier
}
```

|campo|Predeterminado|Descripción|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|Punto final de ingestión de PostHog|
|`sessionRecordingEnabled`|`true`|Capturar repeticiones de sesiones|
|`autoCapture`|`false`|Seguimiento automático de clics, páginas vistas, etc.|
|`exceptionTracking`|`true`|Reenviar excepciones de JS a PostHog|

### Configuración centinela

```typescript
interface SentryConfig {
  enabled: boolean;           // Auto-detected from DSN presence
  dsn?: string;
  org?: string;
  project?: string;
  authToken?: string;
  enableDev: boolean;         // Default: false
  debug: boolean;             // Default: false
  exceptionTracking: boolean; // Default: true
}
```

### Configuración de recaptcha

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Configuración de análisis de Vercel

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Constantes de seguimiento del espectador

Definido en `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Estas constantes impulsan el sistema anónimo de conteo de vistas. Cada visitante recibe una cookie persistente que se utiliza para eliminar duplicados del recuento de vistas diarias sin necesidad de autenticación.

## Esquema de base de datos: participación

La tabla `engagement` en `lib/db/schema.ts` realiza un seguimiento de los análisis a nivel de elemento:

```typescript
// Key columns from the engagement table
{
  id: serial,
  itemId: text,             // Item slug or ID
  viewCount: integer,       // Total page views
  uniqueViewCount: integer, // Unique daily viewers
  clickCount: integer,      // Outbound link clicks
  shareCount: integer,      // Social share actions
  lastViewedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

## Esquema de base de datos: registros de actividad

La tabla `activityLogs` registra las acciones del usuario y del administrador:

```typescript
{
  id: serial,
  userId: text,        // FK -> users.id (admin actions)
  clientId: text,      // FK -> clientProfiles.id (client actions)
  action: text,        // Action identifier string
  timestamp: timestamp,
  ipAddress: varchar(45),
}
```

## Selección de proveedor de seguimiento de excepciones

El campo `exceptionTrackingProvider` determina qué servicio recibe excepciones no controladas:

|Valor|Comportamiento|
|-------|-----------|
|`posthog`|Excepciones enviadas a PostHog (predeterminado)|
|`sentry`|Excepciones enviadas a Sentry|
|`none`|Sin reenvío de excepción|

## Ejemplo de uso

```typescript
import { analyticsConfig } from '@/lib/config/config-service';

// Check if PostHog is configured
if (analyticsConfig.posthog.enabled) {
  // Initialise PostHog client
}

// Check exception tracking provider
if (analyticsConfig.exceptionTrackingProvider === 'sentry') {
  // Initialise Sentry
}
```

## Tipos relacionados

- [Tipos de configuración](./config-types.md) -- `AppConfigSchema` que contiene `AnalyticsConfig`
- [Configuración/Análisis](../configuration/analytics-config.md) -- referencia de variable de entorno
