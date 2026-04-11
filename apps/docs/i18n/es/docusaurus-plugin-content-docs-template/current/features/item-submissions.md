---
id: item-submissions
title: Envíos de artículos
sidebar_label: Envíos de artículos
sidebar_position: 31
---

# Envíos de artículos

El sistema de envío de artículos proporciona un flujo de trabajo completo para que los usuarios envíen, administren y realicen un seguimiento de los listados del directorio. Incluye seguimiento de estado (pendiente, aprobado, rechazado), filtrado, tarjetas de estadísticas, modales de detalle, modales de edición y eliminación con confirmación.

## Descripción general de la arquitectura

| Módulo | Camino | Propósito |
|--------|------|---------|
| Lista de envíos | `components/submissions/submission-list.tsx` | Componente de lista principal con paginación |
| Artículo de envío | `components/submissions/submission-item.tsx` | Tarjeta de presentación individual |
| Filtros de envío | `components/submissions/submission-filters.tsx` | Pestañas de estado y búsqueda |
| Tarjetas de estadísticas de envío | `components/submissions/submission-stats-cards.tsx` | Resumen de tarjetas de estadísticas |
| EditarEnvíoModal | `components/submissions/edit-submission-modal.tsx` | Modal de edición en línea |
| EnvíoDetalleModal | `components/submissions/submission-detail-modal.tsx` | Vista detallada de sólo lectura |
| Eliminar cuadro de diálogo de envío | `components/submissions/delete-submission-dialog.tsx` | Confirmación de eliminación |
| Artículo de basura | `components/submissions/trash-item.tsx` | Visualización de elementos eliminados |
| Plan de Guardia | `lib/guards/plan-features.guard.ts` | Límites de envío por plan |

## Modelo de datos de envío

La interfaz `Submission` representa un envío en la interfaz de usuario:

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

El asistente `toSubmission` convierte desde el modelo de datos API:

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## Componente de lista de envío

El componente `SubmissionList` representa la lista de envíos con estados de carga, vacío y lleno:

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

Comportamientos clave:

- **Estado de carga**: muestra `SubmissionItemSkeleton` marcadores de posición
- **Estado vacío**: muestra un enlace de llamado a la acción a `/submit` - **Estado poblado**: asigna elementos hasta `toSubmission()` y representa `SubmissionItem` para cada uno
- **Indicadores de carga optimistas** -- `deletingId` y `updatingId` desactivan los elementos afectados

La variante `SubmissionListWithInfo` agrega visualización de metadatos de paginación.

## Configuración de estado

Cada estado de envío se asigna a un ícono, combinación de colores y clave de traducción:

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

Los envíos rechazados muestran el motivo del rechazo en un cuadro rojo.

## Filtros de envío

El componente `SubmissionFilters` proporciona filtrado de estado estilo pestaña y búsqueda de texto:

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

Características:

- **Pestañas de estado** - Botones de píldora para Todos, Aprobados, Pendientes y Rechazados con insignias de recuento opcionales
- **Entrada de búsqueda** -- Búsqueda de texto completo con botón de borrar y control giratorio de carga
- **Variante compacta** -- `SubmissionFiltersCompact` usa una selección desplegable para diseños con espacio limitado

## Tarjetas de estadísticas

El componente `SubmissionStatsCards` muestra cuatro tarjetas de estadísticas en una cuadrícula:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

Las cuatro cartas muestran:

| Tarjeta | Clave | Color |
|------|-----|-------|
| Envíos totales | `total` | Azul |
| Aprobado | `approved` | Verde |
| Pendiente | `pending` | Amarillo |
| Rechazado | `rejected` | Rojo |

Cada tarjeta tiene un fondo de icono degradado, un esqueleto de carga animado y un efecto de sombra flotante.

## Tarjeta de artículo de envío

Cada `SubmissionItem` representa:

- Título con insignia de estado
- Descripción truncada (abrazadera de dos líneas)
- Hasta 5 etiquetas con recuento de desbordamiento
- Fila de metadatos: categoría, fecha de envío, recuento de vistas, recuento de me gusta
- Botones de acción: Ver, Editar, Eliminar
- Cargando controles giratorios en los botones editar/eliminar cuando las operaciones están en progreso
- Estado deshabilitado durante operaciones masivas

## Límites de envío basados en el plan

El sistema de guardia del plan controla cuántos envíos puede realizar un usuario:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

Para verificar los límites antes del envío:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Funciones adicionales según el plan para envíos:

| Característica | Gratis | Estándar | Prémium |
|---------|------|----------|---------|
| Enviar artículos | Sí | Sí | Sí |
| Imágenes máximas | 1 | 5 | Ilimitado |
| Palabras descriptivas | 200 | 500 | Ilimitado |
| Subir vídeo | No | No | Sí |
| Insignia verificada | No | Sí | Sí |
| Revisión prioritaria | No | Sí | Sí |
| Revisión instantánea | No | No | Sí |
| Tiempo de revisión (días) | 7 | 3 | 1 |

## Flujo de trabajo de envío

1. **El usuario envía**: completa el formulario de envío de varios pasos.
2. **Validación**: se verifican los límites del plan y la validación de entradas.
3. **Almacenamiento**: los datos del artículo se almacenan en el CMS basado en Git a través del servicio del artículo.
4. **Estado: Pendiente**: el envío ingresa a la cola de revisión del administrador.
5. **Revisión del administrador**: el administrador aprueba o rechaza con notas opcionales
6. **Estado: Aprobado/Rechazado**: el usuario ve el estado actualizado en su panel
7. **Editar**: los usuarios pueden editar los envíos (dentro de los límites de modificación del plan)
8. **Eliminar**: los usuarios pueden eliminar sus propios envíos con el cuadro de diálogo de confirmación.

## Internacionalización

Todo el texto de la interfaz de usuario utiliza `next-intl` traducciones bajo el espacio de nombres `client.submissions` :

- `NO_SUBMISSIONS_TITLE` -- Título de estado vacío
- `NO_SUBMISSIONS_DESC` -- Descripción del estado vacío
- `SUBMIT_FIRST_PROJECT` -- Botón de llamada a la acción
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` -- Etiquetas de estado
- `SUBMITTED` -- Prefijo de fecha
- `VIEWS_COUNT` , `LIKES_COUNT` -- Etiquetas de métricas con parámetro de recuento
- `REJECTION_REASON` -- Etiqueta de aviso de rechazo
- `SEARCH_PLACEHOLDER` -- Marcador de posición de entrada de búsqueda
- `SHOWING_RESULTS` , `PAGE_INFO` -- Texto de paginación

## Documentación relacionada

- [Formularios de varios pasos](/docs/template/features/multi-step-forms) -- Implementación del formulario de envío
- [Gestión de administración](/docs/template/features/admin-management) -- Flujo de trabajo de revisión del administrador
- [Votación y comentarios](/docs/template/features/voting-comments) -- Participación en las presentaciones
