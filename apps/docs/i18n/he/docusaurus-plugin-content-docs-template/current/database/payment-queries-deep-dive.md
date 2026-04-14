---
id: payment-queries-deep-dive
title: שאילתות תשלום ומנוי Deep Dive
sidebar_label: שאילתות תשלום Deep Dive
sidebar_position: 63
---

# שאילתות תשלום ומנוי Deep Dive

התייחסות מקיפה לכל ניהול ספקי התשלומים, פעולות חשבונות תשלום, מחזור חיים של מנוי, חידוש אוטומטי ופונקציות שאילתת חיוב.

## סקירה כללית

שכבת שאילתת התשלום מאורגנת בשני מודולים משלימים:

- **`payment.queries.ts`** -- ספק התשלומים CRUD, ניהול חשבון תשלום ותזמור הגדרת חשבון
- **`subscription.queries.ts`** -- מחזור חיים של מנוי (יצירה, עדכון, ביטול, יפוג), ניהול תוכניות, מעקב אחר היסטוריה, חידוש אוטומטי וסטטיסטיקות חיוב

## קבצי מקור

```
lib/db/queries/payment.queries.ts
lib/db/queries/subscription.queries.ts
```

---

## Function Reference: payment.queries.ts

### Payment Provider Queries

#### `getPaymentProvider`

Gets a payment provider by ID.

```typescript
async function getPaymentProvider(id: string): Promise<OldPaymentProvider | null>
```

**SQL Pattern:**

```sql
SELECT * FROM payment_providers WHERE id = ? LIMIT 1;
```

---

#### `getPaymentProviderByName`

מקבל ספק תשלומים לפי שם (למשל, `'stripe'`, `'lemonsqueezy'`).

```typescript
async function getPaymentProviderByName(name: string): Promise<OldPaymentProvider | null>
```

---

#### `getActivePaymentProviders`

Gets all active payment providers ordered by name.

```typescript
async function getActivePaymentProviders(): Promise<OldPaymentProvider[]>
```

**SQL Pattern:**

```sql
SELECT * FROM payment_providers WHERE is_active = true ORDER BY name;
```

---

#### `createPaymentProvider`

יוצר ספק תשלומים חדש.

```typescript
async function createPaymentProvider(data: NewPaymentProvider): Promise<OldPaymentProvider>
```

---

#### `updatePaymentProvider`

Updates a payment provider's fields.

```typescript
async function updatePaymentProvider(
  id: string,
  data: Partial<NewPaymentProvider>
): Promise<OldPaymentProvider | null>
```

---

#### `deactivatePaymentProvider`

משבית ספק תשלומים על ידי הגדרת `isActive` ל-`false`.

```typescript
async function deactivatePaymentProvider(id: string): Promise<OldPaymentProvider | null>
```

---

### Payment Account Queries

#### `getPaymentAccountByUserId`

Gets a payment account by user ID and provider ID. Validates both the provider and user are active.

```typescript
async function getPaymentAccountByUserId(
  userId: string,
  providerId: string
): Promise<PaymentAccount | null>
```

**SQL Pattern:**

```sql
SELECT payment_accounts.* FROM payment_accounts
INNER JOIN payment_providers ON payment_accounts.provider_id = payment_providers.id
INNER JOIN users ON payment_accounts.user_id = users.id
WHERE payment_accounts.user_id = ?
  AND payment_accounts.provider_id = ?
  AND payment_providers.is_active = true
LIMIT 1;
```

**Performance Notes:** Uses `INNER JOIN` to ensure both the provider is active and the user exists.

---

#### `getPaymentAccountByCustomerId`

מקבל חשבון תשלום על ידי מזהה הלקוח החיצוני מספק התשלום.

```typescript
async function getPaymentAccountByCustomerId(
  customerId: string,
  providerId: string
): Promise<PaymentAccount | null>
```

---

#### `createPaymentAccount`

Creates a new payment account. Automatically sets `lastUsed` to current timestamp.

```typescript
async function createPaymentAccount(data: NewPaymentAccount): Promise<PaymentAccount>
```

---

#### `updatePaymentAccountLastUsed`

מעדכן את חותמת הזמן `lastUsed` בחשבון תשלום.

```typescript
async function updatePaymentAccountLastUsed(accountId: string): Promise<void>
```

---

#### `getUserPaymentAccountByProvider`

Gets a user's payment account by provider name (convenience function).

```typescript
async function getUserPaymentAccountByProvider(
  userId: string,
  providerName: string
): Promise<PaymentAccount | null>
```

Internally calls `getPaymentProviderByName` then `getPaymentAccountByUserId`.

---

### תזמור חשבון תשלום

#### `ensurePaymentAccount`

מוודא שקיים חשבון תשלום עבור משתמש וספק. יוצר את הספק והחשבון אם הם לא קיימים, או מעדכן `lastUsed` אם כן.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|כן|שם הספק (לדוגמה, `'stripe'`)|
|`userId`|`string`|כן|מזהה משתמש|
|`customerId`|`string`|כן|זיהוי לקוח אצל הספק|
|`accountId`|`string`|לא|מזהה חשבון אצל הספק|

**התנהגות:**
1. בודק אם ספק קיים; יוצר אם לא
2. בודק אם קיים חשבון תשלום עבור משתמש+ספק; מעדכן `lastUsed` אם נמצא
3. יוצר חשבון תשלום חדש אם לא נמצא

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

גרסה משופרת של `ensurePaymentAccount` עם לוגיקת עדכון מזהה לקוח. אם ה-`customerId` השתנה בחשבון קיים, הוא מעדכן את הרשומה.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**התנהגות נוספת לעומת `ensurePaymentAccount`:**
- מזהה שונה `customerId` ומעדכן את הרשומה הקיימת
- מספק רישום שגיאות מפורט עם עקבות מחסנית

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## הפניה לפונקציה: subscription.queries.ts

### מנוי CRUD

#### `getUserActiveSubscription`

מקבל את המנוי הפעיל עבור משתמש.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**דפוס SQL:**

```sql
SELECT * FROM subscriptions
WHERE user_id = ? AND status = 'active'
LIMIT 1;
```

---

#### `getUserSubscriptions`

Gets all subscriptions for a user, ordered by creation date descending.

```typescript
async function getUserSubscriptions(userId: string): Promise<Subscription[]>
```

---

#### `getSubscriptionByProviderSubscriptionId`

מחפש מנוי לפי מזהה המנוי של הספק החיצוני.

```typescript
async function getSubscriptionByProviderSubscriptionId(
  paymentProvider: string,
  subscriptionId: string
): Promise<Subscription | null>
```

---

#### `getSubscriptionByUserIdAndSubscriptionId`

```typescript
async function getSubscriptionByUserIdAndSubscriptionId(
  userId: string,
  subscriptionId: string
): Promise<Subscription | null>
```

---

#### `createSubscription`

```typescript
async function createSubscription(data: NewSubscription): Promise<Subscription>
```

מגדיר אוטומטית את `createdAt` ו-`updatedAt` לחותמת הזמן הנוכחית.

---

#### `updateSubscription`

```typescript
async function updateSubscription(
  subscriptionId: string,
  data: Partial<NewSubscription>
): Promise<Subscription | null>
```

---

#### `updateSubscriptionBySubscriptionId`

מעדכן את התאמת המנוי לפי השדה `subscriptionId` של הספק (לא המזהה הפנימי).

```typescript
async function updateSubscriptionBySubscriptionId(
  updateData: Partial<NewSubscription>
): Promise<Subscription | null>
```

---

#### `updateSubscriptionStatus`

Updates subscription status with automatic `cancelledAt` timestamp when status is `CANCELLED`.

```typescript
async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
  reason?: string
): Promise<Subscription | null>
```

---

#### `cancelSubscription`

מבטל מנוי באופן מיידי או בסיום התקופה.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**התנהגות:**
- אם `cancelAtPeriodEnd` הוא `true`: שומר על הסטטוס כ-`ACTIVE` אך מגדיר את הדגל `cancelAtPeriodEnd`
- אם `cancelAtPeriodEnd` הוא `false`: מגדיר את המצב ל-`CANCELLED` באופן מיידי

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### ניהול תוכנית

#### `getUserPlan`

מקבל את התוכנית היעילה של המשתמש, בודק תפוגה.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**החזרות:** מחרוזת מזהה תוכנית (ברירת המחדל היא `PaymentPlan.FREE` אם אין מנוי פעיל או שפג תוקפו)

משתמש בכלי השירות `getEffectivePlan()` כדי לטפל בהיגיון של תפוגה.

---

#### `getUserPlanWithExpiration`

Gets full plan details including expiration information.

```typescript
async function getUserPlanWithExpiration(userId: string): Promise<{
  planId: string;
  effectivePlan: string;
  isExpired: boolean;
  expiresAt: Date | null;
  status: string | null;
  subscriptionId: string | null;
}>
```

---

#### `hasActiveSubscription`

בדיקה בוליאנית לקיום מנוי פעיל.

```typescript
async function hasActiveSubscription(userId: string): Promise<boolean>
```

---

### Expiration Management

#### `getSubscriptionsExpiringSoon`

Gets active subscriptions expiring within N days.

```typescript
async function getSubscriptionsExpiringSoon(days: number = 7): Promise<Subscription[]>
```

**SQL Pattern:**

```sql
SELECT * FROM subscriptions
WHERE status = 'active' AND end_date <= ?
ORDER BY end_date ASC;
```

---

#### `getExpiredActiveSubscriptions`

מקבל מנויים שעברו את `endDate` שלהם אך עדיין מסומנים כפעילים.

```typescript
async function getExpiredActiveSubscriptions(): Promise<Subscription[]>
```

---

#### `updateExpiredSubscriptionsStatus`

Batch updates all expired-but-active subscriptions to `EXPIRED` status.

```typescript
async function updateExpiredSubscriptionsStatus(): Promise<Subscription[]>
```

---

### שאילתות חידוש אוטומטי

#### `getSubscriptionsDueForRenewalReminder`

מקבל מנויים הזקוקים לתזכורות חידוש (פעיל, חידוש אוטומטי מופעל, יפוג תוך N ימים, תזכורת עדיין לא נשלחה).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**דפוס SQL:**

```sql
SELECT * FROM subscriptions
WHERE status = 'active'
  AND auto_renewal = true
  AND renewal_reminder_sent = false
  AND end_date >= NOW()
  AND end_date <= ?
ORDER BY end_date ASC;
```

---

#### `getSubscriptionsToCancel`

Gets subscriptions with auto-renewal disabled whose period has ended.

```typescript
async function getSubscriptionsToCancel(): Promise<Subscription[]>
```

---

#### `setAutoRenewal`

מחליף חידוש אוטומטי. גם מגדיר `cancelAtPeriodEnd` הפוך.

```typescript
async function setAutoRenewal(
  subscriptionId: string,
  enabled: boolean
): Promise<Subscription | null>
```

---

#### `markRenewalReminderSent` / `resetRenewalReminderSent`

```typescript
async function markRenewalReminderSent(subscriptionId: string): Promise<Subscription | null>
async function resetRenewalReminderSent(subscriptionId: string): Promise<Subscription | null>
```

---

### ניהול תשלומים כושל

#### `incrementFailedPaymentCount`

מגדיל באופן אטומי את מונה התשלומים שנכשלו.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**דפוס SQL:**

```sql
UPDATE subscriptions
SET failed_payment_count = COALESCE(failed_payment_count, 0) + 1,
    last_renewal_attempt = NOW()
WHERE id = ?;
```

---

#### `resetFailedPaymentCount`

Resets counter after successful payment.

```typescript
async function resetFailedPaymentCount(subscriptionId: string): Promise<Subscription | null>
```

---

#### `getSubscriptionsWithFailedPayments`

מקבל מנויים החורגים מסף תשלום שנכשל.

```typescript
async function getSubscriptionsWithFailedPayments(
  threshold: number = 3
): Promise<Subscription[]>
```

---

#### `resetRenewalStateAtomic`

Atomically resets both `renewalReminderSent` and `failedPaymentCount` in a single UPDATE to ensure data consistency.

```typescript
async function resetRenewalStateAtomic(
  subscriptionId: string
): Promise<Subscription | null>
```

---

### היסטוריית מנויים

#### `createSubscriptionHistory`

יוצר ערך היסטוריה לשינויי מנוי.

```typescript
async function createSubscriptionHistory(
  data: NewSubscriptionHistory
): Promise<SubscriptionHistoryType>
```

---

#### `getSubscriptionHistory`

Gets history entries for a subscription, ordered by date descending.

```typescript
async function getSubscriptionHistory(
  subscriptionId: string
): Promise<SubscriptionHistoryType[]>
```

---

#### `logSubscriptionChange`

פונקציית נוחות לרישום שינויים במצב מנוי עם נתונים מובנים.

```typescript
async function logSubscriptionChange(
  subscriptionId: string,
  action: string,
  previousStatus?: string,
  newStatus?: string,
  previousPlan?: string,
  newPlan?: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<SubscriptionHistoryType>
```

---

### Statistics

#### `getSubscriptionStats`

Gets subscription statistics including totals and plan distribution.

```typescript
async function getSubscriptionStats(): Promise<{
  total: number;
  active: number;
  cancelled: number;
  planDistribution: Array<{ planId: string; count: number }>;
}>
```

---

## הערות ביצועים

1. **אימות INNER JOIN** -- `getPaymentAccountByUserId` משתמש ב-INNER JOIN כדי לאמת הן את פעילות הספק והן את קיום המשתמש בשאילתה אחת.

2. **עדכונים אטומיים** -- `incrementFailedPaymentCount` משתמש ב-`COALESCE` עבור תוספת בטוחה לאפס. `resetRenewalStateAtomic` מאפס שדות מרובים בעדכון יחיד.

3. **הגדרת חשבון Idempotent** -- `ensurePaymentAccount` ו-`setupUserPaymentAccount` מטפלים בתנאי מרוץ בחן, יוצרים או מעדכנים לפי הצורך.

4. **בדיקת תפוגה** -- `getUserPlan` מעביר לשירות `getEffectivePlan()` המטפל בהיגיון תפוגה מודע לאזור זמן ללא שאילתות DB נוספות.

## דוגמאות לשימוש

### Webhook מטפל לתשלום Stripe

```typescript
import {
  ensurePaymentAccount,
  createSubscription,
  logSubscriptionChange,
} from '@/lib/db/queries';

// Ensure payment account exists
const account = await ensurePaymentAccount(
  'stripe', userId, stripeCustomerId
);

// Create subscription
const sub = await createSubscription({
  userId,
  planId: 'premium',
  status: 'active',
  paymentProvider: 'stripe',
  subscriptionId: stripeSubId,
  startDate: new Date(),
  endDate: endDate,
});

// Log the change
await logSubscriptionChange(sub.id, 'created', null, 'active', null, 'premium');
```

### בודק תוכנית משתמש עם תפוגה

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
