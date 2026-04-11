---
id: deployment-introduction
title: Introducción al Despliegue
sidebar_label: Introducción al Despliegue
sidebar_position: 1
---

# Introducción al Despliegue

Esta guía proporciona una descripción general completa del despliegue de la plantilla Ever Works en entornos de producción. La plantilla está construida sobre Next.js 16 con el modo de salida standalone, lo que la hace compatible con una amplia gama de plataformas de alojamiento y despliegues en contenedores.

## Descripción General de la Arquitectura

La plantilla Ever Works produce un **build standalone de Next.js** que empaqueta todas las dependencias en una única unidad desplegable. Esto se configura en `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

La configuración `output: "standalone"` crea un artefacto de despliegue autosuficiente que incluye solo los archivos `node_modules` necesarios, reduciendo significativamente el tamaño del despliegue.

## Plataformas Compatibles

### Recomendada: Vercel

Vercel es la plataforma de despliegue recomendada para la plantilla. Ofrece:

- Despliegue sin configuración para aplicaciones Next.js
- Aprovisionamiento automático de certificados SSL
- Planificación de trabajos cron integrada mediante `vercel.json`
- Soporte para funciones serverless para rutas API
- Despliegues de vista previa para pull requests

La plantilla incluye una configuración `vercel.json` con horarios cron predefinidos:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Auto-hospedado: Docker

La salida standalone admite contenedorización con Docker. Un despliegue típico usa el runtime de Node.js para servir la aplicación construida. El requisito clave es asegurarse de que el directorio de salida `standalone` y las carpetas `public` y `.next/static` se copien a la imagen del contenedor.

### Otras Plataformas Cloud

La plantilla puede desplegarse en cualquier plataforma que admita aplicaciones Node.js:

- **Railway** -- Despliegue full-stack sencillo con PostgreSQL integrado
- **DigitalOcean App Platform** -- Despliegues de contenedores gestionados
- **AWS (EC2, ECS o App Runner)** -- Infraestructura cloud escalable
- **Google Cloud Run** -- Plataforma de contenedores serverless
- **Azure App Service** -- Hosting Node.js gestionado

## Requisitos Previos

### Requisitos del Sistema

- **Node.js**: versión 20.19.0 o superior (definida en el campo `engines` de `package.json`)
- **Gestor de Paquetes**: pnpm (el proyecto usa `pnpm-lock.yaml`)
- **Base de Datos**: PostgreSQL (requerida para funciones de producción como auth, suscripciones, analíticas)
- **Memoria**: Se recomiendan al menos 8 GB de RAM para el proceso de build

El script de build asigna memoria adicional explícitamente:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Variables de Entorno Requeridas

Antes del despliegue, asegúrese de que estas variables críticas estén configuradas. El script `scripts/check-env.js` las verifica automáticamente:

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

El script de verificación de entorno categoriza las variables por integración:

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### Integraciones Opcionales

Estas variables de entorno habilitan funciones opcionales:

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## Guía de Despliegue Rápido

### Paso 1: Preparar el Build

Ejecute el proceso de build completo localmente para verificar que todo compile:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

El script `build` realiza varios pasos en secuencia:

1. **Verificación de entorno** (`scripts/check-env.js`) -- verifica variables requeridas
2. **Generación de OpenAPI** (`scripts/generate-openapi.ts`) -- genera documentación API
3. **Migraciones de base de datos** (`scripts/build-migrate.ts`) -- aplica cambios de esquema pendientes
4. **Build de Next.js** (`next build`) -- compila la aplicación

### Paso 2: Migración de Base de Datos Durante el Build

El script `scripts/build-migrate.ts` se ejecuta automáticamente durante el build. Maneja diferentes entornos:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Comportamientos clave:

- **Builds de producción**: Los errores de migración hacen fallar el build (previene despliegues rotos)
- **Despliegues de vista previa**: Los errores de conexión se toleran (la base de datos puede no estar configurada aún)
- **Builds CI** (no-Vercel): Las migraciones se omiten completamente

### Paso 3: Inicialización en Tiempo de Ejecución

Cuando la aplicación inicia, `instrumentation.ts` activa la inicialización de la base de datos:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

Secuencia de inicialización:

1. Ejecutar migraciones pendientes (Drizzle maneja la idempotencia)
2. Verificar si la base de datos ha sido sembrada
3. Si no, obtener bloqueo advisory de PostgreSQL y ejecutar el script de seeding
4. Liberar el bloqueo después del seeding

### Paso 4: Despliegue en Vercel

Para despliegues en Vercel, conecta tu repositorio y configura:

1. Establece **Framework Preset** en Next.js
2. Establece **Build Command** en `pnpm build`
3. Establece **Install Command** en `pnpm install`
4. Añade todas las variables de entorno requeridas en el panel de Vercel
5. Despliega

### Paso 5: Verificar el Despliegue

Después del despliegue, verifica:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Cabeceras de Seguridad

La plantilla configura automáticamente cabeceras de seguridad en `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## Configuración del Pool de Conexiones

El pool de conexiones de la base de datos es configurable mediante la variable de entorno `DB_POOL_SIZE`:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **Predeterminado de producción**: 20 conexiones
- **Predeterminado de desarrollo**: 10 conexiones
- **Rango configurable**: 1 a 50 conexiones
- **Tiempo de espera de inactividad**: 20 segundos
- **Tiempo de espera de conexión**: 30 segundos

## Próximos Pasos

- [SSL y Dominios Personalizados](./ssl-domains.md) -- Configura dominios personalizados y certificados SSL
- [Gestión de Base de Datos](./database-management.md) -- Operaciones de base de datos en producción
- [Copia de Seguridad y Recuperación](./backup-recovery.md) -- Estrategias de copia de seguridad de base de datos
- [Monitoreo](./monitoring.md) -- Configura seguimiento de errores y monitoreo de rendimiento
