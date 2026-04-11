---
id: drizzle-config
title: Конфигурация Drizzle ORM
sidebar_label: Конфигурация Drizzle
sidebar_position: 9
---

# Конфигурация Drizzle ORM

На этой странице описана конфигурация Drizzle ORM, используемая шаблоном для управления схемой базы данных, миграциями и типобезопасным построением запросов. Конфигурация находится в файле `drizzle.config.ts` в корне проекта.

## Обзор

Шаблон использует [Drizzle ORM](https://orm.drizzle.team/) с PostgreSQL в качестве диалекта базы данных. Drizzle обеспечивает типобезопасный доступ к базе данных, автоматическую генерацию миграций и визуальную студию для проверки базы данных.

## Файл конфигурации

Полная конфигурация определена в `drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Использовать резервный URL, если DATABASE_URL не задан (БД необязательна для проекта)
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## Свойства конфигурации

### `schema`

- **Значение:** `"./lib/db/schema.ts"`
- **Назначение:** Указывает на файл, содержащий все определения таблиц Drizzle. Здесь находятся декларации `pgTable`.

Файл схемы `lib/db/schema.ts` определяет таблицы с использованием построителей колонок PostgreSQL Drizzle:

```ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  uniqueIndex,
  index,
  jsonb,
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...дополнительные колонки
});
```

### `out`

- **Значение:** `"./lib/db/migrations"`
- **Назначение:** Директория для хранения сгенерированных SQL-файлов миграций. Каждый раз при выполнении `drizzle-kit generate` здесь появляются новые файлы миграций.

### `dialect`

- **Значение:** `"postgresql"`
- **Назначение:** Определяет используемый движок базы данных. Шаблон ориентирован на PostgreSQL для production-деплоев.

### `dbCredentials`

- **Значение:** `{ url: databaseUrl }`
- **Назначение:** Строка подключения к базе данных. Считывается из переменной окружения `DATABASE_URL`.

## Загрузка переменных окружения

Конфигурация загружает переменные окружения из двух файлов по порядку:

1. `.env` — базовые переменные окружения
2. `.env.local` — локальные переопределения (имеют приоритет)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

Этот двойной подход позволяет хранить общие значения по умолчанию в `.env`, переопределяя URL и секреты базы данных локально.

## Резервный URL базы данных

Конфигурация включает резервный URL-заглушку:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

Этот резервный вариант существует потому, что база данных необязательна для проекта. Он позволяет командам Drizzle Kit, например `generate`, выполняться даже при отсутствии реальной базы данных, что удобно в CI/CD или при начальной настройке проекта.

## Часто используемые команды

Шаблон определяет несколько скриптов, связанных с базой данных, в `package.json`:

| Команда | Описание |
|---------|-------------|
| `pnpm db:generate` | Генерация файлов миграций из изменений схемы |
| `pnpm db:migrate` | Применение ожидающих миграций к базе данных |
| `pnpm db:seed` | Заполнение базы данных начальными данными |
| `pnpm db:studio` | Открытие Drizzle Studio для визуального управления базой данных |

### Генерация миграций

После изменения схемы в `lib/db/schema.ts` сгенерируйте новую миграцию:

```bash
pnpm db:generate
```

Это создаёт новый SQL-файл миграции в `lib/db/migrations/` с DDL-операторами для синхронизации базы данных со схемой.

### Запуск миграций

Примените все ожидающие миграции:

```bash
pnpm db:migrate
```

### Автоматическая миграция при запуске

Шаблон также поддерживает автоматическую миграцию при запуске приложения через файл инструментации. Это служит резервным вариантом для preview-деплоев:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ...
  try {
    console.log("[Instrumentation] Running database initialization...");
    await initializeDatabase();
    console.log("[Instrumentation] Database initialization completed");
  } catch (error) {
    // В продакшне повторно выбрасывает ошибку для сигнализации критического сбоя
    // В разработке позволяет запустить приложение для отладки
  }
}
```

Для production-сборок на Vercel предпочтительным подходом являются миграции во время сборки через `scripts/build-migrate.ts`.

## Настройка DATABASE_URL

### Локальная разработка (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Продакшн

Задайте `DATABASE_URL` в переменных окружения вашего проекта Vercel, обычно указывая на управляемый экземпляр PostgreSQL (Neon, Supabase, Railway и т.д.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Типобезопасность

Поскольку Drizzle генерирует типы TypeScript непосредственно из вашей схемы, все запросы полностью проверяются типами во время компиляции. Отдельный шаг генерации кода не требуется — файл схемы сам является единственным источником истины как для структуры базы данных, так и для типов TypeScript.

## Связанные ресурсы

- [Справочник по Переменным Окружения](/template/configuration/environment-reference) — полный список переменных окружения, включая `DATABASE_URL`
- [Проверка работоспособности базы данных](/template/guides/database-health-check) — мониторинг подключения к базе данных
- [Руководство по инструментации](/template/guides/instrumentation) — автоматическая инициализация базы данных при запуске
