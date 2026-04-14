---
id: notification-queries-deep-dive
title: הודעות ושאילתות פעילות Deep Dive
sidebar_label: שאילתות הודעות Deep Dive
sidebar_position: 67
---

# הודעות ושאילתות פעילות Deep Dive

התייחסות מקיפה לכל פונקציות שאילתות מסד הנתונים הקשורות להתראות, כולל ניהול מנוי לניוזלטר, רישום פעילויות והעדפות משתמש.

## סקירה כללית

שכבת שאילתת ההודעות מנהלת תקשורת משתמשים ומעקב אחר פעילות:

- **`newsletter.queries.ts`** -- הרשמה לניוזלטר CRUD, זרימות הרשמה/ביטול רישום וסטטיסטיקות
- **`activity.queries.ts`** -- רישום פעילות לכניסות משתמשים ומעקב אחר הכניסה האחרונה

## קבצי מקור

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

מאחזר מנוי לניוזלטר באמצעות כתובת דואר אלקטרוני.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-----------|----------|----------|------------------|
|`email`|`string`|כן|אימייל של מנוי|

**החזרות:** רשומת מנוי או `null` אם לא נמצא

**דפוס SQL:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**הערה:** הדוא"ל מנורמל (באותיות קטנות, גזוז) לפני חיפוש.

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

מבטל את הרישום של דוא"ל מהניוזלטר על ידי הגדרת `isActive` ל-`false` והקלטת חותמת הזמן לביטול הרישום.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**דפוס SQL:**

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

מקבל סטטיסטיקות מנוי לניוזלטר.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**מחזירה:**
- `totalActive` -- ספירת המינויים הפעילים כעת
- `recentSubscriptions` -- ספירת המנויים ב-30 הימים האחרונים

**דפוס SQL:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**טיפול בשגיאות:** מחזירה `{ totalActive: 0, recentSubscriptions: 0 }` בשגיאה.

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

מקבל את פעילות הכניסה העדכנית ביותר עבור משתמש או לקוח.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|ברירת מחדל|תיאור|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|כן| --         |מזהה משתמש או מזהה פרופיל לקוח|
|`entityType`|`'user'` \|`'client'`|לא|`'client'`|סוג ישות לשאילתה|

**החזרות:** `Promise<ActivityLog | null>` -- פעילות התחברות אחרונה או `null` אם לא נמצאו כניסות

**דפוס SQL:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**הערה:** ברירת המחדל של `entityType` היא `'client'` (לא `'user'`) לצורך תאימות לאחור.

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

## הערות ביצועים

1. **טיפול בשגיאות חינני** -- כל פונקציות הניוזלטר עוטפות את הפעולות בבלוקים של try-catch ומחזירות `null`/ערכי ברירת מחדל במקום זריקה. זה מונע משגיאות הקשורות לניוזלטר להשפיע על זרימת האפליקציה הראשית.

2. **נורמליזציה של דוא"ל** -- הודעות דוא"ל נמוכות בעקביות באותיות קטנות וקוצצות לפני אחסון וחיפוש, ומונעות מינויים כפולים עקב הבדלי רישיות.

3. **שאילתות מבוססות מרווחים** -- `getNewsletterStats` משתמש בתחביר PostgreSQL `INTERVAL` עבור סינון מבוסס-זמן, שהוא יעיל עם אינדקס נכון ב-`subscribed_at`.

4. **תמיכה בישויות כפולות** -- רישום פעילות תומך הן בישויות `user` (אדמין) והן ב-@@TOK001@@@ (משתמש קצה) עם טבלה אחת, תוך שימוש בעמודות null כדי להבחין בין סוגי ישויות.

## דוגמאות לשימוש

### זרימת מנוי לניוזלטר

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

### רישום פעילות המשתמש

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### מציג את הכניסה האחרונה בלוח המחוונים

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
