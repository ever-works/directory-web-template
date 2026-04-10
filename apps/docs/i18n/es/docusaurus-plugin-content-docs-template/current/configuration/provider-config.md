---
id: provider-config
title: "Configuración de Proveedores"
sidebar_label: "Configuración de Proveedores"
sidebar_position: 4
---

# Configuración de Proveedores

La plantilla utiliza un singleton `ConfigService` centralizado para gestionar todos los proveedores de servicios externos. Cada proveedor se configura mediante esquemas validados con Zod con detección automática de características -- los proveedores se habilitan cuando sus credenciales requeridas están presentes.

## Arquitectura de ConfigService

El `ConfigService` en `lib/config/config-service.ts` es un singleton solo del lado del servidor que valida todas las variables de entorno al inicio:

```ts
import { configService } from '@/lib/config';

// Acceder a las secciones de configuración
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

El servicio está organizado en seis secciones, cada una con su propio esquema Zod:

| Sección | Accessor | Archivo de esquema |
|---------|----------|--------------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Importaciones Tree-Shakeable

Las secciones individuales se pueden importar directamente para un mejor tree-shaking:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Validación al Inicio

Toda la configuración se valida con Zod en la primera importación. Los valores no válidos activan los fallbacks `.catch()` donde es posible, mientras que los errores verdaderamente irrecuperables se lanzan al inicio:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Proveedores de Autenticación

Definido en `lib/config/schemas/auth.schema.ts`. Los proveedores OAuth detectan automáticamente la habilitación:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Proveedores OAuth Admitidos

| Proveedor | Variable Client ID | Variable Client Secret |
|-----------|--------------------|-----------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Backend de Auth Supabase

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |

### Configuración de Auth Adicional

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `AUTH_SECRET` | -- | Requerido para firma de sesión |
| `COOKIE_SECRET` | -- | Secreto de cifrado de cookies |
| `COOKIE_DOMAIN` | `'localhost'` | Dominio de cookies |
| `COOKIE_SECURE` | `false` | Cookies solo HTTPS |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | TTL del token de acceso |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | TTL del token de actualización |

## Proveedores de Pago

Definido en `lib/config/schemas/payment.schema.ts`. Cada proveedor se habilita automáticamente cuando sus credenciales requeridas están configuradas.

### Stripe

Se habilita automáticamente cuando `secretKey` y `publishableKey` están presentes:

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta del lado del servidor |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publicable del lado del cliente |
| `STRIPE_WEBHOOK_SECRET` | Verificación de firma de webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | ID de precio para plan gratuito |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | ID de precio para plan estándar |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | ID de precio para plan premium |

### LemonSqueezy

Se habilita automáticamente cuando `apiKey` y `storeId` están presentes:

| Variable | Descripción |
|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Clave de API |
| `LEMONSQUEEZY_STORE_ID` | Identificador de tienda |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Secreto de webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | URL del endpoint de webhook |
| `LEMONSQUEEZY_TEST_MODE` | Habilitar modo de prueba (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | ID de variante para plan gratuito |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | ID de variante para plan estándar |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | ID de variante para plan premium |

### Polar

Se habilita automáticamente cuando `accessToken` y `organizationId` están presentes:

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `POLAR_ACCESS_TOKEN` | -- | Token de acceso de la API |
| `POLAR_ORGANIZATION_ID` | -- | ID de organización |
| `POLAR_WEBHOOK_SECRET` | -- | Secreto de webhook |
| `POLAR_SANDBOX` | `true` | Modo sandbox (establecer `'false'` para producción) |
| `POLAR_API_URL` | -- | URL de API personalizada |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | ID de plan para nivel gratuito |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | ID de plan para nivel estándar |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | ID de plan para nivel premium |

### Visualización de Precios del Producto

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Precio de visualización para plan gratuito |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Precio de visualización para plan estándar |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Precio de visualización para plan premium |

## Proveedores de Email

Definido en `lib/config/schemas/email.schema.ts`.

### SMTP

Se habilita automáticamente cuando `host`, `user` y `password` están todos presentes:

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `SMTP_HOST` | -- | Nombre de host del servidor SMTP |
| `SMTP_PORT` | `587` | Puerto del servidor SMTP |
| `SMTP_USER` | -- | Nombre de usuario de autenticación SMTP |
| `SMTP_PASSWORD` | -- | Contraseña de autenticación SMTP |

### Resend

Se habilita automáticamente cuando `apiKey` está presente:

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | Clave de API de Resend |

### Novu

Se habilita automáticamente cuando `apiKey` está presente:

| Variable | Descripción |
|----------|-------------|
| `NOVU_API_KEY` | Clave de API de Novu |

### Configuración de Email

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `COMPANY_NAME` | `'Ever Works'` | Nombre de empresa en plantillas de email |
| `EMAIL_PROVIDER` | `'resend'` | Proveedor de email activo (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Dirección de email del remitente |
| `EMAIL_SUPPORT` | -- | Dirección de email de soporte |

## Proveedores de Analytics

Definido en `lib/config/schemas/analytics.schema.ts`.

### PostHog

Se habilita automáticamente cuando `key` está presente:

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | Clave de API del proyecto PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | URL de host de PostHog |
| `POSTHOG_DEBUG` | `false` | Habilitar modo de depuración |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Habilitar grabación de sesión |
| `POSTHOG_AUTO_CAPTURE` | `false` | Captura automática de eventos |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Rastrear excepciones |
| `POSTHOG_PERSONAL_API_KEY` | -- | Clave de API personal (panel admin) |
| `POSTHOG_PROJECT_ID` | -- | ID de proyecto (panel admin) |

### Sentry

Se habilita automáticamente cuando `dsn` está presente:

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | DSN de Sentry |
| `SENTRY_ORG` | -- | Slug de organización de Sentry |
| `SENTRY_PROJECT` | -- | Nombre del proyecto de Sentry |
| `SENTRY_AUTH_TOKEN` | -- | Token de auth para mapas de fuente |
| `SENTRY_ENABLE_DEV` | `false` | Habilitar en desarrollo |
| `SENTRY_DEBUG` | `false` | Modo de depuración |

### reCAPTCHA

Se habilita automáticamente cuando tanto `siteKey` como `secretKey` están presentes:

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Clave de sitio del lado del cliente |
| `RECAPTCHA_SECRET_KEY` | Clave secreta del lado del servidor |

### Vercel Analytics

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Habilitar Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Tasa de muestreo (0--1) |

### Proveedor de Seguimiento de Excepciones

| Variable | Predeterminado | Descripción |
|----------|----------------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` o `'none'` |

## Verificar Estado del Proveedor

```ts
import { configService } from '@/lib/config';

// Verificar si Stripe está configurado
if (configService.payment.stripe.enabled) {
  // Stripe está listo para usar
}

// Verificar si hay algún proveedor de email disponible
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// Listar proveedores OAuth habilitados
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## Archivos Relacionados

| Ruta | Descripción |
|------|-------------|
| `lib/config/config-service.ts` | Singleton ConfigService |
| `lib/config/schemas/auth.schema.ts` | Esquemas de proveedores auth |
| `lib/config/schemas/payment.schema.ts` | Esquemas de proveedores de pago |
| `lib/config/schemas/email.schema.ts` | Esquemas de proveedores de email |
| `lib/config/schemas/analytics.schema.ts` | Esquemas de proveedores analytics |
| `lib/config/schemas/integrations.schema.ts` | Esquemas de proveedores de integración |
| `lib/config/schemas/core.schema.ts` | Esquema de configuración core |
| `lib/config/types.ts` | Definiciones de tipo TypeScript |
| `lib/config/index.ts` | Exportación barrel |
| `.env.example` | Referencia completa de variables de entorno |
