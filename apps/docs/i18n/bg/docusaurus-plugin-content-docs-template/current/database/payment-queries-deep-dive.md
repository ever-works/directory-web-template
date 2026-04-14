---
id: payment-queries-deep-dive
title: Заявки за плащания и абонаменти. Задълбочено гмуркане
sidebar_label: Задълбочено потапяне в заявките за плащане
sidebar_position: 63
---

# Заявки за плащания и абонаменти. Задълбочено гмуркане

Изчерпателна справка за всички функции за управление на доставчици на плащания, операции по платежни сметки, жизнен цикъл на абонамент, автоматично подновяване и заявки за фактуриране.

## Преглед

Слоят на заявката за плащане е организиран в два допълващи се модула:

- **`payment.queries.ts`** -- Доставчик на плащания CRUD, управление на платежни акаунти и оркестрация за настройка на акаунти
- **`subscription.queries.ts`** -- Жизнен цикъл на абонамента (създаване, актуализиране, анулиране, изтичане), управление на плана, проследяване на историята, автоматично подновяване и статистика за таксуване

## Изходни файлове

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

Получава доставчик на плащане по име (напр. `'stripe'`, `'lemonsqueezy'`).

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

Създава нов доставчик на плащания.

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

Деактивира доставчик на плащания, като зададе `isActive` на `false`.

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

Получава сметка за плащане по външния клиентски идентификатор от доставчика на плащания.

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

Актуализира клеймото за време `lastUsed` на платежна сметка.

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

### Оркестрация на разплащателна сметка

#### `ensurePaymentAccount`

Гарантира наличието на платежна сметка за потребител и доставчик. Създава доставчика и акаунта, ако не съществуват, или актуализира `lastUsed`, ако съществуват.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|да|Име на доставчик (напр. `'stripe'`)|
|`userId`|`string`|да|Потребителско име|
|`customerId`|`string`|да|ID на клиента при доставчика|
|`accountId`|`string`|не|ID на акаунта при доставчика|

**Поведение:**
1. Проверява дали съществува доставчик; създава, ако не
2. Проверява дали съществува платежна сметка за потребител+доставчик; актуализира `lastUsed`, ако бъде намерен
3. Създава нова сметка за плащане, ако не бъде намерена

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Подобрена версия на `ensurePaymentAccount` с логика за актуализиране на идентификатора на клиента. Ако `customerId` се е променил в съществуващ акаунт, той актуализира записа.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Допълнително поведение срещу `ensurePaymentAccount`:**
- Открива променен `customerId` и актуализира съществуващия запис
- Предоставя подробно регистриране на грешки с проследяване на стека

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Справка за функция: subscription.queries.ts

### Абонамент CRUD

#### `getUserActiveSubscription`

Получава активния абонамент за потребител.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**SQL модел:**

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

Търси абонамент по ИД на абонамент на външния доставчик.

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

Автоматично настройва `createdAt` и `updatedAt` на текущото времево клеймо.

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

Актуализира абонамент, съответстващ на полето `subscriptionId` на доставчика (не вътрешния идентификатор).

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

Анулира абонамент веднага или в края на периода.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Поведение:**
- Ако `cancelAtPeriodEnd` е `true`: запазва състоянието като `ACTIVE`, но задава `cancelAtPeriodEnd` флаг
- Ако `cancelAtPeriodEnd` е `false`: незабавно задава статус на `CANCELLED`

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Управление на плана

#### `getUserPlan`

Получава ефективния план на потребителя, като проверява за изтичане.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Връща:** Низ с идентификатор на план (по подразбиране `PaymentPlan.FREE`, ако няма активен абонамент или е изтекъл)

Използва `getEffectivePlan()` помощна програма за обработка на логиката на изтичане.

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

Булева проверка за съществуване на активен абонамент.

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

Получава абонаменти, които са преминали `endDate`, но все още са маркирани като активни.

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

### Заявки за автоматично подновяване

#### `getSubscriptionsDueForRenewalReminder`

Получава абонаменти, които се нуждаят от напомняния за подновяване (активен, автоматично подновяване е активирано, изтича в рамките на N дни, напомнянето все още не е изпратено).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**SQL модел:**

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

Превключва автоматичното подновяване. Също така задава `cancelAtPeriodEnd` обратно.

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

### Неуспешно управление на плащанията

#### `incrementFailedPaymentCount`

Атомно увеличава брояча на неуспешните плащания.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**SQL модел:**

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

Получава абонаменти, надвишаващи прага за неуспешно плащане.

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

### История на абонаментите

#### `createSubscriptionHistory`

Създава запис в хронологията за промени в абонамента.

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

Удобна функция за регистриране на промени в състоянието на абонамента със структурирани данни.

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

## Бележки за ефективността

1. **INNER JOIN валидиране** -- `getPaymentAccountByUserId` използва INNER JOIN за валидиране както на дейността на доставчика, така и на съществуването на потребителя в една заявка.

2. **Атомни актуализации** -- `incrementFailedPaymentCount` използва `COALESCE` за нулево безопасно нарастване. `resetRenewalStateAtomic` нулира няколко полета в една АКТУАЛИЗАЦИЯ.

3. **Настройка на идемпотентен акаунт** -- `ensurePaymentAccount` и `setupUserPaymentAccount` се справят грациозно с условията на състезание, като създават или актуализират, ако е необходимо.

4. **Проверка на изтичане** -- `getUserPlan` делегира на `getEffectivePlan()` помощната програма, която обработва логиката на изтичане, съобразена с часовата зона, без допълнителни заявки в DB.

## Примери за използване

### Манипулатор на Webhook за Stripe плащане

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

### Проверява се потребителски план с изтичане

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
