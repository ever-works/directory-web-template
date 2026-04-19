---
id: payment-queries-deep-dive
title: Vragen over betalingen en abonnementen Deep Dive
sidebar_label: Betalingsvragen Deep Dive
sidebar_position: 63
---

# Vragen over betalingen en abonnementen Deep Dive

Uitgebreide referentie voor al het beheer van betalingsproviders, betaalrekeningbewerkingen, abonnementslevenscyclus, automatische verlenging en factureringsqueryfuncties.

## Overzicht

De betalingsquerylaag is georganiseerd in twee complementaire modules:

- **`payment.queries.ts`** -- Betalingsprovider CRUD, beheer van betaalrekeningen en orkestratie van accountinstellingen
- **`subscription.queries.ts`** -- Levenscyclus van abonnement (aanmaken, bijwerken, annuleren, verlopen), abonnementsbeheer, bijhouden van geschiedenis, automatische verlenging en factureringsstatistieken

## Bronbestanden

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

Haalt de naam van een betalingsprovider op (bijvoorbeeld `'stripe'`, `'lemonsqueezy'`).

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

Creëert een nieuwe betalingsprovider.

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

Deactiveert een betalingsprovider door `isActive` in te stellen op `false`.

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

Krijgt een betaalrekening met de externe klant-ID van de betalingsprovider.

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

Werkt de `lastUsed` tijdstempel op een betaalrekening bij.

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

### Betaalrekeningorkestratie

#### `ensurePaymentAccount`

Zorgt ervoor dat er een betaalrekening bestaat voor een gebruiker en aanbieder. Maakt de provider en het account aan als deze niet bestaan, of werkt `lastUsed` bij als deze wel bestaan.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|Ja|Naam van de provider (bijvoorbeeld `'stripe'`)|
|`userId`|`string`|Ja|Gebruikers-ID|
|`customerId`|`string`|Ja|Klant-ID bij de aanbieder|
|`accountId`|`string`|Nee|Account-ID bij de provider|

**Gedrag:**
1. Controleert of aanbieder bestaat; creëert als dat niet het geval is
2. Controleert of er een betaalrekening bestaat voor gebruiker+aanbieder; werkt `lastUsed` bij indien gevonden
3. Creëert een nieuwe betaalrekening indien niet gevonden

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Verbeterde versie van `ensurePaymentAccount` met logica voor het bijwerken van klant-ID's. Als `customerId` is gewijzigd voor een bestaand account, wordt de record bijgewerkt.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Aanvullend gedrag versus `ensurePaymentAccount`:**
- Detecteert gewijzigde `customerId` en werkt de bestaande record bij
- Biedt gedetailleerde foutregistratie met stacktraces

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Functiereferentie: abonnement.queries.ts

### Abonnement CRUD

#### `getUserActiveSubscription`

Haalt het actieve abonnement voor een gebruiker op.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**SQL-patroon:**

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

Zoekt een abonnement op aan de hand van de abonnements-ID van de externe provider.

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

Stelt `createdAt` en `updatedAt` automatisch in op de huidige tijdstempel.

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

Werkt het abonnement bij dat overeenkomt met het veld `subscriptionId` van de provider (niet de interne ID).

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

Annuleert een abonnement onmiddellijk of aan het einde van de periode.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Gedrag:**
- Als `cancelAtPeriodEnd` `true` is: behoudt de status als `ACTIVE` maar stelt de vlag `cancelAtPeriodEnd` in
- Als `cancelAtPeriodEnd` `false` is: stelt de status onmiddellijk in op `CANCELLED`

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Planbeheer

#### `getUserPlan`

Haalt het effectieve plan van de gebruiker op en controleert op vervaldatum.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Retourneert:** Plan-ID-tekenreeks (standaard ingesteld op `PaymentPlan.FREE` als er geen actief abonnement is of is verlopen)

Gebruikt het hulpprogramma `getEffectivePlan()` om vervallogica af te handelen.

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

Booleaanse controle op bestaan van actief abonnement.

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

Krijgt abonnementen waarvan de `endDate` is overschreden, maar die nog steeds als actief zijn gemarkeerd.

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

### Vragen over automatische verlenging

#### `getSubscriptionsDueForRenewalReminder`

Ontvangt abonnementen waarvoor verlengingsherinneringen nodig zijn (actief, automatische verlenging ingeschakeld, verloopt binnen N dagen, herinnering nog niet verzonden).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**SQL-patroon:**

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

Schakelt automatische verlenging in. Stelt `cancelAtPeriodEnd` ook omgekeerd in.

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

### Mislukt betalingsbeheer

#### `incrementFailedPaymentCount`

Verhoogt atomair de teller voor mislukte betalingen.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**SQL-patroon:**

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

Ontvangt abonnementen die een mislukte betalingsdrempel overschrijden.

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

### Abonnementsgeschiedenis

#### `createSubscriptionHistory`

Creëert een geschiedenisvermelding voor abonnementswijzigingen.

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

Gemaksfunctie voor het registreren van wijzigingen in de abonnementsstatus met gestructureerde gegevens.

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

## Prestatienotities

1. **INNER JOIN-validatie** -- `getPaymentAccountByUserId` gebruikt INNER JOIN's om zowel de activiteit van de provider als het bestaan van de gebruiker in één enkele zoekopdracht te valideren.

2. **Atomische updates** -- `incrementFailedPaymentCount` gebruikt `COALESCE` voor null-safe verhoging. `resetRenewalStateAtomic` reset meerdere velden in één enkele UPDATE.

3. **Idempotente accountconfiguratie** -- `ensurePaymentAccount` en `setupUserPaymentAccount` gaan netjes om met de raceomstandigheden en maken of updaten indien nodig.

4. **Verloopcontrole** -- `getUserPlan` delegeert aan het hulpprogramma `getEffectivePlan()` dat tijdzonebewuste vervallogica afhandelt zonder aanvullende DB-query's.

## Gebruiksvoorbeelden

### Webhook-handler voor Stripe-betaling

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

### Gebruikersabonnement met vervaldatum controleren

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
