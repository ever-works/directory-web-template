---
id: drizzle-config
title: Конфигурация на Drizzle ORM
sidebar_label: Конфигурация на Drizzle
sidebar_position: 9
---

# Конфигурация на Drizzle ORM

Тази страница документира конфигурацията на Drizzle ORM, използвана от шаблона за управление на схема на база данни, миграции и типово-безопасно изграждане на заявки. Конфигурацията се намира в `drizzle.config.ts` в корена на проекта.

## Обзор

Шаблонът използва [Drizzle ORM](https://orm.drizzle.team/) с PostgreSQL като диалект на базата данни. Drizzle осигурява типово-безопасен достъп до базата данни, автоматично генериране на миграции и визуално студио за инспектиране на базата данни.

## Конфигурационен файл

Пълната конфигурация е дефинирана в `drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Използвайте фиктивен URL, ако DATABASE_URL не е зададен (БД е незадължителна за проекта)
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

## Свойства на конфигурацията

### `schema`

- **Стойност:** `"./lib/db/schema.ts"`
- **Цел:** Сочи към файла, съдържащ всички дефиниции на таблици на Drizzle. Тук живеят декларациите `pgTable`.

Файлът со схема `lib/db/schema.ts` дефинира таблиците с помощта на PostgreSQL конструктори за колони на Drizzle:

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
  // ...допълнителни колони
});
```

### `out`

- **Стойност:** `"./lib/db/migrations"`
- **Цел:** Директория, в която се съхраняват генерираните SQL файлове за миграция. При всяко изпълнение на `drizzle-kit generate` тук се появяват нови файлове за миграция.

### `dialect`

- **Стойност:** `"postgresql"`
- **Цел:** Указва използвания двигател на базата данни. Шаблонът е насочен към PostgreSQL за производствени внедрявания.

### `dbCredentials`

- **Стойност:** `{ url: databaseUrl }`
- **Цел:** Низ за свързване с базата данни. Чете се от променливата на средата `DATABASE_URL`.

## Зареждане на променливи на средата

Конфигурацията зарежда променливи на средата от два файла, по ред:

1. `.env` — Базови променливи на средата
2. `.env.local` — Локални замествания (имат приоритет)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

Този двоен подход ви позволява да запазите споделени стойности по подразбиране в `.env`, докато локално заместват URL-ове и тайни на бази данни.

## Резервен URL на базата данни

Конфигурацията включва фиктивен резервен URL:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

Този резервен вариант съществува, защото базата данни е незадължителна за проекта. Позволява на команди на Drizzle Kit като `generate` да се изпълняват дори когато няма реална база данни, което е полезно по време на CI/CD или начална настройка на проекта.

## Обичайни команди

Шаблонът дефинира няколко скрипта, свързани с базата данни, в `package.json`:

| Команда | Описание |
|---------|-------------|
| `pnpm db:generate` | Генериране на файлове за миграция от промени в схемата |
| `pnpm db:migrate` | Прилагане на чакащи миграции към базата данни |
| `pnpm db:seed` | Попълване на базата данни с начални данни |
| `pnpm db:studio` | Отваряне на Drizzle Studio за визуално управление на базата данни |

### Генериране на миграции

След промяна на схемата в `lib/db/schema.ts`, генерирайте нова миграция:

```bash
pnpm db:generate
```

Това създава нов SQL файл за миграция в `lib/db/migrations/` с DDL операторите, необходими за синхронизиране на базата данни с вашата схема.

### Изпълнение на миграции

Приложете всички чакащи миграции:

```bash
pnpm db:migrate
```

### Автоматична миграция при стартиране

Шаблонът поддържа и автоматична миграция по време на стартиране на приложението чрез файла за инструментация. Това служи като резервен вариант за preview внедрявания:

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
    // В продукция, повторно хвърля за сигнализиране на критичен неуспех
    // В разработката, позволява стартиране за отстраняване на грешки
  }
}
```

За производствени изграждания на Vercel, миграциите по време на изграждане чрез `scripts/build-migrate.ts` са предпочитаният подход.

## Настройка на DATABASE_URL

### Локална разработка (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Продукция

Задайте `DATABASE_URL` в променливите на средата на вашия проект Vercel, обикновено сочещи към управляван PostgreSQL инстанс (Neon, Supabase, Railway и т.н.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Типова безопасност

Тъй като Drizzle генерира TypeScript типове директно от вашата схема, всички заявки са напълно проверени за типове по времето на компилиране. Не се изисква отделна стъпка за генериране на код — файлът со схема сам по себе си е единственият източник на истина за структурата на базата данни и TypeScript типове.

## Свързани ресурси

- [Справочник за Средата](/template/configuration/environment-reference) — пълен списък с променливи на средата, включващ `DATABASE_URL`
- [Проверка на здравето на базата данни](/template/guides/database-health-check) — мониторинг на свързаността с базата данни
- [Ръководство за инструментация](/template/guides/instrumentation) — автоматична инициализация на базата данни при стартиране
