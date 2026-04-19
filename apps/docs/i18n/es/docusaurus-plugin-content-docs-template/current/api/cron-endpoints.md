---
id: cron-endpoints
title: "Endpoints API de Tareas Programadas"
sidebar_label: "Endpoints Cron"
sidebar_position: 6
---

# Endpoints API de Tareas Programadas

La plantilla incluye tres puntos finales de tareas programadas que se ejecutan en intervalos programados vía Vercel Cron. Estos puntos finales gestionan la sincronización de contenido, recordatorios de suscripción y procesamiento de suscripciones vencidas.

## Configuración Cron

Los horarios cron se definen en `vercel.json`:

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

## Sincronización de Contenido (`/api/cron/sync`)

| Método | Ruta | Horario | Descripción |
|--------|------|---------|-------------|
| `GET` | `/api/cron/sync` | Diariamente a las 3:00 AM UTC | Sincronizar repositorio de contenido basado en Git |

### Qué Hace

La tarea cron de sincronización obtiene el contenido más reciente del repositorio de datos Git configurado (`DATA_REPOSITORY`) y actualiza la caché de contenido local. Esto garantiza que la aplicación refleje los cambios realizados directamente en el repositorio de contenido (p. ej., mediante fusión de PR en GitHub).

### Proceso de Sincronización

```
1. Verificar autorización CRON_SECRET
2. Verificar si ya hay una sincronización en progreso (bloqueo mutex)
3. Obtener los últimos cambios del repositorio Git remoto
4. Analizar y validar los archivos de contenido YAML actualizados
5. Actualizar la caché de contenido local
6. Devolver resultado de sincronización con duración
```

### Comportamientos Clave

- **Bloqueo mutex**: Solo puede ejecutarse una sincronización a la vez. Las solicitudes concurrentes se rechazan con un mensaje de estado
- **Tiempo límite**: Las operaciones de sincronización tienen un tiempo límite de 5 minutos para evitar procesos descontrolados
- **Lógica de reintentos**: Las sincronizaciones fallidas se reintentan hasta 3 veces
- **Modo desarrollo**: La sincronización automática puede deshabilitarse mediante la variable de entorno `DISABLE_AUTO_SYNC=true`

### Respuesta

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Recordatorios de Suscripción (`/api/cron/subscription-reminders`)

| Método | Ruta | Horario | Descripción |
|--------|------|---------|-------------|
| `GET` | `/api/cron/subscription-reminders` | Diariamente a las 9:00 AM UTC | Enviar recordatorios de renovación de suscripción |

### Qué Hace

Consulta suscripciones próximas a su fecha de renovación y envía recordatorios por correo a los suscriptores. Esto ayuda a reducir la pérdida involuntaria de clientes alertando a los usuarios antes de que se procese su pago.

### Lógica de Recordatorio

```
1. Verificar autorización CRON_SECRET
2. Consultar suscripciones que se renuevan dentro de la ventana de recordatorio
3. Filtrar suscripciones ya notificadas
4. Enviar correos de recordatorio vía servicio de notificación de correo
5. Marcar suscripciones como notificadas
6. Devolver recuento de recordatorios enviados
```

### Ventanas de Recordatorio

Ventanas de recordatorio típicas:
- **7 días antes de la renovación**: Primer recordatorio
- **1 día antes de la renovación**: Recordatorio final

### Respuesta

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## Expiración de Suscripción (`/api/cron/subscription-expiration`)

| Método | Ruta | Horario | Descripción |
|--------|------|---------|-------------|
| `GET` | `/api/cron/subscription-expiration` | Diariamente a medianoche UTC | Procesar suscripciones vencidas |

### Qué Hace

Identifica suscripciones que han superado su fecha de vencimiento y actualiza su estado. Esto maneja suscripciones que fueron canceladas pero tenían tiempo restante, así como suscripciones que no pudieron renovarse.

### Proceso de Expiración

```
1. Verificar autorización CRON_SECRET
2. Consultar suscripciones con fecha de vencimiento en el pasado
3. Actualizar estado de suscripción a 'expired'
4. Revocar acceso/permisos asociados
5. Enviar correos de notificación de vencimiento
6. Registrar eventos de vencimiento para auditoría
7. Devolver recuento de vencimientos procesados
```

### Respuesta

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## Tareas en Segundo Plano (`/api/cron/jobs`)

El archivo `background-jobs-init.ts` en el directorio de tareas cron inicializa el procesamiento de tareas en segundo plano. Esto configura cualquier tarea recurrente que necesite ejecutarse dentro del tiempo de ejecución de la aplicación.

## Seguridad

### Verificación de CRON_SECRET

Todos los puntos finales cron verifican un encabezado o parámetro de consulta `CRON_SECRET` para evitar la ejecución no autorizada:

```typescript
// Verificación de autorización cron típica
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Autorización de Vercel Cron

Al desplegarse en Vercel, los trabajos cron son llamados automáticamente por el programador cron de Vercel con el encabezado `CRON_SECRET` adecuado. El secreto se configura en el panel de Vercel bajo la configuración del proyecto.

| Variable de Entorno | Descripción |
|--------------------|-------------|
| `CRON_SECRET` | Secreto compartido para autorización de tareas cron |

### Ejecución Manual

Los puntos finales cron pueden activarse manualmente para depuración incluyendo el `CRON_SECRET` en el encabezado Authorization:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## Monitoreo

### Estado de Sincronización

El estado de la tarea cron de sincronización puede monitorearse mediante:
- `/api/version/sync` - Devuelve la última hora de sincronización y resultado
- Registros del servidor - Las operaciones de sincronización se registran con el prefijo `[SYNC_MANAGER]`

### Manejo de Errores

Todas las tareas cron implementan manejo de errores completo:
- Las operaciones fallidas se registran con detalles completos del error
- Los fallos parciales no impiden el procesamiento de los elementos restantes
- Los recuentos de errores se incluyen en la respuesta para monitoreo
- Los fallos críticos generan errores de consola para alertas de agregación de registros

## Referencia de Horarios

| Expresión Cron | Significado |
|----------------|-------------|
| `0 3 * * *` | Todos los días a las 3:00 AM UTC |
| `0 9 * * *` | Todos los días a las 9:00 AM UTC |
| `0 0 * * *` | Todos los días a medianoche UTC |

Todos los horarios están en UTC. Considera la distribución de zonas horarias de tu base de usuarios al ajustar estos horarios.
