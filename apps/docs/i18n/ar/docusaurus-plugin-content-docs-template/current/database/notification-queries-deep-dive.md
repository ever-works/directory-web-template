---
id: notification-queries-deep-dive
title: الإخطارات واستعلامات النشاط الغوص العميق
sidebar_label: استعلامات الإخطار، الغوص العميق
sidebar_position: 67
---

# الإخطارات واستعلامات النشاط الغوص العميق

مرجع شامل لجميع وظائف استعلام قاعدة البيانات المتعلقة بالإشعارات، بما في ذلك إدارة الاشتراك في الرسائل الإخبارية وتسجيل الأنشطة وتفضيلات المستخدم.

## نظرة عامة

تدير طبقة استعلام الإشعارات اتصالات المستخدم وتتبع النشاط:

- **`newsletter.queries.ts`** - الاشتراك في النشرة الإخبارية CRUD، وتدفقات الاشتراك/إلغاء الاشتراك، والإحصائيات
- **`activity.queries.ts`** - تسجيل النشاط لتسجيلات دخول المستخدم وتتبع تسجيل الدخول الأخير

## ملفات المصدر

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

استرداد الاشتراك في النشرة الإخبارية عن طريق عنوان البريد الإلكتروني.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-----------|----------|----------|------------------|
|`email`|`string`|نعم|البريد الإلكتروني للمشترك|

**المرتجعات:** سجل الاشتراك أو `null` إذا لم يتم العثور عليه

** نمط SQL: **

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**ملاحظة:** تتم تسوية البريد الإلكتروني (بأحرف صغيرة ومقتطعة) قبل البحث.

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

إلغاء الاشتراك في رسالة بريد إلكتروني من النشرة الإخبارية عن طريق ضبط `isActive` على `false` وتسجيل الطابع الزمني لإلغاء الاشتراك.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

** نمط SQL: **

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

يحصل على إحصائيات الاشتراك في النشرة الإخبارية.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**المرتجعات:**
- `totalActive` - عدد الاشتراكات النشطة حاليًا
- `recentSubscriptions` -- عدد الاشتراكات في آخر 30 يومًا

** نمط SQL: **

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**معالجة الأخطاء:** إرجاع `{ totalActive: 0, recentSubscriptions: 0 }` عند حدوث خطأ.

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

يحصل على أحدث نشاط تسجيل دخول لمستخدم أو عميل.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الافتراضي|الوصف|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|نعم| --         |معرف المستخدم أو معرف ملف تعريف العميل|
|`entityType`|`'user'` \|`'client'`|لا|`'client'`|نوع الكيان المطلوب الاستعلام عنه|

**المرتجعات:** `Promise<ActivityLog | null>` -- آخر نشاط لتسجيل الدخول أو `null` إذا لم يتم العثور على تسجيلات دخول

** نمط SQL: **

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**ملاحظة:** الافتراضي `entityType` هو `'client'` (وليس `'user'`) للتوافق مع الإصدارات السابقة.

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

## ملاحظات الأداء

1. ** معالجة أنيقة للأخطاء ** - تقوم جميع وظائف الرسائل الإخبارية بتغليف العمليات في كتل محاولة الالتقاط وإرجاع `null`/ القيم الافتراضية بدلاً من الرمي. وهذا يمنع الأخطاء المتعلقة بالرسائل الإخبارية من التأثير على تدفق التطبيق الرئيسي.

2. **تسوية البريد الإلكتروني** - يتم دائمًا كتابة رسائل البريد الإلكتروني بأحرف صغيرة وتشذيبها قبل التخزين والبحث، مما يمنع الاشتراكات المكررة بسبب اختلافات الحالة.

3. **الاستعلامات المستندة إلى الفواصل الزمنية** - يستخدم `getNewsletterStats` بناء جملة PostgreSQL `INTERVAL` للتصفية المستندة إلى الوقت، وهو فعال مع الفهرسة المناسبة على `subscribed_at`.

4. **دعم الكيان المزدوج** - يدعم تسجيل النشاط كلاً من الكيانات `user` (المسؤول) و`client` (المستخدم النهائي) مع جدول واحد، باستخدام أعمدة فارغة للتمييز بين أنواع الكيانات.

## أمثلة الاستخدام

### تدفق الاشتراك في النشرة الإخبارية

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

### تسجيل نشاط المستخدم

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### إظهار آخر تسجيل دخول على لوحة التحكم

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
