---
id: troubleshooting
title: Руководство по устранению неполадок
sidebar_label: Поиск неисправностей
sidebar_position: 7
---

# Руководство по устранению неполадок

В этом руководстве рассматриваются распространенные ошибки, методы отладки, интерпретация журналов и проблемы среды для шаблона Ever Works. Проблемы сгруппированы по категориям с симптомами, причинами и решениями.

## Проблемы со сборкой

### Модуль не найден во время сборки

**Признаки**: сборка завершается с ошибкой `Module not found: Can't resolve 'postgres'` или аналогичными ошибками собственного модуля Node.js.

**Причина**: Webpack пытается объединить серверные модули в клиентский пакет.

**Решение**: Убедитесь, что модуль указан в `serverExternalPackages` в `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

Если вы добавили новую зависимость только для сервера, добавьте ее в этот массив.

### Тайм-аут генерации статической страницы

**Признаки**: сборка завершается с ошибкой `Error: Timeout of 180000ms exceeded` во время статической генерации.

**Причина**: страницы, которые извлекают внешние данные во время сборки, превышают тайм-аут.

**Решение**. В шаблоне установлен 3-минутный тайм-аут:

```typescript
staticPageGenerationTimeout: 180,
```

Для страниц, которым требуется больше времени, увеличьте это значение. Альтернативно переключите медленные страницы на динамический рендеринг:

```typescript
export const dynamic = 'force-dynamic';
```

### Каталог содержимого отсутствует во время сборки

**Признаки**: Не удалось выполнить сборку, поскольку `.content/data` не существует.

**Причина**: содержимое CMS на основе Git не было клонировано. Сценарий `scripts/clone.cjs` выполняется во время перехватов `predev` и `prebuild` .

**Решение**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Предупреждения Webpack от Supabase, bcryptjs, postgres, Stripe

**Признаки**: сборка выдает предупреждения об этих пакетах, но завершается успешно.

**Причина**: известные предупреждения пакетов, ссылающихся на API Node.js, недоступные в браузере.

**Решение**: они уже подавлены в `next.config.ts` :

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

Никаких действий не требуется — предупреждения не влияют на выходные данные сборки.

### Недостаточно памяти в куче JavaScript

**Признаки**: Сбой сборки с `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**Решение**. Скрипты сборки уже выделяют 8 ГБ:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

Если сборке по-прежнему не хватает памяти, проверьте:

- Чрезмерное создание статических страниц (уменьшите количество страниц, создаваемых во время сборки).
- Большие зависимости не обрабатываются должным образом.
- Утечки памяти в скриптах во время сборки.

## Проблемы с базой данных

### Отказ в соединении с PostgreSQL

**Признаки**: Приложение завершается с ошибкой `connection refused` , `ECONNREFUSED` или `connect ETIMEDOUT` .

**Этапы диагностики**:

1. Проверьте `DATABASE_URL` в `.env.local` :
    ``` баш
    node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL? 'Set': 'Missing')"
    ```
2. Проверьте соединение напрямую: `psql $DATABASE_URL -c "SELECT 1"` 3. Убедитесь, что PostgreSQL запущен: `pg_isready` **Распространенные причины и способы устранения**:

| Причина | Исправить |
| ---------------------- | ----------------------------------------------- |
| PostgreSQL не работает | Запустить службу |
| Неправильный порт | Проверьте порт в строке подключения |
| Отсутствует база данных | `createdb your_database_name` |
| Ошибка аутентификации | Проверьте имя пользователя/пароль в `DATABASE_URL` |
| Требуется SSL | Добавьте `?sslmode=require` в строку подключения |

### Миграция не удалась

**Признаки**: `pnpm db:migrate` завершается сбоем из-за ошибок схемы или SQL.

**Решение**. Для отладки используйте подробный инструмент миграции CLI:

```bash
pnpm db:migrate:cli
```

Это показывает:

1. Текущее состояние миграции (список примененных миграций)
2. Подробные результаты выполнения миграции
3. Проверка схемы после миграции

Если миграции повреждены, проверьте таблицу отслеживания Drizzle:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### Инициализация базы данных не удалась при инструментировании

**Симптомы**: Консоль показывает `[Instrumentation] Database initialization failed` при запуске.

**Причина**: Перехватчик `instrumentation.ts` запускает миграцию и заполнение при запуске. Сбой указывает на проблему с подключением к базе данных или схемой.

**Поведение в зависимости от окружающей среды**:

| Окружающая среда | О неудаче |
| ----------- | -------------------------------------- |
| Производство | Выдает ошибку, развертывание обслуживает 503 |
| Развитие | Предупреждение журналов, приложение запускается для отладки |
| Предварительный просмотр | Предупреждение журналов, приложение запускается для отладки |

Из `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Семена застряли в состоянии «посева»

**Симптомы**: Приложение неоднократно регистрирует `[DB Init] Another instance is seeding` .

**Причина**: Предыдущая операция заполнения завершилась сбоем без обновления статуса.

**Решение**. Код инициализации автоматически обрабатывает устаревшие начальные значения через 5 минут:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

Чтобы решить проблему немедленно, обновите исходный статус вручную:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

Затем перезапустите приложение.

## Проблемы с аутентификацией

### AUTH_SECRET не установлен

**Признаки**: Приложение аварийно завершает работу с `AUTH_SECRET is not set` или ошибками сеанса.

**Решение**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### Несоответствие URL-адреса обратного вызова OAuth

**Симптомы**: вход в систему OAuth перенаправляется на страницу ошибки с `redirect_uri_mismatch` .

**Решение**. URL обратного вызова в консоли вашего провайдера OAuth должен точно совпадать:

| Провайдер | URL обратного вызова |
| -------- | -------------------------------------------------- |
| Гугл | `https://yourdomain.com/api/auth/callback/google` |
| Гитхаб | `https://yourdomain.com/api/auth/callback/github` |
| Фейсбук | `https://yourdomain.com/api/auth/callback/facebook` |
| Твиттер | `https://yourdomain.com/api/auth/callback/twitter` |

Для локальной разработки используйте `http://localhost:3000/api/auth/callback/<provider>` .

### Поставщики OAuth не отображаются

**Симптомы**: отображаются только учетные данные для входа, кнопки OAuth отсутствуют.

**Причина**: поставщики OAuth снова отключаются в случае сбоя конфигурации. С `auth.config.ts` :

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**Решение**: убедитесь, что `CLIENT_ID` и `CLIENT_SECRET` установлены для каждого провайдера. Скрипт проверки среды проверяет пары OAuth:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Срок действия сеансов неожиданно истекает

**Распространенные причины**:

| Причина | Решение |
| ---------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` изменено | Изменение секрета делает все сеансы недействительными |
| Несоответствие домена cookie | Установите `COOKIE_DOMAIN` в соответствии с вашим доменом развертывания |
| Несоответствие HTTPS | Установите `COOKIE_SECURE=false` для локальной разработки HTTP |

## Проблемы с развертыванием

### Сборка Vercel не удалась, но локальная сборка прошла успешно

**Контрольный список**:

1. Все необходимые переменные среды установлены на панели управления Vercel.
2. `DATABASE_URL` доступен из сети Vercel.
3. Совместимость с версией Node.js (требуется 20.19.0 или выше)
4. Каталог содержимого существует (CI автоматически создает `.content/data` )
5. Достаточное количество памяти.

### Задания Vercel cron не выполняются

**Симптомы**: Запланированные конечные точки в `vercel.json` не запускаются.

**Этапы диагностики**:

1. Убедитесь, что `vercel.json` находится в корне проекта с правильными путями:
    ```json
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" }
    ```
2. Убедитесь, что план Vercel поддерживает cron (Pro или Enterprise).
3. Проверьте панель Vercel Dashboard на вкладке «Задания Cron» для просмотра журналов выполнения.
4. Проверьте конечную точку вручную: `curl https://yourdomain.com/api/cron/sync` ### На Vercel не удалось выполнить миграцию во время сборки

**Признаки**: В журнале сборки отображается цифра `[Build Migration] Migration error` .

**Поведение**: Скрипт `scripts/build-migrate.ts` обрабатывает различные сценарии:

- **Производство**: все сбои приводят к сбою сборки.
- **Предварительный просмотр с ошибкой подключения**: сборка продолжается с предупреждением.
- **Предварительный просмотр с ошибкой аутентификации**: сборка не удалась (неправильная конфигурация).

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

Чтобы полностью пропустить миграцию во время сборки:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Проблемы интернационализации

### Ключи перевода отображаются вместо текста

**Признаки**: На страницах отображается `common.WELCOME` вместо «Добро пожаловать».

**Решение**:

1. Убедитесь, что файл перевода существует: `messages/<locale>.json` 2. Убедитесь, что путь к ключу соответствует пространству имен, используемому в `useTranslations` 3. Резервная система использует `deepmerge` для объединения сообщений локали с английскими значениями по умолчанию:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Если ключ отсутствует в файле локали, его должен предоставить резервный вариант английского языка.

### Маршрутизация локали возвращает 404

**Признаки**: URL-адреса типа `/fr/discover` возвращают страницу 404.

**Решение**. Убедитесь, что локаль находится в массиве `LOCALES` в `lib/constants.ts` :

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

И проверьте конфигурацию маршрутизации в `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Интерпретация журнала

### Префиксы журналов

| Префикс | Источник | Расположение |
| ------------------- | -------------------- | -------------------------- |
| `[Instrumentation]` | Запуск приложения (DB init, Sentry) | `instrumentation.ts` |
| `[Migration]` | Выполнение миграции базы данных | `lib/db/migrate.ts` |
| `[DB Init]` | Инициализация и заполнение базы данных | `lib/db/initialize.ts` |
| `[Build Migration]` | Скрипт миграции во время сборки | `scripts/build-migrate.ts` |
| `[Layout]` | Ошибки получения данных корневого макета | `app/[locale]/layout.tsx` |

### Теги ошибок охраны

Ошибки Sentry от приборов включают в себя следующие теги для фильтрации:

| Тег | Ценности |
| ------------- | ----------------------------------------- |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` или `development` |

## Диагностические команды

| Задача | Команда |
| ------------------------ | -------------------- |
| Проверьте ошибки TypeScript | `pnpm tsc --noEmit` |
| Запустить линтер | `pnpm lint` |
| Проверка среды | `node scripts/check-env.js` |
| Быстрая проверка окружающей среды | `node scripts/check-env.js --quick` |
| Проверить подключение к базе данных | `pnpm db:studio` |
| Просмотр состояния миграции | `pnpm db:migrate:cli` |
| Создание новых миграций | `pnpm db:generate` |
| Применить ожидающие миграции | `pnpm db:migrate` |
| База данных семян | `pnpm db:seed` |
| Очистить кеш сборки | `rm -rf .next` |
| Полная реконструкция | `rm -rf .next && pnpm build` |
| Сбросить базу данных | `node scripts/clean-database.js` |

## Получение помощи

1. Найдите [Проблемы GitHub](https://github.com/ever-works/directory-web-template/issues).
2. Просмотрите файл `CLAUDE.md` на предмет рекомендаций по разработке с использованием ИИ.
3. Проверьте информационную панель Sentry для получения подробной информации об ошибках (если настроено).
4. По вопросам безопасности пишите на адрес электронной почты security@ever.co в частном порядке.
