---
id: troubleshooting
title: Ръководство за отстраняване на неизправности
sidebar_label: Отстраняване на неизправности
sidebar_position: 7
---

# Ръководство за отстраняване на неизправности

Това ръководство обхваща често срещани грешки, техники за отстраняване на грешки, интерпретация на регистрационни файлове и проблеми със средата за шаблона Ever Works. Проблемите са организирани по категории със симптоми, причини и решения.

## Проблеми с изграждането

### Модулът не е намерен по време на изграждане

**Симптоми**: Компилацията е неуспешна с `Module not found: Can't resolve 'postgres'` или подобни грешки на собствения модул на Node.js.

**Причина**: Webpack се опитва да обедини модули само за сървър за клиентския пакет.

**Решение**: Проверете дали модулът е посочен в `serverExternalPackages` в `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

Ако сте добавили нова зависимост само от сървъра, добавете я към този масив.

### Изчакване за генериране на статична страница

**Симптоми**: Изграждането е неуспешно с `Error: Timeout of 180000ms exceeded` по време на статично генериране.

**Причина**: Страниците, които извличат външни данни по време на компилация, надвишават времето за изчакване.

**Решение**: Шаблонът задава 3 минути изчакване:

```typescript
staticPageGenerationTimeout: 180,
```

За страници, които се нуждаят от повече време, увеличете тази стойност. Като алтернатива превключете бавните страници към динамично изобразяване:

```typescript
export const dynamic = 'force-dynamic';
```

### Липсва директория със съдържание по време на изграждане

**Симптоми**: Изграждането е неуспешно, защото `.content/data` не съществува.

**Причина**: Базираното на Git CMS съдържание не е клонирано. Скриптът `scripts/clone.cjs` се изпълнява по време на `predev` и `prebuild` куки.

**Решение**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Webpack предупреждения от Supabase, bcryptjs, postgres, stripe

**Симптоми**: Компилацията извежда предупреждения за тези пакети, но завършва успешно.

**Причина**: Известни предупреждения от пакети, които препращат към Node.js API, които не са налични в браузъра.

**Решение**: Те вече са потиснати в `next.config.ts` :

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

Не е необходимо действие -- предупрежденията не влияят на изхода на компилацията.

### Купчината на JavaScript няма памет

**Симптоми**: Сривове на компилация с `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**Решение**: Скриптовете за изграждане вече разпределят 8 GB:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

Ако компилацията все още не разполага с памет, проверете за:

- Прекомерно генериране на статични страници (намаляване на страниците, създадени по време на изграждане)
- Големите зависимости не са разклатени правилно
- Изтичане на памет в скриптове по време на изграждане

## Проблеми с базата данни

### Отказана връзка с PostgreSQL

**Симптоми**: Приложението е неуспешно с `connection refused` , `ECONNREFUSED` или `connect ETIMEDOUT` .

**Диагностични стъпки**:

1. Проверете `DATABASE_URL` в `.env.local` :
    ``` баш
    възел -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL ? 'Set' : 'Lissing')"
    ```
2. Тествайте връзката директно: `psql $DATABASE_URL -c "SELECT 1"` 3. Проверете дали PostgreSQL работи: `pg_isready` **Често срещани причини и поправки**:

| Причина | Поправете |
| ---------------------- | ---------------------------------------------- |
| PostgreSQL не работи | Стартирайте услугата |
| Грешен порт | Проверете порта във вашия низ за връзка |
| Липсваща база данни | `createdb your_database_name` |
| Неуспешно удостоверяване | Проверете потребителско име/парола в `DATABASE_URL` |
| Изисква се SSL | Добавете `?sslmode=require` към низа за свързване |

### Мигрирането е неуспешно

**Симптоми**: `pnpm db:migrate` се проваля със схема или SQL грешки.

**Решение**: Използвайте инструмента за подробна миграция на CLI за отстраняване на грешки:

```bash
pnpm db:migrate:cli
```

Това показва:

1. Текущо състояние на миграция (списък на приложените миграции)
2. Подробен изход за изпълнение на миграцията
3. Проверка на схемата след миграция

Ако миграциите са повредени, проверете таблицата за проследяване на Drizzle:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### Неуспешна инициализация на базата данни в инструментариума

**Симптоми**: Конзолата показва `[Instrumentation] Database initialization failed` при стартиране.

**Причина**: Куката `instrumentation.ts` изпълнява миграция и зареждане при стартиране. Неуспехът показва проблем със свързаността на базата данни или схемата.

**Поведение според средата**:

| Околна среда | При повреда |
| ----------- | ------------------------------------- |
| Производство | Извежда грешка, внедряването обслужва 503 |
| Развитие | Регистрира предупреждение, приложението се стартира за отстраняване на грешки |
| Преглед | Регистрира предупреждение, приложението се стартира за отстраняване на грешки |

От `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Семената останаха в състояние на "засяване".

**Симптоми**: Регистри на приложението `[DB Init] Another instance is seeding` многократно.

**Причина**: Предишна начална операция се срива без актуализиране на състоянието.

**Решение**: Кодът за инициализиране автоматично обработва застояли семена след 5 минути:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

За да разрешите незабавно, актуализирайте ръчно началния статус:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

След това рестартирайте приложението.

## Проблеми с удостоверяването

### AUTH_SECRET не е зададен

**Симптоми**: Приложението се срива с `AUTH_SECRET is not set` или грешки в сесията.

**Решение**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### Несъответствие на URL адреса за обратно извикване на OAuth

**Симптоми**: OAuth влизането пренасочва към страница за грешка с `redirect_uri_mismatch` .

**Решение**: URL адресът за обратно извикване в конзолата на вашия OAuth доставчик трябва да съвпада точно:

| Доставчик | URL адрес за обратно извикване |
| -------- | -------------------------------------------------- |
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

За местно развитие използвайте `http://localhost:3000/api/auth/callback/<provider>` .

### Доставчиците на OAuth не се показват

**Симптоми**: Показани са само данни за влизане, OAuth бутони липсват.

**Причина**: Доставчиците на OAuth се връщат към деактивирано, ако конфигурацията е неуспешна. От `auth.config.ts` :

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

**Решение**: Проверете дали `CLIENT_ID` и `CLIENT_SECRET` са зададени за всеки доставчик. Скриптът за проверка на средата валидира OAuth двойки:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Сесиите изтичат неочаквано

**Често срещани причини**:

| Причина | Решение |
| ---------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` променен | Промяната на тайната прави невалидни всички сесии |
| Несъответствие на домейна на бисквитката | Задайте `COOKIE_DOMAIN` , за да съответства на вашия домейн за внедряване |
| HTTPS несъответствие | Задайте `COOKIE_SECURE=false` за локална HTTP разработка |

## Проблеми с внедряването

### Компилацията на Vercel е неуспешна, но локалната компилация е успешна

**Контролен списък**:

1. Всички необходими променливи на средата, зададени в таблото за управление на Vercel
2. `DATABASE_URL` достъпен от мрежата на Vercel
3. Съвместима версия на Node.js (изисква 20.19.0 или по-висока)
4. Съществува директория със съдържание (CI създава `.content/data` автоматично)
5. Разпределението на паметта е достатъчно

### Задачите на Vercel cron не се изпълняват

**Симптоми**: Планираните крайни точки в `vercel.json` не се изпълняват.

**Диагностични стъпки**:

1. Уверете се, че `vercel.json` е в корена на проекта с правилни пътища:
    ```json
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" }
    ```
2. Потвърдете, че планът Vercel поддържа cron (Pro или Enterprise)
3. Проверете Vercel Dashboard под раздела Cron Jobs за регистрационни файлове за изпълнение
4. Тествайте крайната точка ръчно: `curl https://yourdomain.com/api/cron/sync` ### Миграцията по време на компилация е неуспешна на Vercel

**Симптоми**: Регистрационният файл на компилацията показва `[Build Migration] Migration error` .

**Поведение**: Скриптът `scripts/build-migrate.ts` обработва различни сценарии:

- **Производство**: Всички повреди причиняват неизправност при компилирането
- **Визуализация с грешка при свързване**: Изграждането продължава с предупреждение
- **Визуализация с грешка при удостоверяване**: компилацията е неуспешна (неправилна конфигурация)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

За да пропуснете изцяло миграциите по време на изграждане:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Проблеми с интернационализацията

### Показани ключове за превод вместо текст

**Симптоми**: Страниците показват `common.WELCOME` вместо „Добре дошли“.

**Решение**:

1. Уверете се, че файлът за превод съществува: `messages/<locale>.json` 2. Проверете дали пътят на ключа съвпада с пространството от имена, използвано в `useTranslations` 3. Резервната система използва `deepmerge` за сливане на съобщения за локал с английски по подразбиране:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Ако липсва ключ във файла с локални настройки, английският резервен вариант трябва да го предостави.

### Locale Routing връща 404

**Симптоми**: URL адреси като `/fr/discover` връщат страница 404.

**Решение**: Проверете дали локалът е в масива `LOCALES` в `lib/constants.ts` :

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

И проверете конфигурацията на маршрута в `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Интерпретация на регистрационния файл

### Регистрационни префикси

| Префикс | Източник | Местоположение |
| ------------------- | ---------------------------------- | -------------------------- |
| `[Instrumentation]` | Стартиране на приложението (DB init, Sentry) | `instrumentation.ts` |
| `[Migration]` | Изпълнение на миграция на база данни | `lib/db/migrate.ts` |
| `[DB Init]` | Инициализация и зареждане на база данни | `lib/db/initialize.ts` |
| `[Build Migration]` | Скрипт за миграция по време на изграждане | `scripts/build-migrate.ts` |
| `[Layout]` | Грешки при извличане на данни за основно оформление | `app/[locale]/layout.tsx` |

### Етикети за грешка на Sentry

Стражевите грешки от инструментите включват тези тагове за филтриране:

| Етикет | Стойности |
| ------------- | ---------------------------------------------- |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` или `development` |

## Диагностични команди

| Задача | Команда |
| ------------------------ | ---------------------------------- |
| Проверете TypeScript грешки | `pnpm tsc --noEmit` |
| Стартирайте linter | `pnpm lint` |
| Валидиране на среда | `node scripts/check-env.js` |
| Бърза проверка на средата | `node scripts/check-env.js --quick` |
| Тествайте връзката с база данни | `pnpm db:studio` |
| Преглед на състоянието на миграция | `pnpm db:migrate:cli` |
| Генериране на нови миграции | `pnpm db:generate` |
| Прилагане на чакащи миграции | `pnpm db:migrate` |
| База данни за семена | `pnpm db:seed` |
| Изчистване на кеша за компилация | `rm -rf .next` |
| Пълна реконструкция | `rm -rf .next && pnpm build` |
| Нулиране на база данни | `node scripts/clean-database.js` |

## Получаване на помощ

1. Търсете [Проблеми с GitHub](https://github.com/ever-works/directory-web-template/issues)
2. Прегледайте файла `CLAUDE.md` за насоки за разработка, подпомагана от AI
3. Проверете таблото за управление на Sentry за подробности за грешката (ако е конфигурирано)
4. За проблеми със сигурността изпратете лично имейл на security@ever.co
