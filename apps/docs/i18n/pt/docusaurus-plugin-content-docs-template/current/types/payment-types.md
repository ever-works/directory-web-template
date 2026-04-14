---
id: payment-types
title: Definições de tipo de pagamento
sidebar_label: Tipos de pagamento
sidebar_position: 11
---

# Definições de tipo de pagamento

**Fonte:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Os tipos de pagamento alimentam o sistema de cobrança de vários provedores. Eles definem como os pagamentos são criados, verificados e gerenciados no Stripe, LemonSqueezy, Polar e Solidgate.

## Enums

### `PaymentPlan`

Níveis de assinatura disponíveis.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Opções de ciclo de faturamento para cobranças recorrentes.

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

Classifica um pagamento como único, recorrente ou gratuito.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Rastreia o ciclo de vida de uma única tentativa de pagamento.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Instrumentos de pagamento suportados.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Moedas aceitas pela plataforma.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Tipo de união de todos os identificadores do provedor de pagamento.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Interfaces

### `PaymentIntent`

Representa um pagamento pendente ou concluído.

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

|Campo|Descrição|
|-------|-------------|
|`id`|Identificador de pagamento atribuído pelo provedor|
|`amount`|Valor em centavos (por exemplo, 1.000 = US$ 10,00)|
|`currency`|Código de moeda ISO 4217|
|`clientSecret`|Token passado para o SDK front-end para confirmação|

### `CheckoutParams`

Parâmetros para iniciar uma sessão de checkout.

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

Informações de faturamento do cliente anexadas a um pagamento.

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

Credenciais necessárias para inicializar um provedor.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Configuração segura de frontend retornada por `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Exemplo de uso

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

## Tipos Relacionados

- [Tipos de assinatura](./subscription-types.md) – ciclo de vida e status da assinatura
- [Configuração/Pagamento](../configuration/payment-config.md) – configuração do provedor e níveis de preços
- [Tipos de configuração](./config-types.md) -- `PaymentConfig` esquema
