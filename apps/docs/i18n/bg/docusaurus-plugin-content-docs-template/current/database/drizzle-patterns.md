---
id: drizzle-patterns
title: "Drizzle ORM Patterns"
sidebar_label: "Модели на дъжд"
sidebar_position: 13
---

# Drizzle ORM Patterns

Шаблонът използва Drizzle ORM с диалекта PostgreSQL (`drizzle-orm/postgres-js`). Тази страница обхваща конвенциите за дефиниране на схеми, типове колони, стратегии за индексиране, дефиниции на релации, работен поток за мигриране и шаблони за създаване на заявки, използвани в цялата кодова база.

## Дефиниция на схема (`lib/db/schema.ts`)

### Структура на таблицата

Таблиците се дефинират с `pgTable` и следват последователен модел:

```typescript
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').unique(),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
  },
  (table) => ({
    createdAtIndex: index('users_created_at_idx').on(table.createdAt)
  })
);
```

### Използване на тип колона

|Дримен тип|Тип PostgreSQL|Използва се за|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|ID, имейли, имена, охлюви, URL адреси|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Полетата за дата се връщат като JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|Полета за дата с режим по подразбиране|
|`boolean('col')`|`BOOLEAN`|Флагове (isAdmin, isActive и др.)|
|`integer('col')`|`INTEGER`|Числови броячи, OAuth expires_at|
|`serial('col')`|`SERIAL`|Автоматично увеличаващи се идентификатори|
|`varchar('col', { length: N })`|`VARCHAR(N)`|Стрингове с ограничена дължина|
|`jsonb('col')`|`JSONB`|Структурирани метаданни|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Координати за географска ширина/дължина|

### UUID първични ключове

Всички таблици използват `text` колони с `crypto.randomUUID()` като функция по подразбиране:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Колони Enum

Преброяванията на низове се дефинират вградени в колоната:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Композитни първични ключове

Таблиците за присъединяване използват `primaryKey` с множество колони:

```typescript
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    rolePermissionPk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);
```

### Чужди ключове

Външните ключове използват вграден `.references()` с каскадно изтриване:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Дефиниции на индекса

Индексите са дефинирани в третия аргумент на `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Често срещани модели на индекси:
- `createdAt` индексира повечето таблици за сортиране по време
- Индекси на статус/флаг за заявки за филтриране
- Имейл индекси за заявки за търсене
- Индекси на доставчика за заявки за удостоверяване на акаунт

### Проверете ограниченията

Използва се за валидиране на домейн на ниво база данни:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Извод за тип

Drizzle автоматично извежда типовете TypeScript от дефинициите на таблицата:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Тези изведени типове се експортират директно от `lib/db/schema.ts` и се използват в целия слой на заявката.

## Връзки (`lib/db/migrations/relations.ts`)

Релациите се дефинират отделно с помощта на помощника `relations()` за API за релационни заявки на Drizzle:

```typescript
import { relations } from "drizzle-orm/relations";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  activityLogs: many(activityLogs),
  clientProfiles: many(clientProfiles),
  favorites: many(favorites),
  notifications: many(notifications),
  paymentAccounts: many(paymentAccounts),
  subscriptions: many(subscriptions),
  userRoles: many(userRoles),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [clientProfiles.userId],
    references: [users.id]
  }),
  comments: many(comments),
  votes: many(votes),
}));
```

### Типове релации

|Помощник|Кардиналност|Пример|
|--------|------------|---------|
|`one()`|Много към едно|`clientProfile -> user`|
|`many()`|Едно към много|`user -> accounts`|

## Работен процес на миграция

### Конфигурация на комплекта за дъжд

```typescript
// drizzle.config.ts
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
```

### Команди за миграция

|командване|Описание|
|---------|-------------|
|`pnpm db:generate`|Генериране на SQL файлове за миграция от промени в схемата|
|`pnpm db:migrate`|Прилагане на чакащи миграции към базата данни|
|`pnpm db:seed`|Заредете базата данни с първоначални данни|
|`pnpm db:studio`|Отворете Drizzle Studio за визуално управление на база данни|

### Миграционен бегач

Функцията `runMigrations()` в `lib/db/migrate.ts` е идемпотентна и безопасна за извикване при всяко стартиране:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle проследява приложените миграции в таблицата `drizzle.__drizzle_migrations` и изпълнява само нови.

## Модели на конструктора на заявки

### Изберете с Къде

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Вмъкване с връщане

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Актуализиране с Връщане

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Изтриване с връщане

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (при конфликт)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### Динамичен SQL

Суровите SQL изрази се използват за сложни условия и агрегации:

```typescript
import { sql } from 'drizzle-orm';

// Conditional SUM
sql<number>`SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END)`

// ILIKE search
sql`${clientProfiles.name} ILIKE ${`%${search}%`}`

// COALESCE with subquery
sql<string>`coalesce(
  (SELECT provider FROM ${accounts}
   WHERE ${accounts.userId} = ${clientProfiles.userId}
   LIMIT 1),
  'unknown'
)`

// Date formatting
sql<string>`to_char(${votes.createdAt}, 'IYYY-IW')`
```

### Състав на състоянието

Филтрите се изграждат динамично и се съставят с `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Модели за присъединяване

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
