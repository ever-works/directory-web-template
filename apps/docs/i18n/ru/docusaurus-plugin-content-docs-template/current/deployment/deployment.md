---
id: deployment-introduction
title: Введение в Развертывание
sidebar_label: Введение в Развертывание
sidebar_position: 1
---

# Введение в Развертывание

Это руководство предоставляет исчерпывающий обзор развёртывания шаблона Ever Works в производственных средах. Шаблон построен на Next.js 16 с режимом вывода standalone, что делает его совместимым с широким спектром хостинговых платформ и контейнерных развёртываний.

## Обзор Архитектуры

Шаблон Ever Works создаёт **standalone сборку Next.js**, которая упаковывает все зависимости в единую развёртываемую единицу. Это настроено в `next.config.ts`:

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

Настройка `output: "standalone"` создаёт самодостаточный артефакт развёртывания, который включает только необходимые файлы `node_modules`, значительно уменьшая размер развёртывания.

## Поддерживаемые Платформы

### Рекомендуется: Vercel

Vercel является рекомендуемой платформой развёртывания для шаблона. Предлагает:

- Нулевая конфигурация для приложений Next.js
- Автоматическое обеспечение SSL сертификатов
- Встроенное планирование cron заданий через `vercel.json`
- Поддержку serverless функций для API маршрутов
- Предпросмотровые развёртывания для pull request

Шаблон включает конфигурацию `vercel.json` с предопределёнными расписаниями cron:

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

### Самостоятельный Хостинг: Docker

Standalone вывод поддерживает контейнеризацию Docker. Типичное развёртывание использует среду выполнения Node.js для обслуживания собранного приложения. Ключевое требование — убедиться, что директория вывода `standalone` и папки `public` и `.next/static` скопированы в образ контейнера.

### Другие Облачные Платформы

Шаблон может быть развёрнут на любой платформе, поддерживающей приложения Node.js:

- **Railway** -- Простое full-stack развёртывание со встроенным PostgreSQL
- **DigitalOcean App Platform** -- Управляемые контейнерные развёртывания
- **AWS (EC2, ECS или App Runner)** -- Масштабируемая облачная инфраструктура
- **Google Cloud Run** -- Serverless контейнерная платформа
- **Azure App Service** -- Управляемый хостинг Node.js

## Требования

### Системные Требования

- **Node.js**: версия 20.19.0 или выше (определена в поле `engines` `package.json`)
- **Менеджер Пакетов**: pnpm (проект использует `pnpm-lock.yaml`)
- **База Данных**: PostgreSQL (необходима для производственных функций, таких как auth, подписки, аналитика)
- **Память**: Рекомендуется не менее 8 ГБ RAM для процесса сборки

Скрипт сборки явно выделяет дополнительную память:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Необходимые Переменные Окружения

Перед развёртыванием убедитесь, что эти критические переменные настроены. Скрипт `scripts/check-env.js` проверяет их автоматически:

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

Скрипт проверки окружения категоризирует переменные по интеграциям:

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

### Опциональные Интеграции

Эти переменные окружения включают опциональные функции:

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

## Руководство по Быстрому Развёртыванию

### Шаг 1: Подготовка Сборки

Запустите полный процесс сборки локально для проверки компиляции:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

Скрипт `build` выполняет несколько шагов последовательно:

1. **Проверка окружения** (`scripts/check-env.js`) -- проверяет необходимые переменные
2. **Генерация OpenAPI** (`scripts/generate-openapi.ts`) -- генерирует документацию API
3. **Миграции базы данных** (`scripts/build-migrate.ts`) -- применяет ожидающие изменения схемы
4. **Сборка Next.js** (`next build`) -- компилирует приложение

### Шаг 2: Миграция Базы Данных При Сборке

Скрипт `scripts/build-migrate.ts` запускается автоматически во время сборки. Обрабатывает различные окружения:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Ключевые поведения:

- **Производственные сборки**: Ошибки миграции приводят к неудаче сборки (предотвращает сломанные развёртывания)
- **Предпросмотровые развёртывания**: Ошибки подключения допустимы (база данных может быть ещё не настроена)
- **CI сборки** (не-Vercel): Миграции полностью пропускаются

### Шаг 3: Инициализация Во Время Выполнения

При запуске приложения `instrumentation.ts` инициирует инициализацию базы данных:

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

Последовательность инициализации:

1. Запустить ожидающие миграции (Drizzle обрабатывает идемпотентность)
2. Проверить, была ли база данных засеяна
3. Если нет, получить advisory lock PostgreSQL и запустить скрипт засева
4. Освободить lock после засева

### Шаг 4: Развёртывание в Vercel

Для развёртываний Vercel подключите ваш репозиторий и настройте:

1. Установите **Framework Preset** на Next.js
2. Установите **Build Command** на `pnpm build`
3. Установите **Install Command** на `pnpm install`
4. Добавьте все необходимые переменные окружения в панели Vercel
5. Развертывайте

### Шаг 5: Проверка Развёртывания

После развёртывания проверьте:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Заголовки Безопасности

Шаблон автоматически настраивает заголовки безопасности в `next.config.ts`:

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

## Конфигурация Пула Соединений

Пул соединений с базой данных настраивается через переменную окружения `DB_POOL_SIZE`:

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

- **Производственное значение по умолчанию**: 20 соединений
- **Значение по умолчанию для разработки**: 10 соединений
- **Настраиваемый диапазон**: от 1 до 50 соединений
- **Таймаут простоя**: 20 секунд
- **Таймаут соединения**: 30 секунд

## Следующие Шаги

- [SSL и Пользовательские Домены](./ssl-domains.md) -- Настройте пользовательские домены и SSL сертификаты
- [Управление Базой Данных](./database-management.md) -- Операции с производственной базой данных
- [Резервное Копирование и Восстановление](./backup-recovery.md) -- Стратегии резервного копирования базы данных
- [Мониторинг](./monitoring.md) -- Настройка отслеживания ошибок и мониторинга производительности
