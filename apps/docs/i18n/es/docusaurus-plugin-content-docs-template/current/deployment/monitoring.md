---
id: monitoring
title: Monitoreo & Analítica
sidebar_label: Monitoreo
sidebar_position: 6
---

# Monitoreo & Analítica

El Template Ever Works usa un sistema de analítica unificado que soporta múltiples proveedores de seguimiento de excepciones: PostHog, Sentry, ambos simultáneamente o ninguno.

## Seguimiento de Excepciones

### Modos Soportados

| Modo | Variable de Entorno | Cuándo Usar |
|------|---------------------|-------------|
| **PostHog** | `EXCEPTION_PROVIDER=posthog` | Analítica + seguimiento de errores en un único lugar |
| **Sentry** | `EXCEPTION_PROVIDER=sentry` | Seguimiento de errores dedicado, excelente para depuración |
| **Ambos** | `EXCEPTION_PROVIDER=both` | Redundancia máxima y cobertura |
| **Ninguno** | `EXCEPTION_PROVIDER=none` | Deshabilitar para desarrollo local |

### Configuración

```bash
# Exception tracking mode
EXCEPTION_PROVIDER=posthog  # posthog | sentry | both | none

# PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry error tracking
SENTRY_DSN=https://key@sentry.io/project
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project
SENTRY_AUTH_TOKEN=your_token  # for source maps
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

## Sentry

### Instalación

```bash
pnpm add @sentry/nextjs
```

### Configuración

Configurar en `sentry.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';
import { sentryConfig } from '@/lib/analytics/sentry';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  ...sentryConfig,
});
```

### Beneficios de Sentry

- Seguimiento detallado de stack traces
- Reproducción de sesiones (opcional)
- Monitoreo de rendimiento
- Alertas por email/Slack
- Agrupación de errores por fingerprint
- Integración con GitHub para seguimiento de issues
- Gestión de releases y reglas de alerta

## PostHog

### Beneficios de PostHog

PostHog combina analítica de producto con seguimiento de errores:

- Análisis de embudos y retención
- Grabación de sesiones
- Feature flags
- Pruebas A/B
- Seguimiento de excepciones con contexto completo

### Propiedades de las Excepciones

El sistema de analítica captura excepciones con estas propiedades:

| Propiedad | Descripción |
|-----------|-------------|
| `message` | Mensaje de error |
| `stack` | Stack trace completo |
| `context` | Objeto de contexto adicional |
| `userId` | ID del usuario afectado |
| `url` | URL donde ocurrió el error |
| `environment` | `production`, `development` etc. |

### Configuración del Dashboard

1. En PostHog, crear un nuevo **Dashboard**
2. Agregar widgets para: **Tasa de Errores en el Tiempo**, **Top Errores**, **Usuarios Afectados por Errores**
3. Configurar alertas en **Alerts** → Crear alerta para tasa de errores por encima de un umbral

## Capturando Excepciones

### Uso de la API

```typescript
import { analytics } from '@/lib/analytics';

// Capture an exception
analytics.captureException(error, {
  userId: user?.id,
  context: { action: 'checkout', productId },
});
```

### Seguimiento Automático

El sistema rastrea automáticamente:

- Errores de renderizado de React (mediante error boundaries)
- Rechazos de Promises no manejados
- Fallos de rutas de API
- Errores de Server Components

## Mejores Prácticas

### 1. Usar Contexto Significativo

```typescript
analytics.captureException(error, {
  context: {
    action: 'user_checkout',
    cartItems: cart.length,
    paymentMethod: selectedMethod,
  }
});
```

### 2. Categorizar Errores

```typescript
// Business logic errors
analytics.captureException(new BusinessError('Payment failed'), {
  context: { type: 'payment', provider: 'stripe' }
});

// Integration errors
analytics.captureException(new IntegrationError('API timeout'), {
  context: { type: 'external_api', service: 'sendgrid' }
});
```

### 3. No Capturar Errores Esperados

```typescript
// ❌ Don't log expected validation errors
try {
  validateForm(data);
} catch (e) {
  if (e instanceof ValidationError) {
    showFormError(e.message); // just show to user
    return;
  }
  analytics.captureException(e); // only unexpected errors
}
```

### 4. Filtrar Datos Sensibles

```typescript
analytics.captureException(error, {
  context: {
    userId: user.id,
    // ❌ Never include: passwords, tokens, credit card numbers
    // ✅ Include: IDs, actions, non-sensitive metadata
  }
});
```

## Solución de Problemas

### Las Excepciones No Aparecen

1. Verificar que `EXCEPTION_PROVIDER` esté definido (no `none`)
2. Verificar que los DSNs/claves de API sean correctos
3. Comprobar que `NODE_ENV` corresponda al entorno configurado
4. Confirmar que el proveedor está inicializado antes del primer uso

### Fallback de Proveedor

Si el proveedor primario falla, el sistema retorna automáticamente al logging en consola en modo desarrollo.

## Guía de Migración

### Migrando de Sentry a PostHog

```bash
# 1. Actualizar variable de entorno
EXCEPTION_PROVIDER=posthog

# 2. Verificar configuración de PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# 3. Redesplegar
```

### Migrando de PostHog a Sentry

```bash
# 1. Actualizar variable de entorno
EXCEPTION_PROVIDER=sentry

# 2. Verificar configuración de Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# 3. Redesplegar
```

### Usando Ambos Simultáneamente

```bash
EXCEPTION_PROVIDER=both
# Configure both providers' env vars
```

## Monitoreo de Rendimiento

### Core Web Vitals

```typescript
// instrumentation-client.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(metric => analytics.track('web_vitals', { metric: 'CLS', value: metric.value }));
onFID(metric => analytics.track('web_vitals', { metric: 'FID', value: metric.value }));
onLCP(metric => analytics.track('web_vitals', { metric: 'LCP', value: metric.value }));
```

### Métricas Personalizadas

```typescript
// Track custom performance metrics
const start = performance.now();
await heavyOperation();
const duration = performance.now() - start;

analytics.track('performance', {
  operation: 'heavy_operation',
  duration,
  context: operationContext,
});
```

## Infraestructura

### Verificación de Salud

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await runHealthChecks();
  return Response.json({
    status: checks.allPassed ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
```

Verificar mediante:

```bash
curl -s https://yourdomain.com/api/health
```

### Servicios de Uptime

Monitorear el endpoint de salud con cualquier servicio de uptime:

- **UptimeRobot** (gratuito, comprobaciones cada 5 min.)
- **Better Uptime** (página de estado incluida)
- **Pingdom** (análisis avanzados)
- **Checkly** (monitoreo basado en código)
