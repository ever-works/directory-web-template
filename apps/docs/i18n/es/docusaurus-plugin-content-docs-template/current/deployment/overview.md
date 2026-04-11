---
id: overview
title: Descripción General del Despliegue
sidebar_label: Descripción General
sidebar_position: 1
---

# Descripción General del Despliegue

El Template Ever Works soporta múltiples plataformas de despliegue con soporte de primera clase para Vercel. Esta guía cubre la configuración de producción, estrategias de despliegue y mejores prácticas.

## Plataformas Soportadas

### Recomendadas

| Plataforma | Descripción | Mejor Para |
|-----------|-------------|-----------|
| **Vercel** | Plataforma oficial Next.js | Despliegue más sencillo, edge functions integradas |
| **Netlify** | Plataforma Jamstack | Buenas herramientas, CI/CD fácil |
| **Railway** | PaaS sencillo | Base de datos + app en el mismo lugar |
| **Render** | PaaS moderno | Buen equilibrio de características y costo |

### Auto-hospedado

| Plataforma | Descripción |
|-----------|-------------|
| **Docker** | Basado en contenedores, portátil |
| **VPS (Ubuntu/Debian)** | Control total, más configuración |
| **AWS EC2 / ECS** | Escalable, ecosistema AWS |
| **Google Cloud Run** | Serverless basado en contenedores |

## Lista de Verificación Pre-despliegue

### Código & Build

- [ ] Todos los tests pasando: `pnpm lint && pnpm tsc --noEmit`
- [ ] Build exitoso: `pnpm build`
- [ ] Variables de entorno verificadas
- [ ] Schema de la base de datos actualizado

### Base de Datos

- [ ] `DATABASE_URL` apunta a la base de datos de producción
- [ ] Migraciones probadas en entorno de staging
- [ ] Copia de seguridad realizada antes del despliegue
- [ ] Pool de conexiones configurado correctamente

### Seguridad

- [ ] `AUTH_SECRET` es una cadena aleatoria fuerte (32+ chars)
- [ ] `COOKIE_SECRET` es una cadena aleatoria fuerte (32+ chars)
- [ ] `COOKIE_SECURE=true` en producción
- [ ] Todas las credenciales OAuth configuradas
- [ ] `CRON_SECRET` definido si se usan Vercel Crons

### Monitoreo

- [ ] Sentry DSN configurado (si se usa Sentry)
- [ ] Clave PostHog configurada (si se usa PostHog)
- [ ] Endpoint de verificación de salud probado

## Configuración del Entorno de Producción

### Variables de Entorno Esenciales

```bash
# ===== REQUIRED =====
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com

# Auth secrets (generate with: openssl rand -base64 32)
AUTH_SECRET=your-auth-secret-here
COOKIE_SECRET=your-cookie-secret-here
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_POOL_SIZE=20

# ===== RECOMMENDED =====

# OAuth (at least one)
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Exception tracking
EXCEPTION_PROVIDER=posthog  # or sentry, both, none
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Cron jobs (required for Vercel Crons)
CRON_SECRET=your-cron-secret-here

# ===== OPTIONAL =====

# Content repo
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Storage
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

### Seguridad del Entorno

- Nunca commitear `.env` o `.env.local` al repositorio
- Usar variables por entorno (producción vs. preview vs. desarrollo)
- Rotar secrets periódicamente
- Usar el cofre de secrets de la plataforma (Vercel Encrypted Env, AWS Secrets Manager)
- Revisar qué variables comienzan con `NEXT_PUBLIC_` — se exponen al cliente
- Auditar el acceso a variables de entorno regularmente

## Configuración del Build

### next.config.js

```typescript
// next.config.ts
const nextConfig = {
  output: 'standalone',  // for Docker deployments
  experimental: {
    instrumentationHook: true,  // for auto db initialization
  },
};
```

### Scripts de Build

```json
{
  "scripts": {
    "build": "next build",
    "build:migrate": "tsx scripts/build-migrate.ts && next build",
    "postbuild": "next-sitemap"
  }
}
```

Usar `build:migrate` si quieres ejecutar migraciones de base de datos automáticamente durante el build (útil para plataformas que no soportan comandos de release separados).

## Despliegue de la Base de Datos

### Estrategia de Migración

```bash
# Option 1: Run during build (automatic)
pnpm build:migrate

# Option 2: Run as release command
pnpm db:migrate

# Option 3: Run manually before deployment
cd apps/web && pnpm db:migrate
```

### Proveedores de Base de Datos

| Proveedor | Mejor Para | Notas |
|----------|-----------|-------|
| **Supabase** | Desarrollo rápido | PostgreSQL gestionado + Auth + Storage |
| **PlanetScale** | Escala global | PostgreSQL serverless, branching |
| **Neon** | Serverless | PostgreSQL serverless, bueno para Vercel |
| **Railway** | Sencillo | Bueno para proyectos pequeños/medianos |
| **AWS RDS** | Empresarial | Control total, costo más alto |

### Estrategia de Copias de Seguridad

Configurar copias de seguridad automáticas diarias en el proveedor de base de datos. Antes de despliegues importantes:

```bash
# Backup manual via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Or via provider CLI
supabase db dump -f backup.sql
```

## CDN & Recursos Estáticos

### Vercel (Automático)

Vercel sirve automáticamente recursos estáticos a través de su CDN global — sin configuración necesaria.

### Cloudflare

```javascript
// next.config.ts additions for Cloudflare
assetPrefix: process.env.CDN_URL,
```

### Amazon CloudFront

```javascript
// next.config.ts additions for CloudFront
assetPrefix: `https://${process.env.CLOUDFRONT_DISTRIBUTION}.cloudfront.net`,
```

## SSL/TLS

Vercel y Netlify provisionan automáticamente certificados SSL mediante Let's Encrypt para dominios personalizados.

Para auto-hospedaje, usar **Nginx** con certbot:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Monitoreo en Producción

```bash
# Essential monitoring variables
EXCEPTION_PROVIDER=posthog  # or sentry
NEXT_PUBLIC_POSTHOG_KEY=phc_...
SENTRY_DSN=https://...@sentry.io/...

# Log level
LOG_LEVEL=info  # debug | info | warn | error
```

## Estrategias de Despliegue

### Despliegue Blue-Green

Usado para actualizaciones sin tiempo de inactividad:

1. Mantener la instancia de producción actual (**blue**) corriendo
2. Desplegar la nueva versión en una instancia idéntica (**green**)
3. Ejecutar smoke tests en el entorno green
4. Trasladar el tráfico de blue a green mediante el load balancer
5. Mantener blue activo durante 30 min. como fallback
6. Terminar la instancia blue tras confirmación

### Despliegue Rolling (Vercel Por Defecto)

Vercel realiza rolling deployments automáticamente — las instancias antiguas sirven tráfico hasta que las nuevas están listas.

### Despliegue Canary

```bash
# Example using Vercel
vercel --prod --target production  # 100% traffic

# Or split traffic (requires Enterprise/Pro)
# Route 10% to new version first
```

## Rollback

### Vercel

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard: Deployments → select old deployment → Promote to Production
```

### Rollback Basado en Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (careful with shared repos)
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## Seguridad en Producción

- Usar HTTPS en todas las rutas (Vercel: automático)
- Definir headers de seguridad (CSP, HSTS, X-Frame-Options) en `next.config.ts`
- Habilitar rate limiting en endpoints de API
- Sanitizar todas las entradas del usuario antes de persistir
- Usar prepared statements (Drizzle lo gestiona automáticamente)
- Revisar permisos de la base de datos — el usuario de la app debe tener el acceso mínimo necesario
- Rotar secrets tras cualquier sospecha de compromiso
- Monitorear logs de autenticación para accesos sospechosos
