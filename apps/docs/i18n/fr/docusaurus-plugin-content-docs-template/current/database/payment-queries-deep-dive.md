---
id: payment-queries-deep-dive
title: Requêtes de paiement et d'abonnement approfondies
sidebar_label: Requêtes de paiement approfondies
sidebar_position: 63
---

# Requêtes de paiement et d'abonnement approfondies

Référence complète pour toutes les fonctions de gestion des fournisseurs de paiement, d'opérations de compte de paiement, de cycle de vie des abonnements, de renouvellement automatique et de requête de facturation.

## Aperçu

La couche de requêtes de paiement est organisée en deux modules complémentaires :

- **`payment.queries.ts`** -- CRUD du fournisseur de paiement, gestion des comptes de paiement et orchestration de la configuration des comptes
- **`subscription.queries.ts`** -- Cycle de vie de l'abonnement (création, mise à jour, annulation, expiration), gestion du forfait, suivi de l'historique, renouvellement automatique et statistiques de facturation

## Fichiers sources

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

Obtient un fournisseur de paiement par son nom (par exemple, `'stripe'`, `'lemonsqueezy'`).

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

Crée un nouveau fournisseur de paiement.

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

Désactive un fournisseur de paiement en définissant `isActive` sur `false`.

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

Obtient un compte de paiement par l'ID client externe du fournisseur de paiement.

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

Met à jour l’horodatage `lastUsed` sur un compte de paiement.

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

### Orchestration des comptes de paiement

#### `ensurePaymentAccount`

Garantit qu’un compte de paiement existe pour un utilisateur et un fournisseur. Crée le fournisseur et le compte s'ils n'existent pas, ou met à jour `lastUsed` s'ils existent.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|Oui|Nom du fournisseur (par exemple, `'stripe'`)|
|`userId`|`string`|Oui|Identifiant utilisateur|
|`customerId`|`string`|Oui|Numéro client chez le fournisseur|
|`accountId`|`string`|Non|ID de compte chez le fournisseur|

**Comportement :**
1. Vérifie si le fournisseur existe ; crée sinon
2. Vérifie si un compte de paiement existe pour l'utilisateur + le fournisseur ; met à jour `lastUsed` si trouvé
3. Crée un nouveau compte de paiement s'il n'est pas trouvé

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Version améliorée de `ensurePaymentAccount` avec logique de mise à jour de l'ID client. Si le `customerId` a changé sur un compte existant, il met à jour l'enregistrement.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Comportement supplémentaire par rapport à `ensurePaymentAccount` :**
- Détecte les modifications `customerId` et met à jour l'enregistrement existant
- Fournit une journalisation détaillée des erreurs avec des traces de pile

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Référence de la fonction : souscription.queries.ts

### Abonnement CRUD

#### `getUserActiveSubscription`

Obtient l'abonnement actif pour un utilisateur.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**Modèle SQL :**

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

Recherche un abonnement à l'aide de l'ID d'abonnement du fournisseur externe.

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

Définit automatiquement `createdAt` et `updatedAt` sur l'horodatage actuel.

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

Met à jour l’abonnement correspondant au champ `subscriptionId` du fournisseur (et non à l’ID interne).

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

Annule un abonnement immédiatement ou à la fin de la période.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Comportement :**
- Si `cancelAtPeriodEnd` est `true` : conserve le statut `ACTIVE` mais définit l'indicateur `cancelAtPeriodEnd`
- Si `cancelAtPeriodEnd` est `false` : définit immédiatement le statut sur `CANCELLED`

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Gestion des régimes

#### `getUserPlan`

Obtient le plan effectif de l’utilisateur, en vérifiant son expiration.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Renvoi :** Chaîne d'identification du forfait (par défaut `PaymentPlan.FREE` si aucun abonnement actif ou expiré)

Utilise l'utilitaire `getEffectivePlan()` pour gérer la logique d'expiration.

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

Vérification booléenne de l’existence d’un abonnement actif.

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

Obtient les abonnements qui ont dépassé leur `endDate` mais qui sont toujours marqués comme actifs.

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

### Requêtes de renouvellement automatique

#### `getSubscriptionsDueForRenewalReminder`

Obtient les abonnements qui nécessitent des rappels de renouvellement (actifs, renouvellement automatique activé, expirant dans N jours, rappel pas encore envoyé).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**Modèle SQL :**

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

Active le renouvellement automatique. Définit également `cancelAtPeriodEnd` de manière inverse.

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

### Gestion des paiements échoués

#### `incrementFailedPaymentCount`

Incrémente atomiquement le compteur de paiement échoué.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**Modèle SQL :**

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

Obtient les abonnements dépassant un seuil de paiement échoué.

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

### Historique des abonnements

#### `createSubscriptionHistory`

Crée une entrée d'historique pour les modifications d'abonnement.

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

Fonction pratique pour enregistrer les changements d’état d’abonnement avec des données structurées.

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

## Notes de performances

1. **Validation INNER JOIN** -- `getPaymentAccountByUserId` utilise INNER JOIN pour valider à la fois l'activité du fournisseur et l'existence de l'utilisateur dans une seule requête.

2. **Mises à jour atomiques** -- `incrementFailedPaymentCount` utilise `COALESCE` pour un incrément nul. `resetRenewalStateAtomic` réinitialise plusieurs champs en une seule MISE À JOUR.

3. **Configuration de compte idempotente** -- `ensurePaymentAccount` et `setupUserPaymentAccount` gèrent les conditions de concurrence avec élégance, en créant ou en mettant à jour selon les besoins.

4. **Vérification de l'expiration** -- `getUserPlan` délègue à l'utilitaire `getEffectivePlan()` qui gère la logique d'expiration tenant compte du fuseau horaire sans requêtes de base de données supplémentaires.

## Exemples d'utilisation

### Gestionnaire de webhook pour le paiement Stripe

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

### Vérification du plan utilisateur avec expiration

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
