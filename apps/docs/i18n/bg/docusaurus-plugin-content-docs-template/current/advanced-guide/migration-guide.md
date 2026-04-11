---
id: migration-guide
title: Ръководство за мигриране на версия
sidebar_label: Ръководство за миграция
sidebar_position: 8
---

# Ръководство за мигриране на версия

Това ръководство обхваща надграждането на вашата инсталация на Ever Works Template, обработката на миграциите на бази данни между версиите, управлението на нарушаващи промените, писането и прилагането на скриптове за миграция и процедурите за връщане назад.

## Общ преглед на работния процес на надграждане

Надстройването на шаблона следва структуриран процес за минимизиране на риска:

```
1. Review changelog for breaking changes
2. Back up your database (pg_dump)
3. Create a feature branch for the upgrade
4. Update dependencies (pnpm install)
5. Generate and apply database migrations
6. Run lint, type check, and build locally
7. Test critical paths (auth, payments, content)
8. Deploy to staging / preview
9. Verify staging
10. Deploy to production
```

## Система за миграция на бази данни

### Как работят миграциите

Шаблонът използва Drizzle ORM с Drizzle Kit за миграции на схеми. Схемата е дефинирана в `lib/db/schema.ts` и миграциите се генерират като SQL файлове в `lib/db/migrations/` .

Конфигурация в `drizzle.config.ts` :

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### Команди за миграция

| Команда | Цел | Кога да използвате |
|---------|---------|-------------|
| `pnpm db:generate` | Генериране на SQL от промени в схемата | След промяна на `lib/db/schema.ts` |
| `pnpm db:migrate` | Прилагане на чакащи миграции (Drizzle CLI) | Преди стартиране на приложението след промени |
| `pnpm db:migrate:cli` | Кандидатствайте с подробно регистриране | За отстраняване на грешки при проблеми с миграцията |
| `pnpm db:seed` | Попълване на първоначалните данни | След прясна миграция или промени в семената |
| `pnpm db:studio` | Визуална проверка на база данни | За отстраняване на грешки или преглед на данни |

### Файлова структура за миграция

Миграциите се съхраняват като номерирани SQL файлове:

```
lib/db/migrations/
  0000_burly_darkstar.sql          # Initial schema
  0001_add_image_to_users.sql      # Add image column
  ...
  0019_add_subscription_renewal_fields.sql
  ...
  0028_tiresome_mauler.sql         # Latest migration
  meta/
    _journal.json                  # Migration journal
```

Дъжд следи приложени миграции в `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Генериране на нова миграция

След промяна на `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Автоматични миграции

Шаблонът изпълнява автоматично миграции на две места:

**Време за изграждане** (чрез `scripts/build-migrate.ts` ):

```typescript
// Production builds: failure causes build to fail
if (isProduction) {
  process.exit(1);
}

// Preview deployments: connection errors are tolerated
if (isConnectionError && !isAuthError) {
  process.exit(0); // Allow preview to deploy
}
```

**Време на изпълнение** (чрез `instrumentation.ts` ):

```typescript
export async function register() {
  try {
    await initializeDatabase(); // Runs migrate then seed
  } catch (error) {
    if (isProduction) throw error; // Fail fast
    // Dev/preview: log and continue
  }
}
```

### Безопасност на миграцията от околната среда

| Околна среда | Време за изграждане | Време на изпълнение | При повреда |
|-------------|-----------|---------|------------|
| Производство | Задължително | Резервен | Изграждането е неуспешно / хвърляне на приложение |
| Преглед | Допускат се грешки при свързване | Активен | Регистрира предупреждение, приложението стартира |
| Развитие | Не се използва | Активен | Регистрира предупреждение, приложението стартира |
| CI (не-Vercel) | Пропуснато | Не се използва | N/A |

## Процедури за връщане назад

### Дъждът не поддържа автоматично връщане назад

Drizzle Kit генерира миграции само напред. За да обърнете миграция:

**Вариант 1: Ръчна обратна миграция**

1. Идентифицирайте проблемната миграция в `lib/db/migrations/` 2. Напишете обратен SQL ръчно:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Кандидатствайте директно в базата данни:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Премахнете файла за предна миграция от `lib/db/migrations/` 5. Актуализирайте дневника на Drizzle, ако е необходимо

**Вариант 2: Възстановяване от резервно копие**

Най-безопасният подход за връщане назад за сложни миграции:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Опция 3: Възстановяване на схемата и повторно генериране**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Актуализации на зависимости

### Актуализиране на зависимости

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Критични зависимости

Тези пакети изискват внимателно тестване при надграждане:

| Пакет | Риск | Бележки |
|---------|------|-------|
| `next` | Високо | Основните версии променят API, маршрутизиране, конфигурация |
| `next-auth` | Високо | Промени в API за удостоверяване, стратегия за сесия |
| `drizzle-orm` / `drizzle-kit` | Високо | API на схема, промени във формата за миграция |
| `next-intl` | Средно | Промени в маршрутизирането и зареждането на съобщения |
| `@sentry/nextjs` | Средно | Съвместимост на инструменталната кука |
| `stripe` | Средно | Версии на API за плащане |
| `@heroui/react` | Средно | Промени в подпората на компонента на потребителския интерфейс |
| `@trigger.dev/sdk` | Средно | Промени в API за планиране на работа |

### pnpm Замени

Шаблонът използва pnpm замени в `package.json` , за да принуди последователни версии:

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.2.7",
      "@types/react-dom": "19.2.3",
      "esbuild": "0.27.0",
      "@opentelemetry/api": "1.9.0"
    }
  }
}
```

Когато надграждате React или esbuild, актуализирайте тези замени, за да съответстват.

## Контролен списък за критични промени

Когато надстройвате между версии на шаблон, прегледайте всяка категория:

### Промени в схемата

- [ ] Сравнете `lib/db/schema.ts` с upstream за нови/променени колони
- [ ] Генериране на миграции: `pnpm db:generate` - [ ] Преглед на генерирания SQL за разрушителни операции (отпадане на колони, промени в типа)
- [ ] Първо приложете към тестова база данни
- [ ] Проверете съвместимостта на семената: `pnpm db:seed` ### Промени в маршрута на API

- [ ] Проверете за преименувани или премахнати маршрути в `app/api/` - [ ] Актуализиране на външни интеграции и URL адреси на уеб кукички
- [ ] Уверете се, че пътищата на крайните точки на cron все още съвпадат с `vercel.json` ### Промени в конфигурацията

- [ ] Сравнете `.env.example` за нови или преименувани променливи
- [ ] Преглед на `next.config.ts` промени (заглавки, уеб пакет, добавки)
- [ ] Проверете `vercel.json` за промени в графика на cron
- [ ] Прегледайте `drizzle.config.ts` за промени в пътя

### Промени в удостоверяването

- [ ] Сравнете `auth.config.ts` с upstream
- [ ] Проверете съвместимостта на стратегията на сесията
- [ ] Тествайте URL адресите за обратно извикване на OAuth
- [ ] Преглед на дефинициите на разрешения в `lib/permissions/definitions.ts` ### Промени в потребителския интерфейс и стила

- [ ] Сравнете `tailwind.config.ts` за промени в темата
- [ ] Визуално проверете ключовите страници
- [ ] Тествайте адаптивни оформления
- [ ] Проверете дали все още се прилагат персонализациите на темата

## Процес на надграждане стъпка по стъпка

### 1. Подгответе

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Обединяване нагоре по веригата

Ако проследявате шаблона като дистанционно управление нагоре по веригата:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Разрешавайте конфликти, като обръщате внимание на:
- `lib/db/schema.ts` -- промени в схемата
- `next.config.ts` -- изграждане на конфигурация
- `auth.config.ts` -- доставчици на удостоверяване
- `package.json` -- версии на зависимости

### 3. Инсталирайте и мигрирайте

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Проверете локално

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Тествайте критичните пътища

| Площ | Какво да тествам |
|------|-------------|
| Удостоверяване | Влизане, излизане, OAuth, постоянство на сесия |
| Плащания | Абонаментни потоци, обработка на webhook |
| Съдържание | Изобразяване на страници, търсене, филтриране |
| Администратор | Достъп до таблото за управление, прилагане на RBAC |
| i18n | Превключване на локали, пълнота на превода |
| Фонови задачи | Конзолни регистрационни файлове за регистрация на работа |

### 6. Разположете

1. Натиснете клона на функцията за проверка на CI
2. Разположете в среда за етапи/преглед
3. Изпълнете тестове за дим на етапа
4. Обединете към `main` за производствено разгръщане

## Съвместимост на версията

### Node.js

Минималната версия е дефинирана в `package.json` :

```json
{ "engines": { "node": ">=20.19.0" } }
```

### База данни

| Доставчик | Поддържа се | Бележки |
|----------|-----------|-------|
| PostgreSQL 14+ | Да | Препоръчително производство |
| Супабаза | Да | С групиране на връзки |
| Неон | Да | PostgreSQL без сървър |

### Платформи

| Платформа | Статус | Бележки |
|----------|--------|-------|
| Версел | Основна цел | Пълна поддръжка на cron, визуализация и край |
| Докер | Поддържа се | Самостоятелен изход за контейнери |
| Самостоятелен хостинг | Поддържа се | Изисква управление на процеси |

## Надстройки за отстраняване на неизправности

| Симптом | Вероятна причина | Решение |
|---------|-------------|---------|
| Изграждането е неуспешно | Несъвместими deps | Изпълнение `pnpm outdated` , разрешаване на конфликти между партньори |
| DB грешки при стартиране | Неприложени миграции | `pnpm db:generate && pnpm db:migrate` |
| Разрешено удостоверяване | Конфигурацията на доставчика е променена | Сравнете `auth.config.ts` с upstream |
| Липсващи преводи | Добавени нови ключове | Проверете `messages/` за липсващи записи |
| Счупен стил | Конфигурацията на заден вятър е променена | Сравнете `tailwind.config.ts` |
| Типове несъответствие | Актуализирана схема | Повторно изпълнение `pnpm db:generate` |
