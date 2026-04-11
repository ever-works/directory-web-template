---
id: admin-analytics
title: Административная аналитика
sidebar_label: Административная аналитика
sidebar_position: 32
---

# Административная аналитика

Система административной аналитики предоставляет статистику по всей платформе, показатели вовлеченности, отслеживание роста пользователей и фоновую обработку данных. Он сочетает в себе запросы к базе данных в реальном времени, кэшированные агрегаты и дополнительную интеграцию PostHog для комплексной аналитики.

## Обзор архитектуры

| Модуль | Путь | Цель |
|--------|------|---------|
| Хранилище административной статистики | `lib/repositories/admin-stats.repository.ts` | Основная статистика информационной панели |
| Запросы на панель мониторинга | `lib/db/queries/dashboard.queries.ts` | Запросы агрегирования вовлеченности |
| Вопросы по взаимодействию | `lib/db/queries/engagement.queries.ts` | Показатели по каждому элементу |
| Фоновый процессор аналитики | `lib/services/analytics-background-processor.ts` | Планировщик фоновых заданий |
| Аналитический клиент | `lib/analytics/index.ts` | Интеграция PostHog/Sentry на стороне клиента |
| Служба API PostHog | `lib/services/posthog-api.service.ts` | Серверные запросы PostHog |
| Экспорт аналитики | `lib/services/analytics-export.service.ts` | Функциональность экспорта данных |
| Запланированные отчеты | `lib/services/analytics-scheduled-reports.service.ts` | Автоматизированное создание отчетов |

## Статистика панели администратора `AdminStatsRepository` объединяет четыре категории статистики, используя `Promise.allSettled` для устойчивой загрузки данных:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### Статистика пользователей

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

В запросах используются границы дат, нормализованные по UTC, чтобы обеспечить согласованность результатов независимо от часового пояса сервера:

```ts
async getUserStats(): Promise<UserStats> {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStartUtc = new Date(todayUtc);
  // Monday-start week
  weekStartUtc.setUTCDate(
    todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7)
  );
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [total, today, week, month] = await Promise.all([
    db.select({ count: count() }).from(users)
      .where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc))),
    // ... week and month queries
  ]);
  // ...
}
```

### Статистика отправки

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Получается из метода `ItemRepository.getStats()` , поскольку элементы находятся в CMS на базе Git.

### Статистика активности

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

При настройке представления получаются из PostHog и возвращаются к нулю:

```ts
const [totalVotesResult, totalCommentsResult, totalViews] =
  await Promise.all([
    db.select({ count: count() }).from(votes),
    db.select({ count: count() }).from(comments)
      .where(isNull(comments.deletedAt)),
    postHogApiService.isConfigured()
      ? postHogApiService.getTotalPageViews()
      : Promise.resolve(0),
  ]);
```

### Статистика новостной рассылки

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Обработка фоновой аналитики `AnalyticsBackgroundProcessor` планирует шесть повторяющихся заданий:

```ts
const JOB_INTERVALS = {
  USER_GROWTH: 10 * 60 * 1000,      // 10 minutes
  ACTIVITY_TRENDS: 5 * 60 * 1000,    // 5 minutes
  TOP_ITEMS: 15 * 60 * 1000,        // 15 minutes
  RECENT_ACTIVITY: 2 * 60 * 1000,   // 2 minutes
  PERFORMANCE_METRICS: 30 * 1000,    // 30 seconds
  CACHE_CLEANUP: 60 * 60 * 1000,    // 1 hour
};
```

| Работа | Интервал | Цель |
|-----|----------|---------|
| Агрегация роста пользователей | 10 мин | Обновляет тенденции роста числа пользователей |
| Агрегация тенденций активности | 5 мин | Обновления временных рядов взаимодействия |
| Рейтинг лучших товаров | 15 мин | Пересчитывает рейтинг популярности предметов |
| Обновление недавней активности | 2 мин | Обновляет ленту последних действий |
| Обновление показателей производительности | 30 секунд | Обновляет данные о производительности в режиме реального времени |
| Очистка кэша | 1 час | Удаляет устаревшие кэшированные агрегаты |

Задания можно отключить, установив `DISABLE_AUTO_SYNC=true` .

Каждое задание отслеживает свой статус:

```ts
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

## Показатели вовлеченности

### Показатели по каждому элементу

Функция `getEngagementMetricsPerItem` извлекает все метрики параллельно:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Выполняются четыре параллельных запроса:

1. Количество просмотров начинается с `item_views` .
2. Чистая оценка голосов от `votes` (голос «за» = +1, голос «против» = -1)
3. Избранное засчитывается с `favorites` 4. Количество комментариев и средние оценки от `comments` (исключая обратимое удаление)

### Оценка популярности

Элементы оцениваются с использованием логарифмического алгоритма:

```ts
// Approximate max scores at 1M interactions:
// Featured: 10,000 points (base boost)
// Views: ~6,000 points (weight: 1000)
// Votes: ~7,200 points (weight: 1200)
// Rating: 0-2,500 points (linear, 500 per star)
// Favorites: ~6,600 points (weight: 1100)
// Comments: ~6,000 points (weight: 1000)
// Recency: 0-1,750 points (decay over 180 days)
```

## Аналитика на стороне клиента

Одноэлементный класс `Analytics` в `lib/analytics/index.ts` управляет отслеживанием на стороне клиента:

```ts
export class Analytics {
  init()                                    // Initialize PostHog
  identify(userId, properties?)             // Identify user
  track(eventName, properties?)             // Custom events
  trackPageView(url, properties?)           // Page views
  isFeatureEnabled(flagKey, defaultValue?)  // Feature flags
  captureException(error, context?)         // Error tracking
  setUserProperties(properties)             // User attributes
  setSuperProperties(properties)            // Global event properties
}
```

### Поставщики отслеживания исключений

Модуль аналитики поддерживает три конфигурации отслеживания исключений:

| Провайдер | Описание |
|----------|-------------|
| `posthog` | Ошибки отправляются только в PostHog |
| `sentry` | Ошибки отправляются только в Sentry |
| `both` | Ошибки отправляются как в PostHog, так и в Sentry |

Провайдер определяется из `EXCEPTION_TRACKING_PROVIDER` с автоматическим возвратом, если настроенный провайдер недоступен.

### Конфигурация PostHog

```ts
const config = {
  api_host: POSTHOG_HOST,
  debug: POSTHOG_DEBUG,
  capture_pageview: POSTHOG_AUTO_CAPTURE,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-mask]",
    sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  },
};
```

Частота выборки контролирует процент отслеживаемых сеансов и настраивается с помощью переменных среды.

## Запросы данных панели мониторинга

### Еженедельные тенденции вовлеченности

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Использует PostgreSQL `to_char(date, 'IYYY-IW')` для группировки недель по ISO.

### Распределение ежедневной активности

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string;
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

### Самые эффективные товары

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Товары ранжируются по общему участию (голоса плюс комментарии).

## Устойчивая загрузка данных

Метод `getAllStats` использует `Promise.allSettled` , чтобы гарантировать, что частичные сбои не повредят панель мониторинга:

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);

  // Each section falls back to zero values on rejection
  const users =
    u.status === 'fulfilled'
      ? u.value
      : {
          totalUsers: 0,
          registeredUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
        };
  // ... similar for submissions, activity, newsletter
}
```

## Требования к разрешениям

Функции аналитики ограничены системой разрешений:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Доступ к функциям на основе плана:

| Особенность | Бесплатно | Стандарт | Премиум |
|---------|------|----------|---------|
| Посмотреть статистику | Нет | Да | Да |
| Расширенная аналитика | Нет | Нет | Да |

## Сопутствующая документация

- [Фон аналитики](/docs/template/services/analytics-background) – сведения о фоновой обработке.
- [PostHog Service](/docs/template/services/posthog-service) -- Серверный API PostHog
- [Служба экспорта](/docs/template/services/export-service) -- Экспорт данных
- [Служба активности](/docs/template/services/activity-service) – отслеживание активности пользователей.
– [Услуга взаимодействия](/docs/template/services/engagement-services) – оценка популярности
