---
id: version-sync-endpoints
title: "Referencia API Versión y Sincronización"
sidebar_label: "Versión & Sync"
sidebar_position: 58
---

# Referencia API Versión y Sincronización

Endpoints para obtener información de versión del repositorio de contenido Git y controlar la sincronización del contenido. Todos los endpoints en esta sección son públicos (sin autenticación requerida).

## Descripción General

El sistema de versionado expone metadatos del repositorio Git que almacena el contenido del directorio. Los endpoints de sincronización permiten activar y monitorear la sincronización del repositorio de contenido.

## GET /api/version

Obtiene los metadatos del commit actual del repositorio de contenido.

### Respuesta 200

```json
{
  "commit": "abc1234def5678",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new entries for Q1 2024",
  "author": "Content Team",
  "repository": "https://github.com/org/content-repo",
  "lastSync": "2024-01-15T10:30:00.000Z",
  "branch": "main"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `commit` | `string` | Hash completo del commit |
| `date` | `string` | Fecha del commit en formato ISO 8601 |
| `message` | `string` | Mensaje del commit |
| `author` | `string` | Nombre del autor del commit |
| `repository` | `string` | URL del repositorio |
| `lastSync` | `string` | Última vez que el contenido fue sincronizado |
| `branch` | `string \| undefined` | Rama actual (si está disponible) |

### Encabezados de Respuesta

| Encabezado | Valor | Descripción |
|-----------|-------|-------------|
| `Cache-Control` | `public, max-age=60` | Almacenar en caché durante 1 minuto |
| `ETag` | `"<commit-hash>"` | Para validación de caché condicional |
| `Last-Modified` | Fecha del commit | Para solicitudes condicionales |

### Errores de Respuesta

| Código | Error | Descripción |
|--------|-------|-------------|
| 404 | `REPOSITORY_NOT_FOUND` | Repositorio de contenido no inicializado |
| 404 | `NO_COMMITS` | Sin commits en el repositorio |
| 500 | `GIT_ERROR` | Error de operación Git |
| 500 | `VALIDATION_ERROR` | Datos del repositorio inválidos |
| 500 | `INTERNAL_ERROR` | Error del servidor inesperado |

## POST /api/version/sync

Activa una sincronización del repositorio de contenido Git. Actualiza el contenido local con los cambios remotos más recientes.

### Cuerpo de la Solicitud

```typescript
interface SyncOptions {
  options?: {
    force?: boolean;   // Forzar sincronización incluso si está en progreso
  };
}
```

El cuerpo de la solicitud es opcional — una solicitud POST vacía activa la sincronización con las opciones predeterminadas.

### Respuesta: Sincronización Exitosa (200)

```json
{
  "success": true,
  "message": "Repository synced successfully",
  "commit": "abc1234def5678",
  "date": "2024-01-15T10:30:00.000Z",
  "repository": "https://github.com/org/content-repo"
}
```

### Respuesta: Sincronización Ya en Progreso (200)

```json
{
  "success": true,
  "message": "Sync already in progress",
  "syncInProgress": true
}
```

### Respuesta: Falló la Sincronización (500)

```json
{
  "success": false,
  "error": "SYNC_FAILED",
  "message": "Failed to sync repository: Connection timeout"
}
```

### Ejemplo

```bash
curl -X POST /api/version/sync \
  -H "Content-Type: application/json"
```

## GET /api/version/sync

Obtiene el estado actual de sincronización y el estado de tiempo de ejecución del servidor.

### Respuesta 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 3600000,
  "timeSinceLastSyncHuman": "1 hour ago",
  "uptime": 864000,
  "timestamp": "2024-01-15T11:30:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `syncInProgress` | `boolean` | Si la sincronización está actualmente activa |
| `lastSyncTime` | `string \| null` | Timestamp ISO de la última sincronización exitosa |
| `timeSinceLastSync` | `number \| null` | Milisegundos desde la última sincronización |
| `timeSinceLastSyncHuman` | `string \| null` | Duración legible (p. ej. "1 hour ago") |
| `uptime` | `number` | Tiempo de ejecución del servidor en segundos |
| `timestamp` | `string` | Timestamp de la respuesta en ISO 8601 |

### Ejemplo

```bash
curl /api/version/sync
```

## Autenticación

Todos los endpoints de versión y sincronización son **públicos** — no se requiere autenticación.

## Limitación de Tasa y Almacenamiento en Caché

| Endpoint | Caché | Notas |
|----------|-------|-------|
| `GET /api/version` | 60 segundos (`Cache-Control: public, max-age=60`) | Reduce la carga de la base de datos |
| `POST /api/version/sync` | Sin caché | Solo se puede ejecutar una sincronización a la vez |
| `GET /api/version/sync` | Sin caché | Devuelve el estado actual en tiempo real |

La sincronización concurrente está prevenida: si está en progreso y llega otra solicitud, responde con `syncInProgress: true` en lugar de iniciar una segunda.

## Endpoints Relacionados

- [Endpoints de Utilidad](./utility-endpoints.md) — incluye `/api/health/database`
