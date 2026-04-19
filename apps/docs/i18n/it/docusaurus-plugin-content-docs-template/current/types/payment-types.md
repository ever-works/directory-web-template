---
id: payment-types
title: Definizioni del tipo di pagamento
sidebar_label: Tipi di pagamento
sidebar_position: 11
---

# Definizioni del tipo di pagamento

**Fonte:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

I tipi di pagamento alimentano il sistema di fatturazione multi-provider. Definiscono il modo in cui i pagamenti vengono creati, verificati e gestiti su Stripe, LemonSqueezy, Polar e Solidgate.

## Enumerazioni

### `PaymentPlan`

Livelli di abbonamento disponibili.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Opzioni del ciclo di fatturazione per addebiti ricorrenti.

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

Classifica un pagamento come una tantum, ricorrente o gratuito.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Tiene traccia del ciclo di vita di un singolo tentativo di pagamento.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Strumenti di pagamento supportati.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Valute accettate dalla piattaforma.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Tipo di unione di tutti gli identificatori dei fornitori di servizi di pagamento.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Interfacce

### `PaymentIntent`

Rappresenta un pagamento in sospeso o completato.

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

|Campo|Descrizione|
|-------|-------------|
|`id`|Identificatore di pagamento assegnato dal fornitore|
|`amount`|Importo in centesimi (ad esempio, 1000 = $ 10,00)|
|`currency`|Codice valuta ISO 4217|
|`clientSecret`|Token passato all'SDK frontend per conferma|

### `CheckoutParams`

Parametri per l'avvio di una sessione di pagamento.

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

Informazioni di fatturazione del cliente allegate a un pagamento.

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

Credenziali necessarie per inizializzare un provider.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Configurazione frontend-safe restituita da `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di abbonamento](./subscription-types.md): ciclo di vita e stato dell'abbonamento
- [Configurazione/Pagamento](../configuration/payment-config.md) - configurazione del fornitore e livelli di prezzo
- [Tipi di configurazione](./config-types.md) -- `PaymentConfig` schema
