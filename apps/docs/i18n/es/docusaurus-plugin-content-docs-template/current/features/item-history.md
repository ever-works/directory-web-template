---
id: item-history
title: Historial y auditoría de artículos
sidebar_label: Historial y auditoría de artículos
sidebar_position: 17
---

# Historial y auditoría de artículos

La plantilla Ever Works incluye un sistema integral de seguimiento de auditoría que rastrea todos los cambios realizados en los elementos a lo largo de su ciclo de vida. Cada creación, actualización, cambio de estado, revisión, eliminación y restauración se registra con información detallada de cambios, identidad del ejecutante y marcas de tiempo.

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Capa de servicio para registrar acciones de auditoría |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Consultas a la base de datos para el registro de auditoría CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | Gancho React Query para recuperar registros de auditoría |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | UI modal para ver el historial de elementos |

## Acciones de auditoría

El sistema rastrea seis tipos de acciones:

| Acción | Constante | Descripción |
|---|---|---|
| Creado | `ItemAuditAction.CREATED` | El artículo fue creado |
| Actualizado | `ItemAuditAction.UPDATED` | Los campos del artículo fueron modificados |
| Estado cambiado | `ItemAuditAction.STATUS_CHANGED` | Se cambió el estado del artículo |
| Revisado | `ItemAuditAction.REVIEWED` | El artículo fue revisado (aprobado/rechazado) |
| Eliminado | `ItemAuditAction.DELETED` | El elemento fue eliminado (soft o hard) |
| Restaurado | `ItemAuditAction.RESTORED` | El artículo fue restaurado desde su eliminación |

## Campos rastreados

El servicio de auditoría monitorea los siguientes campos para detectar cambios:

| Campo | Tipo |
|---|---|
| `name` | Nombre del artículo |
| `description` | Descripción del artículo |
| `source_url` | URL de fuente/producto |
| `category` | Asignación de categoría |
| `tags` | Matriz de etiquetas |
| `collections` | Asignaciones de cobranza |
| `featured` | Estado destacado |
| `icon_url` | URL del icono/logotipo |
| `status` | Estado del artículo |

## Servicio de auditoría de artículos

El `itemAuditService` proporciona métodos de registro de alto nivel que se llaman desde rutas y servicios API.

### Creación de elementos de registro

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Registro de actualizaciones de elementos

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Registro de revisiones

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Registro de eliminación y restauración

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Diseño sin bloqueo

Todo el registro de auditoría está incluido en bloques try-catch y no generará errores que puedan bloquear la operación principal:

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## Detección de cambios

La función `detectChanges` compara dos estados de elementos y devuelve una diferencia detallada:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Salida de ejemplo:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

La función maneja la igualdad profunda para matrices (comparación ordenada) y devuelve `null` si no se detectan cambios.

## Capa de base de datos

### Esquema de registro de auditoría

Cada entrada del registro de auditoría contiene:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Identificación única |
| `itemId` | `string` | Elemento/ID del artículo |
| `itemName` | `string` | Nombre del artículo en el momento de la acción |
| `action` | `ItemAuditActionValues` | Tipo de acción |
| `previousStatus` | `string \| null` | Estado antes de la acción |
| `newStatus` | `string \| null` | Estado después de la acción |
| `changes` | `JSON \| null` | Detalles del cambio a nivel de campo |
| `performedBy` | `string \| null` | ID de usuario que realizó la acción |
| `performedByName` | `string \| null` | Nombre para mostrar del usuario |
| `notes` | `string \| null` | Notas adicionales (por ejemplo, comentarios de revisión) |
| `metadata` | `JSON \| null` | Datos de contexto adicionales |
| `createdAt` | `timestamp` | Cuando ocurrió la acción |

### Funciones de consulta

| Función | Descripción |
|---|---|
| `createItemAuditLog(data)` | Crear una nueva entrada de registro de auditoría |
| `getItemHistory(params)` | Obtener historial paginado con información del artista |
| `getLatestItemAuditLog(itemId)` | Obtener la entrada de registro más reciente |
| `getAuditLogsByAction(action, limit)` | Filtrar registros por tipo de acción |
| `getAuditLogsByPerformer(userId, limit)` | Filtrar registros por artista |
| `getItemAuditStats(itemId)` | Obtener desglose del recuento por tipo de acción |

### Consulta de historial paginado

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

La consulta se une a la tabla `users` para incluir el correo electrónico del artista junto con cada entrada del registro.

## El gancho `useItemHistory`

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### Configuración del gancho

| Opción | Predeterminado | Descripción |
|---|---|---|
| `itemId` | requerido | ID de elemento/slug para recuperar el historial |
| `page` | `1` | Número de página |
| `limit` | `20` | Artículos por página |
| `actionFilter` | `undefined` | Matriz de tipos de acciones para filtrar |
| `enabled` | `true` | Si la consulta está activa |
| `staleTime` | 30 segundos | Duración de la actualización de la caché |

## Modal de historial de artículos

El componente `ItemHistoryModal` proporciona una interfaz de usuario completa para ver el historial de auditoría de elementos:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Funciones modales

| Característica | Descripción |
|---|---|
| Filtrado de acciones | Desplegable para filtrar por tipo de acción (Creada, Actualizada, etc.) |
| Entradas codificadas por colores | Cada tipo de acción tiene un ícono y una combinación de colores distintos |
| Cambios ampliables | Haga clic para ampliar los detalles del cambio a nivel de campo |
| Marcas de tiempo relativas | "Hace 2 horas", "Hace 3 días" con fecha completa al pasar el mouse |
| Exhibición del artista | Muestra nombre de usuario, correo electrónico o "Sistema" para acciones automatizadas |
| Contexto de revisión | Muestra etiquetas "Aprobado"/"Rechazado" y motivos de rechazo |
| Paginación | Paginación incorporada para historias largas |
| Soporte de teclado | La tecla Escape cierra el modal |

### Esquema de colores de acción

| Acción | Color | Icono |
|---|---|---|
| Creado | Verde | Más |
| Actualizado | Azul | Editar2 |
| Estado cambiado | Amarillo | ActualizarCw |
| Revisado | Púrpura | Círculo de verificación |
| Eliminado | Rojo | Papelera2 |
| Restaurado | Verde azulado | GirarCcw |

## Archivos clave

| Archivo | Camino |
|---|---|
| Servicio de Auditoría | `lib/services/item-audit.service.ts` |
| Consultas de auditoría | `lib/db/queries/item-audit.queries.ts` |
| Gancho de historia | `hooks/use-item-history.ts` |
| Historia modal | `components/admin/items/item-history-modal.tsx` |
