---
id: featured-items
title: Sistema de artículos destacados
sidebar_label: Artículos destacados
sidebar_position: 2
---

# Sistema de artículos destacados

El sistema de artículos destacados permite a los administradores resaltar artículos específicos en el sitio con pedidos personalizados, fechas de vencimiento y controles de activación.

## Modelo de datos

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;        // Display position
  featuredUntil?: string;       // Expiration date (ISO string)
  isActive: boolean;
  featuredBy: string;           // Admin user ID
  featuredAt: string;           // When it was featured
  createdAt: string;
  updatedAt: string;
}
```

## Gestión administrativa

### gancho useAdminFeaturedItems

```typescript
import { useAdminFeaturedItems } from '@/hooks/use-admin-featured-items';

const {
  // Data
  featuredItems,        // FeaturedItem[]
  allItems,             // ItemData[] (for picker)
  filteredItems,        // FeaturedItem[] (after local search/filter)

  // State
  isLoading, isSubmitting,
  currentPage, totalPages, totalItems,
  searchTerm, showActiveOnly,

  // Actions
  setSearchTerm,        // (term: string) => void
  setShowActiveOnly,    // (active: boolean) => void
  addFeaturedItem,      // (data) => Promise<boolean>
  updateFeaturedItem,   // (id, data) => Promise<boolean>
  removeFeaturedItem,   // (id) => Promise<boolean>
  reorderItems,         // (orderedIds: string[]) => Promise<boolean>
  refetch, refreshData,
} = useAdminFeaturedItems({ page: 1, limit: 20 });
```

### Respuesta de API

La API de elementos destacados devuelve resultados paginados con metadatos de navegación:

```typescript
interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## Realizar pedidos

Los elementos destacados admiten la reordenación mediante arrastrar y soltar a través de la función `reorderItems` , que acepta una serie de ID en el orden de visualización deseado:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

El campo `featuredOrder` determina la posición de visualización en la interfaz.

## Caducidad

Los artículos se pueden presentar con una fecha de vencimiento opcional ( `featuredUntil` ). Cuando está configurado:
- El artículo se excluye automáticamente de la exhibición después de la fecha de vencimiento.
- El administrador puede ver los elementos caducados alternando el filtro `showActiveOnly` - La eliminación manual también se admite a través de `removeFeaturedItem` ## Pantalla del lado del cliente

### useFeaturedItemsClient Hook

El gancho de cara al público recupera elementos destacados activos para mostrarlos:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection Gancho

Enlace de nivel superior que proporciona lógica de visualización a nivel de sección:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Bandera de función

Los artículos destacados respetan la marca de característica `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

La función se desactiva automáticamente cuando `DATABASE_URL` no está configurado.

## Puntos finales API

| Método | Punto final | Descripción |
|--------|----------|-------------|
| OBTENER | `/api/admin/featured-items` | Lista de artículos destacados (paginados) |
| PUBLICAR | `/api/admin/featured-items` | Añadir un artículo destacado |
| PONER | `/api/admin/featured-items/:id` | Actualizar la configuración de elementos destacados |
| BORRAR | `/api/admin/featured-items/:id` | Eliminar de destacados |
| PONER | `/api/admin/featured-items/reorder` | Reordenar artículos destacados |
| OBTENER | `/api/featured-items` | Público: obtener elementos destacados activos |
