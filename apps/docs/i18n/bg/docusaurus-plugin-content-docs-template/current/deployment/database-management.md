---
id: database-management
title: Управление на Базата Данни
sidebar_label: Управление на БД
sidebar_position: 4
---

# Управление на Базата Данни

Шаблонът Ever Works използва PostgreSQL с Drizzle ORM за всички операции с база данни. Това ръководство обхваща управлението на базата данни в производствена среда, миграции, пул от връзки, мониторинг и системата за засяване.

## Архитектура

| Слой | Файл | Отговорност |
|------|------|------------|
| **Конфигурация** | `drizzle.config.ts` | Път на схемата, изход на миграциите, диалект |
| **Връзка** | `lib/db/drizzle.ts` | Пул от връзки, singleton инстанция, lazy init |
| **Конфиг** | `lib/db/config.ts` | Сигурен URL на базата данни за скриптове и env помощници |
| **Схема** | `lib/db/schema.ts` | Дефиниции на таблици, индекси, ограничения |
| **Миграции** | `lib/db/migrate.ts` | Идемпотентно изпълнение на миграции |
| **Инициализация** | `lib/db/initialize.ts` | Auto-migrate, seed, advisory locks |
| **Засяване** | `lib/db/seed.ts` | Начални данни: роли, разрешения, admin потребител |

## Управление на връзките

### Singleton с лениво инициализиране

Връзката с базата данни се създава при първа употреба и се кешира чрез `globalThis`, за да оцелее при HMR по време на разработка. От `lib/db/drizzle.ts`:

```typescript
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function initializeDatabase(): ReturnType<typeof drizzle> {
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (globalForDb.db) {
    return globalForDb.db;
  }

  const poolSize = getPoolSize();
  const conn = postgres(getDatabaseUrl()!, {
    max: poolSize,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });

  globalForDb.conn = conn;
  globalForDb.db = drizzle(conn, { schema });
  return globalForDb.db;
}
```

Изнесеният обект `db` използва JavaScript Proxy за прозрачно лениво инициализиране:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

Това означава, че не се установява връзка с базата данни до първата реална заявка.

### Конфигурация на пула от връзки

| Настройка | Производство | Разработка | Описание |
|-----------|-------------|-----------|---------|
| `max` | 20 | 10 | Максимален брой връзки в пула |
| `idle_timeout` | 20 с | 20 с | Затваряне на неактивни връзки след това време |
| `connect_timeout` | 30 с | 30 с | Таймаут за нови опити за връзка |
| `prepare` | false | false | Деактивиране на prepared statements (съвместимост с Vercel) |

Конфигурирайте размера на пула чрез променлива на средата:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## Преглед на схемата

Схемата в `lib/db/schema.ts` дефинира следните основни таблици:

### Потребители и удостоверяване

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  image: text('image'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  createdAtIndex: index('users_created_at_idx').on(table.createdAt)
}));
```

### Контрол на достъпа, базиран на роли

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
}));
```

### Пълен списък на таблиците

| Таблица | Предназначение |
|---------|--------------|
| `users` | Потребителски акаунти |
| `accounts` | Връзки с OAuth доставчици (NextAuth адаптер) |
| `sessions` | Активни потребителски сесии |
| `roles` | Дефиниции на роли с admin флаг |
| `permissions` | Дефиниции на разрешения (ресурс:действие) |
| `userRoles` | Назначения потребител-роля |
| `rolePermissions` | Назначения роля-разрешение |
| `clientProfiles` | Разширени потребителски профили за директорийни листинги |
| `subscriptions` | Записи за платежни абонаменти |
| `subscriptionHistory` | Одитна следа на промените по абонаментите |
| `paymentProviders` | Конфигурация за плащания с множество доставчици |
| `paymentAccounts` | Детайли на акаунта, специфични за доставчика |
| `activityLogs` | Одитна следа на потребителски действия |
| `comments` | Потребителски коментари към елементи |
| `votes` | Потребителски гласове/оценки |
| `favorites` | Любими/отметки на потребителя |
| `notifications` | In-app известия |
| `seedStatus` | Проследяване на засяването (singleton запис) |

## Система за миграции

### Команди за миграции

| Команда | Скрипт | Описание |
|---------|--------|---------|
| `pnpm db:generate` | `drizzle-kit generate` | Генерира SQL от промените в схемата |
| `pnpm db:migrate` | `drizzle-kit migrate` | Прилага чакащите миграции (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Прилага миграции с подробно логване |
| `pnpm db:studio` | `drizzle-kit studio` | Отваря GUI на Drizzle Studio |

## Инициализация на базата данни

### Автоматична инициализация при стартиране

Файлът `instrumentation.ts` задейства `initializeDatabase()` при всяко стартиране на приложението:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    await initializeDatabase();
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In dev/preview, allow app to start for debugging
  }
}
```

## Засяване

### Ръчно засяване

```bash
# Seed the database with initial data
pnpm db:seed
```

### Администраторски идентификационни данни

В производствена среда задайте изрични администраторски идентификационни данни:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## Мониторинг

### Drizzle Studio

Прегледайте базата данни чрез графичен интерфейс:

```bash
pnpm db:studio
```

### Проверка на здравето на базата данни

Endpoint-ът `/api/health` може да провери свързаността с базата данни:

```bash
curl -s https://yourdomain.com/api/health
```
