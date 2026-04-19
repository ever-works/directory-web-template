---
id: payment-types
title: Définitions des types de paiement
sidebar_label: Types de paiement
sidebar_position: 11
---

# Définitions des types de paiement

**Source :** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Les types de paiement alimentent le système de facturation multi-fournisseurs. Ils définissent la manière dont les paiements sont créés, vérifiés et gérés sur Stripe, LemonSqueezy, Polar et Solidgate.

## Énumérations

### `PaymentPlan`

Niveaux d'abonnement disponibles.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Options de cycle de facturation pour les frais récurrents.

```typescript
enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### `PaymentType`

Classifie un paiement comme unique, récurrent ou gratuit.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Suit le cycle de vie d’une seule tentative de paiement.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Instruments de paiement pris en charge.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Devises acceptées par la plateforme.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Type d’union de tous les identifiants du prestataire de paiement.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Interfaces

### `PaymentIntent`

Représente un paiement en attente ou terminé.

```typescript
interface PaymentIntent {
  id: string;
  amount: number;         // Amount in smallest currency unit (cents)
  currency: string;
  status: string;
  clientSecret?: string;  // For client-side confirmation
  customerId?: string;
}
```

|Champ|Descriptif|
|-------|-------------|
|`id`|Identifiant de paiement attribué par le fournisseur|
|`amount`|Montant en cents (par exemple, 1 000 = 10,00 $)|
|`currency`|Code devise ISO 4217|
|`clientSecret`|Jeton transmis au SDK frontend pour confirmation|

### `CheckoutParams`

Paramètres pour lancer une session de paiement.

```typescript
interface CheckoutParams {
  priceId?: string;
  variantId?: number;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  email?: string;
  customPrice?: number;
  metadata?: Record<string, any>;
  dark?: boolean;
}
```

### `BillingDetails`

Informations de facturation client jointes à un paiement.

```typescript
interface BillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}
```

### `PaymentProviderConfig`

Informations d’identification nécessaires pour initialiser un fournisseur.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Configuration sécurisée pour le front-end renvoyée par `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Exemple d'utilisation

```typescript
import { PaymentPlan, PaymentType } from '@/lib/constants/payment';
import type { CheckoutParams } from '@/lib/payment/types/payment-types';

const params: CheckoutParams = {
  priceId: 'price_abc123',
  successUrl: '/checkout/success',
  cancelUrl: '/pricing',
  metadata: { plan: PaymentPlan.PREMIUM },
};
```

## Types associés

- [Types d'abonnement](./subscription-types.md) -- cycle de vie et état de l'abonnement
- [Configuration / Paiement](../configuration/payment-config.md) -- configuration du fournisseur et niveaux de tarification
- [Types de configuration](./config-types.md) -- `PaymentConfig` schéma
