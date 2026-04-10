---
id: database-scripts
title: "Скрипты Базы Данных"
sidebar_label: "Скрипты БД"
sidebar_position: 10
---

# Скрипты Базы Данных

Шаблон предоставляет набор скриптов управления базой данных для миграций, заполнения и обслуживания. Эти скрипты используют Drizzle ORM и предназначены для работы в локальной разработке, CI/CD-пайплайнах и продакшен-деплоях на Vercel.

## Инвентарь Скриптов

| Скрипт | Команда | Назначение |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Выполнение миграций во время сборки |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Интерактивная ручная миграция |
| `cli-seed.ts` | `pnpm db:seed` | Точка входа CLI для заполнения |
| `seed.ts` | Прямое выполнение | Полное заполнение базы данных |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Настройка каталога продуктов Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | Полная очистка (удаляет всё) |

## Скрипты Миграции

### Миграция во Время Сборки (build-migrate.ts)

Запускается автоматически во время `pnpm build` при деплоях на Vercel. Предназначен для обновлений схемы без простоев.

```mermaid
flowchart TD
    A[Build Start] --> B{SKIP_BUILD_MIGRATIONS?}
    B -->|true| C[Skip & Exit 0]
    B -->|false| D{CI Environment?}
    D -->|CI, not Vercel| C
    D -->|Vercel or Local| E{DATABASE_URL set?}
    E -->|No| C
    E -->|Yes| F[Run Drizzle Migrations]
    F --> G{Success?}
    G -->|Yes| H[Verify Schema]
    G -->|No| I{Production?}
    H --> J{Columns exist?}
    J -->|Yes| K[Exit 0 - Success]
    J -->|No| L[Exit 1 - Fail]
    I -->|Yes| L
    I -->|Preview| M{Connection error?}
    M -->|Yes| C
    M -->|Auth error| L
```

**Поведение по Среде:**

| Среда | Сбой миграции | Ошибка подключения | Ошибка аутентификации |
|---|---|---|---|
| Продакшен (`VERCEL_ENV=production`) | Сборка падает | Сборка падает | Сборка падает |
| Preview (`VERCEL_ENV=preview`) | Сборка падает | Сборка проходит (предупреждение) | Сборка падает |
| CI (GitHub Actions) | Полностью пропускается | Полностью пропускается | Полностью пропускается |
| Локальная разработка | Сборка падает | Сборка падает | Сборка падает |

**Верификация Схемы:**

После успешной миграции скрипт проверяет наличие критических столбцов:

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### CLI Ручной Миграции (cli-migrate.ts)

Интерактивный инструмент для ручного выполнения миграций против любой базы данных.

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**Трёхэтапный Процесс:**

1. **Проверить Текущее Состояние** -- Запрашивает таблицу `drizzle.__drizzle_migrations` для истории применённых миграций
2. **Выполнить Миграции** -- Вызывает `runMigrations()` из `lib/db/migrate.ts`
3. **Верифицировать Схему** -- Подтверждает наличие требуемых столбцов

## Скрипты Заполнения

### Заполнение Базы Данных (seed.ts)

Заполняет базу данных реалистичными тестовыми данными. Выполняет заполнение только если таблицы пусты.

```bash
DATABASE_URL=postgres://... pnpm seed
```

**Порядок Заполнения и Зависимости:**

```mermaid
graph TD
    A[Roles] --> B[Permissions]
    B --> C[Role-Permission Links]
    C --> D[Users]
    D --> E[Client Profiles]
    D --> F[User Roles]
    E --> G[Newsletter Subscriptions]
    E --> H[Activity Logs]
    E --> I[Comments]
    E --> J[Votes]
```

**Генерируемые Данные:**

```typescript
// 20 users with sequential emails
{ email: 'user1@example.com', ... }
{ email: 'user2@example.com', ... }

// Client profiles with varied plans
{ plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free' }

// Role assignment: first user = admin
{ roleId: i === 0 ? 'role-admin' : 'role-user' }

// Newsletter subscriptions: every 3rd user
users.filter((_, i) => i % 3 === 0)
```

### Точка Входа CLI Seed (cli-seed.ts)

Скрипт-обёртка, загружающий переменные среды и делегирующий к `lib/db/seed.ts`.

Скрипт ищет файлы среды в следующем порядке:
1. `.env.local` (предпочтительно)
2. `.env` (альтернатива)
3. Только системные переменные среды (если файлы не найдены)

### Заполнение Продуктов Stripe (seed-stripe-products.ts)

Создаёт полный каталог продуктов Stripe с планами подписки и элементами единовременной покупки.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Требуется:** `STRIPE_SECRET_KEY` в `.env.local`

**Продукты и Цены:**

| Продукт | Ключ плана | Тип цены | Метаданные |
|---|---|---|---|
| Free | `free` | Подписка ($0/мес) | `type: subscription` |
| Standard | `standard` | $10/мес, $96/год | `annualDiscount: 20` |
| Premium | `premium` | $20/мес, $180/год | `annualDiscount: 25` |
| Спонсорская реклама - Еженедельная | `sponsor_weekly` | $100 разово | `type: sponsor_ad` |
| Спонсорская реклама - Ежемесячная | `sponsor_monthly` | $300 разово | `type: sponsor_ad` |

## Очистка Базы Данных

### clean-database.js

Удаляет все таблицы и схему отслеживания миграций Drizzle. Обеспечивает полный сброс базы данных.

```bash
node scripts/clean-database.js
```

**Выполняемые операции:**

1. Удаляет все таблицы в схеме `public` с использованием `CASCADE`
2. Удаляет схему `drizzle` (история миграций)

```sql
-- Step 1: Drop all public tables
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Step 2: Drop migration tracking
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

**Предупреждение:** Эта операция необратима. Всегда создавайте резервную копию перед запуском в любой среде с реальными данными.

## Общие Рабочие Процессы

### Настройка Чистой Разработки

```bash
# 1. Start local PostgreSQL
docker compose up -d postgres

# 2. Generate migration files from schema
pnpm db:generate

# 3. Apply migrations
pnpm db:migrate:cli

# 4. Seed test data
pnpm db:seed

# 5. Seed Stripe products (if using payments)
npx tsx scripts/seed-stripe-products.ts
```

### Сброс и Повторное Заполнение

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

## Переменные Среды

| Переменная | Используется в | Назначение |
|---|---|---|
| `DATABASE_URL` | Все скрипты | Строка подключения PostgreSQL |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Установить `true` для пропуска миграций при сборке |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | API ключ Stripe для создания продуктов |
| `SEED_ADMIN_EMAIL` | seed.ts (через lib) | Email аккаунта администратора |
| `SEED_ADMIN_PASSWORD` | seed.ts (через lib) | Пароль аккаунта администратора |

## Обработка Ошибок

Все скрипты базы данных следуют этим соглашениям:

- Код выхода `0` для успеха или приемлемых условий пропуска
- Код выхода `1` для сбоев, которые должны остановить пайплайн
- Строки подключения маскируются в логах (`://***:***@`)
- Подробные сообщения об ошибках записываются на стороне сервера
- Ошибки продакшена всегда приводят к сбою сборки (без замалчивания)
