---
id: overview
title: Обзор Развертывания
sidebar_label: Обзор
sidebar_position: 1
---

# Обзор Развертывания

Шаблон Ever Works поддерживает несколько платформ развертывания с первоклассной поддержкой Vercel. Это руководство охватывает настройку production-среды, стратегии развертывания и лучшие практики.

## Поддерживаемые платформы

### Рекомендуемые

| Платформа | Описание | Лучше всего для |
|-----------|---------|----------------|
| **Vercel** | Официальная платформа Next.js | Простейший деплой, встроенные edge functions |
| **Netlify** | Платформа Jamstack | Хороший инструментарий, удобный CI/CD |
| **Railway** | Простой PaaS | База данных + приложение в одном месте |
| **Render** | Современный PaaS | Хороший баланс функций и стоимости |

### Самостоятельный хостинг

| Платформа | Описание |
|-----------|---------|
| **Docker** | На основе контейнеров, портативный |
| **VPS (Ubuntu/Debian)** | Полный контроль, больше настроек |
| **AWS EC2 / ECS** | Масштабируемый, экосистема AWS |
| **Google Cloud Run** | Контейнерный serverless |

## Контрольный список перед развертыванием

### Код и сборка

- [ ] Все тесты проходят: `pnpm lint && pnpm tsc --noEmit`
- [ ] Сборка успешна: `pnpm build`
- [ ] Переменные окружения проверены
- [ ] Схема базы данных обновлена

### База данных

- [ ] `DATABASE_URL` указывает на production-базу данных
- [ ] Миграции протестированы в staging-среде
- [ ] Резервная копия сделана перед деплоем
- [ ] Пул подключений настроен корректно

### Безопасность

- [ ] `AUTH_SECRET` — надёжная случайная строка (32+ символов)
- [ ] `COOKIE_SECRET` — надёжная случайная строка (32+ символов)
- [ ] `COOKIE_SECURE=true` в production
- [ ] Все учётные данные OAuth настроены
- [ ] `CRON_SECRET` задан при использовании Vercel Crons

### Мониторинг

- [ ] Sentry DSN настроен (при использовании Sentry)
- [ ] Ключ PostHog настроен (при использовании PostHog)
- [ ] Эндпоинт проверки работоспособности протестирован

## Конфигурация production-среды

### Основные переменные окружения

```bash
# ===== REQUIRED =====
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com

# Auth secrets (generate with: openssl rand -base64 32)
AUTH_SECRET=your-auth-secret-here
COOKIE_SECRET=your-cookie-secret-here
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_POOL_SIZE=20

# ===== RECOMMENDED =====

# OAuth (at least one)
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Exception tracking
EXCEPTION_PROVIDER=posthog  # or sentry, both, none
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Cron jobs (required for Vercel Crons)
CRON_SECRET=your-cron-secret-here

# ===== OPTIONAL =====

# Content repo
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Storage
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

### Безопасность среды

- Никогда не коммитить `.env` или `.env.local` в репозиторий
- Использовать переменные по средам (production vs. preview vs. development)
- Регулярно ротировать секреты
- Использовать хранилище секретов платформы (Vercel Encrypted Env, AWS Secrets Manager)
- Проверять, какие переменные начинаются с `NEXT_PUBLIC_` — они доступны на клиенте
- Регулярно проводить аудит доступа к переменным окружения

## Конфигурация сборки

### next.config.js

```typescript
// next.config.ts
const nextConfig = {
  output: 'standalone',  // for Docker deployments
  experimental: {
    instrumentationHook: true,  // for auto db initialization
  },
};
```

### Скрипты сборки

```json
{
  "scripts": {
    "build": "next build",
    "build:migrate": "tsx scripts/build-migrate.ts && next build",
    "postbuild": "next-sitemap"
  }
}
```

Используйте `build:migrate`, если нужно автоматически запускать миграции базы данных во время сборки (полезно для платформ, не поддерживающих отдельные команды релиза).

## Развертывание базы данных

### Стратегия миграций

```bash
# Option 1: Run during build (automatic)
pnpm build:migrate

# Option 2: Run as release command
pnpm db:migrate

# Option 3: Run manually before deployment
cd apps/web && pnpm db:migrate
```

### Провайдеры баз данных

| Провайдер | Лучше всего для | Примечания |
|----------|----------------|-----------|
| **Supabase** | Быстрая разработка | Управляемый PostgreSQL + Auth + Storage |
| **PlanetScale** | Глобальный масштаб | Serverless PostgreSQL, branching |
| **Neon** | Serverless | Serverless PostgreSQL, хорош для Vercel |
| **Railway** | Простые проекты | Хорош для малых/средних проектов |
| **AWS RDS** | Корпоративный | Полный контроль, более высокая стоимость |

### Стратегия резервного копирования

Настроить автоматическое ежедневное резервное копирование у провайдера базы данных. Перед крупными деплоями:

```bash
# Backup manual via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Or via provider CLI
supabase db dump -f backup.sql
```

## CDN и статические ресурсы

### Vercel (автоматически)

Vercel автоматически раздаёт статические ресурсы через глобальную CDN — настройка не требуется.

### Cloudflare

```javascript
// next.config.ts additions for Cloudflare
assetPrefix: process.env.CDN_URL,
```

### Amazon CloudFront

```javascript
// next.config.ts additions for CloudFront
assetPrefix: `https://${process.env.CLOUDFRONT_DISTRIBUTION}.cloudfront.net`,
```

## SSL/TLS

Vercel и Netlify автоматически выпускают SSL-сертификаты через Let's Encrypt для пользовательских доменов.

Для самостоятельного хостинга использовать **Nginx** с certbot:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Мониторинг production

```bash
# Essential monitoring variables
EXCEPTION_PROVIDER=posthog  # or sentry
NEXT_PUBLIC_POSTHOG_KEY=phc_...
SENTRY_DSN=https://...@sentry.io/...

# Log level
LOG_LEVEL=info  # debug | info | warn | error
```

## Стратегии развертывания

### Blue-Green развертывание

Используется для обновлений без простоев:

1. Сохранить текущий production-экземпляр (**blue**) работающим
2. Развернуть новую версию на идентичном экземпляре (**green**)
3. Запустить smoke tests в green-среде
4. Переключить трафик с blue на green через load balancer
5. Держать blue активным 30 мин. в качестве fallback
6. Завершить blue-экземпляр после подтверждения

### Rolling развертывание (по умолчанию в Vercel)

Vercel автоматически выполняет rolling deployments — старые экземпляры обслуживают трафик, пока новые не будут готовы.

### Canary развертывание

```bash
# Example using Vercel
vercel --prod --target production  # 100% traffic

# Or split traffic (requires Enterprise/Pro)
# Route 10% to new version first
```

## Откат

### Vercel

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard: Deployments → select old deployment → Promote to Production
```

### Откат на основе Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (careful with shared repos)
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## Безопасность production

- Использовать HTTPS на всех маршрутах (Vercel: автоматически)
- Задать заголовки безопасности (CSP, HSTS, X-Frame-Options) в `next.config.ts`
- Включить rate limiting для API-эндпоинтов
- Санировать все входные данные пользователей перед сохранением
- Использовать prepared statements (Drizzle делает это автоматически)
- Проверить права доступа к базе данных — пользователь приложения должен иметь минимально необходимые права
- Ротировать секреты при любом подозрении на компрометацию
- Отслеживать логи аутентификации на предмет подозрительных входов
