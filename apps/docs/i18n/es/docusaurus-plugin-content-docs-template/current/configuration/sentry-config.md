---
id: sentry-config
title: Configuración de Sentry
sidebar_label: Conf. de Sentry
sidebar_position: 10
---

# Configuración de Sentry

Esta página documenta la integración de Sentry para el seguimiento de errores, el monitoreo de rendimiento y la repetición de sesiones en el template. La configuración está dividida en tres archivos: `sentry.config.ts` (plugin webpack), `instrumentation.ts` (inicialización del lado del servidor) y `instrumentation-client.ts` (inicialización del lado del cliente).

## Descripción General

El template usa el SDK `@sentry/nextjs` para capturar errores y datos de rendimiento tanto en el servidor como en el cliente. Sentry es completamente opcional -- si no hay DSN configurado, toda la inicialización de Sentry se omite.

## Configuración del Plugin Webpack

El archivo `sentry.config.ts` en la raíz del proyecto configura el plugin webpack de Sentry utilizado durante la compilación:

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### Opciones del Plugin

| Opción | Predeterminado | Descripción |
|--------|---------|-------------|
| `silent` | `true` | Suprime la salida de consola del plugin webpack durante las compilaciones |
| `org` | variable de entorno `SENTRY_ORG` | El slug de tu organización Sentry |
| `project` | variable de entorno `SENTRY_PROJECT` | El slug de tu proyecto Sentry |
| `widenClientFileUpload` | `true` | Sube un conjunto más amplio de archivos fuente del lado del cliente para mejores stack traces |
| `transpileClientSDK` | `true` | Transpila el SDK de Sentry para mayor compatibilidad con navegadores |
| `tunnelRoute` | `"/monitoring"` | Hace proxy de las solicitudes de Sentry a través de tu app para evitar bloqueadores de anuncios |
| `hideSourceMaps` | `true` | Impide que los source maps sean accesibles públicamente en producción |
| `disableLogger` | `true` | Deshabilita el logger de Sentry para reducir el tamaño del bundle |

### Integración con la Configuración de Next.js

Las opciones del plugin se consumen en `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Variables de Entorno

Sentry depende de estas variables de entorno, definidas en `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Variable | Requerida | Descripción |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | El DSN de Sentry (Data Source Name). Si no se establece, Sentry está deshabilitado. |
| `SENTRY_ORG` | No | Slug de la organización Sentry para subidas de source map |
| `SENTRY_PROJECT` | No | Slug del proyecto Sentry para subidas de source map |
| `SENTRY_AUTH_TOKEN` | No | Token de autenticación para subir source maps durante las compilaciones |
| `SENTRY_ENABLE_DEV` | No | Establece en `"true"` para habilitar Sentry en modo desarrollo |
| `SENTRY_DEBUG` | No | Establece en `"true"` para habilitar el logging de depuración del SDK de Sentry |

## Inicialización en el Servidor

Sentry del lado del servidor se inicializa en `instrumentation.ts`, que se ejecuta una vez cuando el servidor Next.js inicia:

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,
      tracesSampleRate:
        process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: SENTRY_DEBUG.value === "true",
    });
  }

  // Database initialization follows...
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### Tasas de Muestreo del Servidor

- **Producción:** muestreo de traza al 10% (`0.1`) para equilibrar costo y visibilidad
- **Desarrollo:** muestreo de traza al 100% (`1.0`) para visibilidad completa de depuración

### Reporte de Errores

Los fallos de inicialización de la base de datos se reportan a Sentry con etiquetas contextuales:

```ts
if (SENTRY_DSN.value) {
  Sentry.captureException(error, {
    tags: {
      component: "instrumentation",
      phase: "database_init",
      environment:
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        "unknown",
    },
  });
}
```

## Inicialización en el Cliente

Sentry del lado del cliente se inicializa en `instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
    return;

  Sentry.init({
    dsn: SENTRY_DSN.value,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: SENTRY_DEBUG.value === "true",

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Router transition instrumentation
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### Características del Cliente

La **Repetición de Sesión** está configurada con valores predeterminados orientados a la privacidad:

- `maskAllText: true` -- Todo el contenido de texto está enmascarado en las repeticiones
- `blockAllMedia: true` -- Todos los elementos multimedia están bloqueados en las repeticiones
- Las repeticiones de errores se capturan al 100% (`replaysOnErrorSampleRate: 1.0`)
- Las repeticiones de sesión generales se capturan al 10% en producción

Las **Transiciones del Router** se instrumentan a través de `onRouterTransitionStart` para rastrear el rendimiento de navegación de páginas.

## Ruta de Túnel

La opción `tunnelRoute: "/monitoring"` hace proxy de las transmisiones de eventos de Sentry a través de tu aplicación en el endpoint `/monitoring`. Esto ayuda a evitar los bloqueadores de anuncios y las políticas de seguridad de contenido que podrían bloquear las solicitudes directas a los servidores de Sentry.

## Resumen de Tasas de Muestreo

| Métrica | Desarrollo | Producción |
|---------|------------|-----------|
| Tasa de muestreo de traza (servidor) | 100% | 10% |
| Tasa de muestreo de traza (cliente) | 100% | 10% |
| Tasa de repetición de errores | 100% | 100% |
| Tasa de repetición de sesión | 100% | 10% |

## Habilitando Sentry

Para habilitar Sentry en tu despliegue:

1. Crea un proyecto Sentry en [sentry.io](https://sentry.io)
2. Establece las variables de entorno requeridas:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. Para desarrollo, también establece:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Recursos Relacionados

- [Guía de Instrumentación](/template/guides/instrumentation) -- Documentación completa del ciclo de vida de la instrumentación
- [Patrones de Manejo de Errores](/template/guides/error-handler-patterns) -- Cómo se estructuran y registran los errores
- [Referencia de Entorno](/template/configuration/environment-reference) -- Todas las variables de entorno
