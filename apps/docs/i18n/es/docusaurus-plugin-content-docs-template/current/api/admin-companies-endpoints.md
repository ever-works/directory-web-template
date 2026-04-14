---
id: admin-companies-endpoints
title: "Endpoints Admin Empresas"
sidebar_label: "Admin Empresas"
sidebar_position: 32
---

# Endpoints Admin Empresas

La API Admin de Empresas proporciona puntos finales de gestión para registros de empresas. Las empresas representan organizaciones asociadas con elementos listados. La API admite operaciones CRUD completas con validación basada en Zod, aplicación de unicidad de dominio/slug y sincronización opcional con CRM en las actualizaciones.

## Resumen de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/admin/companies` | Admin | Listar empresas (paginado, con búsqueda) |
| `POST` | `/api/admin/companies` | Admin | Crear una nueva empresa |
| `GET` | `/api/admin/companies/{id}` | Admin | Obtener una empresa por UUID |
| `PUT` | `/api/admin/companies/{id}` | Admin | Actualizar una empresa |
| `DELETE` | `/api/admin/companies/{id}` | Admin | Eliminar permanentemente una empresa |

## Autenticación

Todos los puntos finales de empresas verifican que la sesión tenga privilegios de administrador:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Puntos Finales

### GET `/api/admin/companies`

Devuelve una lista paginada de empresas con búsqueda y filtrado por estado. También devuelve conteos globales de empresas activas e inactivas independientemente de los filtros aplicados.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `page` | entero | `1` | Número de página (debe ser >= 1) |
| `limit` | entero | `10` | Elementos por página (1--100) |
| `q` | string | -- | Buscar por nombre o dominio (insensible a mayúsculas) |
| `status` | string | -- | Filtro: `"active"` o `"inactive"` |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

Los valores `meta.activeCount` y `meta.inactiveCount` reflejan totales globales y no se ven afectados por los filtros `q` o `status`. Esto permite que la interfaz muestre conteos de pestañas junto con los resultados filtrados.

### POST `/api/admin/companies`

Crea un nuevo registro de empresa. Los datos de la solicitud se validan con el esquema Zod (`createCompanySchema`). Los valores de dominio y slug se normalizan a minúsculas. Se verifica la unicidad de `domain` y `slug` antes de la inserción.

**Cuerpo de la Solicitud:**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | Sí | Nombre de la empresa (1--255 caracteres) |
| `website` | string (URI) | No | URL completa del sitio web |
| `domain` | string | No | Dominio normalizado (máx. 255 caracteres) |
| `slug` | string | No | Identificador amigable con URL (`^[a-z0-9-]+$`, máx. 255) |
| `status` | string | No | `"active"` o `"inactive"` (predeterminado: `"active"`) |

**Validación:** Usa validación de esquema Zod. En caso de fallo, devuelve errores detallados por campo:

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**Respuesta (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### GET `/api/admin/companies/{id}`

Recupera una empresa por su UUID.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string (UUID) | Identificador único de la empresa |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### PUT `/api/admin/companies/{id}`

Actualiza una empresa existente. Admite actualizaciones parciales — solo se cambian los campos proporcionados. Validado con `updateCompanySchema`. La unicidad de dominio y slug se verifica nuevamente cuando esos campos cambian. Tras una actualización exitosa, los datos de la empresa se sincronizan opcionalmente con un sistema CRM.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string (UUID) | Identificador único de la empresa |

**Cuerpo de la Solicitud:**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

Todos los campos son opcionales. Solo los campos proporcionados serán actualizados.

**Sincronización con CRM:**

Cuando `TWENTY_CRM_ENABLED` no está establecido en `"false"`, la empresa actualizada se sincroniza automáticamente con el sistema Twenty CRM. Esta sincronización no es bloqueante — si falla, la API aún retorna éxito para la actualización en la base de datos:

```typescript
const syncService = createTwentyCrmSyncServiceFromEnv();
const companyPayload = mapCompanyToTwentyCompany(company);
await syncService.upsertCompany(companyPayload);
```

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### DELETE `/api/admin/companies/{id}`

Elimina permanentemente una empresa. Es una eliminación definitiva — el registro se quita de la base de datos. Los vínculos de elemento-empresa asociados se eliminan mediante restricciones CASCADE.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string (UUID) | Identificador único de la empresa |

**Respuesta (200):**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::caution
La eliminación de empresas es permanente y no puede deshacerse. Todas las asociaciones de elementos para la empresa eliminada serán removidas mediante las reglas CASCADE de la base de datos.
:::

## Reglas de Validación

Los datos de empresa se validan usando esquemas Zod definidos en `lib/validations/company.ts`:

| Campo | Regla |
|-------|-------|
| `name` | Requerido, 1--255 caracteres |
| `website` | Opcional, debe ser formato URI válido |
| `domain` | Opcional, máx. 255 caracteres, normalizado a minúsculas |
| `slug` | Opcional, máx. 255 caracteres, solo alfanumérico en minúsculas y guiones |
| `status` | Opcional, debe ser `"active"` o `"inactive"` |

## Códigos de Error

| Estado | Error | Causa |
|--------|-------|-------|
| `400` | Error de validación | Fallo de validación de esquema Zod (incluye detalles por campo) |
| `400` | Parámetro de página inválido | La página no es un entero positivo |
| `400` | Parámetro de límite inválido | Límite fuera del rango 1--100 |
| `401` | No autorizado | Sesión ausente o sin permisos de administrador |
| `404` | Empresa no encontrada | No existe empresa con el UUID dado |
| `409` | Ya existe una empresa con ese dominio | Violación de unicidad de dominio |
| `409` | Ya existe una empresa con ese slug | Violación de unicidad de slug |
| `500` | Error al crear/actualizar/eliminar empresa | Error de servidor o base de datos |

## Documentación Relacionada

- [Descripción General de Endpoints Admin](./admin-endpoints.md)
- [Patrones de Respuesta](./response-patterns.md)
- [Validación de Solicitudes](./request-validation.md)
