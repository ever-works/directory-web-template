---
id: payment-library
title: "Biblioteca de pagamentos"
sidebar_label: "Biblioteca de pagamentos"
sidebar_position: 17
---

# Biblioteca de pagamentos

O modelo implementa um sistema de pagamento multiprovedor usando os padrões Factory e Strategy. Suporta Stripe, LemonSqueezy, Solidgate e Polar como provedores de pagamento, com uma interface unificada para pagamentos, assinaturas, webhooks e reembolsos.

## Visão geral da arquitetura

```mermaid
graph TD
    A[Application Code] --> B[PaymentService]
    B --> C[PaymentProviderFactory]
    C --> D{Provider Type}
    D -->|stripe| E[StripeProvider]
    D -->|lemonsqueezy| F[LemonSqueezyProvider]
    D -->|solidgate| G[SolidgateProvider]
    D -->|polar| H[PolarProvider]
    B --> I[PaymentServiceManager]
    I --> B
    E --> J[PaymentProviderInterface]
    F --> J
    G --> J
    H --> J
```

## Arquivos de origem

|Arquivo|Objetivo|
|------|---------|
|`lib/payment/index.ts`|Exportações de API pública|
|`lib/payment/lib/payment-provider-factory.ts`|Fábrica para criação de instâncias de provedor|
|`lib/payment/lib/payment-service.ts`|Fachada de serviço unificada|
|`lib/payment/lib/payment-service-manager.ts`|Gerenciador singleton para ciclo de vida de serviço|
|`lib/payment/types/payment-types.ts`|Interfaces principais e enums|
|`lib/payment/types/payment.ts`|Fluxo de pagamento e tipos de envio|
|`lib/payment/config/`|Configuração e validação do provedor|
|`lib/payment/lib/providers/`|Implementações de provedores individuais|
|`lib/payment/hooks/`|Ganchos React para fluxos de pagamento do lado do cliente|
|`lib/payment/ui/`|Componentes do formulário de pagamento|

## Interfaces principais

### Interface do Provedor de Pagamento

Cada provedor implementa esta interface abrangente:

```typescript
export interface PaymentProviderInterface {
  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;

  // Webhooks and refunds
  handleWebhook(payload: any, signature: string, ...args: any[]): Promise<WebhookResult>;
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration and UI
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### Fábrica de Provedor de Pagamento

Cria instâncias de provedor com base na configuração:

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':       return new StripeProvider(config);
      case 'solidgate':    return new SolidgateProvider(config);
      case 'lemonsqueezy': return new LemonSqueezyProvider(config);
      case 'polar':        return new PolarProvider(config);
      default:             throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## Serviço de pagamento

A classe `PaymentService` fornece uma fachada unificada sobre todas as operações do provedor:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(config.provider, config.config);
  }

  // All methods delegate to the underlying provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  // ... additional delegated methods
}
```

## Tipos de dados

### Enumerações de pagamento

```typescript
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}
```

### Eventos de webhook

```typescript
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  INVOICE_PAID = 'invoice_paid',
  REFUND_CREATED = 'refund_created',
  // ... additional event types
}
```

### Principais estruturas de dados

|Tipo|Objetivo|
|------|---------|
|`PaymentIntent`|Sessão de pagamento com id, valor, moeda, status, clientSecret|
|`SubscriptionInfo`|Detalhes da assinatura com status, final do período e informações de avaliação|
|`CustomerResult`|Cliente criado com id, email, nome|
|`WebhookResult`|Webhook processado com tipo, id, dados|
|`ClientConfig`|Configuração segura de frontend com publicKey e tipo de gateway|
|`UIComponents`|Componentes React e ativos visuais para o provedor|

## Utilitários de moeda

A biblioteca inclui funções auxiliares para formatação de moeda:

```typescript
// Format cents to display currency
export function formatCentsToCurrency(
  cents: number, currency: string = 'USD', locale: string = 'en-US'
): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

// Convert between cents and decimal
export function convertCentsToDecimal(cents: number): number;
export function convertDecimalToCents(decimal: number): number;

// Convert timestamps to Date objects
export function convertNumberToDate(timestamp?: number): Date | null;
export function safeTimestampToDate(timestamp: number | null | undefined): Date | undefined;
```

## Tipos de fluxo de pagamento

O sistema suporta dois fluxos de pagamento de envio:

|Fluxo|Enum|Descrição|
|------|------|-------------|
|Pague no início|`PAY_AT_START`|Pagamento necessário antes da análise do envio|
|Pague no final|`PAY_AT_END`|Pagamento cobrado após aprovação do administrador|

### Ciclo de vida do status de envio

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_PAYMENT: Submit (pay at start)
    DRAFT --> PUBLISHED: Submit (free)
    PENDING_PAYMENT --> PAID: Payment confirmed
    PAID --> PUBLISHED: Admin approves
    PAID --> REJECTED: Admin rejects
    DRAFT --> PUBLISHED: Admin approves (pay at end)
    DRAFT --> REJECTED: Admin rejects (pay at end)
```

## Interface de componentes de UI

Cada provedor expõe componentes de UI para integração de frontend:

```typescript
export interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## Integração do lado do cliente

O gancho `usePayment` e o contexto `PaymentProvider` fornecem integração com React:

```typescript
import { usePayment, PaymentProvider } from '@/lib/payment';

// Wrap your app with the payment provider
<PaymentProvider>
  <PaymentForm
    amount={2999}
    currency="usd"
    isSubscription={false}
    onSuccess={(paymentId) => console.log('Paid:', paymentId)}
    onError={(error) => console.error('Failed:', error)}
  />
</PaymentProvider>
```

## Configuração do provedor

```typescript
export interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

Cada provedor exige no mínimo um `apiKey`. Stripe e Solidgate também usam `webhookSecret` para verificação de assinatura de webhook.
