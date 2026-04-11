---
id: migration-guide
title: Руководство по миграции версий
sidebar_label: Руководство по миграции
sidebar_position: 8
---

# Руководство по миграции версий

В этом руководстве описывается обновление установки шаблона Ever Works, обработка миграции базы данных между версиями, управление критическими изменениями, написание и применение сценариев миграции, а также процедуры отката.

## Обзор рабочего процесса обновления

Обновление шаблона следует структурированному процессу, позволяющему минимизировать риск:

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

## Система миграции баз данных

### Как работают миграции

В шаблоне используется Drizzle ORM с Drizzle Kit для миграции схемы. Схема определена в `lib/db/schema.ts` , а миграции генерируются в виде файлов SQL в `lib/db/migrations/` .

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

### Команды миграции

| Команда | Цель | Когда использовать |
|---------|---------|-------------|
| `pnpm db:generate` | Генерация SQL на основе изменений схемы | После изменения `lib/db/schema.ts` |
| `pnpm db:migrate` | Применить ожидающие миграции (Drizzle CLI) | Перед запуском приложения после изменений |
| `pnpm db:migrate:cli` | Применить с подробным журналированием | Для устранения проблем миграции |
| `pnpm db:seed` | Заполняем исходные данные | После свежей миграции или замены семян |
| `pnpm db:studio` | Визуальная проверка базы данных | Для отладки или просмотра данных |

### Структура файла миграции

Миграции хранятся в виде пронумерованных файлов SQL:

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

Морось отслеживает примененные миграции в `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Создание новой миграции

После изменения `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Автоматическая миграция

Шаблон автоматически запускает миграцию в двух местах:

**Время сборки** (через `scripts/build-migrate.ts` ):

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

**Время выполнения** (через `instrumentation.ts` ):

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

### Миграционная безопасность по окружающей среде

| Окружающая среда | Время сборки | Время выполнения | О неудаче |
|-------------|-----------|---------|------------|
| Производство | Требуется | Резервный вариант | Сборка не удалась/приложение выдает ошибку |
| Предварительный просмотр | Ошибки подключения допускаются | Активный | Предупреждения журналов, запуск приложения |
| Развитие | Не используется | Активный | Предупреждения журналов, запуск приложения |
| CI (не Vercel) | Пропущено | Не используется | Н/Д |

## Процедуры отката

### Drizzle не поддерживает автоматический откат

Drizzle Kit генерирует только прямую миграцию. Чтобы отменить миграцию:

**Вариант 1. Обратная миграция вручную**

1. Определите проблемную миграцию в `lib/db/migrations/` 2. Напишите обратный SQL вручную:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Применить непосредственно к базе данных:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Удалите файл прямой миграции из `lib/db/migrations/` 5. При необходимости обновите журнал Drizzle.

**Вариант 2. Восстановление из резервной копии**

Самый безопасный подход к откату для сложных миграций:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Вариант 3. Отменить схему и выполнить ее повторное создание**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Обновления зависимостей

### Обновление зависимостей

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Критические зависимости

Эти пакеты требуют тщательного тестирования при обновлении:

| Пакет | Риск | Заметки |
|---------|------|-------|
| `next` | Высокий | Основные версии меняют API, маршрутизацию, конфигурацию |
| `next-auth` | Высокий | Изменения API аутентификации, стратегия сеанса |
| `drizzle-orm` / `drizzle-kit` | Высокий | Schema API, изменения формата миграции |
| `next-intl` | Средний | Изменения в маршрутизации и загрузке сообщений |
| `@sentry/nextjs` | Средний | Совместимость с крючками для инструментов |
| `stripe` | Средний | Управление версиями платежного API |
| `@heroui/react` | Средний | Изменения в компонентах пользовательского интерфейса |
| `@trigger.dev/sdk` | Средний | Изменения в API планирования заданий |

### переопределения pnpm

Шаблон использует переопределения pnpm в `package.json` для обеспечения согласованности версий:

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

При обновлении React или esbuild обновите эти переопределения, чтобы они соответствовали.

## Контрольный список критических изменений

При обновлении между версиями шаблона просмотрите каждую категорию:

### Изменения схемы

- [ ] Сравните `lib/db/schema.ts` с исходным для новых/измененных столбцов.
- [ ] Создать миграции: `pnpm db:generate` - [ ] Просмотр сгенерированного SQL-кода на предмет деструктивных операций (удаление столбцов, изменение типов).
- [ ] Сначала применить к тестовой базе данных
- [ ] Проверьте совместимость семян: `pnpm db:seed` ### Изменения маршрута API

- [ ] Проверьте наличие переименованных или удаленных маршрутов в `app/api/` - [] Обновление внешних интеграций и URL-адресов веб-перехватчиков.
- [ ] Убедитесь, что пути к конечной точке cron по-прежнему совпадают `vercel.json` ### Изменения конфигурации

- [ ] Сравните `.env.example` на наличие новых или переименованных переменных.
- [ ] Просмотр `next.config.ts` изменений (заголовки, веб-пакет, плагины)
- [ ] Проверьте `vercel.json` , чтобы узнать об изменениях в расписании cron.
- [ ] Просмотрите `drizzle.config.ts` для изменений пути.

### Изменения аутентификации

- [ ] Сравните `auth.config.ts` с восходящим потоком
- [ ] Проверка совместимости стратегии сеанса
- [ ] Проверка URL-адресов обратного вызова OAuth
- [ ] Просмотрите определения разрешений в `lib/permissions/definitions.ts` ### Изменения пользовательского интерфейса и стиля

- [ ] Сравните `tailwind.config.ts` на предмет изменений темы.
- [ ] Визуально проверьте ключевые страницы.
- [ ] Тестирование адаптивных макетов
- [ ] Убедитесь, что настройки темы все еще применяются.

## Пошаговый процесс обновления

### 1. Подготовьтесь

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Объединение восходящих потоков

Если вы отслеживаете шаблон как вышестоящий удаленный компьютер:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Решайте конфликты, обращая внимание на:
- `lib/db/schema.ts` -- изменения схемы
- `next.config.ts` -- конфигурация сборки
- `auth.config.ts` -- поставщики аутентификации
- `package.json` -- версии зависимостей

### 3. Установка и перенос

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Проверьте локально

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Тестирование критических путей

| Площадь | Что тестировать |
|------|-------------|
| Аутентификация | Вход, выход, OAuth, сохранение сеанса |
| Платежи | Потоки подписки, обработка веб-перехватчиков |
| Содержание | Рендеринг страниц, поиск, фильтрация |
| Админ | Доступ к информационной панели, применение RBAC |
| i18n | Переключение локали, полнота перевода |
| Фоновые вакансии | Журналы консоли для регистрации заданий |

### 6. Развертывание

1. Отправьте ветку функций для проверки CI.
2. Развертывание в среде предварительной/предварительного просмотра.
3. Запустите дымовые тесты на стадии разработки
4. Объедините с `main` для производственного развертывания.

## Совместимость версий

### Node.js

Минимальная версия определена в `package.json` :

```json
{ "engines": { "node": ">=20.19.0" } }
```

### База данных

| Провайдер | Поддерживается | Заметки |
|----------|-----------|-------|
| PostgreSQL 14+ | Да | Рекомендуемая продукция |
| Супабаза | Да | С пулом соединений |
| Неон | Да | Бессерверный PostgreSQL |

### Платформы

| Платформа | Статус | Заметки |
|----------|--------|-------|
| Версель | Основная цель | Полный cron, предварительный просмотр и поддержка Edge |
| Докер | Поддерживается | Автономный вывод для контейнеров |
| Самостоятельное размещение | Поддерживается | Требуется управление процессами |

## Устранение неполадок при обновлении

| Симптом | Вероятная причина | Решение |
|---------|-------------|---------|
| Сборка не удалась | Несовместимые версии | Запустите `pnpm outdated` , разрешите конфликты одноранговых узлов |
| Ошибки БД при запуске | Непримененные миграции | `pnpm db:generate && pnpm db:migrate` |
| Авторизация сломана | Конфигурация провайдера изменена | Сравните `auth.config.ts` с восходящим |
| Отсутствующие переводы | Добавлены новые ключи | Проверьте `messages/` на наличие отсутствующих записей |
| Стиль сломан | Конфигурация попутного ветра изменена | Сравнить `tailwind.config.ts` |
| Несоответствие типов | Схема обновлена ​​| Повторно запустить `pnpm db:generate` |
