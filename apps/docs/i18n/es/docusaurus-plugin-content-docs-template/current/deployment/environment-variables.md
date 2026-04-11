---
id: environment-variables
title: Variables de Entorno
sidebar_label: Variables de Entorno
sidebar_position: 5
---

# Variables de Entorno

Esta guía describe todas las variables de entorno usadas por el Template Ever Works, incluyendo sus valores por defecto, valores de ejemplo e instrucciones de configuración por plataforma.

## Variables Requeridas

### Configuración de la Aplicación

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
AUTH_SECRET=your-nextauth-secret-here  # openssl rand -base64 32
```

### Configuración de la Base de Datos

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Connection pool size (default: 20 in production, 10 in development)
DB_POOL_SIZE=20
```

### Autenticación

```bash
# Auth
COOKIE_SECRET=your-cookie-secret-here  # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# OAuth providers (optional, but at least one recommended)
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Variables Opcionales

### Correo Electrónico

```bash
# Email (required for notifications and auth emails)
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Or use specific SMTP settings:
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=username
EMAIL_SERVER_PASSWORD=password
```

### Analítica

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### Almacenamiento

```bash
# S3-compatible storage (for file uploads)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com  # or custom endpoint for R2, etc.
```

## Configuración por Plataforma

### Vercel

1. Ir a **Configuración del Proyecto → Variables de Entorno**
2. Agregar cada variable con sustitución por entorno (Producción, Preview, Desarrollo)
3. Las variables con `NEXT_PUBLIC_` se exponen automáticamente al navegador

**Variables requeridas para Vercel:**
- `DATABASE_URL` — Cadena de conexión a la base de datos
- `AUTH_SECRET` — Secret de NextAuth (generado con `openssl rand -base64 32`)
- `COOKIE_SECRET` — Secret de cookies
- `NEXTAUTH_URL` — URL pública de la app (por ejemplo `https://yourapp.vercel.app`)

**Variables establecidas automáticamente por Vercel:**
- `VERCEL=1` — Detecta entorno Vercel (usado para selección de cron jobs)
- `VERCEL_URL` — URL del deployment actual
- `VERCEL_ENV` — `production`, `preview` o `development`

### Netlify

1. Ir a **Configuración del Sitio → Variables de Entorno**
2. Agregar cada variable, opcionalmente con ámbitos por contexto (Producción/Deploy/Rama)
3. Redesplegar después de agregar variables

### Docker / Auto-hospedado

Crear un archivo `.env` en el directorio raíz de la app:

```bash
# .env (do not commit to git)
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db:5432/myapp
AUTH_SECRET=your-secret-here
COOKIE_SECRET=another-secret-here
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
```

Para Docker Compose:

```yaml
services:
  web:
    image: your-app-image
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
```

## Mejores Prácticas de Seguridad

1. **Nunca commitear** `.env` o `.env.local` al control de versiones — verificar `.gitignore`
2. **Rotar secrets** regularmente, especialmente `AUTH_SECRET` y credenciales OAuth
3. **Usar variables por entorno** — diferentes valores para producción/preview/desarrollo
4. **Almacenamiento seguro** — usar el cofre de secrets de la plataforma (Vercel Encrypted Env, AWS Secrets Manager, etc.)

## Script de Validación

La app valida las variables de entorno requeridas al iniciar. Verificar manualmente:

```bash
node scripts/check-env.js
```

## Próximos Pasos

- [Descripción General del Despliegue](./overview.md)
- [Gestión de Base de Datos](./database-management.md)
- [Monitoreo & Analítica](./monitoring.md)
