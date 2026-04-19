---
id: payment-queries-deep-dive
title: Zahlungs- und Abonnementanfragen im Detail
sidebar_label: Zahlungsabfragen im Detail
sidebar_position: 63
---

# Zahlungs- und Abonnementanfragen im Detail

Umfassende Referenz für die gesamte Zahlungsanbieterverwaltung, Zahlungskontovorgänge, Abonnementlebenszyklus, automatische Verlängerung und Abrechnungsabfragefunktionen.

## Übersicht

Die Zahlungsabfrageebene ist in zwei komplementäre Module unterteilt:

- **`payment.queries.ts`** – Zahlungsanbieter CRUD, Zahlungskontoverwaltung und Orchestrierung der Kontoeinrichtung
- **`subscription.queries.ts`** – Abonnementlebenszyklus (Erstellen, Aktualisieren, Kündigen, Ablaufen), Planverwaltung, Verlaufsverfolgung, automatische Verlängerung und Abrechnungsstatistiken

## Quelldateien

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

Ruft einen Zahlungsanbieter namentlich ab (z. B. `'stripe'`, `'lemonsqueezy'`).

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

Erstellt einen neuen Zahlungsanbieter.

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

Deaktiviert einen Zahlungsanbieter, indem `isActive` auf `false` gesetzt wird.

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

Ruft ein Zahlungskonto anhand der externen Kunden-ID vom Zahlungsanbieter ab.

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

Aktualisiert den Zeitstempel `lastUsed` auf einem Zahlungskonto.

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

### Orchestrierung von Zahlungskonten

#### `ensurePaymentAccount`

Stellt sicher, dass für einen Benutzer und Anbieter ein Zahlungskonto vorhanden ist. Erstellt den Anbieter und das Konto, falls diese nicht vorhanden sind, oder aktualisiert `lastUsed`, falls vorhanden.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|Ja|Anbietername (z. B. `'stripe'`)|
|`userId`|`string`|Ja|Benutzer-ID|
|`customerId`|`string`|Ja|Kundennummer beim Anbieter|
|`accountId`|`string`|Nein|Konto-ID beim Anbieter|

**Verhalten:**
1. Prüft, ob ein Anbieter existiert; erstellt, wenn nicht
2. Prüft, ob ein Zahlungskonto für Benutzer+Anbieter vorhanden ist; aktualisiert `lastUsed`, falls gefunden
3. Erstellt ein neues Zahlungskonto, wenn es nicht gefunden wird

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Erweiterte Version von `ensurePaymentAccount` mit Kunden-ID-Aktualisierungslogik. Wenn sich `customerId` bei einem vorhandenen Konto geändert hat, wird der Datensatz aktualisiert.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Zusätzliches Verhalten gegenüber `ensurePaymentAccount`:**
- Erkennt geänderte `customerId` und aktualisiert den vorhandenen Datensatz
- Bietet detaillierte Fehlerprotokollierung mit Stack-Traces

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Funktionsreferenz: subscription.queries.ts

### Abonnement CRUD

#### `getUserActiveSubscription`

Ruft das aktive Abonnement für einen Benutzer ab.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**SQL-Muster:**

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

Sucht ein Abonnement anhand der Abonnement-ID des externen Anbieters.

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

Setzt `createdAt` und `updatedAt` automatisch auf den aktuellen Zeitstempel.

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

Aktualisiert den Abonnementabgleich anhand des Feldes `subscriptionId` des Anbieters (nicht der internen ID).

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

Kündigt ein Abonnement entweder sofort oder zum Ende des Zeitraums.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Verhalten:**
- Wenn `cancelAtPeriodEnd` `true` ist: Behält den Status als `ACTIVE`, setzt aber das Flag `cancelAtPeriodEnd`
- Wenn `cancelAtPeriodEnd` `false` ist: Setzt den Status sofort auf `CANCELLED`

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Planverwaltung

#### `getUserPlan`

Ruft den effektiven Plan des Benutzers ab und prüft auf Ablauf.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Rückgabe:** Plan-ID-Zeichenfolge (standardmäßig `PaymentPlan.FREE`, wenn kein aktives Abonnement vorhanden oder abgelaufen ist)

Verwendet das Dienstprogramm `getEffectivePlan()` zur Handhabung der Ablauflogik.

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

Boolesche Prüfung auf das Vorhandensein eines aktiven Abonnements.

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

Ruft Abonnements ab, die ihre `endDate` überschritten haben, aber immer noch als aktiv markiert sind.

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

### Fragen zur automatischen Verlängerung

#### `getSubscriptionsDueForRenewalReminder`

Ruft Abonnements ab, die Verlängerungserinnerungen benötigen (aktiv, automatische Verlängerung aktiviert, läuft innerhalb von N Tagen ab, Erinnerung noch nicht gesendet).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**SQL-Muster:**

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

Schaltet die automatische Verlängerung um. Setzt `cancelAtPeriodEnd` auch umgekehrt.

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

### Fehler bei der Zahlungsverwaltung

#### `incrementFailedPaymentCount`

Erhöht den Zähler für fehlgeschlagene Zahlungen atomar.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**SQL-Muster:**

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

Ruft Abonnements ab, die einen Schwellenwert für fehlgeschlagene Zahlungen überschreiten.

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

### Abonnementverlauf

#### `createSubscriptionHistory`

Erstellt einen Verlaufseintrag für Abonnementänderungen.

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

Komfortfunktion zum Protokollieren von Abonnementstatusänderungen mit strukturierten Daten.

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

## Leistungshinweise

1. **INNER JOIN-Validierung** – `getPaymentAccountByUserId` verwendet INNER JOINs, um sowohl die Anbieteraktivität als auch die Benutzerexistenz in einer einzigen Abfrage zu validieren.

2. **Atomaktualisierungen** – `incrementFailedPaymentCount` verwendet `COALESCE` für nullsicheres Inkrement. `resetRenewalStateAtomic` setzt mehrere Felder in einem einzigen UPDATE zurück.

3. **Einrichten eines idempotenten Kontos** – `ensurePaymentAccount` und `setupUserPaymentAccount` handhaben Race-Bedingungen ordnungsgemäß und erstellen oder aktualisieren sie nach Bedarf.

4. **Ablaufprüfung** – `getUserPlan` delegiert an das Dienstprogramm `getEffectivePlan()`, das die zeitzonenbezogene Ablauflogik ohne zusätzliche DB-Abfragen verarbeitet.

## Anwendungsbeispiele

### Webhook-Handler für Stripe-Zahlungen

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

### Überprüfung des Benutzerplans mit Ablauf

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
