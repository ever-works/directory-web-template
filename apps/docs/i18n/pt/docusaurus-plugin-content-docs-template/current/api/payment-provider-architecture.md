---
id: payment-provider-architecture
title: "Arquitetura do Provedor de Pagamentos"
sidebar_label: "Arquitetura do Provedor"
sidebar_position: 8
---

# Arquitetura do Provedor de Pagamentos

O sistema de pagamentos usa o **padrão Strategy** para suportar múltiplos provedores de forma intercambiável. A `PaymentProviderFactory` resolve o provedor correto em tempo de execução com base em variáveis de ambiente.

## Provedores Suportados

| Provedor | Identificador | Serviço Responsável |
|----------|--------------|---------------------|
| Stripe | `"stripe"` | `StripePaymentService` |
| Solidgate | `"solidgate"` | `SolidgatePaymentService` |
| LemonSqueezy | `"lemonsqueezy"` | `LemonSqueezyPaymentService` |
| Polar | `"polar"` | `PolarPaymentService` |

---

## PaymentProviderInterface

Todos os provedores implementam a mesma interface:

```typescript
interface PaymentProviderInterface {
  // Gerenciamento de cliente
  createCustomer(email: string, userId: string): Promise<string>;
  getCustomer(customerId: string): Promise<Customer | null>;

  // Operações de pagamento
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;
  getCheckoutSession(sessionId: string): Promise<CheckoutSession>;
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent>;

  // Assinaturas
  createSubscription(params: SubscriptionParams): Promise<SubscriptionInfo>;
  updateSubscription(subscriptionId: string, params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<void>;
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>;

  // Webhooks
  constructWebhookEvent(payload: string, signature: string): Promise<WebhookEvent>;
  handleWebhookEvent(event: WebhookEvent): Promise<WebhookResult>;

  // Reembolsos
  refundPayment(paymentId: string, amount?: number): Promise<void>;

  // Componentes de UI
  getUIComponents(): UIComponents;
}
```

---

## PaymentProviderFactory

A fábrica resolve o provedor correto com base em `NEXT_PUBLIC_PAYMENT_PROVIDER`:

```typescript
class PaymentProviderFactory {
  static create(type?: string): PaymentProviderInterface {
    const providerType = type ?? process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? 'stripe';

    switch (providerType) {
      case 'stripe':
        return new StripePaymentService();
      case 'solidgate':
        return new SolidgatePaymentService();
      case 'lemonsqueezy':
        return new LemonSqueezyPaymentService();
      case 'polar':
        return new PolarPaymentService();
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

---

## PaymentService

O `PaymentService` envolve a fábrica com gerenciamento singleton para evitar recriações desnecessárias:

```typescript
class PaymentService {
  private static providers: Map<string, PaymentProviderInterface> = new Map();

  static getOrCreateProvider(type?: string): PaymentProviderInterface {
    const key = type ?? process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? 'stripe';

    if (!this.providers.has(key)) {
      this.providers.set(key, PaymentProviderFactory.create(key));
    }

    return this.providers.get(key)!;
  }

  // Atalhos convenientes
  static getDefaultProvider(): PaymentProviderInterface {
    return this.getOrCreateProvider();
  }

  static clearProviders(): void {
    this.providers.clear();
  }
}
```

---

## Como Trocar Provedores

Para mudar o provedor de pagamento ativo:

1. **Atualizar variável de ambiente:**
   ```bash
   NEXT_PUBLIC_PAYMENT_PROVIDER=polar
   ```

2. **Configurar variáveis do novo provedor:**
   ```bash
   POLAR_ACCESS_TOKEN=...
   POLAR_WEBHOOK_SECRET=...
   POLAR_ORGANIZATION_ID=...
   ```

3. **Nenhuma alteração de código necessária** — todos os endpoints usam `PaymentService.getDefaultProvider()`.

4. **Atualizar configuração de webhook** no painel do novo provedor para apontar para o endpoint correspondente.

---

## Padrão Comum de Resolução de Cliente

Todos os provedores seguem o mesmo padrão de 3 etapas para resolver clientes:

```typescript
async function resolveCustomer(userId?: string, email?: string): Promise<string> {
  // Etapa 1: Verificar usuário autenticado no banco de dados
  if (userId) {
    const user = await getUserById(userId);
    if (user?.providerCustomerId) return user.providerCustomerId;
  }

  // Etapa 2: Buscar por e-mail no provedor
  if (email) {
    const existing = await provider.findCustomerByEmail(email);
    if (existing) return existing.id;
  }

  // Etapa 3: Criar novo cliente
  const customer = await provider.createCustomer(email!, userId);
  if (userId) await updateUserProviderCustomerId(userId, customer);
  return customer;
}
```

---

## Normalização de Eventos de Webhook

Todos os provedores normalizam seus eventos nativos para `WebhookEventType`:

| WebhookEventType | Stripe | LemonSqueezy | Polar | Solidgate |
|------------------|---------|----|-------|-----------|
| `subscription_created` | `customer.subscription.created` | `subscription_created` | `subscription.created` | `subscription_activated` |
| `subscription_updated` | `customer.subscription.updated` | `subscription_updated` | `subscription.updated` | `subscription_updated` |
| `subscription_cancelled` | `customer.subscription.deleted` | `subscription_cancelled` | `subscription.canceled` | `subscription_cancelled` |
| `payment_succeeded` | `invoice.paid` | `subscription_payment_success` | `order.created` | `payment_approved` |
| `payment_failed` | `invoice.payment_failed` | `subscription_payment_failed` | — | `payment_declined` |
| `payment_refunded` | `charge.refunded` | `subscription_payment_refunded` | — | `refund_approved` |
| `checkout_completed` | `checkout.session.completed` | — | `checkout.created` | — |

---

## Interface UIComponents

Cada provedor expõe componentes de UI específicos:

```typescript
interface UIComponents {
  CheckoutButton: React.ComponentType<CheckoutButtonProps>;
  PaymentForm?: React.ComponentType<PaymentFormProps>;
  SubscriptionManager?: React.ComponentType<SubscriptionManagerProps>;
}
```

Uso:

```typescript
const provider = PaymentService.getDefaultProvider();
const { CheckoutButton } = provider.getUIComponents();

// Em um componente React
return <CheckoutButton priceId="price_..." successUrl="/success" cancelUrl="/cancel" />;
```

---

## Estrutura de Arquivos

```
template/lib/payment/
├── index.ts                    # Exportações públicas
├── payment.service.ts          # PaymentService (singleton)
├── payment.factory.ts          # PaymentProviderFactory
├── payment.types.ts            # Interfaces e tipos compartilhados
├── stripe/
│   ├── stripe.service.ts       # Implementação StripePaymentService
│   ├── stripe.client.ts        # Cliente Stripe inicializado
│   └── stripe.config.ts        # Configuração e mapeamentos
├── solidgate/
│   ├── solidgate.service.ts    # Implementação SolidgatePaymentService
│   └── solidgate.client.ts     # Cliente Solidgate + assinatura
├── lemonsqueezy/
│   ├── lemonsqueezy.service.ts # Implementação LemonSqueezyPaymentService
│   └── lemonsqueezy.client.ts  # Cliente LemonSqueezy
└── polar/
    ├── polar.service.ts        # Implementação PolarPaymentService
    └── polar.client.ts         # Cliente Polar inicializado
```

---

## Tipos Principais

```typescript
type PaymentProvider = "stripe" | "solidgate" | "lemonsqueezy" | "polar";

interface PaymentProviderConfig {
  type: PaymentProvider;
  publicKey: string;
  webhookSecret: string;
}

interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
}

interface SubscriptionInfo {
  subscriptionId: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  currentPeriodEnd: string;
  currentPeriodStart: string;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  planName: string;
  amount: number;
  currency: string;
  interval: "month" | "year" | "week" | "day";
}

type WebhookEventType =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_trial_started"
  | "subscription_trial_ended"
  | "payment_succeeded"
  | "payment_failed"
  | "payment_refunded"
  | "checkout_completed"
  | "order_created"
  | "order_refunded";
```
