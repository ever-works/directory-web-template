---
id: notification-queries-deep-dive
title: Задълбочено потапяне в заявки за известия и активност
sidebar_label: Запитвания за известия Deep Dive
sidebar_position: 67
---

# Задълбочено потапяне в заявки за известия и активност

Изчерпателна справка за всички свързани с уведомяването функции за заявки към бази данни, включително управление на абонамент за бюлетин, регистриране на активност и потребителски предпочитания.

## Преглед

Слоят за заявка за уведомяване управлява комуникацията на потребителите и проследяването на активността:

- **`newsletter.queries.ts`** -- CRUD за абонамент за бюлетин, потоци за абониране/отписване и статистика
- **`activity.queries.ts`** -- Регистриране на активността за потребителски влизания и проследяване на последно влизане

## Изходни файлове

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

Извлича абонамент за бюлетин по имейл адрес.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-----------|----------|----------|------------------|
|`email`|`string`|да|Имейл на абоната|

**Връща:** Запис на абонамент или `null`, ако не бъде намерен

**SQL модел:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Забележка:** Имейлът се нормализира (с малки букви, изрязва се) преди търсене.

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

Прекратява абонамента за имейл от бюлетина, като задава `isActive` на `false` и записва клеймото за време на отписване.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**SQL модел:**

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

Получава статистически данни за абонамента за бюлетин.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Връща:**
- `totalActive` -- Брой текущи активни абонаменти
- `recentSubscriptions` -- Брой абонаменти през последните 30 дни

**SQL модел:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Обработка на грешки:** Връща `{ totalActive: 0, recentSubscriptions: 0 }` при грешка.

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

Получава най-новата активност при влизане за потребител или клиент.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Параметри:**

|Параметър|Тип|Задължително|По подразбиране|Описание|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|да| --         |Потребителско име или ИД на клиентски профил|
|`entityType`|`'user'` \|`'client'`|не|`'client'`|Тип обект за заявка|

**Връща:** `Promise<ActivityLog | null>` -- Последна активност при влизане или `null`, ако не са намерени влизания

**SQL модел:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Забележка:** По подразбиране `entityType` е `'client'` (не `'user'`) за обратна съвместимост.

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

## Бележки за ефективността

1. **Елегантно обработване на грешки** -- Всички функции за бюлетин обгръщат операциите в блокове try-catch и връщат стойности по подразбиране `null`/ вместо хвърляне. Това предотвратява грешките, свързани с бюлетина, да повлияят на главния поток на приложението.

2. **Нормализиране на имейли** -- Имейлите постоянно се изписват с малки букви и се изрязват преди съхранение и търсене, предотвратявайки дублиращи се абонаменти поради разлики в главните и главните букви.

3. **Базирани на интервали заявки** -- `getNewsletterStats` използва PostgreSQL `INTERVAL` синтаксис за базирано на време филтриране, което е ефективно при правилно индексиране на `subscribed_at`.

4. **Поддръжка на двоен обект** -- Регистрирането на активността поддържа както `user` (администратор), така и `client` (краен потребител) обекти с една таблица, използвайки нулеви колони за разграничаване на типовете обекти.

## Примери за използване

### Процес на абонамент за бюлетин

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

### Регистриране на потребителската активност

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Показва последно влизане на таблото за управление

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
