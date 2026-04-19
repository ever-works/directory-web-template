---
id: cron-api-endpoints
title: "Endpoints API Cron"
sidebar_label: "API Cron"
sidebar_position: 59
---

# Endpoints API Cron

La API Cron proporciona puntos finales de tareas programadas que se activan mediante Vercel Cron, programadores externos o el `BackgroundJobManager` interno. Todos los puntos finales cron requieren autenticación mediante la variable de entorno `CRON_SECRET` usando un token `Bearer` en el encabezado `Authorization`.

**Directorio fuente:** `template/app/api/cron/`

---

## Autenticación

Los puntos finales cron usan un secreto compartido para la autorización:

- **Producción:** La variable de entorno `CRON_SECRET` debe estar configurada. Las solicitudes deben incluir `Authorization: Bearer <CRON_SECRET>`.
- **Desarrollo:** Si `CRON_SECRET` no está configurado, se permite el acceso sin autenticación para una experiencia de desarrollo local sin fricción.
- **Seguridad:** Todos los puntos finales cron usan `crypto.timingSafeEqual()` para comparación en tiempo constante y prevenir ataques de temporización.

**Respuesta no autorizada (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Configuración de Vercel Cron

El horario cron se define en `vercel.json`:

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

| Tarea | Horario | Descripción |
|-------|---------|-------------|
| Sincronización de Contenido | Diariamente a las 3:00 AM UTC | Sincroniza contenido desde el CMS basado en Git |
| Recordatorios de Suscripción | Diariamente a las 9:00 AM UTC | Envía correos de recordatorio de renovación |
| Expiración de Suscripción | Diariamente a medianoche UTC | Procesa suscripciones vencidas |

---

## Sincronización de Contenido

Activa una sincronización de contenido desde el repositorio del CMS basado en Git.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/cron/sync` |
| **Autenticación** | `CRON_SECRET` (token Bearer) |
| **Fuente** | `cron/sync/route.ts` |

### Respuesta

**Estado 200** -- Sincronización completada exitosamente.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Estado 500** -- Sincronización fallida.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | `boolean` | Si la sincronización tuvo éxito |
| `timestamp` | `string` (ISO 8601) | Cuándo completó la sincronización |
| `duration` | `number` | Duración en milisegundos |
| `message` | `string` | Mensaje de estado legible |
| `details` | `string` (opcional) | Detalles adicionales en caso de fallo |

### Encabezados de Respuesta

Todas las respuestas incluyen `Cache-Control: no-cache, no-store, must-revalidate` para evitar el almacenamiento en caché de resultados de sincronización.

### Ejemplo con curl

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Expiración de Suscripción

Encuentra y procesa suscripciones vencidas actualizando su estado de `active` a `expired` y enviando correos de notificación.

| Propiedad | Valor |
|-----------|-------|
| **Métodos** | `GET`, `POST` |
| **Ruta** | `/api/cron/subscription-expiration` |
| **Autenticación** | `CRON_SECRET` (token Bearer) |
| **Fuente** | `cron/subscription-expiration/route.ts` |

### Respuesta

**Estado 200** -- Procesado exitosamente.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `data.processed` | `number` | Número de suscripciones actualizadas a vencidas |
| `data.affectedUsers` | `array` | Lista de suscripciones afectadas (sin PII) |
| `data.errors` | `string[]` | Errores no fatales (p. ej., fallos de entrega de correo) |
| `data.timestamp` | `string` | Marca de tiempo de procesamiento |

### Pasos de Procesamiento

1. Encuentra suscripciones activas que han superado su fecha de vencimiento.
2. Actualiza el estado de `active` a `expired`.
3. Envía correos de notificación de vencimiento mediante el servicio de correo.
4. Devuelve un resumen -- los fallos de correo no causan que toda la tarea falle.

### Ejemplo con curl

```bash
# Vía GET
curl -s http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"

# Vía POST (también admitido para activación manual)
curl -s -X POST http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Recordatorios de Suscripción

Envía correos de recordatorio de renovación a usuarios con suscripciones próximas a vencer.

| Propiedad | Valor |
|-----------|-------|
| **Métodos** | `GET`, `POST` |
| **Ruta** | `/api/cron/subscription-reminders` |
| **Autenticación** | `CRON_SECRET` (token Bearer) |
| **Fuente** | `cron/subscription-reminders/route.ts` |

### Respuesta

**Estado 200** -- Tarea completada exitosamente.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Estado 207** -- Tarea completada con errores parciales (Multi-Estado).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

### Ejemplo con curl

```bash
curl -s http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Inicialización de Tareas en Segundo Plano

El módulo de tareas en segundo plano (`cron/jobs/background-jobs-init.ts`) no es un punto final de API, sino un módulo de inicialización singleton utilizado para configurar el modo de programación al inicio de la aplicación.

**Fuente:** `cron/jobs/background-jobs-init.ts`

### Modos de Programación

| Modo | Descripción |
|------|-------------|
| `vercel` | Tareas gestionadas por Vercel Cron vía puntos finales `/api/cron/*` |
| `local` | Programador interno (para despliegues auto-hospedados) |
| `trigger-dev` | Integración con Trigger.dev para tareas en segundo plano gestionadas |
| `disabled` | Sincronización en segundo plano deshabilitada (`DISABLE_AUTO_SYNC=true`) |

### Uso

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Llamado una vez desde layout.tsx -- seguro llamarlo múltiples veces
await ensureBackgroundJobsInitialized();
```
