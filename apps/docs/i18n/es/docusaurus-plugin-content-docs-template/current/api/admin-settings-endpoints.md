---
id: admin-settings-endpoints
title: "Endpoints Admin Configuración"
sidebar_label: "Admin Configuración"
sidebar_position: 23
---

# Endpoints Admin Configuración

La API de configuración del administrador proporciona puntos finales para leer y modificar la configuración del sitio almacenada en `config.yml`. Esto incluye configuración general y el estado del proveedor de mapas. Todos los puntos finales requieren autenticación de administrador.

## Descripción General

| Punto final | Método | Autenticación | Descripción |
|---|---|---|---|
| `/api/admin/settings` | GET | Admin | Obtener toda la configuración |
| `/api/admin/settings` | PATCH | Admin | Actualizar una configuración específica |
| `/api/admin/settings/map-status` | GET | Admin | Obtener el estado de configuración del proveedor de mapas |

## Obtener Configuración

```
GET /api/admin/settings
```

Recupera la sección completa de `settings` del archivo `config.yml` del sitio.

**Autenticación:** Se requiere administrador (mediante `getCachedApiSession`)

**Respuesta exitosa (200):**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "enableVoting": true,
    "enableNewsletter": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

La forma exacta del objeto `settings` depende de la configuración de `config.yml` del sitio. El punto final devuelve lo que esté almacenado bajo la clave `settings`.

| Estado | Condición |
|---|---|
| 401 | No autenticado como administrador |
| 500 | Error al leer la configuración |

**Fuente:** `template/app/api/admin/settings/route.ts`

## Actualizar una Configuración

```
PATCH /api/admin/settings
```

Actualiza un valor de configuración individual dentro de la sección `settings` de `config.yml`. La clave se circunscribe automáticamente al espacio de nombres `settings` (p. ej., al proporcionar la clave `"theme"` se actualiza `settings.theme` en el archivo de configuración).

**Autenticación:** Se requiere administrador

**Cuerpo de la Solicitud:**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `key` | string | Sí | La clave de configuración a actualizar (relativa a `settings.`) |
| `value` | cualquiera | Sí | El nuevo valor para la configuración |

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "key": "itemsPerPage",
  "value": 30
}
```

La actualización se persiste mediante `configManager.updateNestedKey()`, que modifica el archivo `config.yml` subyacente. La clave se prefija automáticamente con `settings.` antes de pasarla al gestor de configuración.

**Respuestas de Error:**

| Estado | Condición |
|---|---|
| 400 | Falta el campo `key` en el cuerpo de la solicitud |
| 401 | No autenticado como administrador |
| 500 | Error al escribir la configuración |

**Fuente:** `template/app/api/admin/settings/route.ts`

## Estado del Proveedor de Mapas

### Obtener Estado del Mapa

```
GET /api/admin/settings/map-status
```

Devuelve el estado de configuración de los proveedores de mapas compatibles sin exponer las claves de API reales. Esto permite que el panel de administración muestre qué proveedores de mapas están disponibles para su uso.

**Autenticación:** Se requiere administrador

**Respuesta exitosa (200):**

```json
{
  "status": {
    "mapbox": {
      "isConfigured": true,
      "isPreviewAvailable": true,
      "name": "Mapbox"
    },
    "google": {
      "isConfigured": false,
      "isPreviewAvailable": false,
      "name": "Google Maps"
    }
  }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `mapbox.isConfigured` | booleano | Si `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` está configurado |
| `mapbox.isPreviewAvailable` | booleano | Igual que `isConfigured` — la vista previa requiere el token |
| `google.isConfigured` | booleano | Si `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` está configurado |
| `google.isPreviewAvailable` | booleano | Igual que `isConfigured` |

El punto final verifica la presencia de variables de entorno:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` para Mapbox
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` para Google Maps

No se exponen los valores reales de las claves en la respuesta.

| Estado | Condición |
|---|---|
| 401 | No autenticado como administrador |
| 500 | Error interno del servidor |

**Fuente:** `template/app/api/admin/settings/map-status/route.ts`

## Arquitectura de Configuración

El sistema de configuración está construido sobre el singleton `configManager` de `lib/config-manager`:

- **Almacenamiento:** La configuración se guarda en un archivo de configuración YAML (`config.yml`)
- **Acceso:** El método `configManager.getConfig()` lee la configuración completa
- **Actualizaciones:** El método `configManager.updateNestedKey()` modifica claves anidadas específicas
- **Caché:** Las sesiones se almacenan en caché mediante `getCachedApiSession()` para mejorar el rendimiento

Todas las actualizaciones de configuración están delimitadas bajo el espacio de nombres `settings` en el archivo de configuración. Esto evita la modificación accidental de claves de configuración de nivel superior a través de la API de configuración.
