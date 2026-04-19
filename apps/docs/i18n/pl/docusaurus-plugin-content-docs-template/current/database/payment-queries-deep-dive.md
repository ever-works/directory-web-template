---
id: payment-queries-deep-dive
title: Zapytania dotyczące płatności i subskrypcji Głębokie nurkowanie
sidebar_label: Zapytania dotyczące płatności Głębokie nurkowanie
sidebar_position: 63
---

# Zapytania dotyczące płatności i subskrypcji Głębokie nurkowanie

Kompleksowe źródło informacji na temat wszystkich funkcji zarządzania dostawcami usług płatniczych, operacji na kontach płatniczych, cyklu życia subskrypcji, automatycznego odnawiania i zapytań o rozliczenia.

## Przegląd

Warstwa zapytań o płatności jest podzielona na dwa uzupełniające się moduły:

- **`payment.queries.ts`** — Dostawca płatności CRUD, zarządzanie kontem płatniczym i koordynacja konfiguracji konta
- **`subscription.queries.ts`** — Cykl życia subskrypcji (tworzenie, aktualizacja, anulowanie, wygaśnięcie), zarządzanie planami, śledzenie historii, automatyczne odnawianie i statystyki rozliczeniowe

## Pliki źródłowe

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

Pobiera dostawcę płatności według nazwy (np. `'stripe'`, `'lemonsqueezy'`).

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

Tworzy nowego dostawcę płatności.

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

Dezaktywuje dostawcę płatności, ustawiając `isActive` na `false`.

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

Pobiera konto płatnicze na podstawie zewnętrznego identyfikatora klienta od dostawcy usług płatniczych.

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

Aktualizuje znacznik czasu `lastUsed` na rachunku płatniczym.

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

### Orkiestracja konta płatniczego

#### `ensurePaymentAccount`

Zapewnia istnienie rachunku płatniczego dla użytkownika i dostawcy. Tworzy dostawcę i konto, jeśli nie istnieją, lub aktualizuje `lastUsed`, jeśli istnieją.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|Tak|Nazwa dostawcy (np. `'stripe'`)|
|`userId`|`string`|Tak|Identyfikator użytkownika|
|`customerId`|`string`|Tak|Identyfikator klienta u dostawcy|
|`accountId`|`string`|Nie|Identyfikator konta u dostawcy|

**Zachowanie:**
1. Sprawdza, czy dostawca istnieje; tworzy, jeśli nie
2. Sprawdza, czy istnieje konto płatnicze dla użytkownika+dostawcy; aktualizuje `lastUsed`, jeśli zostanie znaleziony
3. Tworzy nowe konto płatnicze, jeśli nie zostanie znalezione

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Ulepszona wersja `ensurePaymentAccount` z logiką aktualizacji identyfikatora klienta. Jeśli `customerId` uległ zmianie na istniejącym koncie, rekord zostanie zaktualizowany.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Dodatkowe zachowanie w porównaniu z `ensurePaymentAccount`:**
- Wykrywa zmieniony `customerId` i aktualizuje istniejący rekord
- Zapewnia szczegółowe rejestrowanie błędów ze śladami stosu

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Odniesienie do funkcji: subskrypcja.queries.ts

### Subskrypcja CRUD

#### `getUserActiveSubscription`

Pobiera aktywną subskrypcję dla użytkownika.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**Wzorzec SQL:**

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

Wyszukuje subskrypcję według identyfikatora subskrypcji dostawcy zewnętrznego.

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

Automatycznie ustawia `createdAt` i `updatedAt` na bieżący znacznik czasu.

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

Aktualizuje dopasowanie subskrypcji według pola `subscriptionId` dostawcy (nie wewnętrznego identyfikatora).

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

Anuluje subskrypcję natychmiast lub na koniec okresu.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Zachowanie:**
- Jeśli `cancelAtPeriodEnd` to `true`: zachowuje status `ACTIVE`, ale ustawia flagę `cancelAtPeriodEnd`
- Jeśli `cancelAtPeriodEnd` to `false`: natychmiast ustawia status na `CANCELLED`

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Zarządzanie planami

#### `getUserPlan`

Pobiera efektywny plan użytkownika, sprawdzając jego wygaśnięcie.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Zwraca:** Ciąg identyfikatora planu (domyślnie `PaymentPlan.FREE`, jeśli nie ma aktywnej subskrypcji lub wygasła)

Używa narzędzia `getEffectivePlan()` do obsługi logiki wygaśnięcia.

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

Wartość logiczna sprawdzająca istnienie aktywnej subskrypcji.

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

Pobiera subskrypcje, które przekroczyły `endDate`, ale nadal są oznaczone jako aktywne.

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

### Zapytania o automatyczne odnawianie

#### `getSubscriptionsDueForRenewalReminder`

Pobiera subskrypcje wymagające przypomnień o odnowieniu (aktywne, z włączonym automatycznym odnawianiem, wygasające w ciągu N dni, przypomnienie nie zostało jeszcze wysłane).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**Wzorzec SQL:**

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

Włącza automatyczne odnawianie. Ustawia również `cancelAtPeriodEnd` odwrotnie.

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

### Zarządzanie płatnościami nie powiodło się

#### `incrementFailedPaymentCount`

Atomowo zwiększa licznik nieudanych płatności.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**Wzorzec SQL:**

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

Pobiera subskrypcje przekraczające próg nieudanej płatności.

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

### Historia subskrypcji

#### `createSubscriptionHistory`

Tworzy wpis historii zmian subskrypcji.

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

Wygodna funkcja rejestrowania zmian stanu subskrypcji za pomocą danych strukturalnych.

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

## Uwagi dotyczące wydajności

1. **Weryfikacja INNER JOIN** -- `getPaymentAccountByUserId` wykorzystuje INNER JOIN do sprawdzania zarówno aktywności dostawcy, jak i istnienia użytkownika w jednym zapytaniu.

2. **Aktualizacje atomowe** -- `incrementFailedPaymentCount` używa `COALESCE` do przyrostu bezpiecznego zerowego. `resetRenewalStateAtomic` resetuje wiele pól w jednej AKTUALIZACJI.

3. **Konfiguracja konta idempotentnego** -- `ensurePaymentAccount` i `setupUserPaymentAccount` sprawnie radzą sobie z warunkami wyścigu, tworząc lub aktualizując w razie potrzeby.

4. **Sprawdzanie ważności** -- `getUserPlan` deleguje do narzędzia `getEffectivePlan()`, które obsługuje logikę wygasania uwzględniającą strefę czasową bez dodatkowych zapytań do bazy danych.

## Przykłady użycia

### Obsługa webhooka dla płatności Stripe

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

### Sprawdzanie planu użytkownika z wygaśnięciem

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
