---
id: cron-jobs
title: Configuración de Cron Jobs
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Configuración de Cron Jobs

El Template Ever Works soporta tres mecanismos de programación de trabajos en segundo plano, seleccionados automáticamente según el entorno de ejecución.

## Cómo Funciona

### Prioridad de Mecanismos

```typescript
// Priority order (highest to lowest):
// 1. Trigger.dev  — when TRIGGER_SECRET_KEY is set
// 2. Vercel Crons — when VERCEL=1 (auto-set by Vercel platform)
// 3. Local setInterval — fallback for development
```

### Auto-detección de Entorno

El sistema detecta automáticamente el mecanismo correcto:

- **Trigger.dev**: cuando `TRIGGER_SECRET_KEY` está definido
- **Vercel Crons**: cuando `VERCEL=1` (establecido automáticamente por Vercel)
- **Local setInterval**: en todos los demás casos (desarrollo local)

## Trabajos Registrados

Hay tres trabajos cron registrados en el sistema:

| Trabajo | Endpoint | Programación | Propósito |
|---------|----------|-------------|-----------|
| Sincronización de Repositorio | `/api/cron/sync` | `*/5 * * * *` | Sincroniza contenido cada 5 minutos |
| Recordatorios de Renovación | `/api/cron/subscription-reminders` | `0 9 * * *` | Envía emails de recordatorio a las 9:00 diariamente |
| Limpieza de Expiración | `/api/cron/subscription-expiration` | `0 0 * * *` | Procesa suscripciones vencidas a la medianoche |

## Configuración de Vercel Crons

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
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

### Variable de Entorno CRON_SECRET

Para seguridad, Vercel firmará cada invocación de cron con el encabezado `Authorization`. Defina el mismo secreto en ambos lados:

```bash
# In Vercel project settings (Environment Variables)
CRON_SECRET=your-secret-here  # openssl rand -base64 32
```

Cada endpoint de API verifica el secreto:

```typescript
// app/api/cron/sync/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

## Verificación

### Paso 1: Dashboard de Vercel

```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

Confirmar que los 3 cron jobs aparecen con sus programaciones correctas.

### Paso 2: Logs de Invocación

```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

### Paso 3: Logs de la Aplicación

Al inicio de la aplicación:
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

En cada sincronización:
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

### Paso 4: Prueba Manual

```bash
curl -X GET https://yourdomain.com/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Sync completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": 1234
}
```

## Solución de Problemas

### Los trabajos no se ejecutan

1. Verificar que `vercel.json` lista los 3 cron jobs
2. Confirmar que `CRON_SECRET` está definido en las variables de entorno de Vercel
3. Verificar que las variables de Trigger.dev **no** están definidas (de lo contrario tomará prioridad)

### Errores 401 No Autorizado

```bash
# Generar nuevo secreto
openssl rand -base64 32

# Agregar a Vercel
vercel env add CRON_SECRET

# Redesplegar
vercel --prod
```

### Ejecución demasiado frecuente

Verificar que no hay duplicados en `vercel.json` — cada ruta debe aparecer solo una vez.

## Guía de Migración

### Local → Vercel Crons

1. Agregar entradas cron a `vercel.json`
2. Generar y definir `CRON_SECRET`
3. Redesplegar en Vercel

### Vercel → Trigger.dev

```bash
# Install Trigger.dev
pnpm add @trigger.dev/sdk

# Set the environment variable
TRIGGER_SECRET_KEY=your-trigger-secret

# Deploy your trigger jobs
npx trigger.dev@latest deploy
```

### Trigger.dev → Vercel Crons

```bash
# Remove Trigger.dev environment variables
vercel env rm TRIGGER_SECRET_KEY
vercel env rm TRIGGER_API_KEY

# Redeploy
vercel --prod
```
