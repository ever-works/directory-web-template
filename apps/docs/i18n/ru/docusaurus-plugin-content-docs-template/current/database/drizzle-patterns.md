---
id: drizzle-patterns
title: "Шаблоны ORM дождя"
sidebar_label: "Моросящий дождь"
sidebar_position: 13
---

# Шаблоны ORM дождя

В шаблоне используется Drizzle ORM с диалектом PostgreSQL (`drizzle-orm/postgres-js`). На этой странице описаны соглашения об определении схемы, типы столбцов, стратегии индексирования, определения отношений, рабочий процесс миграции и шаблоны построителя запросов, используемые в базе кода.

## Определение схемы (`lib/db/schema.ts`)

### Структура таблицы

Таблицы определяются с помощью `pgTable` и следуют единому шаблону:

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

### Использование типа столбца

|Тип дождя|Тип PostgreSQL|Используется для|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|Идентификаторы, адреса электронной почты, имена, слаги, URL-адреса|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Поля даты возвращаются как JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|Поля даты с режимом по умолчанию|
|`boolean('col')`|`BOOLEAN`|Флаги (isAdmin, isActive и т. д.)|
|`integer('col')`|`INTEGER`|Числовые счетчики, OAuth expires_at|
|`serial('col')`|`SERIAL`|Автоинкрементные идентификаторы|
|`varchar('col', { length: N })`|`VARCHAR(N)`|Строки с ограничением длины|
|`jsonb('col')`|`JSONB`|Структурированные метаданные|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Координаты широты/долготы|

### Первичные ключи UUID

Во всех таблицах используются столбцы `text` с `crypto.randomUUID()` в качестве функции по умолчанию:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Столбцы перечисления

Перечисления строк определяются внутри столбца:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Составные первичные ключи

В таблицах объединения используется `primaryKey` с несколькими столбцами:

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

### Внешние ключи

Внешние ключи используют встроенный `.references()` с каскадным удалением:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Определения индексов

Индексы определяются в третьем аргументе `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Общие шаблоны индексов:
- `createdAt` индексы в большинстве таблиц для сортировки по времени
- Индексы состояния/флагов для запросов фильтров
- Индексы электронной почты для поисковых запросов
- Индексы поставщиков для запросов аутентификации учетной записи

### Проверить ограничения

Используется для проверки домена на уровне базы данных:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Вывод типа

Drizzle автоматически выводит типы TypeScript из определений таблиц:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Эти выведенные типы экспортируются непосредственно из `lib/db/schema.ts` и используются на уровне запроса.

## Отношения (`lib/db/migrations/relations.ts`)

Отношения определяются отдельно с помощью помощника `relations()` для API реляционных запросов Drizzle:

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

### Типы отношений

|Помощник|Мощность|Пример|
|--------|------------|---------|
|`one()`|Многие к одному|`clientProfile -> user`|
|`many()`|Один ко многим|`user -> accounts`|

## Рабочий процесс миграции

### Конфигурация комплекта для дождевания

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

### Команды миграции

|Команда|Описание|
|---------|-------------|
|`pnpm db:generate`|Создание файлов миграции SQL на основе изменений схемы.|
|`pnpm db:migrate`|Применить ожидающие миграции к базе данных|
|`pnpm db:seed`|Заполните базу данных исходными данными|
|`pnpm db:studio`|Откройте Drizzle Studio для визуального управления базами данных.|

### Миграционный бегун

Функция `runMigrations()` в `lib/db/migrate.ts` идемпотентна и ее можно безопасно вызывать при каждом запуске:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle отслеживает примененные миграции в таблице `drizzle.__drizzle_migrations` и запускает только новые.

## Шаблоны построителя запросов

### Выбрать с помощью Где

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Вставка с возвратом

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Обновление с возвращением

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Удалить с возвратом

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (о конфликте)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### Динамический SQL

Необработанные выражения SQL используются для сложных условий и агрегатов:

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

### Состояние Состав

Фильтры создаются динамически и состоят из `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Объединение шаблонов

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
