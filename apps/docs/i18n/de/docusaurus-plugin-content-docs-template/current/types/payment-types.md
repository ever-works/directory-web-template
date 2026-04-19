---
id: payment-types
title: Definitionen der Zahlungsarten
sidebar_label: Zahlungsarten
sidebar_position: 11
---

# Definitionen der Zahlungsarten

**Quelle:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Zahlungsarten bilden die Grundlage des Multi-Provider-Abrechnungssystems. Sie definieren, wie Zahlungen in Stripe, LemonSqueezy, Polar und Solidgate erstellt, überprüft und verwaltet werden.

## Aufzählungen

### `PaymentPlan`

Verfügbare Abonnementstufen.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Abrechnungszyklusoptionen für wiederkehrende Gebühren.

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

Klassifiziert eine Zahlung als einmalig, wiederkehrend oder kostenlos.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Verfolgt den Lebenszyklus eines einzelnen Zahlungsversuchs.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Unterstützte Zahlungsinstrumente.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Von der Plattform akzeptierte Währungen.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Unionstyp aller Zahlungsanbieter-IDs.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Schnittstellen

### `PaymentIntent`

Stellt eine ausstehende oder abgeschlossene Zahlung dar.

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

|Feld|Beschreibung|
|-------|-------------|
|`id`|Vom Anbieter zugewiesene Zahlungskennung|
|`amount`|Betrag in Cent (z. B. 1000 = 10,00 $)|
|`currency`|ISO 4217-Währungscode|
|`clientSecret`|Token, der zur Bestätigung an das Frontend-SDK übergeben wird|

### `CheckoutParams`

Parameter zum Initiieren einer Checkout-Sitzung.

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

Rechnungsinformationen des Kunden, die einer Zahlung beigefügt sind.

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

Zur Initialisierung eines Anbieters erforderliche Anmeldeinformationen.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Frontend-sichere Konfiguration, zurückgegeben von `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Anwendungsbeispiel

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

## Verwandte Typen

- [Abonnementtypen](./subscription-types.md) – Lebenszyklus und Status des Abonnements
- [Konfiguration/Zahlung](../configuration/zahlung-config.md) – Anbieter-Setup und Preisstufen
- [Konfigurationstypen](./config-types.md) – `PaymentConfig` Schema
