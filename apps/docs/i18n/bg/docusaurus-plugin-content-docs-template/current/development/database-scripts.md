---
id: database-scripts
title: "Скриптове за Базата Данни"
sidebar_label: "Скриптове"
sidebar_position: 10
---

# Скриптове за Базата Данни

Шаблонът предоставя набор от скриптове за управление на базата данни за миграции, seed данни и поддръжка. Тези скриптове използват Drizzle ORM и са проектирани да работят в локална разработка, CI/CD пайплайни и продукционни деплойвания на Vercel.

## Инвентар на Скриптовете

| Скрипт | Команда | Предназначение |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Изпълнител на миграции при билдване |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Интерактивна ръчна миграция |
| `cli-seed.ts` | `pnpm db:seed` | CLI входна точка за seed |
| `seed.ts` | Директно изпълнение | Пълен seed на базата данни |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Настройка на каталога с продукти на Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | Пълно нулиране (изтрива всичко) |

## Скриптове за Миграция

### Миграция при Билдване (build-migrate.ts)

Изпълнява се автоматично по време на `pnpm build` при деплойване на Vercel. Проектиран за актуализации на схема без престой.

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

**Поведение по Среда:**

| Среда | Грешка при миграция | Грешка при връзка | Грешка при автентикация |
|---|---|---|---|
| Продукция (`VERCEL_ENV=production`) | Билдът се проваля | Билдът се проваля | Билдът се проваля |
| Preview (`VERCEL_ENV=preview`) | Билдът се проваля | Билдът минава (предупреждение) | Билдът се проваля |
| CI (GitHub Actions) | Напълно пропуснато | Напълно пропуснато | Напълно пропуснато |
| Локална разработка | Билдът се проваля | Билдът се проваля | Билдът се проваля |

**Верификация на Схемата:**

След успешна миграция скриптът проверява дали съществуват критични колони:

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### CLI за Ръчна Миграция (cli-migrate.ts)

Интерактивен инструмент за ръчно изпълнение на миграции срещу всяка база данни.

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**Тристъпков Процес:**

1. **Проверка на Текущото Състояние** -- Заявява таблицата `drizzle.__drizzle_migrations` за историята на приложените миграции
2. **Изпълнение на Миграциите** -- Извиква `runMigrations()` от `lib/db/migrate.ts`
3. **Верификация на Схемата** -- Потвърждава съществуването на изискваните колони

## Скриптове за Seed Данни

### Seed на Базата Данни (seed.ts)

Попълва базата данни с реалистични тестови данни. Прави seed само ако таблиците са празни.

```bash
DATABASE_URL=postgres://... pnpm seed
```

**Ред на Seed и Зависимости:**

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

**Генерирани Данни:**

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

### CLI Входна Точка за Seed (cli-seed.ts)

Обвиващ скрипт, който зарежда променливи на средата и делегира към `lib/db/seed.ts`.

Скриптът търси файлове за среда в следния ред:
1. `.env.local` (предпочитан)
2. `.env` (алтернативен)
3. Само системни променливи за среда (ако не съществуват файлове)

### Seed на Продукти в Stripe (seed-stripe-products.ts)

Създава пълен каталог с продукти в Stripe с абонаментни планове и артикули за еднократна покупка.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Изисква:** `STRIPE_SECRET_KEY` в `.env.local`

**Продукти и Цени:**

| Продукт | Ключ на плана | Тип цена | Метаданни |
|---|---|---|---|
| Free | `free` | Абонамент ($0/мес) | `type: subscription` |
| Standard | `standard` | $10/мес, $96/год | `annualDiscount: 20` |
| Premium | `premium` | $20/мес, $180/год | `annualDiscount: 25` |
| Спонсорирана реклама - Седмична | `sponsor_weekly` | $100 еднократно | `type: sponsor_ad` |
| Спонсорирана реклама - Месечна | `sponsor_monthly` | $300 еднократно | `type: sponsor_ad` |

## Почистване на Базата Данни

### clean-database.js

Изтрива всички таблици и схемата за проследяване на миграции на Drizzle. Осигурява пълно нулиране на базата данни.

```bash
node scripts/clean-database.js
```

**Извършвани операции:**

1. Изтрива всички таблици в схемата `public` чрез `CASCADE`
2. Изтрива схемата `drizzle` (история на миграции)

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

**Предупреждение:** Тази операция е необратима. Винаги правете резервно копие преди изпълнение в среда с реални данни.

## Общи Работни Процеси

### Настройка на Чисто Разработване

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

### Нулиране и Повторен Seed

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

## Променливи на Средата

| Променлива | Използва се от | Предназначение |
|---|---|---|
| `DATABASE_URL` | Всички скриптове | Низ за връзка с PostgreSQL |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Задайте `true` за пропускане на миграции при билдване |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | API ключ на Stripe за създаване на продукти |
| `SEED_ADMIN_EMAIL` | seed.ts (чрез lib) | Имейл на акаунта на администратора |
| `SEED_ADMIN_PASSWORD` | seed.ts (чрез lib) | Парола на акаунта на администратора |

## Обработка на Грешки

Всички скриптове за база данни следват тези конвенции:

- Код на изход `0` за успех или приемливи условия за пропуск
- Код на изход `1` за грешки, които трябва да спрат пайплайна
- Низовете за връзка са маскирани в логовете (`://***:***@`)
- Подробни съобщения за грешки се записват на страната на сървъра
- Продукционните грешки винаги провалят билда (без заглушаване)
