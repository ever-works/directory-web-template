---
id: voting-comments-deep-dive
title: Votación y comentarios Análisis profundo
sidebar_label: Votación y comentarios Análisis profundo
sidebar_position: 36
---

# Votación y comentarios Análisis profundo

Esta inmersión profunda cubre la mecánica interna de los sistemas de votación y comentarios, incluidos algoritmos de actualización optimistas, estrategias de administración de caché, agregación de calificaciones, coordinación de eventos entre componentes y flujos de trabajo de moderación administrativa.

## Descripción general de la arquitectura

```
hooks/
  use-item-vote.ts           # Vote hook with optimistic mutations and cache utilities
  use-comments.ts            # Comment CRUD hook with rating integration
  use-admin-comments.ts      # Admin moderation hook with pagination

app/api/items/[id]/
  votes/route.ts             # GET/POST/DELETE vote endpoints
  comments/route.ts          # GET/POST comment endpoints
  comments/[commentId]/route.ts  # PUT/DELETE single comment
  comments/rating/route.ts   # POST/PUT/GET rating endpoints

lib/db/schema.ts             # votes and comments table definitions
```

## Componentes internos del sistema de votación

### gancho useItemVote

El gancho gestiona el estado de la votación para un solo elemento con soporte completo de actualización optimista:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Máquina de estado de votación

La función `handleVote` implementa una máquina de estados basada en alternancia:

| Estado actual | Acción | Resultado | Cambio neto |
|--------------|--------|--------|------------|
| Sin voto | Haga clic arriba | Voto positivo | +1 |
| Sin voto | Haga clic en Abajo | Voto negativo | -1 |
| Votado a favor | Haga clic arriba | Eliminar voto (desactivar) | -1 |
| Votado a favor | Haga clic en Abajo | Cambiar a voto negativo | -2 |
| Votado en contra | Haga clic en Abajo | Eliminar voto (desactivar) | +1 |
| Votado en contra | Haga clic arriba | Cambiar a voto positivo | +2 |

Cuando el voto actual del usuario coincide con el tipo solicitado, el gancho llama a `unvote()` (BORRAR). De lo contrario llama a `vote(type)` (POST).

### Cálculo de recuento optimista

La actualización optimista calcula el diferencial de recuento sin esperar al servidor:

```ts
onMutate: async (type) => {
  const previousVotes = queryClient.getQueryData(['item-votes', itemId]);
  queryClient.setQueryData(['item-votes', itemId], (old) => {
    if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
    const countDiff = old.userVote === type ? -1
      : old.userVote === null ? 1
      : 2; // switching direction
    return {
      count: old.count + (type === 'up' ? countDiff : -countDiff),
      userVote: old.userVote === type ? null : type
    };
  });
  return { previousVotes };
},
```

El cálculo `countDiff` maneja tres casos: alternar (restar 1), voto nuevo (sumar 1) y cambiar de dirección (sumar 2 para el giro completo).

### Puerta de autenticación

A los usuarios no autenticados que intentan votar se les muestra un modo de inicio de sesión en lugar de recibir un error:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

El error es detectado por el controlador `onError` de la mutación, que comprueba el mensaje de autenticación y suprime el mensaje de error.

### Configuración de consulta

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Utilidades de caché de votos

El gancho `useVoteCache` proporciona operaciones de caché entre componentes:

```ts
function useVoteCache() {
  return {
    invalidateAllVotes,    // Invalidate all vote queries
    invalidateItemVotes,   // Invalidate votes for a specific item
    clearVoteCache,        // Remove all vote data from cache
    prefetchItemVotes,     // Pre-fetch votes for an item (e.g., on hover)
  };
}
```

## Comentarios Internos del sistema

### utilizar gancho de comentarios

El gancho proporciona operaciones CRUD completas con soporte de calificación integrado:

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}
```

### Valor de retorno

| Propiedad | Tipo | Descripción |
|----------|------|-------------|
| `comments` | `CommentWithUser[]` | Comentarios con datos de usuario completos |
| `isPending` | `boolean` | Verdadero durante la recuperación inicial |
| `createComment` | `(data) => Promise` | Crear un nuevo comentario |
| `updateComment` | `(data) => Promise` | Editar un comentario existente |
| `deleteComment` | `(id) => Promise` | Eliminar un comentario |
| `rateComment` | `(data) => void` | Califica un comentario |
| `updateCommentRating` | `(data) => void` | Actualizar una calificación existente |
| `commentRating` | `number` | Calificación agregada para el artículo |

### Sistema de eventos entre componentes

El sistema de comentarios envía eventos DOM personalizados para la coordinación entre componentes que no comparten claves de caché de React Query:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

Esto permite que componentes como el encabezado de detalles del elemento (que muestra el recuento de comentarios) reaccionen a los cambios de comentarios sin estar directamente acoplados a la consulta de comentarios.

### Agregación de calificaciones

Los comentarios y las calificaciones están estrechamente integrados. Después de cualquier mutación de comentario (crear, actualizar, eliminar), el gancho fuerza una nueva recuperación de la calificación del elemento:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

Esto garantiza que la visualización de la calificación de estrellas se actualice inmediatamente después de que un usuario envíe o edite una reseña.

### Estabilidad de consultas

La consulta de comentarios utiliza configuraciones de actualización conservadoras para evitar el parpadeo de la interfaz de usuario:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Moderación del administrador

### useAdminComments Hook

El gancho de moderación del administrador proporciona gestión de comentarios paginados:

```ts
function useAdminComments({ page, limit, search }) {
  return {
    comments: AdminCommentItem[],
    totalComments: number,
    totalPages: number,
    isDeleting: string | null,  // ID of comment being deleted
    deleteComment: (id: string) => Promise<boolean>,
  };
}
```

### Flujo de trabajo de moderación

1. El administrador navega a la página de administración de comentarios.
2. Los comentarios se muestran con búsqueda y paginación.
3. El estado `isDeleting` rastrea qué comentario se está eliminando y deshabilita su fila.
4. La eliminación activa una notificación al autor del comentario a través de `NotificationService` .

## Puntos finales API

| Método | Punto final | Descripción |
|--------|----------|-------------|
| OBTENER | `/api/items/:id/votes` | Obtener el recuento de votos y el voto del usuario |
| PUBLICAR | `/api/items/:id/votes` | Emitir o cambiar un voto |
| BORRAR | `/api/items/:id/votes` | Eliminar un voto |
| OBTENER | `/api/items/:id/comments` | Obtener comentarios con datos de usuario |
| PUBLICAR | `/api/items/:id/comments` | Crear un nuevo comentario |
| PONER | `/api/items/:id/comments/:commentId` | Actualizar un comentario |
| BORRAR | `/api/items/:id/comments/:commentId` | Eliminar un comentario |
| PUBLICAR | `/api/items/:id/comments/rating` | Califica un comentario |
| PONER | `/api/items/:id/comments/rating` | Actualizar la calificación de un comentario |
| OBTENER | `/api/items/:id/comments/rating` | Obtener calificación agregada del artículo |

## Integración de indicador de funciones

Tanto la votación como los comentarios respetan las marcas de características:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

Cuando la base de datos no está configurada, estas funciones se desactivan automáticamente.

## Accesibilidad

- Los botones de votación usan `aria-pressed` para indicar el estado de votación actual.
- El modo de inicio de sesión activado por intentos de voto no autenticados está atrapado en el foco.
- Los formularios de comentarios utilizan asociaciones `<label>` y mensajes de validación adecuados.
- El componente de calificación de estrellas admite la navegación por teclado con teclas de flecha.
- Las tablas de moderación de administrador incluyen indicadores de estado a nivel de fila y acciones accesibles mediante teclado.
- Los estados de carga y error proporcionan atributos `aria-busy` y `role="alert"` respectivamente.

## Documentación relacionada

- [Descripción general de votaciones y comentarios](/docs/template/features/voting-comments) -- Descripción general de funciones de alto nivel
- [Componentes de detalles del artículo](/docs/template/components/item-detail-components) -- Donde se representan los votos y los comentarios
- [Sistema de notificación](/docs/template/features/notification-system) -- Notificaciones activadas por comentarios
- [Componentes del panel](/docs/template/components/dashboard-components) -- Análisis de votos y comentarios
