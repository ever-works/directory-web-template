---
id: config-system
title: Sistema de Configuración
sidebar_label: Sistema de Configuración
sidebar_position: 0
---

# Sistema de Configuración

El template Ever Works utiliza un sistema de configuración centralizado y con tipos seguros construido sobre esquemas de validación Zod. Todas las variables de entorno se validan al iniciar la aplicación, proporcionando retroalimentación inmediata sobre configuraciones faltantes o inválidas. El sistema admite tanto secretos solo del servidor como variables públicas seguras para el cliente.

## Arquitectura

```
lib/config/
  config-service.ts        # Singleton ConfigService centralizado
  client.ts                # Configuración segura para cliente (NEXT_PUBLIC_*)
  env.ts                   # Esquema env legado (configuración de API)
  server-config.ts         # Helpers de servidor obsoletos (usa ConfigService)
  feature-flags.ts         # Flags de disponibilidad de funcionalidades
  index.ts                 # Barrel export
  types.ts                 # Definiciones de tipos TypeScript
  schemas/
    index.ts               # Barrel export de esquemas
    core.schema.ts         # URLs, info del sitio, base de datos, contenido
    auth.schema.ts         # Secretos auth, proveedores OAuth, JWT, cookies
    email.schema.ts        # SMTP, Resend, configuración Novu
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, precios
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Barrel de configuración de facturación
    stripe.config.ts       # Configuración específica de Stripe
    lemonsqueezy.config.ts # Configuración de LemonSqueezy
    polar.config.ts        # Configuración de Polar
    solidgate.config.ts    # Configuración de Solidgate
    types.ts               # Tipos de facturación
  utils/
    env-parser.ts          # Utilidades para parsear variables de entorno
    validation-logger.ts   # Formateo y logging de resultados de validación
```

## Singleton ConfigService

El núcleo del sistema de configuración es la clase `ConfigService` en `lib/config/config-service.ts`. Ella:

1. Recolecta todas las variables de entorno a través de funciones recolectoras
2. Las valida contra un esquema Zod combinado
3. Almacena la configuración validada como singleton
4. Proporciona getters tipados para cada sección de configuración

```typescript
import { configService } from '@/lib/config';

// Acceder a secciones específicas
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Exportaciones de Sección

Para el tree-shaking y la conveniencia, las secciones individuales también se exportan directamente:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Acceso directo sin prefijo ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### Aplicación Solo del Servidor

El módulo `ConfigService` importa `'server-only'`, lo que significa:

- Solo puede usarse en Server Components, rutas de API y código del lado del servidor
- Intentar importarlo en un Client Component producirá un error de build
- Esto previene la exposición accidental de secretos como claves API

## Configuración del Cliente (`lib/config/client.ts`)

La configuración segura para el cliente está en un módulo separado que solo lee variables `NEXT_PUBLIC_*`:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Branding del sitio
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Links de redes sociales
siteConfig.attribution // Atribución "Built with"

// Precios
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Entorno
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Este módulo es seguro para importar en cualquier componente, incluido el código del lado del cliente.

## Esquemas de Validación

Cada sección de configuración tiene un esquema Zod dedicado en `lib/config/schemas/`:

### Esquema Core (`core.schema.ts`)

Valida: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, metadatos del sitio (nombre, tagline, descripción, palabras clave, logo), enlaces sociales, tema de imagen OG, atribución y configuración del repositorio de contenido.

### Esquema Auth (`auth.schema.ts`)

Valida: `AUTH_SECRET`, `COOKIE_SECRET`, configuraciones de expiración de tokens JWT, configuración de cookies, credenciales de proveedores OAuth (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), configuración de Supabase y credenciales de usuario seed.

### Esquema de Email (`email.schema.ts`)

Valida: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, configuraciones SMTP (host, puerto, usuario, contraseña), clave API de Resend y clave API de Novu.

### Esquema de Pago (`payment.schema.ts`)

Valida: Stripe (clave secreta, clave publicable, secreto webhook, IDs de precio, precios dinámicos, multi-moneda), LemonSqueezy (clave API, ID de tienda, webhook, IDs de variante), Polar (token de acceso, webhook, organización, IDs de plan), precios de producto, montos de prueba.

### Esquema de Análisis (`analytics.schema.ts`)

Valida: PostHog (clave, host, debug, grabación de sesión, auto-capture, clave API personal, ID de proyecto), Sentry (DSN, organización, proyecto, token auth, debug), Vercel Analytics, Recaptcha (clave del sitio, clave secreta), proveedor de seguimiento de excepciones.

### Esquema de Integraciones (`integrations.schema.ts`)

Valida: Trigger.dev (habilitado, clave API, URL, entorno), Twenty CRM (URL base, clave API, habilitado, modo de sincronización), Cron (secreto).

## Comportamiento de Validación

El sistema de validación usa `.catch()` de Zod para una degradación controlada:

```typescript
// De integrations.schema.ts
export const twentyCrmConfigSchema = z
  .object({
    baseUrl: z.string().url().optional().catch(undefined),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false),
    syncMode: twentyCrmSyncModeSchema,
  })
  .transform((data) => ({
    ...data,
    enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
  }));
```

- **Campos opcionales** con `.catch()` se recuperan con valores predeterminados
- **Campos requeridos** sin `.catch()` causan un error de inicio
- **Pasos de transformación** calculan valores derivados (como la detección automática del estado habilitado)

Los resultados de validación se registran al inicio a través de `validation-logger.ts`, mostrando qué integraciones están activas y advertencias sobre configuración opcional faltante.

## Indicadores de Funcionalidad (`lib/config/feature-flags.ts`)

Los indicadores de funcionalidad proporcionan un mecanismo simple para habilitar/deshabilitar funcionalidades dependientes de la base de datos:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Renderizar la sección de comentarios
}
```

Todos los indicadores de funcionalidad están actualmente vinculados a la disponibilidad de `DATABASE_URL`. Cuando no hay base de datos configurada, las funcionalidades interactivas se deshabilitan mientras el directorio sigue sirviendo contenido estático.

## Migración desde la Configuración Antigua

El módulo `server-config.ts` contiene funciones helper obsoletas. Rutas de migración:

| Obsoleto | Reemplazo |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## Archivos Relacionados

- `lib/config/config-service.ts` -- Singleton ConfigService
- `lib/config/client.ts` -- Configuración segura para cliente
- `lib/config/schemas/*.schema.ts` -- Esquemas de validación Zod
- `lib/config/feature-flags.ts` -- Indicadores de funcionalidad
- `lib/config/types.ts` -- Definiciones de tipos TypeScript
- `.env.example` -- Referencia completa de variables de entorno
