---
id: deployment-introduction
title: Въведение в Внедряването
sidebar_label: Въведение
sidebar_position: 1
---

# Въведение в Внедряването

Това ръководство предоставя изчерпателен преглед на внедряването на шаблона Ever Works в производствени среди. Шаблонът е изграден върху Next.js 16 с режим на изход standalone, което го прави съвместим с широк набор от хостинг платформи и контейнеризирани внедрявания.

## Преглед на Архитектурата

Шаблонът Ever Works произвежда **standalone сборка на Next.js**, която пакетира всички зависимости в единна разгъваема единица. Това е конфигурирано в `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

Настройката `output: "standalone"` създава самодостатъчен артефакт за внедряване, който включва само необходимите файлове `node_modules`, значително намалявайки размера на внедряването.

## Поддържани Платформи

### Препоръчително: Vercel

Vercel е препоръчваната платформа за внедряване за шаблона. Предлага:

- Внедряване с нулева конфигурация за Next.js приложения
- Автоматично осигуряване на SSL сертификати
- Вградено планиране на cron задачи чрез `vercel.json`
- Поддръжка за serverless функции за API маршрути
- Предпросмотрови внедрявания за pull request

Шаблонът включва конфигурация `vercel.json` с предварително дефинирани cron разписания:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Самостоятелно Хостиране: Docker

Standalone изходът поддържа Docker контейнеризация. Типичното внедряване използва Node.js среда за изпълнение за обслужване на изградено приложение. Ключовото изискване е да се гарантира, че директорията за изход `standalone` и папките `public` и `.next/static` са копирани в образа на контейнера.

### Други Облачни Платформи

Шаблонът може да бъде внедрен на всяка платформа, поддържаща Node.js приложения:

- **Railway** -- Простото full-stack внедряване с вграден PostgreSQL
- **DigitalOcean App Platform** -- Управлявани контейнерни внедрявания
- **AWS (EC2, ECS или App Runner)** -- Мащабируема облачна инфраструктура
- **Google Cloud Run** -- Serverless контейнерна платформа
- **Azure App Service** -- Управляван хостинг на Node.js

## Изисквания

### Системни Изисквания

- **Node.js**: версия 20.19.0 или по-нова (дефинирана в полето `engines` на `package.json`)
- **Мениджър на Пакети**: pnpm (проектът използва `pnpm-lock.yaml`)
- **База Данни**: PostgreSQL (необходима за производствени функции като удостоверяване, абонаменти, анализи)
- **Памет**: Препоръчват се минимум 8 GB RAM за процеса на сборка

Скриптът за сборка изрично разпределя допълнителна памет:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Необходими Променливи на Средата

Преди внедряване се уверете, че тези критични променливи са конфигурирани. Скриптът `scripts/check-env.js` ги проверява автоматично:

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Скриптът за проверка на средата категоризира променливите по интеграция:

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### Незадължителни Интеграции

Тези променливи на средата активират незадължителни функции:

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## Ръководство за Бързо Внедряване

### Стъпка 1: Подготовка на Сборката

Стартирайте пълния процес на сборка локално, за да проверите дали всичко се компилира:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

Скриптът `build` изпълнява няколко стъпки последователно:

1. **Проверка на средата** (`scripts/check-env.js`) -- проверява необходимите променливи
2. **Генериране на OpenAPI** (`scripts/generate-openapi.ts`) -- генерира документация на API
3. **Миграции на базата данни** (`scripts/build-migrate.ts`) -- прилага чакащите промени в схемата
4. **Сборка на Next.js** (`next build`) -- компилира приложението

### Стъпка 2: Миграция на Базата Данни по Време на Сборката

Скриптът `scripts/build-migrate.ts` се изпълнява автоматично по време на сборката. Обработва различни среди:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Ключово поведение:

- **Производствени сборки**: Грешките при миграция причиняват неуспех на сборката (предотвратява счупени внедрявания)
- **Предпросмотрови внедрявания**: Грешките при свързване се толерират (базата данни може да не е все още конфигурирана)
- **CI сборки** (не-Vercel): Миграциите се пропускат изцяло

### Стъпка 3: Инициализация по Време на Изпълнение

Когато приложението стартира, `instrumentation.ts` задейства инициализацията на базата данни:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

Последователност на инициализацията:

1. Изпълнение на чакащи миграции (Drizzle обработва идемпотентността)
2. Проверка дали базата данни е засята
3. Ако не, получаване на PostgreSQL advisory lock и изпълнение на скрипта за засяване
4. Освобождаване на lock след засяването

### Стъпка 4: Внедряване в Vercel

За внедрявания в Vercel свържете хранилището си и конфигурирайте:

1. Задайте **Framework Preset** на Next.js
2. Задайте **Build Command** на `pnpm build`
3. Задайте **Install Command** на `pnpm install`
4. Добавете всички необходими променливи на средата в таблото на Vercel
5. Внедрете

### Стъпка 5: Проверка на Внедряването

След внедряването проверете:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Заглавки за Сигурност

Шаблонът автоматично конфигурира заглавки за сигурност в `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## Конфигурация на Пула от Връзки

Пулът от връзки с базата данни е конфигурируем чрез променливата на средата `DB_POOL_SIZE`:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **Производствена стойност по подразбиране**: 20 връзки
- **Стойност по подразбиране за разработка**: 10 връзки
- **Конфигурируем диапазон**: 1 до 50 връзки
- **Таймаут за неактивност**: 20 секунди
- **Таймаут за свързване**: 30 секунди

## Следващи Стъпки

- [SSL и Персонализирани Домейни](./ssl-domains.md) -- Конфигурирайте персонализирани домейни и SSL сертификати
- [Управление на Базата Данни](./database-management.md) -- Операции с производствена база данни
- [Резервно Копие и Възстановяване](./backup-recovery.md) -- Стратегии за резервно копиране на базата данни
- [Мониторинг](./monitoring.md) -- Конфигуриране на проследяване на грешки и мониторинг на производителността
