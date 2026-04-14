---
id: comment-types
title: Definiciones de tipos de comentarios
sidebar_label: Tipos de comentarios
sidebar_position: 4
---

# Definiciones de tipos de comentarios

**Fuente:** `lib/types/comment.ts`

Los comentarios permiten a los usuarios dejar reseñas y comentarios sobre los artículos. Los tipos de comentarios se infieren principalmente del esquema de la base de datos Drizzle ORM, lo que garantiza que permanezcan sincronizados con las migraciones de la base de datos.

## Esquema de base de datos

Los tipos `Comment` y `NewComment` se infieren de la tabla `comments` definida en `lib/db/schema.ts`:

```typescript
// From lib/db/schema.ts
const comments = pgTable('comments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  content: text('content').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => clientProfiles.id, { onDelete: 'cascade' }),
  itemId: text('itemId').notNull(),
  rating: integer('rating').notNull().default(0),
  createdAt: timestamp('created_at', {
    mode: 'date',
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).notNull().defaultNow(),
  editedAt: timestamp('edited_at', {
    mode: 'date',
    withTimezone: true,
  }),
  deletedAt: timestamp('deleted_at', {
    mode: 'date',
    withTimezone: true,
  }),
});
```

## Tipos

### `Comment`

Tipo de selección inferido del esquema de la base de datos. Representa un comentario devuelto por consultas de base de datos.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Esto se resuelve en un objeto con la siguiente forma:

```typescript
// Effective type (inferred from schema)
interface CommentShape {
  id: string;
  content: string;
  userId: string;
  itemId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}
```

**Detalles del campo:**

|campo|Tipo|Descripción|
|-------|------|-------------|
|`id`|`string`|Clave primaria UUID generada automáticamente|
|`content`|`string`|Cuerpo del texto del comentario|
|`userId`|`string`|Clave externa para `clientProfiles.id` (eliminación en cascada)|
|`itemId`|`string`|Slug o ID del elemento que se comenta|
|`rating`|`number`|Clasificación numérica (predeterminada: 0)|
|`createdAt`|`Date`|Marca de tiempo de creación (con zona horaria)|
|`updatedAt`|`Date`|Marca de tiempo de la última actualización (con zona horaria)|
|`editedAt`|`Fecha \|nulo`|Marca de tiempo de la última edición, nula si nunca se editó|
|`deletedAt`|`Fecha \|nulo`|Marca de tiempo de eliminación temporal, nula si no se elimina|

### `NewComment`

Tipo de inserción inferido del esquema de la base de datos. Representa los datos necesarios para crear un nuevo comentario.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Esto se resuelve en un objeto donde los campos generados automáticamente y predeterminados son opcionales:

```typescript
// Effective type (inferred from schema)
interface NewCommentShape {
  id?: string;       // Auto-generated if not provided
  content: string;   // Required
  userId: string;    // Required
  itemId: string;    // Required
  rating?: number;   // Defaults to 0
  createdAt?: Date;  // Defaults to now()
  updatedAt?: Date;  // Defaults to now()
  editedAt?: Date | null;
  deletedAt?: Date | null;
}
```

### `CommentWithUser`

Tipo de comentario extendido que incluye los datos del usuario relacionados. Se utiliza cuando se muestran comentarios en la interfaz de usuario donde se necesita información del usuario (nombre, avatar) junto con el contenido del comentario.

```typescript
interface CommentWithUser extends Comment {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}
```

## Ejemplos de uso

### Creando un nuevo comentario

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Consultar comentarios con datos de usuario.

```typescript
import type { CommentWithUser } from '@/lib/types/comment';

function renderComment(comment: CommentWithUser) {
  const authorName = comment.user.name ?? 'Anonymous';
  const isEdited = comment.editedAt !== null;
  const isDeleted = comment.deletedAt !== null;

  return {
    author: authorName,
    avatar: comment.user.image,
    text: isDeleted ? '[Comment deleted]' : comment.content,
    rating: comment.rating,
    date: comment.createdAt,
    edited: isEdited,
  };
}
```

### Filtrar comentarios eliminados temporalmente

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Comprobar si un comentario ha sido editado

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Notas de diseño

### ¿Por qué los tipos inferidos por llovizna?

Los tipos `Comment` y `NewComment` se derivan del esquema ORM de Drizzle usando `$inferSelect` y `$inferInsert`. Este enfoque proporciona:

1. **Sincronización automática**: los tipos se actualizan automáticamente cuando el esquema cambia a través de migraciones
2. **Distinción entre insertar y seleccionar** - `NewComment` marca correctamente los campos generados automáticamente como opcionales
3. **Precisión de la base de datos**: los tipos coinciden exactamente con los tipos de columnas y las restricciones de la base de datos.

### Patrón de eliminación suave

Los comentarios utilizan un campo `deletedAt` para la eliminación temporal:
- Un valor `deletedAt` no nulo significa que el comentario está "eliminado" pero aún existe en la base de datos.
- Las consultas deben filtrarse por `deletedAt IS NULL` para mostrar solo los comentarios activos.
- El campo `editedAt` está separado de `updatedAt` para distinguir las actualizaciones del sistema de las ediciones del usuario.

### Comportamiento en cascada

El campo `userId` tiene una política de eliminación `CASCADE`. Cuando un usuario es eliminado de `clientProfiles`, todos sus comentarios se eliminan automáticamente de la base de datos.

## Tipos relacionados

- [`Vote`](./vote-types.md): otro tipo de interacción de usuario por elemento
- [`ItemData`](./item-types.md): el elemento principal al que pertenecen los comentarios
- [`Profile`](./user-types.md): los datos del perfil de usuario a los que hace referencia `CommentWithUser.user`
