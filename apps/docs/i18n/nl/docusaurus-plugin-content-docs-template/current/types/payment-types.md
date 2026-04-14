---
id: payment-types
title: Definities van betalingstypes
sidebar_label: Betalingstypen
sidebar_position: 11
---

# Definities van betalingstypes

**Bron:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Betalingstypen vormen de drijvende kracht achter het facturatiesysteem met meerdere providers. Ze bepalen hoe betalingen worden aangemaakt, geverifieerd en beheerd in Stripe, LemonSqueezy, Polar en Solidgate.

## Enums

### `PaymentPlan`

Beschikbare abonnementsniveaus.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Factureringscyclusopties voor terugkerende kosten.

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

Classificeert een betaling als eenmalig, terugkerend of gratis.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Volgt de levenscyclus van één enkele betaalpoging.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Ondersteunde betaalinstrumenten.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Valuta's die door het platform worden geaccepteerd.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Unietype van alle ID's van betalingsaanbieders.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Interfaces

### `PaymentIntent`

Vertegenwoordigt een openstaande of voltooide betaling.

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

|Veld|Beschrijving|
|-------|-------------|
|`id`|Door de provider toegewezen betalingsidentificatie|
|`amount`|Bedrag in centen (bijvoorbeeld 1000 = $ 10,00)|
|`currency`|ISO 4217-valutacode|
|`clientSecret`|Token doorgegeven aan de frontend-SDK ter bevestiging|

### `CheckoutParams`

Parameters voor het starten van een betaalsessie.

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

Factureringsgegevens van klanten die aan een betaling zijn gekoppeld.

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

Referenties die nodig zijn om een provider te initialiseren.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Frontend-veilige configuratie geretourneerd door `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Abonnementstypen](./subscription-types.md) - levenscyclus en status van abonnementen
- [Configuratie / Betaling](../configuration/betaling-config.md) -- providerconfiguratie en prijsniveaus
- [Configtypen](./config-types.md) -- `PaymentConfig` schema
