---
id: payment-queries-deep-dive
title: Подробное описание вопросов оплаты и подписки
sidebar_label: Подробное описание платежных запросов
sidebar_position: 63
---

# Подробное описание вопросов оплаты и подписки

Комплексное руководство по управлению всеми поставщиками платежных услуг, операциям с платежными счетами, жизненному циклу подписки, автоматическому продлению и функциям запросов на выставление счетов.

## Обзор

Уровень платежных запросов организован в два взаимодополняющих модуля:

- **`payment.queries.ts`** — CRUD поставщика платежных услуг, управление платежными счетами и оркестровка настройки учетных записей.
- **`subscription.queries.ts`** — жизненный цикл подписки (создание, обновление, отмена, срок действия), управление планом, отслеживание истории, автоматическое продление и статистика выставления счетов.

## Исходные файлы

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

Получает поставщика платежей по имени (например, `'stripe'`, `'lemonsqueezy'`).

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

Создает нового поставщика платежей.

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

Деактивирует поставщика платежей, устанавливая для `isActive` значение `false`.

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

Получает платежный счет по внешнему идентификатору клиента от поставщика платежей.

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

Обновляет временную метку `lastUsed` на платежном счете.

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

### Оркестрация платежного счета

#### `ensurePaymentAccount`

Гарантирует существование платежного счета для пользователя и поставщика. Создает поставщика и учетную запись, если они не существуют, или обновляет `lastUsed`, если они существуют.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|Да|Имя поставщика (например, `'stripe'`)|
|`userId`|`string`|Да|Идентификатор пользователя|
|`customerId`|`string`|Да|Идентификатор клиента у провайдера|
|`accountId`|`string`|Нет|Идентификатор аккаунта у провайдера|

**Поведение:**
1. Проверяет, существует ли провайдер; создает, если нет
2. Проверяет, существует ли платежный счет для пользователя+провайдера; обновляет `lastUsed`, если найдено
3. Создает новый платежный счет, если не найден.

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Расширенная версия `ensurePaymentAccount` с логикой обновления идентификатора клиента. Если `customerId` изменился в существующей учетной записи, запись обновляется.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Дополнительное поведение по сравнению с `ensurePaymentAccount`:**
- Обнаруживает изменение `customerId` и обновляет существующую запись.
- Обеспечивает подробную регистрацию ошибок с трассировкой стека.

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Ссылка на функцию: subscribe.queries.ts

### Подписка CRUD

#### `getUserActiveSubscription`

Получает активную подписку для пользователя.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**Шаблон SQL:**

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

Ищет подписку по идентификатору подписки внешнего поставщика.

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

Автоматически устанавливает `createdAt` и `updatedAt` на текущую временную метку.

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

Соответствие подписки обновлений по полю `subscriptionId` провайдера (а не по внутреннему идентификатору).

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

Отменяет подписку немедленно или в конце периода.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Поведение:**
- Если `cancelAtPeriodEnd` равен `true`: сохраняет статус `ACTIVE`, но устанавливает флаг `cancelAtPeriodEnd`
- Если `cancelAtPeriodEnd` равен `false`: немедленно устанавливает статус `CANCELLED`.

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Планирование управления

#### `getUserPlan`

Получает действующий план пользователя, проверяя срок его действия.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Возвраты:** Строка идентификатора плана (по умолчанию — `PaymentPlan.FREE`, если нет активной подписки или срок ее действия истек).

Использует утилиту `getEffectivePlan()` для обработки логики истечения срока действия.

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

Логическая проверка наличия активной подписки.

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

Получает подписки, которые прошли `endDate`, но все еще отмечены как активные.

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

### Запросы на автоматическое продление

#### `getSubscriptionsDueForRenewalReminder`

Получает подписки, для которых необходимы напоминания о продлении (активные, с включенным автоматическим продлением, срок действия которых истекает в течение N дней, напоминание еще не отправлено).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**Шаблон SQL:**

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

Включает автоматическое продление. Также устанавливается обратное значение `cancelAtPeriodEnd`.

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

### Неудачное управление платежами

#### `incrementFailedPaymentCount`

Атомарно увеличивает счетчик неудачных платежей.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**Шаблон SQL:**

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

Получает подписки, превышающие порог неудачного платежа.

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

### История подписки

#### `createSubscriptionHistory`

Создает запись истории для изменений подписки.

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

Удобная функция для регистрации изменений состояния подписки со структурированными данными.

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

## Примечания по производительности

1. **Проверка INNER JOIN** – `getPaymentAccountByUserId` использует INNER JOIN для проверки как активности поставщика, так и существования пользователя в одном запросе.

2. **Атомарные обновления** – `incrementFailedPaymentCount` использует `COALESCE` для нулевого безопасного приращения. `resetRenewalStateAtomic` сбрасывает несколько полей за одно ОБНОВЛЕНИЕ.

3. **Настройка идемпотентной учетной записи** — `ensurePaymentAccount` и `setupUserPaymentAccount` корректно обрабатывают условия гонки, создавая или обновляя по мере необходимости.

4. **Проверка срока действия** — `getUserPlan` делегирует утилиту `getEffectivePlan()`, которая обрабатывает логику истечения срока действия с учетом часового пояса без дополнительных запросов к базе данных.

## Примеры использования

### Обработчик вебхука для оплаты Stripe

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

### Проверка пользовательского плана с истечением срока действия

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
