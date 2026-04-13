---
id: admin-navigation-endpoints
title: "Endpoints Admin Navegación"
sidebar_label: "Admin Navegación"
sidebar_position: 29
---

# Endpoints Admin Navegación e Índice de Ubicación

Estos puntos finales de administración gestionan los enlaces de navegación del sitio personalizados y el índice de ubicación geográfica. Los puntos finales de navegación permiten configurar enlaces personalizados de encabezado y pie de página almacenados en `config.yml`. Los puntos finales del índice de ubicación gestionan el índice espacial utilizado para analíticas geográficas y funciones de mapa.

## Descripción General

| Punto final | Método | Autenticación | Descripción |
|---|---|---|---|
| `/api/admin/navigation` | GET | Admin | Obtener configuración de navegación personalizada |
| `/api/admin/navigation` | PATCH | Admin | Actualizar elementos de navegación personalizada |
| `/api/admin/location-index` | GET | Admin | Obtener estadísticas del índice de ubicación |
| `/api/admin/location-index` | POST | Admin | Reconstruir o limpiar el índice de ubicación |

## Puntos Finales de Navegación

### Obtener Configuración de Navegación

```
GET /api/admin/navigation
```

Recupera los elementos de navegación `custom_header` y `custom_footer` del archivo `config.yml` del sitio. Devuelve arrays vacíos si no hay navegación personalizada configurada.

**Autenticación:** Se requiere administrador (mediante `getCachedApiSession`)

**Respuesta exitosa (200):**

```json
{
  "custom_header": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Documentation",
      "path": "/pages/docs"
    }
  ],
  "custom_footer": [
    {
      "label": "GitHub",
      "path": "https://github.com/example"
    },
    {
      "label": "footer.PRIVACY_POLICY",
      "path": "/pages/privacy-policy"
    }
  ]
}
```

Cada elemento de navegación tiene dos campos:

| Campo | Tipo | Descripción |
|---|---|---|
| `label` | string | Texto para mostrar (texto plano o clave de traducción i18n como `"footer.PRIVACY_POLICY"`) |
| `path` | string | Ruta URL (ruta interna que comienza con `/` o URL externa con `http://`/`https://`) |

| Estado | Condición |
|---|---|
| 401 | No autenticado como administrador |
| 500 | Error al leer la configuración |

**Fuente:** `template/app/api/admin/navigation/route.ts`

### Actualizar Configuración de Navegación

```
PATCH /api/admin/navigation
```

Actualiza los elementos de navegación personalizados del encabezado o pie de página en `config.yml`. Valida el formato de la ruta de cada elemento para prevenir ataques XSS mediante esquemas de URL peligrosos.

**Autenticación:** Se requiere administrador

**Cuerpo de la Solicitud:**

```json
{
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Blog",
      "path": "https://blog.example.com"
    }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `type` | string | Sí | `"header"` o `"footer"` |
| `items` | array | Sí | Array de elementos de navegación |
| `items[].label` | string | Sí | Etiqueta de visualización no vacía |
| `items[].path` | string | Sí | Ruta URL válida |

**Validación de Ruta:**

La función `isValidNavigationPath()` aplica reglas estrictas de formato de ruta:

| Formato de Ruta | Permitido | Ejemplo |
|---|---|---|
| Rutas internas | Sí | `/about`, `/pages/docs` |
| URLs HTTPS | Sí | `https://example.com` |
| URLs HTTP | Sí | `http://example.com` |
| URLs relativas a protocolo | No | `//evil.com` |
| URLs JavaScript | No | `javascript:alert(1)` |
| URLs de datos | No | `data:text/html,...` |
| Otros esquemas | No | `vbscript:`, `file:` |

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    }
  ]
}
```

**Respuestas de Error:**

| Estado | Condición |
|---|---|
| 400 | `type` no es `"header"` ni `"footer"` |
| 400 | `items` no es un array |
| 400 | Elemento sin campos string `label` o `path` |
| 400 | Formato de ruta inválido (prevención XSS) |
| 401 | No autenticado como administrador |
| 500 | Error al escribir la configuración |

Pasa un array `items` vacío para limpiar toda la navegación personalizada del tipo especificado.

**Fuente:** `template/app/api/admin/navigation/route.ts`

## Puntos Finales del Índice de Ubicación

### Obtener Estadísticas del Índice de Ubicación

```
GET /api/admin/location-index
```

Devuelve estadísticas sobre el índice de ubicación geográfica incluyendo total de elementos indexados, conteos de ciudades y países, y metadatos de reconstrucción. Usa el servicio de índice de ubicación para la recuperación de datos.

**Autenticación:** Se requiere administrador (mediante `checkAdminAuth()`)

**Caché:** Deshabilitado — usa `force-dynamic`, `revalidate: 0` y `force-no-store`.

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "data": {
    "totalIndexed": 450,
    "citiesCount": 85,
    "countriesCount": 25,
    "remoteCount": 30,
    "lastIndexedAt": "2024-01-20T10:30:00.000Z",
    "lastRebuildAt": "2024-01-15T08:00:00.000Z"
  }
}
```

| Estado | Condición |
|---|---|
| 401 | No autenticado como administrador |
| 500 | Error interno del servidor |

**Fuente:** `template/app/api/admin/location-index/route.ts`

### Gestionar Índice de Ubicación

```
POST /api/admin/location-index
```

Realiza acciones de gestión en el índice de ubicación. Admite la reconstrucción del índice desde cero o el borrado de todas las entradas.

**Autenticación:** Se requiere administrador

**Cuerpo de la Solicitud:**

```json
{
  "action": "rebuild"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `action` | string | Sí | `"rebuild"` o `"clear"` |

**Acciones:**

| Acción | Descripción |
|---|---|
| `rebuild` | Obtiene todos los elementos del repositorio y re-indexa sus datos de ubicación. Devuelve estadísticas de reconstrucción. |
| `clear` | Elimina todas las entradas del índice de ubicación. Devuelve el número de entradas borradas. |

**Respuesta exitosa (200) — Reconstrucción:**

```json
{
  "success": true,
  "data": {
    "indexed": 420,
    "skipped": 80,
    "errors": 0
  }
}
```

**Respuesta exitosa (200) — Borrado:**

```json
{
  "success": true,
  "data": {
    "cleared": 450
  }
}
```

**Respuestas de Error:**

| Estado | Condición |
|---|---|
| 400 | Acción inválida (no es `"rebuild"` ni `"clear"`) |
| 401 | No autenticado como administrador |
| 500 | Error interno del servidor |
