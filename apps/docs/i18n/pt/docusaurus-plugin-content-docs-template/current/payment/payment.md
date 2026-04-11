---
id: payment-overview
title: Visão geral da integração de pagamento
sidebar_label: Guia de Integração
sidebar_position: 1.5
---

# Visão geral da integração de pagamento

Este guia fornece um passo a passo prático do sistema de pagamento Ever Works. Ele cobre a camada de abstração do provedor, como configurar cada provedor, o ciclo de vida de checkout e assinatura, controle de recursos e manipulação de webhook.

## Visão geral da arquitetura do provedor

O sistema de pagamento é construído em uma **abstração independente de provedor**. Cada provedor de pagamento implementa o mesmo `PaymentProviderInterface` , e um padrão de fábrica permite que você troque de provedor sem alterar o código do aplicativo.

```
lib/payment/
  index.ts                          # Public API exports
  config/
    provider-configs.ts             # Provider configuration factory
    payment-provider-manager.ts     # Singleton manager + ConfigManager
    validation.ts                   # Input validation utilities
  guards/
    feature.guard.tsx               # Plan-based feature gating
  hooks/
    use-payment.tsx                 # React context + usePayment hook
  lib/
    payment-provider-factory.ts     # Factory for creating providers
    payment-service.ts              # Service wrapping the active provider
    payment-service-manager.ts      # Singleton for service lifecycle
    providers/
      stripe-provider.ts
      lemonsqueezy-provider.ts
      polar-provider.ts
      solidgate-provider.ts
    client/
      payment-account-client.ts     # Client-side account API
    utils/
      prices.ts                     # Price formatting utilities
      polar-subscription-helpers.ts
  services/
    payment-email.service.ts        # Email notifications on payment events
  types/
    payment-types.ts                # Core type definitions
    payment.ts                      # Payment flow and submission types
  ui/
    stripe/stripe-elements.tsx
    lemonsqueezy/lemonsqueezy-elements.tsx
    polar/polar-elements.tsx
    solidgate/solidgate-elements.tsx
```

### Provedores Suportados

| Provedor | Pagamentos únicos | Assinaturas | Ensaios | Webhooks | Comerciante de Registro |
|-------------|:-:|:-:|:-:|:-:|:-:|
| Listra | Sim | Sim | Sim | Sim | Não |
| Espremedor de Limão | Sim | Sim | Sim | Sim | Sim |
| polares | Sim | Sim | Sim | Sim | Não |
| Solidgate | Sim | Sim | Não | Sim | Não |

## Interfaces principais

### PaymentProviderInterface

Todo provedor implementa esta interface, definida em `lib/payment/types/payment-types.ts` :

```typescript
// lib/payment/types/payment-types.ts
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

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
                timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client-side configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### Principais tipos de dados

```typescript
// Subscription statuses
export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

// Payment types
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

// Supported providers
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Configuração rápida

### Etapa 1: Definir variáveis de ambiente

Cada provedor requer chaves de API e segredos de webhook. Adicione-os a `.env.local` :

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# LemonSqueezy
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_STORE_ID=...

# Polar
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_ORGANIZATION_ID=...

# Solidgate
SOLIDGATE_API_KEY=...
SOLIDGATE_SECRET_KEY=...
SOLIDGATE_WEBHOOK_SECRET=...
SOLIDGATE_MERCHANT_ID=...
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=...
```

### Etapa 2: configurar planos de preços

Os planos de preços são definidos em `.content/config.yml` :

```yaml
pricing:
  provider: stripe          # Default provider
  currency: USD
  plans:
    FREE:
      id: free
      name: Free
      description: Basic access
      price: 0
      features:
        - "List your product"
        - "Basic analytics"
    STANDARD:
      id: standard
      name: Standard
      description: Enhanced features
      price: 9
      stripePriceId: price_xxx
      annualDiscount: 20
      features:
        - "Everything in Free"
        - "Priority listing"
        - "Advanced analytics"
    PREMIUM:
      id: premium
      name: Premium
      description: Full access
      price: 29
      stripePriceId: price_yyy
      annualDiscount: 25
      isPremium: true
      features:
        - "Everything in Standard"
        - "Featured placement"
        - "API access"
```

### Etapa 3: configurar webhooks

Cada provedor tem um endpoint de webhook dedicado:

| Provedor | URL do webhook |
|------------|-------------------------------|
| Listra | `/api/stripe/webhook` |
| Espremedor de Limão | `/api/lemonsqueezy/webhook` |
| polares | `/api/polar/webhook` |
| Solidgate | `/api/solidgate/webhook` |

Configure essas URLs no painel de cada provedor, apontando para o seu domínio implantado.

## A Fábrica de Provedores de Pagamento

A fábrica cria instâncias de provedor com base em uma string de tipo:

```typescript
// lib/payment/lib/payment-provider-factory.ts
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
      case 'polar':
        return new PolarProvider(config as unknown as PolarConfig);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## PaymentService e ServiceManager

### Serviço de Pagamento

O `PaymentService` envolve a instância ativa do provedor e expõe uma API uniforme:

```typescript
// lib/payment/lib/payment-service.ts
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<SubscriptionInfo> {
    return this.provider.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
  }

  getClientConfig(): ClientConfig {
    return this.provider.getClientConfig();
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }
}
```

### PaymentServiceManager (Singleton)

O gerenciador lida com a troca de provedor em tempo de execução e persiste a escolha do usuário em `localStorage` :

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;
  private readonly STORAGE_KEY = 'everworks_template.payment_provider.selected';

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }

  async switchProvider(newProvider: SupportedProvider): Promise<void> {
    this.setStoredProvider(newProvider);
    this.currentService = new PaymentService({
      provider: newProvider,
      config: this.providerConfigs[newProvider],
    });
  }

  getAvailableProviders(): SupportedProvider[] {
    return Object.keys(this.providerConfigs) as SupportedProvider[];
  }
}
```

## Integração com reação

### Contexto do PaymentProvider

Envolva seu aplicativo (ou páginas relacionadas a pagamentos) com o `PaymentProvider` :

```tsx
// Example: wrapping a layout
import { PaymentProvider } from '@/lib/payment';
import { createProviderConfigs } from '@/lib/payment/config/provider-configs';

const configs = createProviderConfigs(
  { apiKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, webhookSecret: '' },
  undefined,  // solidgate
  undefined,  // lemonsqueezy
  undefined   // polar
);

export default function PricingLayout({ children }) {
  return (
    <PaymentProvider providerConfigs={configs} defaultProvider="stripe">
      {children}
    </PaymentProvider>
  );
}
```

### useGancho de pagamento

Os componentes acessam o serviço de pagamento através do gancho `usePayment` :

```typescript
// lib/payment/hooks/use-payment.tsx
export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}

// Returns:
// {
//   service: PaymentService | null;
//   switchProvider: (provider: SupportedProvider) => Promise<void>;
//   currentProvider: SupportedProvider;
//   availableProviders: SupportedProvider[];
// }
```

**Exemplo de uso:**

```tsx
function CheckoutButton({ priceId }: { priceId: string }) {
  const { service, currentProvider } = usePayment();

  const handleCheckout = async () => {
    const intent = await service?.createPaymentIntent({
      amount: 2900,
      currency: 'usd',
      metadata: { priceId },
    });
    // Redirect to checkout or show payment form
  };

  return <button onClick={handleCheckout}>Pay with {currentProvider}</button>;
}
```

## Controle de recursos

O componente `FeatureGuard` restringe os elementos da UI com base no plano de assinatura do usuário:

```tsx
// lib/payment/guards/feature.guard.tsx
export type PlanType = "TRIAL" | "FREE" | "STANDARD" | "PREMIUM" | "EXPIRED" | "CANCELLED";

const PLAN_LEVEL: Record<PlanType, number> = {
  CANCELLED: 0,
  EXPIRED: 1,
  TRIAL: 2,
  FREE: 3,
  STANDARD: 4,
  PREMIUM: 5,
};
```

**Uso:**

```tsx
import FeatureGuard from '@/lib/payment/guards/feature.guard';

<FeatureGuard
  user={currentUser}
  requiredPlan="STANDARD"
  fallback={<UpgradePrompt />}
  onAccessDenied={(userPlan, required, reason) => {
    console.log(`Access denied: ${reason}`);
  }}
>
  <PremiumFeature />
</FeatureGuard>
```

### Suporte do período de carência

Os planos expirados recebem um período de carência de 7 dias com acesso degradado:

```typescript
export const GRACE_PERIOD_CONFIG = {
  EXPIRED_GRACE_DAYS: 7,
  TRIAL_DURATION_DAYS: 14,
  EXPIRED_ACCESS_LEVEL: "FREE" as PlanType,
};

export const isInGracePeriod = (user: User): boolean => {
  if (!user.planExpiresAt) return false;
  const graceEnd = new Date(user.planExpiresAt);
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_CONFIG.EXPIRED_GRACE_DAYS);
  return new Date() <= graceEnd && user.plan === "EXPIRED";
};
```

## Tipos de eventos de webhook

Todos os eventos de webhook são normalizados em uma enumeração comum:

```typescript
// lib/payment/types/payment-types.ts
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  REFUND_CREATED = 'refund_created',
  // ... and more
}
```

## Fluxos de pagamento

O modelo oferece suporte a dois fluxos de pagamento para envio de conteúdo:

```typescript
// lib/payment/types/payment.ts
export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}

export enum SubmissionStatus {
  DRAFT = "draft",
  PENDING_PAYMENT = "pending_payment",
  PAID = "paid",
  PUBLISHED = "published",
  REJECTED = "rejected",
}
```

- **Pagar no início**: o usuário paga antes da revisão do envio.
- **Pagar no final**: o usuário envia gratuitamente, paga somente após aprovação.

## Referência de rota de API

### Rotas de distribuição

| Rota | Método | Descrição |
|-------|--------|------------|
| `/api/stripe/checkout` | POSTAR | Crie uma sessão de checkout |
| `/api/stripe/subscription` | OBTER/POSTAR | Gerenciar assinaturas |
| `/api/stripe/subscription/portal` | POSTAR | Criar sessão do portal de cobrança |
| `/api/stripe/subscription/[id]/cancel` | POSTAR | Cancelar uma assinatura |
| `/api/stripe/payment-intent` | POSTAR | Crie uma intenção de pagamento |
| `/api/stripe/payment-methods/list` | OBTER | Listar métodos de pagamento salvos |
| `/api/stripe/payment-methods/create` | POSTAR | Adicione uma forma de pagamento |
| `/api/stripe/payment-methods/delete` | POSTAR | Remover uma forma de pagamento |
| `/api/stripe/setup-intent` | POSTAR | Crie uma intenção de configuração |
| `/api/stripe/webhook` | POSTAR | Lidar com webhooks Stripe |

### Rotas LemonSqueezy

| Rota | Método | Descrição |
|-------|--------|------------|
| `/api/lemonsqueezy/checkout` | POSTAR | Criar sessão de checkout |
| `/api/lemonsqueezy/cancel` | POSTAR | Cancelar uma assinatura |
| `/api/lemonsqueezy/reactivate` | POSTAR | Reativar uma assinatura |
| `/api/lemonsqueezy/update-plan` | POSTAR | Alterar plano de assinatura |
| `/api/lemonsqueezy/list` | OBTER | Listar assinaturas de usuários |
| `/api/lemonsqueezy/webhook` | POSTAR | Lidar com webhooks |

### Rotas Polares

| Rota | Método | Descrição |
|-------|--------|------------|
| `/api/polar/checkout` | POSTAR | Criar sessão de checkout |
| `/api/polar/subscription/portal` | POSTAR | Criar portal do cliente |
| `/api/polar/subscription/[id]/cancel` | POSTAR | Cancelar uma assinatura |
| `/api/polar/subscription/[id]/reactivate` | POSTAR | Reativar |
| `/api/polar/webhook` | POSTAR | Lidar com webhooks |

## Funções utilitárias

O arquivo `payment-types.ts` inclui auxiliares de formatação úteis:

```typescript
// Format cents to currency string
formatCentsToCurrency(2900, 'USD', 'en-US');
// => "$29.00"

// Convert cents to decimal
convertCentsToDecimal(2900);
// => 29.00

// Convert timestamp to Date
convertNumberToDate(1640995200);
// => Date: 2022-01-01T00:00:00.000Z
```

## Próximas etapas

- [Configuração do Stripe](./stripe) -- Configuração completa do Stripe
- [Configuração do LemonSqueezy](./lemonsqueezy) -- Configuração do LemonSqueezy
- [Configuração polar](./polar) -- Configuração polar
- [Integração multimoeda](./multi-currency) - Suporte a moedas
- [Arquitetura de Pagamento](./payment-architecture) -- Aprofunde-se na arquitetura
- [Webhooks](./webhooks) -- Detalhes de manipulação do webhook
- [Guia de configuração](./configuration) -- Todas as variáveis e opções de ambiente
