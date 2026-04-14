---
id: payment-queries-deep-dive
title: استعلامات الدفع والاشتراك الغوص العميق
sidebar_label: استعلامات الدفع الغوص العميق
sidebar_position: 63
---

# استعلامات الدفع والاشتراك الغوص العميق

مرجع شامل لجميع وظائف إدارة مزود الدفع وعمليات حساب الدفع ودورة حياة الاشتراك والتجديد التلقائي والاستعلام عن الفواتير.

## نظرة عامة

يتم تنظيم طبقة استعلام الدفع في وحدتين متكاملتين:

- **`payment.queries.ts`** - مزود الدفع CRUD وإدارة حساب الدفع وتنسيق إعداد الحساب
- **`subscription.queries.ts`** - دورة حياة الاشتراك (إنشاء، تحديث، إلغاء، انتهاء الصلاحية)، إدارة الخطة، تتبع السجل، التجديد التلقائي، وإحصائيات الفوترة

## ملفات المصدر

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

الحصول على مزود الدفع بالاسم (على سبيل المثال، `'stripe'`، `'lemonsqueezy'`).

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

إنشاء مزود دفع جديد.

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

يقوم بإلغاء تنشيط مزود الدفع عن طريق تعيين `isActive` على `false`.

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

الحصول على حساب دفع بواسطة معرف العميل الخارجي من مزود الدفع.

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

يقوم بتحديث الطابع الزمني `lastUsed` على حساب الدفع.

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

### تنسيق حساب الدفع

#### `ensurePaymentAccount`

يضمن وجود حساب دفع للمستخدم والمزود. يقوم بإنشاء الموفر والحساب في حالة عدم وجودهما، أو تحديث `lastUsed` في حالة وجودهما.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|نعم|اسم الموفر (على سبيل المثال، `'stripe'`)|
|`userId`|`string`|نعم|معرف المستخدم|
|`customerId`|`string`|نعم|معرف العميل لدى المزود|
|`accountId`|`string`|لا|معرف الحساب لدى المزود|

**السلوك:**
1. التحقق من وجود المزود؛ يخلق إذا لم يكن كذلك
2. التحقق من وجود حساب الدفع للمستخدم + المزود؛ التحديثات `lastUsed` إذا وجدت
3. إنشاء حساب دفع جديد إذا لم يتم العثور عليه

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

نسخة محسنة من `ensurePaymentAccount` مع منطق تحديث معرف العميل. إذا تم تغيير `customerId` في حساب موجود، فإنه يقوم بتحديث السجل.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

** سلوك إضافي مقابل `ensurePaymentAccount`:**
- يكتشف التغيير `customerId` ويقوم بتحديث السجل الموجود
- يوفر تسجيلًا تفصيليًا للأخطاء مع تتبعات المكدس

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## مرجع الوظيفة:اشتراك.queries.ts

### الاشتراك الخام

#### `getUserActiveSubscription`

يحصل على الاشتراك النشط للمستخدم.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

** نمط SQL: **

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

يبحث عن الاشتراك من خلال معرف اشتراك الموفر الخارجي.

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

يقوم تلقائيًا بتعيين `createdAt` و`updatedAt` على الطابع الزمني الحالي.

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

تحديثات مطابقة الاشتراك بواسطة حقل `subscriptionId` الخاص بالموفر (وليس المعرف الداخلي).

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

يلغي الاشتراك إما على الفور أو في نهاية الفترة.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**السلوك:**
- إذا كان `cancelAtPeriodEnd` هو `true`: يحتفظ بالحالة كـ `ACTIVE` ولكنه يقوم بتعيين علامة `cancelAtPeriodEnd`
- إذا كان `cancelAtPeriodEnd` هو `false`: قم بتعيين الحالة على `CANCELLED` على الفور

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### إدارة الخطة

#### `getUserPlan`

يحصل على الخطة الفعالة للمستخدم، والتحقق من انتهاء الصلاحية.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**المرتجعات:** سلسلة معرف الخطة (الإعداد الافتراضي هو `PaymentPlan.FREE` إذا لم يكن هناك اشتراك نشط أو انتهت صلاحيته)

يستخدم `getEffectivePlan()` الأداة المساعدة للتعامل مع منطق انتهاء الصلاحية.

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

التحقق المنطقي من وجود الاشتراك النشط.

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

الحصول على الاشتراكات التي اجتازت `endDate` ولكن لا تزال تحمل علامة نشطة.

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

### استعلامات التجديد التلقائي

#### `getSubscriptionsDueForRenewalReminder`

يحصل على الاشتراكات التي تحتاج إلى تذكيرات للتجديد (نشطة، مع تمكين التجديد التلقائي، وتنتهي خلال N من الأيام، ولم يتم إرسال التذكير بعد).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

** نمط SQL: **

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

تبديل التجديد التلقائي. يضبط أيضًا `cancelAtPeriodEnd` بشكل عكسي.

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

### فشل إدارة الدفع

#### `incrementFailedPaymentCount`

يقوم تلقائيًا بزيادة عداد الدفع الفاشل.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

** نمط SQL: **

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

الحصول على اشتراكات تتجاوز حد الدفع الفاشل.

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

### تاريخ الاشتراك

#### `createSubscriptionHistory`

يقوم بإنشاء إدخال محفوظات لتغييرات الاشتراك.

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

وظيفة ملائمة لتسجيل تغييرات حالة الاشتراك باستخدام البيانات المنظمة.

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

## ملاحظات الأداء

1. ** التحقق من صحة INNER JOIN ** - يستخدم `getPaymentAccountByUserId` INNER JOINs للتحقق من صحة نشاط الموفر ووجود المستخدم في استعلام واحد.

2. **التحديثات الذرية** - يستخدم `incrementFailedPaymentCount` `COALESCE` لزيادة خالية من الأخطاء. `resetRenewalStateAtomic` يقوم بإعادة تعيين حقول متعددة في تحديث واحد.

3. **إعداد حساب Idempotent** - يتعامل `ensurePaymentAccount` و`setupUserPaymentAccount` مع ظروف السباق بأمان، ويقومان بالإنشاء أو التحديث حسب الحاجة.

4. ** التحقق من انتهاء الصلاحية ** - `getUserPlan` يفوض إلى `getEffectivePlan()` الأداة المساعدة التي تتعامل مع منطق انتهاء الصلاحية المدرك للمنطقة الزمنية دون استعلامات قاعدة بيانات إضافية.

## أمثلة الاستخدام

### معالج Webhook للدفع الشريطي

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

### التحقق من خطة المستخدم مع انتهاء الصلاحية

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
