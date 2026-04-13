---
id: admin-endpoints
title: "Endpoints API de Administración"
sidebar_label: "Endpoints Admin"
sidebar_position: 1
---

# Endpoints API de Administración

La API de administración contiene aproximadamente 60 manejadores de rutas distribuidos en 19 grupos de recursos. Todos los puntos finales de administración están protegidos por el middleware `withAdminAuth`, que verifica tanto la autenticación como la asignación del rol de administrador mediante consulta a la base de datos.

## Autenticación

Cada punto final de administración requiere:

1. Una sesión JWT válida (verificada mediante `auth()`)
2. Un rol de administrador en la tabla `user_roles` (verificado mediante `isAdmin()` desde `lib/db/roles.ts`)

Las solicitudes no autenticadas reciben una respuesta `401`. Las solicitudes autenticadas pero sin rol de administrador reciben una respuesta `403`.

## Grupos de Recursos

### Categorías (`/api/admin/categories`)

Gestión de categorías de contenido con persistencia basada en Git.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/categories` | Listar categorías con paginación |
| `POST` | `/api/admin/categories` | Crear una nueva categoría |
| `GET` | `/api/admin/categories/all` | Obtener todas las categorías (sin paginación) |
| `POST` | `/api/admin/categories/git` | Sincronizar categorías con repositorio Git |
| `POST` | `/api/admin/categories/reorder` | Reordenar posiciones de categorías |
| `GET` | `/api/admin/categories/[id]` | Obtener categoría por ID |
| `PUT` | `/api/admin/categories/[id]` | Actualizar categoría |
| `DELETE` | `/api/admin/categories/[id]` | Eliminar categoría |

### Clientes (`/api/admin/clients`)

Gestión de cuentas y perfiles de usuarios clientes.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/clients` | Listar perfiles de clientes con paginación |
| `POST` | `/api/admin/clients/advanced-search` | Búsqueda avanzada de clientes con filtros |
| `POST` | `/api/admin/clients/bulk` | Operaciones masivas sobre clientes |
| `GET` | `/api/admin/clients/dashboard` | Estadísticas del panel de clientes |
| `GET` | `/api/admin/clients/stats` | Estadísticas agregadas de clientes |
| `GET` | `/api/admin/clients/[clientId]` | Obtener detalles del perfil del cliente |
| `PUT` | `/api/admin/clients/[clientId]` | Actualizar perfil del cliente |
| `DELETE` | `/api/admin/clients/[clientId]` | Eliminar cuenta del cliente |

### Colecciones (`/api/admin/collections`)

Gestión de colecciones curadas de elementos.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/collections` | Listar todas las colecciones |
| `POST` | `/api/admin/collections` | Crear una nueva colección |
| `GET` | `/api/admin/collections/[id]` | Obtener detalles de la colección |
| `PUT` | `/api/admin/collections/[id]` | Actualizar colección |
| `DELETE` | `/api/admin/collections/[id]` | Eliminar colección |
| `GET` | `/api/admin/collections/[id]/items` | Listar elementos de una colección |
| `PUT` | `/api/admin/collections/[id]/items` | Actualizar elementos de la colección |

### Comentarios (`/api/admin/comments`)

Moderación de comentarios de usuarios.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/comments` | Listar comentarios con filtros de moderación |
| `GET` | `/api/admin/comments/[id]` | Obtener detalles del comentario |
| `PUT` | `/api/admin/comments/[id]` | Actualizar comentario (aprobar/rechazar) |
| `DELETE` | `/api/admin/comments/[id]` | Eliminar comentario |

### Empresas (`/api/admin/companies`)

Gestión de perfiles de empresas vinculados a elementos.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/companies` | Listar empresas |
| `POST` | `/api/admin/companies` | Crear empresa |
| `GET` | `/api/admin/companies/[id]` | Obtener detalles de la empresa |
| `PUT` | `/api/admin/companies/[id]` | Actualizar empresa |
| `DELETE` | `/api/admin/companies/[id]` | Eliminar empresa |

### Panel de Control (`/api/admin/dashboard`)

Analíticas agregadas del panel de control.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Estadísticas resumen del panel |

### Elementos Destacados (`/api/admin/featured-items`)

Gestión de elementos destacados.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/featured-items` | Listar elementos destacados |
| `POST` | `/api/admin/featured-items` | Destacar un elemento |
| `GET` | `/api/admin/featured-items/[id]` | Obtener detalles del elemento destacado |
| `PUT` | `/api/admin/featured-items/[id]` | Actualizar configuración del elemento destacado |
| `DELETE` | `/api/admin/featured-items/[id]` | Eliminar de destacados |

### Analíticas Geográficas (`/api/admin/geo-analytics`)

Analíticas geográficas y datos de distribución de visitantes.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/geo-analytics` | Obtener datos de analíticas geográficas |

### Elementos (`/api/admin/items`)

Gestión completa del contenido de elementos.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/items` | Listar elementos con filtros y paginación |
| `POST` | `/api/admin/items` | Crear un nuevo elemento |
| `POST` | `/api/admin/items/bulk` | Operaciones masivas (aprobar, rechazar, eliminar) |
| `GET` | `/api/admin/items/stats` | Estadísticas agregadas de elementos |
| `GET` | `/api/admin/items/[id]` | Obtener detalles del elemento |
| `PUT` | `/api/admin/items/[id]` | Actualizar elemento |
| `DELETE` | `/api/admin/items/[id]` | Eliminar elemento |
| `GET` | `/api/admin/items/[id]/history` | Obtener historial de auditoría del elemento |
| `POST` | `/api/admin/items/[id]/review` | Enviar revisión del elemento (aprobar/rechazar) |

### Índice de Ubicación (`/api/admin/location-index`)

Gestión del índice de búsqueda geográfica.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/admin/location-index` | Reconstruir el índice de búsqueda de ubicaciones |

### Navegación (`/api/admin/navigation`)

Configuración de navegación del administrador.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/navigation` | Obtener estructura de navegación |
| `PUT` | `/api/admin/navigation` | Actualizar navegación |

### Notificaciones (`/api/admin/notifications`)

Gestión de notificaciones del administrador.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/notifications` | Listar notificaciones del administrador |
| `POST` | `/api/admin/notifications/mark-all-read` | Marcar todas las notificaciones como leídas |
| `POST` | `/api/admin/notifications/[id]/read` | Marcar una notificación como leída |

### Reportes (`/api/admin/reports`)

Gestión de reportes de contenido y moderación.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/reports` | Listar reportes de contenido |
| `GET` | `/api/admin/reports/stats` | Estadísticas de reportes |
| `GET` | `/api/admin/reports/[id]` | Obtener detalles del reporte |
| `PUT` | `/api/admin/reports/[id]` | Actualizar estado del reporte (resolver, desestimar) |

### Roles (`/api/admin/roles`)

Gestión de roles y permisos para RBAC.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/roles` | Listar roles con paginación |
| `POST` | `/api/admin/roles` | Crear un nuevo rol |
| `GET` | `/api/admin/roles/active` | Obtener solo roles activos |
| `GET` | `/api/admin/roles/stats` | Estadísticas de roles |
| `GET` | `/api/admin/roles/[id]` | Obtener detalles del rol |
| `PUT` | `/api/admin/roles/[id]` | Actualizar rol |
| `DELETE` | `/api/admin/roles/[id]` | Eliminar rol (eliminación suave) |
| `GET` | `/api/admin/roles/[id]/permissions` | Obtener permisos del rol |
| `PUT` | `/api/admin/roles/[id]/permissions` | Actualizar permisos del rol |

### Configuración (`/api/admin/settings`)

Gestión de configuración de la aplicación.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/settings` | Obtener toda la configuración |
| `PUT` | `/api/admin/settings` | Actualizar configuración |
| `GET` | `/api/admin/settings/map-status` | Obtener estado de la función de mapa |

### Anuncios Patrocinados (`/api/admin/sponsor-ads`)

Moderación de anuncios patrocinados.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/sponsor-ads` | Listar anuncios patrocinados |
| `GET` | `/api/admin/sponsor-ads/[id]` | Obtener detalles del anuncio |
| `PUT` | `/api/admin/sponsor-ads/[id]` | Actualizar anuncio |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Aprobar anuncio patrocinado |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Rechazar anuncio patrocinado |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Cancelar anuncio patrocinado |

### Etiquetas (`/api/admin/tags`)

Gestión de etiquetas de contenido.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/tags` | Listar etiquetas con paginación |
| `POST` | `/api/admin/tags` | Crear una nueva etiqueta |
| `GET` | `/api/admin/tags/all` | Obtener todas las etiquetas (sin paginación) |
| `GET` | `/api/admin/tags/[id]` | Obtener detalles de la etiqueta |
| `PUT` | `/api/admin/tags/[id]` | Actualizar etiqueta |
| `DELETE` | `/api/admin/tags/[id]` | Eliminar etiqueta |

### Twenty CRM (`/api/admin/twenty-crm`)

Configuración e integración con CRM.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/twenty-crm/config` | Obtener configuración del CRM |
| `PUT` | `/api/admin/twenty-crm/config` | Actualizar configuración del CRM |
| `POST` | `/api/admin/twenty-crm/test-connection` | Probar conexión con el CRM |

### Usuarios (`/api/admin/users`)

Gestión de usuarios del administrador.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/users` | Listar usuarios con paginación |
| `POST` | `/api/admin/users` | Crear un nuevo usuario |
| `GET` | `/api/admin/users/stats` | Estadísticas de usuarios |
| `GET` | `/api/admin/users/check-email` | Verificar disponibilidad de correo electrónico |
| `GET` | `/api/admin/users/check-username` | Verificar disponibilidad de nombre de usuario |
| `GET` | `/api/admin/users/[id]` | Obtener detalles del usuario |
| `PUT` | `/api/admin/users/[id]` | Actualizar usuario |
| `DELETE` | `/api/admin/users/[id]` | Eliminar usuario |

## Patrones Comunes

### Operaciones Masivas

Varios recursos admiten operaciones masivas mediante POST con un array de IDs:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Puntos Finales de Estadísticas

La mayoría de los grupos de recursos incluyen un punto final `/stats` que devuelve conteos agregados:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### Historial de Auditoría

Los elementos admiten seguimiento del historial de auditoría mediante el punto final `/[id]/history`, registrando quién realizó cambios y cuándo.
