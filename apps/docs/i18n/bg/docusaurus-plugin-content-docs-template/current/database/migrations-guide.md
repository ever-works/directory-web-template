---
id: migrations-guide
title: Ръководство за миграции
sidebar_label: миграции
sidebar_position: 4
---

# Ръководство за миграции

Шаблонът Ever Works използва **Drizzle Kit** за миграции на бази данни. Миграциите са SQL файлове, които проследяват промените в схемата във времето, като гарантират последователно състояние на базата данни в среди и членове на екипа.

## Как работят миграциите

Drizzle Kit сравнява текущата дефиниция на схема (`lib/db/schema.ts`) с предишни генерирани миграции и създава SQL миграционни файлове за всякакви разлики.

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

## Структура на директория за миграция

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

Директорията `meta/` съдържа метаданни за вътрешно проследяване на Drizzle Kit. Файловете `relations.ts` и `schema.ts` в директорията за миграции са референтни моментни снимки и не трябва да се редактират ръчно.

## Команди

### Генериране на миграция

След като промените `lib/db/schema.ts`, генерирайте миграция:

```bash
pnpm db:generate
```

Това изпълнява `drizzle-kit generate`, което:
1. Чете текущата схема от `lib/db/schema.ts`
2. Сравнява го с последната моментна снимка на миграцията
3. Генерира нов SQL файл в `lib/db/migrations/`
4. Актуализира метаданните за миграция в `meta/`

### Изпълнение на чакащи миграции

Приложете всички неприложени миграции към вашата база данни:

```bash
pnpm db:migrate
```

Това извиква `lib/db/migrate.ts`, което:
1. Свързва се с базата данни чрез `DATABASE_URL`
2. Проверява таблицата `drizzle.__drizzle_migrations` за приложени миграции
3. Изпълнява всички миграции, които не са били приложени
4. Актуализира таблицата за проследяване

### Отворете Drizzle Studio

Стартирайте визуален редактор на база данни:

```bash
pnpm db:studio
```

## Migration Runner (`lib/db/migrate.ts`)

Програмата за мигриране (`runMigrations()`) е идемпотентна и безопасна за извикване при всяко стартиране:

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

Ключови поведения:
- **Идемпотент**: Дъжд проследява приложените миграции в `drizzle.__drizzle_migrations`; вече приложените миграции се пропускат
- **Регистриране**: Отчита скорошни приложени миграции преди и след изпълнение
- **Обработка на грешки**: Връща `false` при повреда с подробни съобщения за грешка
- **Автоматично стартиране**: Извиква се по време на стартиране на приложението чрез `lib/db/initialize.ts`

## Автоматична миграция при стартиране

Шаблонът автоматично изпълнява миграции при стартиране на приложението. Това се задейства от `instrumentation.ts`, който извиква `initializeDatabase()` от `lib/db/initialize.ts`.

Стартовият поток:
1. Проверете дали `DATABASE_URL` е конфигуриран (пропуснете, ако не е)
2. Изпълнете всички предстоящи миграции
3. Проверете дали базата данни е заредена
4. Ако не е поставено, придобийте препоръчително заключване и стартирайте семе

В производството грешките на миграцията хвърлят грешка, за да сигнализират на системите за наблюдение. В среди за разработка и визуализация приложението продължава с предупреждение.

## Създаване на нови миграции

### Стъпка 1: Променете схемата

Редактирайте `lib/db/schema.ts`, за да добавите, промените или премахнете дефиниции на таблици:

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

### Стъпка 2: Генерирайте миграцията

```bash
pnpm db:generate
```

Това създава нов SQL файл като `0029_some_name.sql`.

### Стъпка 3: Прегледайте генерирания SQL

Винаги преглеждайте генерираната миграция, преди да я приложите. Проверете за:
- Правилни имена на таблици и колони
- Правилни типове данни и ограничения
- Дефиниции на индекса
- Връзки с външен ключ
- Всякакви деструктивни операции (ДРОП ТАБЛИЦА, ДРОП КОЛОНА)

### Стъпка 4: Приложете миграцията

```bash
pnpm db:migrate
```

### Стъпка 5: Ангажирайте се

Ангажирайте както промяната на схемата, така и генерирания файл за миграция:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (актуализирани метаданни)

## Екипен работен процес

### Обработване на едновременни промени в схемата

Когато няколко членове на екипа променят схемата едновременно:

1. Всеки разработчик генерира своя собствена миграция локално
2. При сливане файловете за мигриране може да се нуждаят от преномериране, ако поредните номера са в конфликт
3. Drizzle Kit проследява миграциите по хеш, а не по номер, така че изпълнението извън реда се обработва
4. След сливането изпълнете `pnpm db:migrate`, за да приложите всички нови миграции

### Съображения за околната среда

|Околна среда|Стратегия за миграция|
|-------------|-------------------|
|развитие|Автоматично стартиране при стартиране; генерирайте и тествайте локално|
|Преглед/постановка|Автоматично стартиране при внедряване чрез `instrumentation.ts`|
|производство|Автоматично стартиране при внедряване; следете за повреди|

### Най-добри практики

1. **Една грижа за всяка миграция**: Дръжте миграциите фокусирани върху една функция или промяна
2. **Никога не редактирайте съществуващи миграции**: След като дадена миграция бъде приложена някъде, третирайте я като неизменна
3. **Преглед на генерирания SQL**: Винаги проверявайте какво генерира Drizzle Kit, преди да приложите
4. **Тестови миграции**: Изпълнявайте миграции срещу тестова база данни преди внедряване в производствена среда
5. **Включете файлове за мигриране в преглед на кода**: SQL за мигриране трябва да се прегледа точно като кода на приложението
6. **Резервно копие преди деструктивни миграции**: Винаги архивирайте преди стартиране на миграции, които изпускат таблици или колони
