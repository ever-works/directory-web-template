---
id: type-definitions
title: Descripción general del sistema de tipos
sidebar_label: Definiciones de tipo
sidebar_position: 41
---

# Descripción general del sistema de tipos

La plantilla centraliza sus definiciones de tipo TypeScript en `template/lib/types/`. Este directorio contiene interfaces, alias de tipos, esquemas de validación de Zod y DTO de solicitud/respuesta utilizados en repositorios, servicios y rutas API.

**Directorio de origen:** `template/lib/types/`

---

## Directory Listing

| File | Purpose |
|------|---------|
| `item.ts` | Item data model, create/update/review requests, list options, status types |
| `user.ts` | Authentication user data, create/update requests, Zod validation schemas, list options |
| `role.ts` | Role data model, create/update requests, list options, role-with-count type |
| `tag.ts` | Tag data model, create/update requests, paginated list response |
| `category.ts` | Category data model with count, create/update requests, validation constants, list options |
| `comment.ts` | Comment data structures |
| `vote.ts` | Vote data structures |
| `client.ts` | Client profile types |
| `client-item.ts` | Client-facing item types |
| `profile.ts` | User profile types |
| `survey.ts` | Survey data structures |
| `location.ts` | Location/geography types |
| `sponsor-ad.ts` | Sponsor and advertisement types |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity model types |
| `twenty-crm-errors.types.ts` | Twenty CRM error handling types |
| `twenty-crm-sync.types.ts` | Twenty CRM synchronization types |

---

## Tipos de dominios principales

### Tipos de elementos (`item.ts`)

El sistema de tipos de elementos es el más extenso y cubre el ciclo de vida completo de una lista de directorio.

**Tipos de claves:**

- **`ItemData`** -- el modelo de datos de artículo principal con campos para `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at` y más
- **`CreateItemRequest`** -- DTO para la creación de artículos; requiere `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- DTO parcial para actualizaciones de artículos; todos los campos opcionales
- **`ReviewRequest`** -- contiene `status` (`'approved'` o `'rejected'`) y opcional `review_notes`
- **`ItemListOptions`** -- opciones de filtrado y paginación: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Tipos de usuarios (`user.ts`)

Tipos de usuarios de nivel de autenticación con esquemas de validación de Zod.

**Tipos de claves:**

- **`AuthUserData`** -- representa un registro de usuario autenticado (id, correo electrónico, creado_at, etc.)
- **`CreateUserRequest`** -- correo electrónico y contraseña para la creación de usuarios
- **`UpdateUserRequest`** -- campos de actualización parcial
- **`UserListOptions`** -- opciones de paginación y filtrado
- **`AuthUserListResponse`** -- respuesta paginada con `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- Esquema Zod para validación completa de la creación de usuarios
- **`updateUserValidationSchema`** -- Esquema Zod para validación de actualización parcial del usuario

### Tipos de roles (`role.ts`)

Tipos de datos de roles para el sistema RBAC.

**Tipos de claves:**

- **`RoleData`** -- registro de rol con `id`, `name`, `description`, `permissions`, `isDefault`, `status`, marcas de tiempo
- **`CreateRoleRequest`** -- campos necesarios para crear un nuevo rol
- **`UpdateRoleRequest`** -- actualización parcial del rol
- **`RoleListOptions`** -- opciones de filtrado que incluyen `status`, búsqueda y paginación
- **`RoleWithCount`** -- extiende `RoleData` con `userCount` para visualización de administrador

### Tipos de etiquetas (`tag.ts`)

Tipos de datos de etiquetas para el sistema de etiquetado/etiquetado.

**Tipos de claves:**

- **`TagData`** -- etiquetar registro con `id`, `name` y metadatos opcionales.
- **`CreateTagRequest`** -- requiere `id` y `name`
- **`UpdateTagRequest`** -- actualización de etiqueta parcial
- **`TagListResponse`** -- lista de etiquetas paginadas con `tags`, `total`, `page`, `limit`, `totalPages`

### Tipos de categorías (`category.ts`)

Tipos de datos de categoría para la taxonomía organizacional.

**Tipos de claves:**

- **`CategoryData`** -- registro de categoría con `id`, `name`, `description` y metadatos
- **`CategoryWithCount`** -- extiende `CategoryData` con un recuento de elementos
- **`CreateCategoryRequest`** -- requiere `id`, `name`, opcional `description`
- **`UpdateCategoryRequest`** -- actualización de categoría parcial (requiere `id`)
- **`CategoryListOptions`** -- opciones de filtrado, clasificación y paginación
- **`CATEGORY_VALIDATION`** -- constantes para la validación de la longitud del campo (nombre mínimo/máximo, descripción máxima, restricciones de ID)

---

## Integration Types

### Twenty CRM Types

Four files define the type system for the Twenty CRM integration:

| File | Contents |
|------|----------|
| `twenty-crm-config.types.ts` | Configuration types for CRM connection settings |
| `twenty-crm-entities.types.ts` | Entity models mapping to CRM objects |
| `twenty-crm-errors.types.ts` | Error types for CRM API error handling |
| `twenty-crm-sync.types.ts` | Synchronization state and operation types |

---

## Convenciones de patrones de tipos

### DTO de solicitud/respuesta

El código base sigue un patrón consistente para los objetos de transferencia de datos:

- **`Create[Entity]Request`** -- contiene todos los campos obligatorios para la creación
- **`Update[Entity]Request`** -- tipo parcial donde la mayoría de los campos son opcionales; normalmente requiere `id`
- **`[Entity]ListOptions`** -- parámetros de filtrado, clasificación y paginación
- **`[Entity]ListResponse`** -- respuesta paginada con `items`, `total`, `page`, `limit`, `totalPages`

### Esquemas de validación

Los esquemas Zod están ubicados junto con sus tipos correspondientes:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Los repositorios utilizan `.parse()` o `.pick()` en estos esquemas antes de ejecutar mutaciones.

### Constantes de validación

Para entidades respaldadas por Git (categorías, colecciones), las constantes de validación se exportan como objetos simples:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

Se hace referencia a estos en los métodos de validación del repositorio.

---

## Type Relationships

```
ItemData
  ├── references CategoryData (via category field)
  ├── references TagData (via tags field)
  ├── references Collection (via collections field)
  └── referenced by ClientDashboardRepository

AuthUserData
  ├── references RoleData (via role assignments)
  └── referenced by UserRepository

RoleData
  ├── contains Permission[] (from permissions/definitions)
  └── referenced by RoleRepository

CategoryData
  └── referenced by items (category field)

TagData
  └── referenced by items (tags field)
```

---

## Pautas de uso

1. **Importe siempre tipos desde `@/lib/types/`** en lugar de volver a declararlos en componentes o rutas API.
2. **Utilice DTO de solicitud** para la validación de entrada del controlador API, no el modelo de datos completo
3. **Utilice esquemas Zod** cuando estén disponibles (tipos de usuario) para la validación en tiempo de ejecución
4. **Utilice constantes de validación** (categorías, colecciones) para restricciones de campo consistentes en el frontend y el backend
5. **Extienda los tipos localmente** solo cuando necesite tipos derivados de componentes específicos que no pertenezcan a la capa compartida

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
