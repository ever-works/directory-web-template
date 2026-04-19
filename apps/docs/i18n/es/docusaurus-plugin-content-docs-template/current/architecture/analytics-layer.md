---
id: analytics-layer
title: "Capa de integración de análisis"
sidebar_label: "Capa de análisis"
sidebar_position: 28
---

# Capa de integración de análisis

El módulo de análisis (`lib/analytics/index.ts`) proporciona una capa de análisis unificada que abstrae el seguimiento de eventos de PostHog, el monitoreo de errores de Sentry y la evaluación de indicadores de funciones detrás de una única clase `Analytics`. El módulo utiliza el patrón singleton para garantizar una única instancia inicializada en toda la aplicación.

## Descripción general de la arquitectura

La capa de análisis envuelve dos proveedores:

- **PostHog**: seguimiento de eventos, visitas a páginas, identificación de usuarios, indicadores de funciones, grabación de sesiones y seguimiento de excepciones
- **Sentry** -- Monitoreo de errores y seguimiento de excepciones

Ambos proveedores son opcionales y se controlan mediante constantes de configuración del entorno. El módulo se degrada suavemente cuando los proveedores están deshabilitados.

## La clase de análisis

### Acceso único

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

La exportación `analytics` es un singleton preinicializado. La clase en sí también se exporta para uso de tipos:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Inicialización

El método `init()` debe llamarse una vez en el lado del cliente antes de cualquier llamada de seguimiento:

```ts
analytics.init();
```

#### ¿Qué sucede durante el inicio?

1. **Guardia SSR** -- Omite la inicialización si `window` no está definido
2. **Configuración de PostHog**: si está habilitado, inicializa PostHog con configuración centralizada
3. **Grabación de sesiones**: habilita condicionalmente la grabación de sesiones con enmascaramiento de entrada
4. **Muestreo**: aplica una tasa de muestreo de eventos (excluye a los usuarios aleatoriamente según `POSTHOG_SAMPLE_RATE`)
5. **Seguimiento de excepciones**: configura los controladores de errores globales de PostHog si están configurados
6. **Integración de Sentry**: vincula PostHog y Sentry cuando ambos están habilitados

#### Configuración de PostHog

El método init construye la configuración de PostHog a partir de constantes centralizadas:

```ts
const baseConfig: Partial<PostHogConfig> = {
  api_host: posthogHost,
  debug: POSTHOG_DEBUG.value === 'true',
  persistence: 'localStorage',
  capture_pageview: POSTHOG_AUTO_CAPTURE.value === 'true',
  capture_pageleave: true,
  enable_recording_console_log: POSTHOG_DEBUG.value === 'true',
  mask_all_element_attributes: false,
  mask_all_text: false,
  loaded: (posthog) => {
    if (POSTHOG_SAMPLE_RATE < 1) {
      if (Math.random() > POSTHOG_SAMPLE_RATE) {
        posthog.opt_out_capturing();
      }
    }
  },
};
```

Cuando la grabación de sesiones está habilitada, se fusionan configuraciones adicionales:

```ts
const config = POSTHOG_SESSION_RECORDING_ENABLED.value === 'true'
  ? {
      ...baseConfig,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-mask]',
        sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
      },
    }
  : baseConfig;
```

## Proveedores de seguimiento de excepciones

El módulo admite un seguimiento flexible de excepciones con cuatro modos de proveedor:

|Proveedor|Comportamiento|
|----------|----------|
|`'posthog'`|Excepciones enviadas solo a PostHog|
|`'sentry'`|Excepciones enviadas solo a Sentry|
|`'both'`|Excepciones enviadas tanto a PostHog como a Sentry|
|`'none'`|Seguimiento de excepciones deshabilitado|

El proveedor se determina automáticamente en el momento de la construcción según la configuración `EXCEPTION_TRACKING_PROVIDER` y la disponibilidad de cada proveedor:

```ts
private determineExceptionTrackingProvider(): ExceptionTrackingProvider {
  const provider = EXCEPTION_TRACKING_PROVIDER.value;

  // Validate availability and fall back gracefully
  if (provider === 'sentry' && !SENTRY_ENABLED) {
    return POSTHOG_ENABLED ? 'posthog' : 'none';
  }

  if (provider === 'posthog' && !POSTHOG_ENABLED) {
    return SENTRY_ENABLED ? 'sentry' : 'none';
  }

  // For 'both', check what's actually available
  if (provider === 'both') {
    const sentryAvailable = SENTRY_ENABLED;
    const posthogAvailable = POSTHOG_ENABLED;
    if (!sentryAvailable && !posthogAvailable) return 'none';
    if (!sentryAvailable) return 'posthog';
    if (!posthogAvailable) return 'sentry';
  }

  return provider;
}
```

## Referencia de API

### Identificación de usuario

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

El método `identify` configura al usuario en PostHog y Sentry simultáneamente. El método `reset` borra la identidad en ambos.

### Seguimiento de eventos

```ts
// Track a custom event
analytics.track('checkout_started', {
  plan: 'pro',
  source: 'pricing_page',
});

// Track a page view
analytics.trackPageView('/pricing', {
  referrer: document.referrer,
});
```

### Banderas de características

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

El método `isFeatureEnabled` devuelve `defaultValue` cuando PostHog no se inicializa o no se encuentra la bandera.

### Seguimiento de excepciones

```ts
// Capture an exception
analytics.captureException(new Error('Something went wrong'), {
  component: 'PaymentForm',
  action: 'submit',
});

// Capture from a string
analytics.captureException('Unexpected response format', {
  endpoint: '/api/data',
});
```

El método `captureException` enruta al proveedor configurado:

```ts
captureException(error: Error | string, context?: Record<string, any>) {
  const errorObject =
    typeof error === 'string' ? new Error(error) : error;

  // Send to PostHog
  if (POSTHOG_ENABLED && (provider === 'posthog' || provider === 'both')) {
    this.track('$exception', {
      $exception_message: errorObject.message,
      $exception_type: errorObject.name,
      $exception_stack_trace_raw: errorObject.stack,
      $exception_handled: true,
      ...context,
    });
  }

  // Send to Sentry
  if (SENTRY_ENABLED && (provider === 'sentry' || provider === 'both')) {
    Sentry.captureException(errorObject, {
      extra: context,
    });
  }
}
```

### Usuario y Superpropiedades

```ts
// Set persistent user properties
analytics.setUserProperties({
  plan: 'pro',
  company: 'Acme Inc',
});

// Set super properties (sent with every event)
analytics.setSuperProperties({
  app_version: '1.0.0',
  environment: 'production',
});
```

## Configuración de seguimiento de excepciones de PostHog

Cuando el seguimiento de excepciones de PostHog está habilitado, el módulo instala controladores de errores globales:

```ts
private setupPostHogExceptionTracking() {
  // Override window.onerror
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    this.captureException(error || new Error(String(message)), {
      source,
      lineno,
      colno,
      type: 'window.onerror',
    });
    // Chain to original handler
    if (typeof originalOnError === 'function') {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    this.captureException(
      new Error(event.reason?.message || String(event.reason)),
      { type: 'unhandledrejection' }
    );
  });
}
```

Esto captura tanto los errores sincrónicos (`window.onerror`) como los rechazos de promesas no controlados.

## Integración Sentry-PostHog

Cuando ambos proveedores están configurados con el modo `'both'`, el módulo los vincula agregando un procesador de eventos Sentry que reenvía errores a PostHog:

```ts
Sentry.addIntegration({
  name: 'PostHog',
  setupOnce() {
    Sentry.addEventProcessor((event) => {
      if (event.user) {
        posthog.capture('sentry_error', {
          error: event.message,
          error_id: event.event_id,
          error_type: event.type,
          error_context: event.contexts,
          error_tags: event.tags,
        });
      }
      return event;
    });
  },
});
```

Esto le proporciona errores de Sentry en PostHog para correlacionarlos con las sesiones de los usuarios.

## Guardias de seguridad

Cada método público incluye tres controles de seguridad:

1. **Comprobación de inicialización** -- `if (!this.initialized)` evita llamadas antes de `init()`
2. **Verificación de proveedor** -- `if (!POSTHOG_ENABLED)` omite cuando el proveedor está deshabilitado
3. **Guardia SSR** -- `if (typeof window === 'undefined')` evita llamadas del lado del servidor

Estos guardias garantizan que el módulo de análisis nunca falle en ningún entorno.

## Constantes de configuración

El módulo lee desde constantes centralizadas definidas en `lib/constants.ts`:

|constante|Propósito|
|----------|---------|
|`POSTHOG_KEY`|Clave API del proyecto PostHog|
|`POSTHOG_HOST`|URL del host de la API de PostHog|
|`POSTHOG_ENABLED`|Alternancia maestra para PostHog|
|`POSTHOG_DEBUG`|Habilitar el registro de depuración|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Habilitar grabación de sesión|
|`POSTHOG_AUTO_CAPTURE`|Captura automática de vistas de página|
|`POSTHOG_SAMPLE_RATE`|Tasa de muestreo de eventos (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Frecuencia de muestreo de grabación|
|`SENTRY_ENABLED`|Alternancia maestra para Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|¿Qué proveedor maneja las excepciones?|
|`POSTHOG_EXCEPTION_TRACKING`|Habilitar la captura de excepciones de PostHog|
|`SENTRY_EXCEPTION_TRACKING`|Habilitar la captura de excepciones de Sentry|

## Archivos fuente

|Archivo|Propósito|
|------|---------|
|`lib/analytics/index.ts`|Abstracción de proveedor y clase singleton de análisis|
|`lib/constants.ts`|Constantes de configuración para todos los proveedores de análisis|
