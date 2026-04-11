---
id: favorites-system
title: Sistema de favoritos
sidebar_label: Favoritos
sidebar_position: 33
---

# Sistema de favoritos

La función de favoritos permite a los usuarios autenticados marcar elementos del directorio como favoritos para un acceso rápido. Incluye una página de favoritos dedicada, actualizaciones optimistas de la interfaz de usuario, una API REST completa respaldada por PostgreSQL e integración con indicadores de funciones para renderizado condicional.

## Descripción general de la arquitectura

```
hooks/
  use-favorites.ts           # React Query hook with optimistic mutations

components/favorites/
  favorites-client.tsx       # Full favorites page with grid, sorting, pagination

app/api/favorites/
  route.ts                   # GET (list) and POST (add) endpoints
  [itemSlug]/route.ts        # DELETE endpoint for removing a favorite

lib/db/schema.ts             # favorites table definition
```

## Esquema de base de datos

La tabla `favorites` almacena relaciones de marcadores entre usuarios y elementos:

```ts
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemSlug: text('item_slug').notNull(),
  itemName: text('item_name').notNull(),
  itemIconUrl: text('item_icon_url'),
  itemCategory: text('item_category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
  userIdIndex: index('favorites_user_id_idx').on(table.userId),
  itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
  createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
}));
```

### Decisiones de diseño

- **Metadatos desnormalizados**: `itemName` , `itemIconUrl` y `itemCategory` se almacenan junto al slug para que la lista de favoritos se muestre sin unirse a la tabla de elementos.
- **Restricción única compuesta**: el índice `(userId, itemSlug)` evita favoritos duplicados en el nivel de la base de datos.
- **Búsquedas indexadas**: índices separados en `userId` , `itemSlug` y `createdAt` optimizan los patrones de consulta comunes para enumerar, contar y ordenar cronológicamente.

## usar gancho de favoritos

La API principal del lado del cliente con soporte completo para actualizaciones positivas:

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

### Valor de retorno

| Propiedad | Tipo | Descripción |
|----------|------|-------------|
| `favorites` | `Favorite[]` | Lista actual de favoritos de los usuarios |
| `isLoading` | `boolean` | Verdadero durante la recuperación inicial |
| `error` | `Error \| null` | Error de recuperación, si corresponde |
| `refetch` | `() => void` | Volver a buscar favoritos manualmente |
| `isFavorited` | `(slug: string) => boolean` | Comprobar si un elemento está marcado como favorito |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Agregar o eliminar según el estado actual |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Agregar un favorito explícitamente |
| `removeFavorite` | `(slug: string) => void` | Eliminar un favorito explícitamente |
| `isAdding` | `boolean` | Verdadero mientras la mutación agregada está en vuelo |
| `isRemoving` | `boolean` | Verdadero mientras la mutación eliminada está en vuelo |

### Flujo de actualización optimista

Tanto agregar como eliminar mutaciones siguen el patrón de actualización optimista de React Query:

1. ** `onMutate` ** -- cancelar consultas en vuelo, tomar una instantánea del estado anterior, aplicar el cambio optimista inmediatamente. Agregar mutaciones crea un favorito temporal con un ID con el prefijo `temp-` .
2. ** `onError` **: retrocede a la instantánea si la llamada a la API falla y muestra un mensaje de error.
3. ** `onSuccess` ** -- reemplace la entrada optimista con datos confirmados por el servidor. La mutación add reemplaza inteligentemente la entrada temporal haciendo coincidir `itemSlug` , evitando duplicados.

La invalidación `onSettled` se omite intencionalmente para evitar recuperaciones innecesarias. La actualización optimista más la actualización de caché `onSuccess` proporcionan suficiente coherencia.

### Integración de indicador de funciones

La consulta solo se habilita cuando se cumplen ambas condiciones:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

Cuando el indicador de función `favorites` está deshabilitado o el usuario no está autenticado, el enlace devuelve una matriz vacía sin realizar ninguna solicitud de red.

### Uso

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## Puntos finales API

### OBTENER /api/favoritos

Devuelve todos los favoritos del usuario autenticado, ordenados por fecha de creación.

### PUBLICAR /api/favoritos

Agrega un elemento a favoritos. Valida con Zod y busca duplicados (devuelve 409 en caso de conflicto).

| Campo | Requerido | Descripción |
|-------|----------|-------------|
| `itemSlug` | Sí | Identificador único de artículo |
| `itemName` | Sí | Nombre para mostrar de la lista de favoritos |
| `itemIconUrl` | No | URL del icono para renderizar |
| `itemCategory` | No | Etiqueta de categoría |

### BORRAR /api/favoritos/[itemSlug]

Elimina un elemento específico de los favoritos del usuario mediante slug. Devuelve 404 si no se encuentra.

## Página de favoritos

El componente `FavoritesClient` muestra la página de favoritos completa:

1. **Puerta de autenticación**: mensaje de inicio de sesión para usuarios no autenticados.
2. **Esqueleto de carga**: marcador de posición de cuadrícula de 8 tarjetas durante la recuperación inicial.
3. **Estado de error**: mensaje de error con un botón de reintento.
4. **Estado vacío**: mensaje con una sección alternativa de "elementos populares".
5. **Cuadrícula de favoritos**: elementos que se muestran con clasificación, paginación y cambio de diseño.

### Opciones de clasificación

| Valor | Etiqueta |
|-------|-------|
| `popularity` | Popularidad |
| `name-asc` | Nombre A-Z |
| `name-desc` | Nombre Z-A |
| `date-asc` | Más antiguo |

### Integración de diseño

La página se integra con `useLayoutTheme()` para cambiar de vista de cuadrícula/lista/tarjeta. Aparecen `ViewToggle` y `SortMenu` encima de los elementos. La paginación del lado del cliente divide los favoritos en páginas de 12, con `clampAndScrollToTop` al cambiar de página.

## Sincronización entre dispositivos

Los favoritos se almacenan en el lado del servidor en PostgreSQL, por lo que se sincronizan automáticamente entre dispositivos cuando el usuario se autentica. La caché de React Query con un tiempo de inactividad de 5 minutos equilibra la frescura con el rendimiento. La sincronización manual está disponible a través de la función `refetch` .

## Accesibilidad

- El botón de alternancia de favoritos se desactiva durante las mutaciones pendientes para evitar acciones dobles.
- Las notificaciones de brindis brindan información sobre operaciones exitosas y fallidas.
- La cuadrícula de la página de favoritos utiliza los mismos componentes de tarjeta accesibles que la lista principal.
- Los estados vacíos y de error incluyen elementos procesables para la navegación con el teclado.

## Documentación relacionada

- [Marcas de funciones](/docs/template/configuration/feature-config) -- Habilitar/deshabilitar la función de favoritos
- [Componentes de tarjeta compartida](/docs/template/components/shared-card-components) -- Representación de tarjeta en la cuadrícula de favoritos
- [Proveedores de contexto](/docs/template/components/context-providers) -- Integración del tema de diseño
- [Componentes del panel](/docs/template/components/dashboard-components) -- Recuentos de favoritos en análisis
