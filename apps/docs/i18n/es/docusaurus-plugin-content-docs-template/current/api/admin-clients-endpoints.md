---
id: admin-clients-endpoints
title: "Endpoints Admin Clientes"
sidebar_label: "Admin Clientes"
sidebar_position: 38
---

# Endpoints Admin Clientes

La API de Clientes proporciona puntos finales para gestionar perfiles de clientes, incluyendo creación, actualizaciones, búsqueda avanzada, operaciones masivas, analíticas del panel y estadísticas completas. Los clientes representan perfiles de usuario final vinculados a cuentas de autenticación. Todos los puntos finales requieren autenticación de administrador.

## Ruta Base

```
/api/admin/clients
```

## Resumen de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/admin/clients` | Admin | Obtener lista paginada de clientes |
| `POST` | `/api/admin/clients` | Admin | Crear un nuevo perfil de cliente |
| `GET` | `/api/admin/clients/stats` | Admin | Obtener estadísticas completas de clientes |
| `GET` | `/api/admin/clients/dashboard` | Admin | Obtener datos combinados del panel |
| `GET` | `/api/admin/clients/advanced-search` | Admin | Búsqueda avanzada con múltiples filtros |
| `PUT` | `/api/admin/clients/bulk` | Admin | Actualización masiva de perfiles de clientes |
| `DELETE` | `/api/admin/clients/bulk` | Admin | Eliminación masiva de perfiles de clientes |
| `GET` | `/api/admin/clients/{clientId}` | Admin | Obtener cliente por ID |
| `PUT` | `/api/admin/clients/{clientId}` | Admin | Actualizar perfil de cliente |
| `DELETE` | `/api/admin/clients/{clientId}` | Admin | Eliminar perfil de cliente |

---

## Listar Clientes

```
GET /api/admin/clients
```

Devuelve una lista paginada de perfiles de clientes con filtrado básico.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `page` | entero | `1` | Número de página (mínimo: 1) |
| `limit` | entero | `10` | Resultados por página (1--100) |
| `search` | string | -- | Buscar por nombre o correo electrónico |
| `status` | string | -- | Filtro: `active`, `inactive`, `suspended`, `trial` |
| `plan` | string | -- | Filtro: `free`, `standard`, `premium` |
| `accountType` | string | -- | Filtro: `individual`, `business`, `enterprise` |
| `provider` | string | -- | Filtrar por proveedor de autenticación |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## Crear Cliente

```
POST /api/admin/clients
```

Crea un nuevo perfil de cliente. Si no existe una cuenta de usuario para el correo electrónico proporcionado, se crea automáticamente un nuevo usuario con una contraseña temporal. Activa la sincronización con CRM cuando está habilitado.

**Cuerpo de la Solicitud:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Dirección de correo electrónico del cliente |
| `displayName` | string | No | Nombre para mostrar (por defecto, prefijo del correo) |
| `username` | string | No | Nombre de usuario único |
| `bio` | string | No | Biografía del cliente |
| `jobTitle` | string | No | Título del puesto |
| `company` | string | No | Nombre de la empresa |
| `industry` | string | No | Sector industrial |
| `phone` | string | No | Número de teléfono |
| `website` | string | No | URL del sitio web |
| `location` | string | No | Ubicación |
| `accountType` | string | No | `individual` (predeterminado), `business`, `enterprise` |
| `status` | string | No | `active` (predeterminado), `inactive`, `suspended`, `trial` |
| `plan` | string | No | `free` (predeterminado), `standard`, `premium` |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Obtener Estadísticas de Clientes

```
GET /api/admin/clients/stats
```

Devuelve analíticas completas de todos los clientes, agrupadas por resumen, crecimiento, planes, tipos de cuenta, engagement, demografía y proveedores de autenticación.

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## Panel de Control

```
GET /api/admin/clients/dashboard
```

Devuelve una respuesta combinada con una lista paginada de clientes, estadísticas agregadas y metadatos de paginación. Admite todos los filtros básicos más parámetros de rango de fechas.

**Parámetros de Consulta adicionales:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `createdAfter` | string | Fecha ISO o `YYYY-MM-DD` — creado después de |
| `createdBefore` | string | Fecha ISO o `YYYY-MM-DD` — creado antes de |

---

## Búsqueda Avanzada

```
GET /api/admin/clients/advanced-search
```

Realiza una búsqueda multidimensional en perfiles de clientes. Además de los filtros básicos, admite búsquedas por campos específicos, rangos numéricos, indicadores booleanos y rangos de fechas. Devuelve metadatos de búsqueda incluyendo filtros aplicados y tiempo de ejecución.

**Parámetros de Consulta adicionales:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `sortBy` | string | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder` | string | `asc` o `desc` |
| `createdAfter` | string | Filtro de fecha-hora ISO |
| `createdBefore` | string | Filtro de fecha-hora ISO |
| `emailDomain` | string | Filtrar por dominio de correo (ej. `example.com`) |
| `companySearch` | string | Buscar dentro de nombres de empresas |
| `locationSearch` | string | Buscar dentro de ubicaciones |
| `industrySearch` | string | Buscar dentro de industrias |
| `minSubmissions` | entero | Conteo mínimo de envíos |
| `maxSubmissions` | entero | Conteo máximo de envíos |
| `emailVerified` | booleano | Filtrar por estado de verificación de correo |
| `twoFactorEnabled` | booleano | Filtrar por estado de 2FA |
| `hasAvatar` | booleano | Filtrar clientes con/sin avatar |
| `hasWebsite` | booleano | Filtrar clientes con/sin sitio web |
| `hasPhone` | booleano | Filtrar clientes con/sin teléfono |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "...": "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## Operaciones Masivas

### Actualización Masiva

```
PUT /api/admin/clients/bulk
```

Actualiza múltiples perfiles de clientes en una sola solicitud. Cada objeto de cliente debe incluir un campo `id` más los campos a actualizar. Los fallos individuales no cancelan el lote completo.

**Cuerpo de la Solicitud:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Eliminación Masiva

```
DELETE /api/admin/clients/bulk
```

Elimina permanentemente múltiples perfiles de clientes. Cada objeto en el array debe incluir un campo `id`.

**Cuerpo de la Solicitud:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Respuesta (200) — ambos puntos finales masivos:**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Obtener / Actualizar / Eliminar Cliente

### Obtener Cliente

```
GET /api/admin/clients/{clientId}
```

Devuelve el perfil completo del cliente incluyendo nombre para mostrar, empresa, plan, tipo de cuenta y marcas de tiempo de actividad.

### Actualizar Cliente

```
PUT /api/admin/clients/{clientId}
```

Actualización parcial — solo se modifican los campos proporcionados. Activa la sincronización con CRM cuando cambian los datos de empresa o perfil.

**Cuerpo de la Solicitud (todos los campos son opcionales):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Eliminar Cliente

```
DELETE /api/admin/clients/{clientId}
```

Elimina permanentemente un perfil de cliente. Esta acción no se puede deshacer.

**Respuesta (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## Reglas de Validación

| Campo | Regla |
|-------|-------|
| `email` | Requerido para creación; formato de correo electrónico válido |
| `status` | Debe ser `active`, `inactive`, `suspended` o `trial` |
| `plan` | Debe ser `free`, `standard` o `premium` |
| `accountType` | Debe ser `individual`, `business` o `enterprise` |
| `clients` | Masivo: array no vacío con `id` requerido en cada objeto |

## Códigos de Error

| Estado | Significado |
|--------|-------------|
| `400` | Error de validación, correo faltante, fallo en creación de usuario |
| `401` | Se requiere autenticación |
| `403` | Se requieren privilegios de administrador |
| `404` | Cliente no encontrado |
| `500` | Error interno del servidor |

## Documentación Relacionada

- [API Admin Usuarios](./admin-users-endpoints.md) — gestión de cuentas de usuario
- [API Admin Roles](./admin-roles-endpoints.md) — gestión de roles y permisos
- [Autenticación](../architecture/nextauth-configuration.md) — gestión de sesiones y guardias
