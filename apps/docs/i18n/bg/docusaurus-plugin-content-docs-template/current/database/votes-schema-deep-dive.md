---
id: votes-schema-deep-dive
title: "Дълбоко потапяне в схемата на гласовете"
sidebar_label: "Схема за гласуване"
sidebar_position: 55
---

# Дълбоко потапяне в схемата на гласовете

## Преглед

Системата за гласуване прилага механизъм за гласуване за/против гласуване за елементи. Всеки потребител (идентифициран чрез неговия `client_profiles` запис) може да даде точно един глас за всеки елемент, наложен от уникален съставен индекс. Гласовете могат да се превключват между гласуване за и гласуване против.

**Изходен файл:** `template/lib/db/schema.ts`
**Файл за връзки:** `template/lib/db/migrations/relations.ts`

---

## Table: `votes`

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `userId` | `userid` | `text` | No | - | FK -> `client_profiles.id` (CASCADE) |
| `itemId` | `item_id` | `text` | No | - | Item slug |
| `voteType` | `vote_type` | `text (enum)` | No | `'upvote'` | `upvote`, `downvote` |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

:::caution Column Name Note
The `userId` property maps to the database column `userid` (lowercase, no underscore). This is intentional -- it matches the migration schema. Do not confuse this with other tables where the column is `userId` or `user_id`.
:::

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `userid` | `client_profiles.id` | CASCADE |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `unique_user_item_vote_idx` | `(userid, item_id)` | Unique |
| `item_votes_idx` | `item_id` | B-tree |
| `votes_created_at_idx` | `created_at` | B-tree |

### Key Constraints

- **One vote per user per item:** The `unique_user_item_vote_idx` unique index on `(userid, item_id)` ensures each client profile can only have one vote record per item.
- **Vote type is exclusive:** A user either has an upvote or a downvote, never both.

---

## Тип гласуване Enum

```typescript
export const VoteType = {
    UPVOTE: 'upvote',
    DOWNVOTE: 'downvote'
} as const;

export type VoteTypeValues = (typeof VoteType)[keyof typeof VoteType];
```

---

## TypeScript Types

```typescript
export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;
```

---

## Връзки

```typescript
// From relations.ts
export const votesRelations = relations(votes, ({ one }) => ({
    clientProfile: one(clientProfiles, {
        fields: [votes.userid],
        references: [clientProfiles.id]
    }),
}));
```

---

## Relations Diagram

```mermaid
erDiagram
    client_profiles ||--o{ votes : "casts"

    votes {
        text id PK
        text userid FK
        text item_id
        text vote_type
        timestamp created_at
        timestamp updated_at
    }

    client_profiles {
        text id PK
        text userId FK
        text name
        text username
    }
```

---

## Поток на гласуване

```mermaid
flowchart TD
    A[User clicks upvote] --> B{Existing vote?}
    B -->|No| C[INSERT new upvote]
    B -->|Yes, same type| D[DELETE vote - toggle off]
    B -->|Yes, different type| E[UPDATE vote_type]
    C --> F[Vote count updated]
    D --> F
    E --> F
```

---

## Query Examples

### Cast a vote (upsert pattern)

```typescript
import { db } from '@/lib/db/drizzle';
import { votes, VoteType } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Insert or update vote using onConflict
await db
    .insert(votes)
    .values({
        userId: clientProfileId,
        itemId: 'my-item-slug',
        voteType: VoteType.UPVOTE,
    })
    .onConflictDoUpdate({
        target: [votes.userId, votes.itemId],
        set: {
            voteType: VoteType.UPVOTE,
            updatedAt: new Date(),
        },
    });
```

### Remove a vote

```typescript
await db
    .delete(votes)
    .where(
        and(
            eq(votes.userId, clientProfileId),
            eq(votes.itemId, 'my-item-slug')
        )
    );
```

### Count votes for an item

```typescript
import { sql } from 'drizzle-orm';

const voteCounts = await db
    .select({
        upvotes: sql<number>`count(*) filter (where ${votes.voteType} = 'upvote')`,
        downvotes: sql<number>`count(*) filter (where ${votes.voteType} = 'downvote')`,
    })
    .from(votes)
    .where(eq(votes.itemId, 'my-item-slug'));
```

### Get user's vote on an item

```typescript
const userVote = await db
    .select()
    .from(votes)
    .where(
        and(
            eq(votes.userId, clientProfileId),
            eq(votes.itemId, 'my-item-slug')
        )
    )
    .limit(1);
```

### Get all votes by a user

```typescript
const userVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.userId, clientProfileId))
    .orderBy(desc(votes.createdAt));
```

### Get most upvoted items

```typescript
const topItems = await db
    .select({
        itemId: votes.itemId,
        upvotes: sql<number>`count(*)`,
    })
    .from(votes)
    .where(eq(votes.voteType, 'upvote'))
    .groupBy(votes.itemId)
    .orderBy(sql`count(*) desc`)
    .limit(10);
```

---

## Бележки по дизайна

- **Гласовете препращат към клиентски профили, а не към потребители.** Това е в съответствие с таблицата с коментари. Потребителите трябва да имат `client_profiles` запис, за да гласуват.
- **Елементите се идентифицират чрез slug.** Колоната `item_id` съхранява елемента slug от Git CMS, а не външен ключ на база данни.
- **Няма отделна таблица за преброяване на гласовете.** Броят на гласовете се обобщава по време на заявка с помощта на `count()`. Това разменя цената на заявката за последователност (без остарели броячи).
- **Полето `updatedAt` проследява промените в гласуването.** Когато потребителят превключи от гласуване „за“ към гласуване „против“, `updatedAt` се актуализира, докато `createdAt` запазва първоначалното време за гласуване.
