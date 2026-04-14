---
id: internal-endpoints
title: "Endpoints Internos y del Sistema"
sidebar_label: "Interno & Sistema"
sidebar_position: 17
---

# Endpoints Internos y del Sistema

Estos puntos finales proporcionan operaciones a nivel de sistema: inicialización de la base de datos, configuración de indicadores de características, verificaciones de salud, información de versión y sincronización del repositorio. La mayoría son usados por la propia plataforma en lugar de por los usuarios finales.

**Archivos fuente:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Resumen de Puntos Finales

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| GET | `/api/internal/db-init` | Solo desarrollo | Disparar inicialización de base de datos |
| GET | `/api/config/features` | Ninguna | Obtener indicadores de disponibilidad de características |
| GET | `/api/health/database` | Ninguna | Verificación de salud de la base de datos |
| GET | `/api/version` | Ninguna | Obtener información de versión de la aplicación |
| GET | `/api/version/sync` | Ninguna | Obtener estado de sincronización |
| POST | `/api/version/sync` | Ninguna | Disparar sincronización manual del repositorio |

---

## GET `/api/internal/db-init`

Dispara la migración y siembra automática de la base de datos si aún no está inicializada.

### Seguridad

Este punto final **solo está disponible en modo desarrollo**. En producción, devuelve 403:

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Configuración de Runtime

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Respuesta: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Respuesta: 403 (Producción)

```json
{
  "error": "Not available in production"
}
```

---

## GET `/api/config/features`

Devuelve los indicadores de disponibilidad de características actuales basados en la configuración del sistema (principalmente disponibilidad de la base de datos). Este es un **punto final público** utilizado por el frontend para manejar con elegancia las características faltantes.

### Respuesta: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Respuesta: 200 (Sin Base de Datos)

Cuando la base de datos no está configurada, todas las características están deshabilitadas:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### Caché

Las respuestas exitosas se almacenan en caché durante 5 minutos con stale-while-revalidate:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

Las respuestas de error usan `Cache-Control: no-cache`.

### Comportamiento en Error

En caso de error, el punto final devuelve todas las características deshabilitadas (con estado 500) para garantizar que el frontend se degrade con elegancia.

---

## GET `/api/health/database`

Una verificación de salud ligera que prueba la conexión a la base de datos ejecutando `SELECT 1`.

### Respuesta: 200 (Saludable)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Respuesta: 500 (No Saludable)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Casos de Uso

- Pruebas de actividad y preparación de Kubernetes/Docker
- Paneles de monitoreo
- Scripts de verificación de despliegue
- Verificaciones de salud del balanceador de carga

---

## GET `/api/version`

Recupera información de versión completa del repositorio de contenido Git, incluyendo los detalles del último commit, información del autor, rama y estado de sincronización.

### Cómo Funciona

1. Valida que el directorio Git exista en la ruta de contenido
2. Si falta el directorio `.git`, intenta sincronizar (útil para arranques en frío en Vercel)
3. Lee el último commit usando `isomorphic-git`
4. Devuelve información de versión formateada con encabezados de caché

### Respuesta: 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### Encabezados de Respuesta

| Encabezado | Valor | Descripción |
|------------|-------|-------------|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | Caché de cliente de 1 minuto |
| `ETag` | `"a1b2c3d-1705312200000"` | Basado en el hash del commit |
| `Last-Modified` | `Mon, 15 Jan 2024 10:30:00 GMT` | Marca de tiempo del commit |

### Respuestas de Error

Todos los errores incluyen un formato estructurado con código de error:

| Estado | Código | Condición |
|--------|--------|-----------|
| 404 | `REPOSITORY_NOT_FOUND` | El directorio Git no existe |
| 404 | `NO_COMMITS` | El repositorio no tiene commits |
| 500 | `GIT_ERROR` | Falló la lectura de la información del commit |
| 500 | `VALIDATION_ERROR` | Los datos del commit tienen campos requeridos faltantes |
| 500 | `INTERNAL_ERROR` | Error inesperado |

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Devuelve el estado actual de sincronización, incluyendo si hay una sincronización en progreso, cuándo ocurrió la última sincronización y el tiempo de actividad del servidor.

### Respuesta: 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Respuesta: 200 (Nunca Sincronizado)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## POST `/api/version/sync`

Dispara manualmente una sincronización en segundo plano del repositorio de contenido Git. Previene operaciones de sincronización concurrentes (si ya hay una sincronización en ejecución, devuelve éxito con un mensaje informativo).

### Cuerpo de la Solicitud

Opcional. Reservado para uso futuro:

```json
{}
```

### Respuesta: 200 (Sincronización Completa)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### Respuesta: 200 (Ya en Progreso)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### Respuesta: 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

Tanto las respuestas GET como POST incluyen `Cache-Control: no-cache, no-store, must-revalidate` para evitar el estado de sincronización desactualizado.

---

## Archivos Fuente Relacionados

| Archivo | Propósito |
|---------|----------|
| `template/app/api/internal/db-init/route.ts` | Punto final de inicialización de base de datos |
| `template/app/api/config/features/route.ts` | Punto final de indicadores de características |
| `template/app/api/health/database/route.ts` | Verificación de salud de la base de datos |
| `template/app/api/version/route.ts` | Punto final de información de versión |
| `template/app/api/version/sync/route.ts` | Disparador y estado de sincronización |
| `template/lib/db/initialize.ts` | Lógica de inicialización de base de datos |
| `template/lib/config/feature-flags.ts` | Resolución de indicadores de características |
| `template/lib/services/sync-service.ts` | Servicio de sincronización del repositorio |
| `template/lib/lib.ts` | Utilidades de ruta de contenido y sistema de archivos |
