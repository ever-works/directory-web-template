---
id: comment-types
title: Definições de tipo de comentário
sidebar_label: Tipos de comentários
sidebar_position: 4
---

# Definições de tipo de comentário

**Fonte:** `lib/types/comment.ts`

Os comentários permitem que os usuários deixem comentários e comentários sobre os itens. Os tipos de comentários são inferidos principalmente do esquema de banco de dados Drizzle ORM, garantindo que permaneçam sincronizados com as migrações de banco de dados.

## Esquema de banco de dados

Os tipos `Comment` e `NewComment` são inferidos da tabela `comments` definida em `lib/db/schema.ts`:

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

Tipo de seleção inferido do esquema do banco de dados. Representa um comentário retornado por consultas ao banco de dados.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Isso resulta em um objeto com a seguinte forma:

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

**Detalhes do campo:**

|Campo|Tipo|Descrição|
|-------|------|-------------|
|`id`|`string`|Chave primária UUID gerada automaticamente|
|`content`|`string`|Corpo do texto do comentário|
|`userId`|`string`|Chave estrangeira para `clientProfiles.id` (exclusão em cascata)|
|`itemId`|`string`|Slug ou ID do item que está sendo comentado|
|`rating`|`number`|Classificação numérica (padrão: 0)|
|`createdAt`|`Date`|Carimbo de data e hora de criação (com fuso horário)|
|`updatedAt`|`Date`|Carimbo de data e hora da última atualização (com fuso horário)|
|`editedAt`|`Data \|nulo`|Carimbo de data/hora da última edição, nulo se nunca foi editado|
|`deletedAt`|`Data \|nulo`|Carimbo de data e hora de exclusão reversível, nulo se não for excluído|

### `NewComment`

Tipo de inserção inferido do esquema do banco de dados. Representa os dados necessários para criar um novo comentário.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Isso resulta em um objeto onde os campos gerados automaticamente e os campos padrão são opcionais:

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

Tipo de comentário estendido que inclui os dados do usuário relacionados. Usado ao exibir comentários na UI onde as informações do usuário (nome, avatar) são necessárias junto com o conteúdo do comentário.

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

## Exemplos de uso

### Criando um novo comentário

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Consultando comentários com dados do usuário

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

### Filtrando comentários excluídos de forma reversível

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Verificando se um comentário foi editado

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Notas de projeto

### Por que tipos inferidos por chuvisco?

Os tipos `Comment` e `NewComment` são derivados do esquema Drizzle ORM usando `$inferSelect` e `$inferInsert`. Esta abordagem fornece:

1. **Sincronização automática** – Os tipos são atualizados automaticamente quando o esquema é alterado por meio de migrações
2. **Distinção entre inserção e seleção** - `NewComment` marca corretamente os campos gerados automaticamente como opcionais
3. **Precisão do banco de dados** – Os tipos correspondem exatamente aos tipos e restrições das colunas do banco de dados

### Padrão de exclusão suave

Os comentários usam um campo `deletedAt` para exclusão reversível:
- Um valor `deletedAt` não nulo significa que o comentário foi "excluído", mas ainda existe no banco de dados
- As consultas devem ser filtradas por `deletedAt IS NULL` para mostrar apenas comentários ativos
- O campo `editedAt` é separado de `updatedAt` para distinguir atualizações do sistema de edições do usuário

### Comportamento em cascata

O campo `userId` possui uma política de exclusão `CASCADE`. Quando um usuário é excluído de `clientProfiles`, todos os seus comentários são automaticamente removidos do banco de dados.

## Tipos Relacionados

- [`Vote`](./vote-types.md) - Outro tipo de interação do usuário por item
- [`ItemData`](./item-types.md) - O item pai ao qual os comentários pertencem
- [`Profile`](./user-types.md) - Os dados do perfil do usuário referenciados por `CommentWithUser.user`
