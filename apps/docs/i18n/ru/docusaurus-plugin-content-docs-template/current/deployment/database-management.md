---
id: database-management
title: Управление Базой Данных
sidebar_label: Управление БД
sidebar_position: 4
---

# Управление Базой Данных

Шаблон Ever Works использует PostgreSQL с Drizzle ORM для всех операций с базой данных. Это руководство охватывает управление базой данных в production-среде, миграции, пул подключений, мониторинг и систему сидирования.

## Архитектура

| Слой | Файл | Ответственность |
|------|------|----------------|
| **Конфигурация** | `drizzle.config.ts` | Путь к схеме, вывод миграций, диалект |
| **Подключение** | `lib/db/drizzle.ts` | Пул соединений, singleton-экземпляр, lazy init |
| **Конфиг** | `lib/db/config.ts` | Безопасный URL базы данных для скриптов и env-хелперов |
| **Схема** | `lib/db/schema.ts` | Определения таблиц, индексы, ограничения |
| **Миграции** | `lib/db/migrate.ts` | Идемпотентный запуск миграций |
| **Инициализация** | `lib/db/initialize.ts` | Auto-migrate, seed, advisory locks |
| **Сидирование** | `lib/db/seed.ts` | Начальные данные: роли, разрешения, admin-пользователь |

## Управление подключениями

### Singleton с ленивой инициализацией

Подключение к базе данных создаётся при первом использовании и кэшируется через `globalThis`, чтобы пережить HMR во время разработки. Из `lib/db/drizzle.ts`:

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

Экспортируемый объект `db` использует JavaScript Proxy для прозрачной ленивой инициализации:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

Это означает, что подключение к базе данных не устанавливается до выполнения первого реального запроса. Маршруты, не использующие базу данных, не имеют накладных расходов на подключение.

### Конфигурация пула подключений

| Настройка | Продакшен | Разработка | Описание |
|-----------|----------|-----------|---------|
| `max` | 20 | 10 | Максимальное количество подключений в пуле |
| `idle_timeout` | 20 с | 20 с | Закрывать простаивающие подключения через указанное время |
| `connect_timeout` | 30 с | 30 с | Таймаут для новых попыток подключения |
| `prepare` | false | false | Отключить prepared statements (совместимость с Vercel) |

Настроить размер пула через переменную окружения:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## Обзор схемы

Схема в `lib/db/schema.ts` определяет следующие основные таблицы:

### Пользователи и аутентификация

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

### Управление доступом на основе ролей

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

### Полный список таблиц

| Таблица | Назначение |
|---------|-----------|
| `users` | Аккаунты пользователей |
| `accounts` | Связи с OAuth-провайдерами (адаптер NextAuth) |
| `sessions` | Активные сессии пользователей |
| `roles` | Определения ролей с флагом admin |
| `permissions` | Определения разрешений (ресурс:действие) |
| `userRoles` | Назначения пользователь-роль |
| `rolePermissions` | Назначения роль-разрешение |
| `clientProfiles` | Расширенные профили пользователей для каталогов |
| `subscriptions` | Записи платёжных подписок |
| `subscriptionHistory` | Журнал аудита изменений подписки |
| `paymentProviders` | Конфигурация мультипровайдерной оплаты |
| `paymentAccounts` | Данные аккаунта, специфичные для провайдера |
| `activityLogs` | Журнал аудита действий пользователя |
| `comments` | Комментарии пользователей к элементам |
| `votes` | Голоса/оценки пользователей |
| `favorites` | Избранное/закладки пользователя |
| `notifications` | In-app уведомления |
| `seedStatus` | Отслеживание сидирования (singleton-запись) |

## Система миграций

### Команды для работы с миграциями

| Команда | Скрипт | Описание |
|---------|--------|---------|
| `pnpm db:generate` | `drizzle-kit generate` | Генерирует SQL из изменений схемы |
| `pnpm db:migrate` | `drizzle-kit migrate` | Применяет ожидающие миграции (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Применяет миграции с подробным логированием |
| `pnpm db:studio` | `drizzle-kit studio` | Открывает GUI Drizzle Studio |

### Идемпотентный запуск миграций

Запуск миграций в `lib/db/migrate.ts` безопасно вызывать при каждом старте приложения:

```typescript
export async function runMigrations(): Promise<boolean> {
  try {
    const { db } = await import('./drizzle');

    // Log current migration state
    const result = await db.execute(sql`
      SELECT hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Run migrations (skips already-applied ones)
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    return true;
  } catch (error) {
    console.error('[Migration] Database migrations failed:', error);
    return false;
  }
}
```

## Инициализация базы данных

### Автоматическая инициализация при запуске

Файл `instrumentation.ts` запускает `initializeDatabase()` при каждом старте приложения:

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

## Сидирование

### Ручное сидирование

```bash
# Seed the database with initial data
pnpm db:seed
```

### Учётные данные администратора

В production задайте явные учётные данные администратора:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## Мониторинг

### Drizzle Studio

Просматривайте базу данных через графический интерфейс:

```bash
pnpm db:studio
```

### Проверка состояния базы данных

Эндпоинт `/api/health` может проверить подключение к базе данных:

```bash
curl -s https://yourdomain.com/api/health
```

## Связанные файлы

| Файл | Назначение |
|------|-----------|
| `drizzle.config.ts` | Конфигурация Drizzle Kit |
| `lib/db/config.ts` | Безопасные env-хелперы для скриптов |
| `lib/db/drizzle.ts` | Пул подключений и singleton |
| `lib/db/schema.ts` | Полные определения схемы |
| `lib/db/migrate.ts` | Идемпотентный запуск миграций |
| `lib/db/initialize.ts` | Auto-migrate, сидирование, управление locками |
| `lib/db/seed.ts` | Логика сидирования базы данных |
| `scripts/build-migrate.ts` | Запуск миграций во время сборки |
| `scripts/cli-migrate.ts` | Ручной CLI для миграций |
| `scripts/cli-seed.ts` | Ручной CLI для сидирования |
| `scripts/clean-database.js` | Утилита сброса базы данных |
