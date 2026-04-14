---
id: notification-queries-deep-dive
title: Подробное описание уведомлений и запросов активности
sidebar_label: Подробное описание запросов уведомлений
sidebar_position: 67
---

# Подробное описание уведомлений и запросов активности

Комплексный справочник по всем функциям запросов к базе данных, связанным с уведомлениями, включая управление подпиской на рассылку новостей, ведение журнала активности и настройки пользователя.

## Обзор

Уровень запроса уведомлений управляет общением пользователей и отслеживанием активности:

- **`newsletter.queries.ts`** — CRUD подписки на рассылку, потоки подписки/отписки и статистика.
- **`activity.queries.ts`** – ведение журнала действий для входа пользователей и отслеживание последнего входа в систему.

## Исходные файлы

```
lib/db/queries/newsletter.queries.ts
lib/db/queries/activity.queries.ts
```

---

## Function Reference: newsletter.queries.ts

### `createNewsletterSubscription`

Creates a new newsletter subscription. Normalizes the email to lowercase before storage.

```typescript
async function createNewsletterSubscription(
  email: string,
  source: string = 'footer'
): Promise<NewsletterSubscription | null>
```

**Parameters:**

| Parameter | Type     | Required | Default    | Description                        |
|-----------|----------|----------|------------|------------------------------------|
| `email`   | `string` | Yes      | --         | Subscriber email                   |
| `source`  | `string` | No       | `'footer'` | Source of subscription (e.g., `'footer'`, `'popup'`, `'api'`) |

**Returns:** `Promise<NewsletterSubscription | null>` -- Created subscription or `null` on error

**SQL Pattern:**

```sql
INSERT INTO newsletter_subscriptions (email, source)
VALUES (?, ?) RETURNING *;
```

**Error Handling:** Catches and logs all errors, returning `null` instead of throwing. This prevents newsletter signup failures from crashing the page.

---

### `getNewsletterSubscriptionByEmail`

Получает подписку на информационный бюллетень по адресу электронной почты.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-----------|----------|----------|------------------|
|`email`|`string`|Да|Электронная почта подписчика|

**Возврат:** запись о подписке или `null`, если не найдена.

**Шаблон SQL:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Примечание.** Перед поиском электронная почта нормализуется (в нижнем регистре, обрезается).

---

### `updateNewsletterSubscription`

Updates specific fields on a newsletter subscription.

```typescript
async function updateNewsletterSubscription(
  email: string,
  updates: Partial<Pick<NewsletterSubscription, 'isActive' | 'unsubscribedAt'>>
): Promise<NewsletterSubscription | null>
```

**Parameters:**

| Parameter | Type     | Required | Description                               |
|-----------|----------|----------|-------------------------------------------|
| `email`   | `string` | Yes      | Subscriber email                          |
| `updates` | `object` | Yes      | Fields to update (`isActive`, `unsubscribedAt`) |

**Returns:** Updated subscription or `null` on error

---

### `unsubscribeFromNewsletter`

Отменяет подписку на электронную рассылку новостей, устанавливая для `isActive` значение `false` и записывая временную метку отказа от подписки.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**Шаблон SQL:**

```sql
UPDATE newsletter_subscriptions
SET is_active = false, unsubscribed_at = NOW()
WHERE email = ?
RETURNING *;
```

---

### `resubscribeToNewsletter`

Resubscribes an email by setting `isActive` to `true` and clearing the `unsubscribedAt` timestamp.

```typescript
async function resubscribeToNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**SQL Pattern:**

```sql
UPDATE newsletter_subscriptions
SET is_active = true, unsubscribed_at = NULL
WHERE email = ?
RETURNING *;
```

---

### `getNewsletterStats`

Получает статистику подписки на рассылку новостей.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Возвраты:**
- `totalActive` -- Количество активных на данный момент подписок.
- `recentSubscriptions` -- Количество подписок за последние 30 дней.

**Шаблон SQL:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Обработка ошибок:** Возвращает `{ totalActive: 0, recentSubscriptions: 0 }` в случае ошибки.

---

## Function Reference: activity.queries.ts

### `logActivity`

Logs an activity event to the activity logs table.

```typescript
async function logActivity(
  type: ActivityType,
  id?: string,
  entityType: 'user' | 'client' = 'user',
  ipAddress?: string
): Promise<void>
```

**Parameters:**

| Parameter    | Type                     | Required | Default  | Description                           |
|--------------|--------------------------|----------|----------|---------------------------------------|
| `type`       | `ActivityType`           | Yes      | --       | Activity type enum value              |
| `id`         | `string`                 | No       | --       | User ID or Client Profile ID          |
| `entityType` | `'user'` \| `'client'`   | No       | `'user'` | Whether this is a user or client activity |
| `ipAddress`  | `string`                 | No       | --       | IP address of the request             |

**Behavior:**
- If `entityType` is `'user'`: sets `userId` field, `clientId` is `null`
- If `entityType` is `'client'`: sets `clientId` field, `userId` is `null`
- IP address defaults to empty string if not provided

**SQL Pattern:**

```sql
INSERT INTO activity_logs (user_id, client_id, action, ip_address)
VALUES (?, ?, ?, ?);
```

---

### `getLastLoginActivity`

Получает самые последние действия по входу в систему для пользователя или клиента.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Параметры:**

|Параметр|Тип|Требуется|По умолчанию|Описание|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|Да| --         |Идентификатор пользователя или идентификатор профиля клиента|
|`entityType`|`'user'` \|`'client'`|Нет|`'client'`|Тип объекта для запроса|

**Возвраты:** `Promise<ActivityLog | null>` – последняя активность входа в систему или `null`, если вход не выполнен.

**Шаблон SQL:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Примечание:** `entityType` по умолчанию — `'client'` (не `'user'`) для обратной совместимости.

---

## Internal Helpers

### `normalizeEmail` (newsletter.queries.ts)

Private helper that normalizes email addresses for consistent lookups.

```typescript
function normalizeEmail(email: string): string
// Returns: email.toLowerCase().trim()
```

All newsletter functions normalize emails before database operations.

---

## Примечания по производительности

1. **Удобная обработка ошибок** – все функции информационного бюллетеня заключают операции в блоки try-catch и возвращают значения `null`/default вместо выдачи. Это предотвращает влияние ошибок, связанных с информационными бюллетенями, на основной поток приложения.

2. **Нормализация электронной почты**. Электронные письма последовательно преобразуются в нижний регистр и обрезаются перед сохранением и поиском, что предотвращает дублирование подписок из-за различий в регистре.

3. **Интервальные запросы** – `getNewsletterStats` использует синтаксис PostgreSQL `INTERVAL` для фильтрации по времени, которая эффективна при правильной индексации на `subscribed_at`.

4. **Поддержка двух сущностей**. Ведение журнала активности поддерживает как сущности `user` (администратор), так и `client` (конечный пользователь) с одной таблицей, используя пустые столбцы для различения типов сущностей.

## Примеры использования

### Порядок подписки на рассылку новостей

```typescript
import {
  getNewsletterSubscriptionByEmail,
  createNewsletterSubscription,
  resubscribeToNewsletter,
} from '@/lib/db/queries';

const email = 'user@example.com';
const existing = await getNewsletterSubscriptionByEmail(email);

if (!existing) {
  // New subscriber
  await createNewsletterSubscription(email, 'footer');
} else if (!existing.isActive) {
  // Previously unsubscribed, resubscribe
  await resubscribeToNewsletter(email);
} else {
  // Already subscribed
  console.log('Already subscribed');
}
```

### Логирование активности пользователей

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Отображение последнего входа в систему на панели управления

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
