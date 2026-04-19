---
id: migrations-guide
title: Руководство по миграции
sidebar_label: Миграции
sidebar_position: 4
---

# Руководство по миграции

Шаблон Ever Works использует **Drizzle Kit** для миграции базы данных. Миграции — это файлы SQL, которые отслеживают изменения схемы с течением времени, обеспечивая согласованное состояние базы данных в разных средах и среди членов команды.

## Как работают миграции

Drizzle Kit сравнивает текущее определение схемы (`lib/db/schema.ts`) с ранее созданными миграциями и создает файлы миграции SQL для любых различий.

```
lib/db/schema.ts (source of truth)
        │
        ▼
  drizzle-kit generate
        │
        ▼
lib/db/migrations/
  ├── 0000_burly_darkstar.sql       (initial schema)
  ├── 0001_add_image_to_users.sql
  ├── 0002_silly_victor_mancha.sql
  ├── ...
  └── 0028_tiresome_mauler.sql      (latest)
```

## Структура каталога миграции

```
lib/db/migrations/
├── 0000_burly_darkstar.sql           # Initial schema (16KB - all core tables)
├── 0001_add_image_to_users.sql       # Add image column to users
├── 0002_silly_victor_mancha.sql      # Subscription and payment tables
├── 0003_gigantic_thunderbolts.sql    # Small schema adjustment
├── 0004_big_marrow.sql               # Small schema adjustment
├── 0005_sharp_malcolm_colcord.sql    # Favorites table
├── 0006_giant_the_phantom.sql        # Featured items table
├── 0007_tiresome_true_believers.sql  # Sponsor ads table
├── 0008_add_twenty_crm_singleton_constraint.sql  # CRM singleton
├── 0009_add_integration_mappings.sql # Integration mappings
├── 0010_convert_comments_timestamps_to_timestamptz.sql # Timezone fix
├── 0011_quiet_gravity.sql            # Companies table
├── 0012_purple_vindicator.sql        # Items-companies join
├── 0013_add_surveys_table.sql        # Survey system
├── 0014_fat_madame_masque.sql        # Seed status, item views, audit logs
├── 0015_previous_jack_flag.sql       # Report and moderation tables
├── 0016_solid_stellaris.sql          # Minor adjustment
├── 0017_whole_supreme_intelligence.sql # Minor adjustment
├── 0018_wooden_electro.sql           # Additional indexes
├── 0019_add_subscription_renewal_fields.sql # Auto-renewal support
├── 0020_chunky_naoko.sql             # Minor adjustment
├── 0021_redundant_dragon_lord.sql    # Additional indexes
├── 0022_tidy_dakota_north.sql        # Payment account improvements
├── 0023_boring_silverclaw.sql        # Collection tables
├── 0024_deep_wrecker.sql             # Additional improvements
├── 0025_overconfident_moon_knight.sql # Location features
├── 0026_exotic_clea.sql              # Minor adjustment
├── 0027_minor_mesmero.sql            # Minor adjustment
├── 0028_tiresome_mauler.sql          # Latest migration
├── meta/                             # Drizzle migration metadata
├── relations.ts                      # Drizzle relation definitions
└── schema.ts                         # Snapshot of schema at migration time
```

Каталог `meta/` содержит внутренние метаданные отслеживания Drizzle Kit. Файлы `relations.ts` и `schema.ts` в каталоге миграций представляют собой эталонные снимки, и их не следует редактировать вручную.

## Команды

### Создать миграцию

После изменения `lib/db/schema.ts` создайте миграцию:

```bash
pnpm db:generate
```

Это запускает `drizzle-kit generate`, который:
1. Считывает текущую схему из `lib/db/schema.ts`.
2. Сравнивает его с последним снимком миграции.
3. Генерирует новый файл SQL в `lib/db/migrations/`.
4. Обновляет метаданные миграции в `meta/`.

### Запустить ожидающие миграции

Примените все непримененные миграции к вашей базе данных:

```bash
pnpm db:migrate
```

Это вызывает `lib/db/migrate.ts`, который:
1. Подключается к базе данных с помощью `DATABASE_URL`
2. Проверяет таблицу `drizzle.__drizzle_migrations` на наличие примененных миграций.
3. Запускает любые миграции, которые не были применены.
4. Обновляет таблицу отслеживания

### Открытая студия «Дождь»

Запускаем визуальный редактор базы данных:

```bash
pnpm db:studio
```

## Менеджер по миграции (`lib/db/migrate.ts`)

Средство миграции (`runMigrations()`) является идемпотентным и его можно безопасно вызывать при каждом запуске:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');

  // Log current migration state
  // ...

  // Run migrations (Drizzle automatically skips applied ones)
  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  return true;
}
```

Ключевые модели поведения:
- **Идемпотент**: Drizzle отслеживает прикладные миграции в `drizzle.__drizzle_migrations`; уже примененные миграции пропускаются
- **Журналирование**: сообщает о последних примененных миграциях до и после выполнения.
- **Обработка ошибок**: в случае сбоя возвращает `false` с подробными сообщениями об ошибках.
- **Автозапуск**: вызывается при запуске приложения через `lib/db/initialize.ts`.

## Автоматическая миграция при запуске

Шаблон автоматически запускает миграцию при запуске приложения. Это инициируется `instrumentation.ts`, который вызывает `initializeDatabase()` из `lib/db/initialize.ts`.

Последовательность запуска:
1. Проверьте, настроен ли `DATABASE_URL` (если нет, пропустите)
2. Запустите все ожидающие миграции
3. Проверьте, заполнена ли база данных
4. Если не засеяно, получите рекомендательную блокировку и запустите заполнение

В производственной среде сбои миграции вызывают ошибку, сигнализирующую системам мониторинга. В средах разработки и предварительной версии приложение продолжает работу с предупреждением.

## Создание новых миграций

### Шаг 1. Измените схему

Отредактируйте `lib/db/schema.ts`, чтобы добавить, изменить или удалить определения таблиц:

```typescript
// Add a new table
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add a column to an existing table
// Just add the new column to the existing pgTable definition
```

### Шаг 2. Создайте миграцию

```bash
pnpm db:generate
```

При этом создается новый файл SQL вида `0029_some_name.sql`.

### Шаг 3. Просмотрите сгенерированный SQL

Всегда проверяйте созданную миграцию перед ее применением. Проверьте:
- Правильные названия таблиц и столбцов.
- Правильные типы данных и ограничения
- Определения индексов
- Отношения с внешним ключом
- Любые деструктивные операции (DROP TABLE, DROP COLUMN)

### Шаг 4. Примените миграцию

```bash
pnpm db:migrate
```

### Шаг 5: Подтвердите

Зафиксируйте как изменение схемы, так и созданный файл миграции:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (обновленные метаданные)

## Рабочий процесс команды

### Обработка одновременных изменений схемы

Когда несколько членов команды одновременно изменяют схему:

1. Каждый разработчик генерирует собственную миграцию локально.
2. При объединении файлов миграции может потребоваться перенумерация, если порядковые номера конфликтуют.
3. Drizzle Kit отслеживает миграции по хешу, а не по номеру, поэтому обрабатывается выполнение вне очереди.
4. После слияния запустите `pnpm db:migrate`, чтобы применить все новые миграции.

### Соображения окружающей среды

|Окружающая среда|Миграционная стратегия|
|-------------|-------------------|
|Развитие|Автозапуск при запуске; генерировать и тестировать локально|
|Предварительный просмотр/постановка|Автоматический запуск при развертывании через `instrumentation.ts`|
|Производство|Автоматический запуск при развертывании; следить за сбоями|

### Лучшие практики

1. **Одна проблема на миграцию**: сосредоточьте миграцию на одной функции или изменении.
2. **Никогда не редактируйте существующие миграции**: как только миграция была применена где-либо, рассматривайте ее как неизменяемую.
3. **Проверьте сгенерированный SQL**: перед применением всегда проверяйте, что генерирует Drizzle Kit.
4. **Тестовая миграция**. Запустите миграцию для тестовой базы данных перед развертыванием в рабочей среде.
5. **Включайте файлы миграции в проверку кода**: SQL миграции следует проверять так же, как и код приложения.
6. **Выполняйте резервное копирование перед деструктивной миграцией**. Всегда делайте резервную копию перед запуском миграции, при которой удаляются таблицы или столбцы.
