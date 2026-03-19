---
id: notification-queries-deep-dive
title: Notification & Activity Queries Deep Dive
sidebar_label: Notification Queries Deep Dive
sidebar_position: 67
---

# Notification & Activity Queries Deep Dive

Comprehensive reference for all notification-related database query functions, including newsletter subscription management, activity logging, and user preferences.

## Overview

The notification query layer manages user communication and activity tracking:

- **`newsletter.queries.ts`** -- Newsletter subscription CRUD, subscribe/unsubscribe flows, and statistics
- **`activity.queries.ts`** -- Activity logging for user sign-ins and last-login tracking

## Source Files

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

Retrieves a newsletter subscription by email address.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Parameters:**

| Parameter | Type     | Required | Description      |
|-----------|----------|----------|------------------|
| `email`   | `string` | Yes      | Subscriber email |

**Returns:** Subscription record or `null` if not found

**SQL Pattern:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Note:** Email is normalized (lowercased, trimmed) before lookup.

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

Unsubscribes an email from the newsletter by setting `isActive` to `false` and recording the unsubscribe timestamp.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**SQL Pattern:**

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

Gets newsletter subscription statistics.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Returns:**
- `totalActive` -- Count of currently active subscriptions
- `recentSubscriptions` -- Count of subscriptions in the last 30 days

**SQL Pattern:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Error Handling:** Returns `{ totalActive: 0, recentSubscriptions: 0 }` on error.

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

Gets the most recent sign-in activity for a user or client.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Parameters:**

| Parameter    | Type                     | Required | Default    | Description                  |
|--------------|--------------------------|----------|------------|------------------------------|
| `id`         | `string`                 | Yes      | --         | User ID or Client Profile ID |
| `entityType` | `'user'` \| `'client'`   | No       | `'client'` | Entity type to query         |

**Returns:** `Promise<ActivityLog | null>` -- Last login activity or `null` if no sign-ins found

**SQL Pattern:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Note:** Default `entityType` is `'client'` (not `'user'`) for backward compatibility.

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

## Performance Notes

1. **Graceful error handling** -- All newsletter functions wrap operations in try-catch blocks and return `null`/default values instead of throwing. This prevents newsletter-related errors from impacting the main application flow.

2. **Email normalization** -- Emails are consistently lowercased and trimmed before storage and lookup, preventing duplicate subscriptions due to case differences.

3. **Interval-based queries** -- `getNewsletterStats` uses PostgreSQL `INTERVAL` syntax for time-based filtering, which is efficient with proper indexing on `subscribed_at`.

4. **Dual entity support** -- Activity logging supports both `user` (admin) and `client` (end user) entities with a single table, using null columns to distinguish between entity types.

## Usage Examples

### Newsletter subscription flow

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

### Logging user activity

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Showing last login on dashboard

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
