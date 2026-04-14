---
id: types-overview
title: Descripción general del sistema de tipos
sidebar_label: Descripción general
sidebar_position: 0
---

# Descripción general del sistema de tipos

La plantilla utiliza un completo sistema de tipos TypeScript ubicado en `lib/types/`. Estas definiciones de tipos sirven como fuente única de verdad para las estructuras de datos utilizadas en rutas API, servicios, repositorios y componentes de UI.

## Tipo de archivos

El directorio `lib/types/` contiene los siguientes módulos:

|Archivo|Descripción|
|------|-------------|
|`item.ts`|Datos de artículos, solicitudes CRUD, opciones de lista, constantes de validación y definiciones de estado|
|`user.ts`|Datos de usuario administrador, tipos de autenticación, esquemas de validación de Zod y funciones auxiliares|
|`profile.ts`|Estructura de perfil de usuario público que incluye enlaces sociales, habilidades, cartera y envíos.|
|`category.ts`|Datos de categoría, solicitudes CRUD, opciones de lista y constantes de validación|
|`comment.ts`|Tipos de comentarios inferidos del esquema de la base de datos, incluidos comentarios enriquecidos por el usuario|
|`vote.ts`|Esquema de votación (Zod), tipos de respuesta, tipos de error y estado de votación del lado del cliente|
|`survey.ts`|Encuestas y tipos de respuestas de encuestas, opciones de filtro y enumeraciones de estado/tipo|
|`location.ts`|Configuración de ubicación, tipos de consultas geográficas, tipos de proveedores de mapas y datos de coordenadas|
|`sponsor-ad.ts`|Tipos de anuncios de patrocinadores, incluidas solicitudes, respuestas, estadísticas y datos del panel|
|`client.ts`|Tipos de perfiles de clientes para el portal de cara al cliente, incluidos el panel y las estadísticas|
|`client-item.ts`|Tipos de envío de artículos del lado del cliente con métricas de participación y filtros de estado|
|`role.ts`|Tipos de roles y permisos para el sistema RBAC|
|`tag.ts`|Datos de etiquetas, solicitudes CRUD, opciones de lista y constantes de validación|
|`twenty-crm-config.types.ts`|Veinte tipos de pruebas de conexión y configuración de integración de CRM|
|`twenty-crm-entities.types.ts`|Veinte tipos de entidades de CRM para registros de personas y empresas|
|`twenty-crm-errors.types.ts`|Tipos de error estructurados, códigos de error y protecciones de tipo para errores de CRM|
|`twenty-crm-sync.types.ts`|Operaciones de upsert, entradas de caché y tipos relacionados con la sincronización|

## Patrones de arquitectura

### Patrón CRUD consistente

La mayoría de los tipos de entidades siguen un patrón consistente de interfaces:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Constantes de validación

Cada módulo de entidad exporta un objeto de constantes de validación usando `as const` para seguridad de tipos:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Estas constantes se utilizan tanto en la validación del lado del servidor como en la validación de formularios del lado del cliente, lo que garantiza reglas coherentes en toda la pila.

### Respuestas sindicales discriminadas

Los tipos de respuesta API utilizan uniones discriminadas para el manejo de errores con seguridad de tipos:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Este patrón lo utilizan `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` y otros.

### Integración del esquema Zod

Varios módulos utilizan Zod para la validación del tiempo de ejecución junto con los tipos de TypeScript:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Esto se utiliza en `vote.ts` (para el esquema de votación) y `user.ts` (para la validación del usuario).

### Tipos extendidos con relaciones

Los tipos que incluyen datos relacionados utilizan la palabra clave `extends`:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## Convenios de importación

Los tipos se importan usando la palabra clave `type` para importaciones de solo tipo:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Esto garantiza que los tipos se borren en el momento de la compilación y no afecten el tamaño del paquete.

## Configuración frente a tipos de tiempo de ejecución

El módulo de ubicación demuestra un patrón utilizado para la configuración:

- **Tipos de configuración** use `snake_case` para coincidir con los archivos de configuración YAML
- **Tipos de tiempo de ejecución** usan `camelCase` para el uso idiomático de TypeScript
- Una función de mapeo convierte entre los dos formatos.

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## Enumeraciones y etiquetas de estado

Los valores de estado se definen como objetos constantes con sus correspondientes asignaciones de etiquetas y colores:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Tipos inferidos por bases de datos

Algunos tipos se infieren directamente del esquema ORM de Drizzle:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Este enfoque garantiza que los tipos se mantengan sincronizados automáticamente con las migraciones de bases de datos.

## Documentación relacionada

- [Tipos de elementos](./item-types.md) - Estructuras de datos de elementos principales
- [Tipos de usuario](./user-types.md) - Autenticación de usuario y tipos de perfil
- [Tipos de categoría](./category-types.md) - Tipos de gestión de categorías
- [Tipos de comentarios](./comment-types.md) - Tipos de comentarios y reseñas
- [Tipos de votación](./vote-types.md) - Tipos de sistemas de votación
- [Tipos de encuesta](./survey-types.md) - Tipos de encuesta y respuesta
- [Tipos de ubicación](./location-types.md) - Geolocalización y tipos de mapas
- [Tipos de anuncios de patrocinador](./sponsor-ad-types.md) - Tipos de patrocinio y publicidad
- [Tipos de CRM](./crm-types.md) - Veinte tipos de integración de CRM
