---
id: environment-reference
title: Referencia Completa de Variables de Entorno
sidebar_label: Referencia de Entorno
sidebar_position: 1
---

# Referencia Completa de Variables de Entorno

Esta página proporciona una referencia completa de todas las variables de entorno utilizadas por el template Ever Works. Las variables están organizadas por categoria con sus tipos, valores predeterminados y si son requeridas.

Copie `.env.example` a `.env.local` y rellene los valores para su implementación.

## Contenido & Repositorio de Datos

| Variable | Tipo | Requerida | Predeterminado | Descripción |
|----------|------|-----------|----------------|-------------|
| `DATA_REPOSITORY` | string (URL) | **Sí** | -- | URL del repositorio Git para datos de contenido |
| `GH_TOKEN` | string | No | -- | Token de acceso personal de GitHub (para repos privados) |
| `GITHUB_TOKEN` | string | No | -- | Variable de token alternativa de GitHub |
| `GITHUB_BRANCH` | string | No | `master` | Rama de Git para clonar contenido |

## Base de Datos

| Variable | Tipo | Requerida | Predeterminado | Descripción |
|----------|------|-----------|----------------|-------------|
| `DATABASE_URL` | string | Recomendada | -- | Cadena de conexión de la base de datos (SQLite o Postgres) |

Cuando `DATABASE_URL` no está definida, las funcionalidades dependientes de la base de datos (valoraciones, comentarios, favoritos, encuestas, elementos destacados) se deshabilitan automáticamente a través del sistema de feature flags.

## Autenticación

| Variable | Tipo | Requerida | Predeterminado | Descripción |
|----------|------|-----------|----------------|-------------|
| `AUTH_SECRET` | string | **Sí** | -- | Secreto NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Sí** | -- | Secreto de cifrado de cookies |
| `COOKIE_DOMAIN` | string | No | -- | Dominio de cookies (ej. `localhost`) |
| `COOKIE_SECURE` | boolean | No | `true` | Indicador de cookie segura |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | No | `15m` | TTL del token de acceso |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | No | `7d` | TTL del token de actualización |

### Proveedores OAuth

| Variable | Tipo | Requerida | Descripción |
|----------|------|-----------|-------------|
| `GOOGLE_CLIENT_ID` | string | No | ID de cliente OAuth de Google |
| `GOOGLE_CLIENT_SECRET` | string | No | Secreto de cliente OAuth de Google |
| `GITHUB_CLIENT_ID` | string | No | ID de cliente OAuth de GitHub |
| `GITHUB_CLIENT_SECRET` | string | No | Secreto de cliente OAuth de GitHub |
| `MICROSOFT_CLIENT_ID` | string | No | ID de cliente OAuth de Microsoft |
| `MICROSOFT_CLIENT_SECRET` | string | No | Secreto de cliente OAuth de Microsoft |
| `FB_CLIENT_ID` | string | No | ID de cliente OAuth de Facebook |
| `FB_CLIENT_SECRET` | string | No | Secreto de cliente OAuth de Facebook |
| `X_CLIENT_ID` | string | No | ID de cliente OAuth de X (Twitter) |
| `X_CLIENT_SECRET` | string | No | Secreto de cliente OAuth de X (Twitter) |
| `LINKEDIN_CLIENT_ID` | string | No | ID de cliente OAuth de LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | string | No | Secreto de cliente OAuth de LinkedIn |

Los proveedores OAuth se habilitan automáticamente cuando se establecen tanto el ID de cliente como el secreto.

## Sitio & Branding (Seguro para el Cliente)

Todas las variables `NEXT_PUBLIC_*` se exponen al navegador.

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | URL de la aplicación de directorio |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | URL del sitio web público de la empresa |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | URL base de la API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Nombre del sitio para metadatos |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Eslogan del sitio |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Nombre de marca para schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (ver .env.example) | Descripción SEO (menos de 160 caracteres) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | Palabras clave SEO separadas por coma |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Ruta del logo (relativo a /public) |

### Tema de Imagen OG

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | Color de inicio del degradado de imagen OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | Color de fin del degradado de imagen OG |

### Enlaces de Redes Sociales

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | Enlace de GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | Enlace de X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (ver .env.example) | Enlace de LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (ver .env.example) | Enlace de Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Enlace del blog |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Email de contacto |

### Atribución

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | URL del enlace "Creado con" |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | Texto del enlace "Creado con" |

## Proveedores de Pago

### Stripe

| Variable | Tipo | Requerida | Descripción |
|----------|------|-----------|-------------|
| `STRIPE_SECRET_KEY` | string | No | Clave secreta de Stripe (solo servidor) |
| `STRIPE_PUBLISHABLE_KEY` | string | No | Clave publicable de Stripe |
| `STRIPE_WEBHOOK_SECRET` | string | No | Secreto de firma del webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | No | Clave publicable segura para el cliente |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | No | Cargar precios desde la API de Stripe |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | No | Habilitar checkout de Stripe |

#### IDs de Precio Multi-Moneda de Stripe

Para los planes Standard y Premium, el template soporta IDs de precio específicos por moneda:

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=
...
```

El mismo patrón aplica a las variables del plan Premium e IDs de cuota de instalación.

### LemonSqueezy

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `LEMONSQUEEZY_API_KEY` | string | Clave de API |
| `LEMONSQUEEZY_STORE_ID` | string | Identificador de la tienda |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Secreto del webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | URL del endpoint del webhook |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Habilitar modo de prueba |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Variante del plan gratuito |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Variante del plan estándar |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Variante del plan premium |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Habilitar checkout |

### Polar

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `POLAR_ACCESS_TOKEN` | string | Token de acceso |
| `POLAR_WEBHOOK_SECRET` | string | Secreto del webhook |
| `POLAR_ORGANIZATION_ID` | string | ID de la organización |
| `POLAR_SANDBOX` | boolean | Modo sandbox (predeterminado: `true`) |
| `POLAR_API_URL` | string (URL) | URL de API personalizada |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | ID del plan gratuito |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | ID del plan estándar |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | ID del plan premium |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Habilitar checkout |

### Solidgate

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `SOLIDGATE_API_KEY` | string | Clave de API |
| `SOLIDGATE_SECRET_KEY` | string | Clave secreta |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Secreto del webhook |
| `SOLIDGATE_MERCHANT_ID` | string | ID de comerciante |
| `SOLIDGATE_API_BASE_URL` | string (URL) | URL base de la API |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Clave segura para el cliente |

### Precios de Producto

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Precio del nivel gratuito |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Precio del nivel estándar |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Precio del nivel premium |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | ID del monto de prueba premium |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | ID del monto de prueba estándar |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Habilitar montos de prueba |

## Análisis & Monitoreo

### PostHog

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | Clave de API del proyecto PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | Host de PostHog |
| `POSTHOG_DEBUG` | boolean | `false` | Habilitar registro de depuración |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Grabación de sesiones |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Captura automática de eventos |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | Clave de API del lado del servidor |
| `POSTHOG_PROJECT_ID` | string | -- | ID del proyecto para análisis |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Seguimiento de excepciones |

### Sentry

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | DSN de Sentry |
| `SENTRY_ORG` | string | `ever-co` | Organización Sentry |
| `SENTRY_PROJECT` | string | `ever-works` | Nombre del proyecto Sentry |
| `SENTRY_AUTH_TOKEN` | string | -- | Token de autenticación Sentry |
| `SENTRY_ENABLE_DEV` | boolean | `false` | Habilitar en desarrollo |
| `SENTRY_DEBUG` | boolean | `false` | Modo de depuración |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Seguimiento de excepciones |

### Otros Análisis

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Proveedor de excepciones (`posthog` o `sentry`) |
| `ANALYZE` | boolean | `true` | Habilitar análisis de bundle |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | Clave de sitio reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | string | -- | Clave secreta reCAPTCHA |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Tasa de muestreo de Speed Insights |

## Email

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `EMAIL_PROVIDER` | string | `resend` | Proveedor de email (`resend` o `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | Dirección del remitente para notificaciones |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Dirección de email de soporte |
| `COMPANY_NAME` | string | `Ever Works` | Nombre de la empresa para plantillas de email |
| `RESEND_API_KEY` | string | -- | Clave de API de Resend |
| `NOVU_API_KEY` | string | -- | Clave de API de Novu |
| `SMTP_HOST` | string | -- | Nombre de host del servidor SMTP |
| `SMTP_PORT` | number | `587` | Puerto SMTP |
| `SMTP_USER` | string | -- | Nombre de usuario SMTP |
| `SMTP_PASSWORD` | string | -- | Contraseña SMTP |

## Integraciones

### Twenty CRM

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | URL de la instancia de Twenty CRM |
| `TWENTY_CRM_API_KEY` | string | -- | Clave de API para autenticación |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Habilitación/deshabilitación explícita |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Modo de sincronización (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Trabajos en Segundo Plano)

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Habilitar Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | Clave de API |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | URL de API personalizada |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Entorno (`development`, `staging`, `production`) |

### Trabajos Cron

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `CRON_SECRET` | string | Secreto de autenticación para endpoints cron |

### Mapas & Ubicación

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Token público de Mapbox (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Clave de Google Maps restringida al navegador |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | ID del mapa de Google Maps |

### API de la Plataforma Ever Works

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | URL de la API de la plataforma |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Token de autenticación de la API de la plataforma |

## Vercel & Implementación

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `VERCEL_TOKEN` | string | Token de acceso personal de Vercel |
| `VERCEL_PROJECT_ID` | string | ID del proyecto Vercel |
| `VERCEL_TEAM_SCOPE` | string | ID del equipo Vercel |
| `VERCEL_PLAN` | string | Tipo de plan (`pro` para cron de 5 minutos) |
| `VERCEL_DEPLOYMENT_ID` | string | ID de la implementación actual |
| `CRON_FREQUENCY` | string | Forzar frecuencia cron (ej. `5min`) |

## Demo & Población de Datos

| Variable | Tipo | Predeterminado | Descripción |
|----------|------|----------------|-------------|
| `NEXT_PUBLIC_DEMO` | boolean | `true` | Habilitar modo demo con datos de ejemplo |
| `SEED_ADMIN_EMAIL` | string | `admin@changeme.com` | Email del usuario administrador para población |
| `SEED_ADMIN_PASSWORD` | string | `changeme_password` | Contraseña del usuario administrador para población |
| `SEED_FAKE_USER_COUNT` | number | `10` | Número de usuarios ficticios a generar |
| `NODE_ENV` | string | `development` | Entorno Node |

## Archivos Relacionados

- `.env.example` -- Archivo de plantilla con todas las variables y documentación inline
- `lib/config/schemas/*.schema.ts` -- Esquemas de validación Zod para cada categoría
- `lib/config/config-service.ts` -- Validación centralizada y acceso
- `lib/config/client.ts` -- Módulo de configuración seguro para el cliente
