---
id: payment-queries-deep-dive
title: Approfondimento delle query su pagamenti e abbonamenti
sidebar_label: Approfondimento delle domande sui pagamenti
sidebar_position: 63
---

# Approfondimento delle query su pagamenti e abbonamenti

Riferimento completo per tutta la gestione dei fornitori di servizi di pagamento, le operazioni dei conti di pagamento, il ciclo di vita degli abbonamenti, il rinnovo automatico e le funzioni di query sulla fatturazione.

## Panoramica

Il livello delle query di pagamento è organizzato in due moduli complementari:

- **`payment.queries.ts`** -- CRUD del fornitore di pagamenti, gestione dei conti di pagamento e orchestrazione della configurazione dei conti
- **`subscription.queries.ts`** -- Ciclo di vita dell'abbonamento (creazione, aggiornamento, annullamento, scadenza), gestione del piano, monitoraggio della cronologia, rinnovo automatico e statistiche di fatturazione

## File di origine

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

Ottiene un fornitore di servizi di pagamento per nome (ad esempio, `'stripe'`, `'lemonsqueezy'`).

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

Crea un nuovo fornitore di servizi di pagamento.

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

Disattiva un fornitore di servizi di pagamento impostando `isActive` su `false`.

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

Ottiene un conto di pagamento in base all'ID cliente esterno dal fornitore di servizi di pagamento.

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

Aggiorna il timestamp `lastUsed` su un conto di pagamento.

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

### Orchestrazione dei conti di pagamento

#### `ensurePaymentAccount`

Garantisce che esista un conto di pagamento per un utente e un fornitore. Crea il provider e l'account se non esistono o aggiorna `lastUsed` se esistono.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|Sì|Nome del fornitore (ad es. `'stripe'`)|
|`userId`|`string`|Sì|ID utente|
|`customerId`|`string`|Sì|ID cliente presso il fornitore|
|`accountId`|`string`|No|ID account presso il fornitore|

**Comportamento:**
1. Controlla se il fornitore esiste; crea altrimenti
2. Controlla se esiste un conto di pagamento per utente+fornitore; aggiorna `lastUsed` se trovato
3. Crea un nuovo conto di pagamento se non trovato

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Versione migliorata di `ensurePaymentAccount` con logica di aggiornamento dell'ID cliente. Se `customerId` è cambiato su un account esistente, aggiorna il record.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Comportamento aggiuntivo rispetto a `ensurePaymentAccount`:**
- Rileva modifiche `customerId` e aggiorna il record esistente
- Fornisce una registrazione dettagliata degli errori con analisi dello stack

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Riferimento funzione: membership.queries.ts

### Abbonamento CRUD

#### `getUserActiveSubscription`

Ottiene la sottoscrizione attiva per un utente.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**Modello SQL:**

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

Cerca un abbonamento in base all'ID di abbonamento del provider esterno.

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

Imposta automaticamente `createdAt` e `updatedAt` sul timestamp corrente.

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

Aggiorna la corrispondenza dell'abbonamento in base al campo `subscriptionId` del provider (non all'ID interno).

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

Annulla un abbonamento immediatamente o alla fine del periodo.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Comportamento:**
- Se `cancelAtPeriodEnd` è `true`: mantiene lo stato come `ACTIVE` ma imposta il flag `cancelAtPeriodEnd`
- Se `cancelAtPeriodEnd` è `false`: imposta immediatamente lo stato su `CANCELLED`

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Gestione del piano

#### `getUserPlan`

Ottiene il piano effettivo dell'utente, controllandone la scadenza.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Restituisce:** Stringa ID piano (predefinito su `PaymentPlan.FREE` se nessun abbonamento attivo o è scaduto)

Utilizza l'utilità `getEffectivePlan()` per gestire la logica di scadenza.

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

Controllo booleano per l'esistenza di un abbonamento attivo.

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

Ottiene gli abbonamenti che hanno superato `endDate` ma sono ancora contrassegnati come attivi.

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

### Query di rinnovo automatico

#### `getSubscriptionsDueForRenewalReminder`

Riceve gli abbonamenti che necessitano di promemoria di rinnovo (attivi, rinnovo automatico abilitato, in scadenza entro N giorni, promemoria non ancora inviato).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**Modello SQL:**

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

Attiva/disattiva il rinnovo automatico. Imposta anche `cancelAtPeriodEnd` inversamente.

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

### Gestione dei pagamenti non riuscita

#### `incrementFailedPaymentCount`

Incrementa atomicamente il contatore dei pagamenti falliti.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**Modello SQL:**

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

Ottiene abbonamenti che superano una soglia di pagamento non riuscita.

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

### Cronologia degli abbonamenti

#### `createSubscriptionHistory`

Crea una voce nella cronologia per le modifiche all'abbonamento.

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

Funzione comoda per registrare le modifiche allo stato dell'abbonamento con dati strutturati.

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

## Note sulle prestazioni

1. **Convalida INNER JOIN** -- `getPaymentAccountByUserId` utilizza INNER JOIN per convalidare sia l'attività del provider che l'esistenza dell'utente in un'unica query.

2. **Aggiornamenti atomici** -- `incrementFailedPaymentCount` utilizza `COALESCE` per l'incremento null-safe. `resetRenewalStateAtomic` reimposta più campi in un singolo AGGIORNAMENTO.

3. **Configurazione dell'account idempotente** -- `ensurePaymentAccount` e `setupUserPaymentAccount` gestiscono le condizioni di gara con garbo, creando o aggiornando secondo necessità.

4. **Controllo della scadenza** -- `getUserPlan` delega all'utilità `getEffectivePlan()` che gestisce la logica di scadenza in base al fuso orario senza query DB aggiuntive.

## Esempi di utilizzo

### Gestore webhook per il pagamento Stripe

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

### Controllo del piano utente con scadenza

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
