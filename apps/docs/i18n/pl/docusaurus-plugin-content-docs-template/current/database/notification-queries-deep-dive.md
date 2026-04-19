---
id: notification-queries-deep-dive
title: Powiadomienia i zapytania dotyczące aktywności Głębokie nurkowanie
sidebar_label: Powiadomienia pytają o głębokie nurkowanie
sidebar_position: 67
---

# Powiadomienia i zapytania dotyczące aktywności Głębokie nurkowanie

Kompleksowe informacje na temat wszystkich funkcji zapytań do baz danych związanych z powiadomieniami, w tym zarządzania subskrypcją biuletynu, rejestrowania aktywności i preferencji użytkownika.

## Przegląd

Warstwa zapytań powiadomień zarządza komunikacją użytkowników i śledzeniem aktywności:

- **`newsletter.queries.ts`** — Subskrypcja biuletynu CRUD, przepływy subskrypcji/rezygnacji z subskrypcji oraz statystyki
- **`activity.queries.ts`** — Rejestrowanie aktywności w zakresie logowań użytkowników i śledzenie ostatniego logowania

## Pliki źródłowe

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

Pobiera subskrypcję biuletynu według adresu e-mail.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-----------|----------|----------|------------------|
|`email`|`string`|Tak|E-mail subskrybenta|

**Zwroty:** Zapis subskrypcji lub `null`, jeśli nie został znaleziony

**Wzorzec SQL:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Uwaga:** Przed wyszukaniem wiadomości e-mail są normalizowane (pisane małymi literami i przycinane).

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

Anuluje subskrypcję wiadomości e-mail z newslettera, ustawiając `isActive` na `false` i zapisując znacznik czasu rezygnacji.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**Wzorzec SQL:**

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

Pobiera statystyki subskrypcji biuletynu.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Zwroty:**
- `totalActive` — Liczba aktualnie aktywnych subskrypcji
- `recentSubscriptions` — Liczba subskrypcji w ciągu ostatnich 30 dni

**Wzorzec SQL:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Obsługa błędów:** Zwraca `{ totalActive: 0, recentSubscriptions: 0 }` w przypadku błędu.

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

Pobiera najnowsze działanie związane z logowaniem dla użytkownika lub klienta.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Domyślne|Opis|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|Tak| --         |Identyfikator użytkownika lub identyfikator profilu klienta|
|`entityType`|`'user'` \|`'client'`|Nie|`'client'`|Typ jednostki do zapytania|

**Zwroty:** `Promise<ActivityLog | null>` -- Ostatnia aktywność logowania lub `null`, jeśli nie znaleziono żadnych logowań

**Wzorzec SQL:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Uwaga:** Domyślny `entityType` to `'client'` (a nie `'user'`) ze względu na kompatybilność wsteczną.

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

## Uwagi dotyczące wydajności

1. **Ładna obsługa błędów** -- Wszystkie funkcje biuletynu zawijają operacje w bloki try-catch i zwracają wartości `null`/default zamiast rzucać. Zapobiega to wpływowi błędów związanych z biuletynem na główny przepływ aplikacji.

2. **Normalizacja poczty e-mail** – W wiadomościach e-mail stale są pisane małymi literami i przycinane przed przechowywaniem i przeglądaniem, co zapobiega duplikowaniu subskrypcji ze względu na różnice w wielkości liter.

3. **Zapytania oparte na interwałach** -- `getNewsletterStats` używa składni PostgreSQL `INTERVAL` do filtrowania opartego na czasie, co jest efektywne przy właściwym indeksowaniu na `subscribed_at`.

4. **Obsługa dwóch jednostek** -- Rejestrowanie aktywności obsługuje zarówno encje `user` (administrator), jak i `client` (użytkownik końcowy) w jednej tabeli, przy użyciu kolumn zerowych w celu rozróżnienia typów encji.

## Przykłady użycia

### Przepływ subskrypcji biuletynu

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

### Rejestrowanie aktywności użytkownika

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Wyświetlanie ostatniego logowania na pulpicie nawigacyjnym

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
