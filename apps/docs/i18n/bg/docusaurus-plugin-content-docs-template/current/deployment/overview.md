---
id: overview
title: Преглед на Внедряването
sidebar_label: Преглед
sidebar_position: 1
---

# Преглед на Внедряването

Шаблонът Ever Works поддържа множество платформи за разпределение с поддръжка от първи клас за Vercel. Това ръководство обхваща конфигурацията на производствена среда, стратегиите за разпределение и добрите практики.

## Поддържани платформи

### Препоръчани

| Платформа | Описание | Най-добра за |
|-----------|---------|-------------|
| **Vercel** | Официална платформа Next.js | Най-простото разпределение, вградени edge functions |
| **Netlify** | Платформа Jamstack | Добри инструменти, лесен CI/CD |
| **Railway** | Прост PaaS | База данни + приложение на едно място |
| **Render** | Модерен PaaS | Добър баланс на функции и цена |

### Самостоятелен хостинг

| Платформа | Описание |
|-----------|---------|
| **Docker** | Базиран на контейнери, преносим |
| **VPS (Ubuntu/Debian)** | Пълен контрол, повече конфигурация |
| **AWS EC2 / ECS** | Мащабируем, екосистема AWS |
| **Google Cloud Run** | Serverless базиран на контейнери |

## Контролен списък преди внедряване

### Код и изграждане

- [ ] Всички тестове преминават: `pnpm lint && pnpm tsc --noEmit`
- [ ] Успешно изграждане: `pnpm build`
- [ ] Зачертани са променливите на средата
- [ ] Схемата на базата данни е актуализирана

### База данни

- [ ] `DATABASE_URL` сочи към производствената база данни
- [ ] Миграциите са тествани в staging среда
- [ ] Архивиране е направено преди разпределението
- [ ] Пулът от връзки е конфигуриран правилно

### Сигурност

- [ ] `AUTH_SECRET` е силен случаен низ (32+ символа)
- [ ] `COOKIE_SECRET` е силен случаен низ (32+ символа)
- [ ] `COOKIE_SECURE=true` в производствена среда
- [ ] Всички OAuth идентификационни данни са конфигурирани
- [ ] `CRON_SECRET` е зададен при използване на Vercel Crons

### Мониторинг

- [ ] Sentry DSN е конфигуриран (при използване на Sentry)
- [ ] PostHog ключ е конфигуриран (при използване на PostHog)
- [ ] Endpoint-ът за проверка на здравето е тестван

## Конфигурация на производствената среда

### Основни променливи на средата

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

### Сигурност на средата

- Никога не включвайте `.env` или `.env.local` в хранилището
- Използвайте променливи по среда (производствена vs. preview vs. разработка)
- Редовно ротирайте тайните
- Използвайте хранилището за тайни на платформата (Vercel Encrypted Env, AWS Secrets Manager)
- Прегледайте кои променливи започват с `NEXT_PUBLIC_` — те се излагат на клиента
- Редовно проверявайте достъпа до променливите на средата

## Конфигурация на изграждането

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

### Скриптове за изграждане

```json
{
  "scripts": {
    "build": "next build",
    "build:migrate": "tsx scripts/build-migrate.ts && next build",
    "postbuild": "next-sitemap"
  }
}
```

Използвайте `build:migrate`, ако искате да стартирате миграции на базата данни автоматично по време на изграждането.

## Внедряване на базата данни

### Стратегия за миграции

```bash
# Option 1: Run during build (automatic)
pnpm build:migrate

# Option 2: Run as release command
pnpm db:migrate

# Option 3: Run manually before deployment
cd apps/web && pnpm db:migrate
```

### Доставчици на бази данни

| Доставчик | Най-добър за | Бележки |
|----------|------------|--------|
| **Supabase** | Бърза разработка | Управляван PostgreSQL + Auth + Storage |
| **PlanetScale** | Глобален мащаб | Serverless PostgreSQL, разклоняване |
| **Neon** | Serverless | Serverless PostgreSQL, добър за Vercel |
| **Railway** | Прости проекти | Добър за малки/средни проекти |
| **AWS RDS** | Корпоративен | Пълен контрол, по-висока цена |

## CDN и статични ресурси

### Vercel (автоматично)

Vercel автоматично обслужва статичните ресурси чрез глобалната си CDN — не е необходима конфигурация.

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

Vercel и Netlify автоматично предоставят SSL сертификати чрез Let's Encrypt за персонализирани домейни.

За самостоятелен хостинг, използвайте **Nginx** с certbot:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Стратегии за внедряване

### Blue-Green внедряване

Използва се за актуализации без престой:

1. Запазете текущия производствен екземпляр (**blue**) работещ
2. Разпределете новата версия на идентичен екземпляр (**green**)
3. Изпълнете smoke тестове в green средата
4. Превключете трафика от blue към green чрез load balancer
5. Запазете blue активен за 30 мин. като резервен вариант
6. Прекратете blue екземпляра след потвърждение

### Rolling внедряване (По подразбиране в Vercel)

Vercel автоматично извършва rolling deployments — старите екземпляри обслужват трафика, докато новите не са готови.

## Отмяна

### Vercel

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard: Deployments → select old deployment → Promote to Production
```

### Отмяна, базирана на Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (careful with shared repos)
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## Сигурност в производствена среда

- Използвайте HTTPS на всички маршрути (Vercel: автоматично)
- Задайте заглавия за сигурност (CSP, HSTS, X-Frame-Options) в `next.config.ts`
- Активирайте rate limiting за API endpoints
- Санирайте всички потребителски входни данни преди записване
- Използвайте prepared statements (Drizzle прави това автоматично)
- Прегледайте правата за достъп до базата данни — потребителят на приложението трябва да има минималните необходими права
- Ротирайте тайните при всякакво подозрение за компрометиране
- Наблюдавайте логовете за удостоверяване за подозрителни входи
