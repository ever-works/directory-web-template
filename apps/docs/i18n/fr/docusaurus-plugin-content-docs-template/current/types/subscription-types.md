---
id: subscription-types
title: Définitions des types d'abonnement
sidebar_label: Types d'abonnement
sidebar_position: 12
---

# Définitions des types d'abonnement

**Source :** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Les types d'abonnement modélisent le cycle de vie complet de la facturation récurrente : de la création de l'essai à l'annulation et au renouvellement.

## Énumérations

### `SubscriptionStatus` (niveau fournisseur)

Valeurs d'état renvoyées par le SDK du fournisseur de paiement.

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}
```

|Valeur|Descriptif|
|-------|-------------|
|`incomplete`|Le paiement initial est toujours en attente|
|`trialing`|Le client est dans sa période d'essai|
|`active`|L'abonnement est actif et payant|
|`past_due`|Le paiement a échoué mais l'abonnement n'est pas encore annulé|
|`canceled`|L'abonnement a été annulé|
|`unpaid`|Plusieurs échecs de paiement ; l'abonnement est suspendu|

### `SubscriptionStatus` (niveau base de données)

Valeurs d'état stockées dans la table `subscriptions`.

```typescript
const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PENDING: 'pending',
  PAUSED: 'paused',
} as const;

type SubscriptionStatusValues =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
```

### `SubscriptionPlanType`

Différencie la manière dont un abonnement a été démarré.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Interfaces

### `SubscriptionInfo`

Données d'abonnement normalisées renvoyées par n'importe quel fournisseur.

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number | null;  // Unix timestamp
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: Record<string, any>;
}
```

|Champ|Descriptif|
|-------|-------------|
|`id`|Identifiant d'abonnement du fournisseur|
|`customerId`|Identifiant client du fournisseur|
|`currentPeriodEnd`|Horodatage Unix à la fin de la période de facturation en cours|
|`cancelAtPeriodEnd`|Si `true`, l'abonnement s'annule en fin de période au lieu d'être immédiatement|
|`trialEnd`|Horodatage Unix à l'expiration de la période d'essai|

### `CreateSubscriptionParams`

Paramètres de création d'un nouvel abonnement.

```typescript
interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}
```

### `UpdateSubscriptionParams`

Paramètres de modification d'un abonnement existant.

```typescript
interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  metadata?: Record<string, any>;
}
```

### `PriceDetails`

Informations de prix formatées pour l'affichage.

```typescript
interface PriceDetails {
  amount: number;      // Amount in cents
  formatted: string;   // e.g., "$9.99/mo"
}

interface SubscriptionDetails extends OneTimeDetails {
  weekly?: PriceDetails;
}

interface OneTimeDetails extends PriceDetails {
  collect_tax: boolean;
}
```

### `CountryPricing`

Tarification localisée pour un pays spécifique.

```typescript
interface CountryPricing {
  country: string;
  currency: string;
  symbol: string;
  subscription: SubscriptionDetails;
  oneTime: OneTimeDetails;
  free: OneTimeDetails;
}
```

## Schéma de base de données

La table `subscriptions` stocke l'enregistrement d'abonnement :

```typescript
// Key columns from lib/db/schema.ts
{
  id: text,
  userId: text,                // FK -> users.id
  planId: text,                // 'free' | 'standard' | 'premium'
  status: text,                // 'active' | 'cancelled' | 'expired' | 'pending' | 'paused'
  startDate: timestamp,
  endDate: timestamp,
  paymentProvider: text,       // 'stripe' | 'lemonsqueezy' | 'polar'
  subscriptionId: text,        // Provider subscription ID
  customerId: text,            // Provider customer ID
  autoRenewal: boolean,
  cancelAtPeriodEnd: boolean,
  trialStart: timestamp,
  trialEnd: timestamp,
}
```

## Exemple d'utilisation

```typescript
import type {
  CreateSubscriptionParams,
  SubscriptionInfo,
} from '@/lib/payment/types/payment-types';

const params: CreateSubscriptionParams = {
  customerId: 'cus_abc123',
  priceId: 'price_monthly_premium',
  trialPeriodDays: 7,
};

// After creation
const sub: SubscriptionInfo = await provider.createSubscription(params);
console.log(sub.status); // 'trialing'
```

## Types associés

- [Types de paiement](./payment-types.md) -- intentions de paiement, paramètres de paiement
- [Types d'authentification](./auth-types.md) -- types d'utilisateurs et de sessions liés aux abonnements
