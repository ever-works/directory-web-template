---
id: payment-config
title: "Configuração de Pagamento"
sidebar_label: "Pagamento"
sidebar_position: 12
---

# Configuração de Pagamento

O template suporta múltiplos provedores de pagamento e fluxos de cobrança flexíveis. Esta referência cobre todas as constantes, enums e opções de configuração relacionadas a pagamentos.

## Constantes de Pagamento

Todos os enums e tipos de pagamento principais são definidos em `lib/constants/payment.ts`. Este arquivo é mantido intencionalmente separado do módulo de configuração principal para que possa ser importado em scripts que rodam fora do runtime do Next.js (migrações, seeds, ferramentas CLI).

### PaymentFlow

Determina quando o pagamento é coletado em relação ao processo de envio.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Valor | Descrição |
|-------|-----------|
| `pay_at_start` | Usuário paga antes de enviar; item é publicado imediatamente |
| `pay_at_end` | Usuário envia primeiro; pagamento é coletado após aprovação do administrador |

### PaymentStatus

Rastreia o estado de uma tentativa de pagamento.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Opções de frequência de cobrança.

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

Níveis de assinatura disponíveis.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Gateways de pagamento suportados.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Esquema de Configuração de Pagamento

Definido em `lib/config/schemas/payment.schema.ts` e validado na inicialização com Zod.

### Preços de Produto (Valores de Exibição)

```typescript
pricing: {
  free: number;       // Padrão: 0
  standard: number;   // Padrão: 10
  premium: number;    // Padrão: 20
}
```

| Variável de Ambiente | Campo | Padrão |
|----------------------|-------|--------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Configuração de Teste

| Variável de Ambiente | Campo | Descrição |
|----------------------|-------|-----------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | ID de preço para teste padrão |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | ID de preço para teste premium |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Habilitar valores de teste (`true`/`false`) |

## Configuração do Provedor

### Stripe

Habilitado automaticamente quando tanto `secretKey` quanto `publishableKey` estão presentes.

| Variável de Ambiente | Obrigatório | Descrição |
|----------------------|-------------|-----------|
| `STRIPE_SECRET_KEY` | Sim | Chave de API do lado do servidor |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sim | Chave publicável do lado do cliente |
| `STRIPE_WEBHOOK_SECRET` | Recomendado | Verificação de assinatura de webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Não | ID de preço para plano gratuito |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Não | ID de preço para plano padrão |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Não | ID de preço para plano premium |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Não | Defina `true` para buscar preços da API do Stripe |

### LemonSqueezy

Habilitado automaticamente quando tanto `apiKey` quanto `storeId` estão presentes.

| Variável de Ambiente | Obrigatório | Descrição |
|----------------------|-------------|-----------|
| `LEMONSQUEEZY_API_KEY` | Sim | Chave de API do dashboard LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | Sim | Seu identificador de loja |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Recomendado | Verificação de assinatura de webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | Não | Substituir URL do endpoint de webhook |
| `LEMONSQUEEZY_TEST_MODE` | Não | Defina `true` para modo de teste |
| `LEMONSQUEEZY_VARIANT_ID` | Não | ID de variante padrão |

### Polar

Habilitado automaticamente quando tanto `accessToken` quanto `organizationId` estão presentes.

| Variável de Ambiente | Obrigatório | Descrição |
|----------------------|-------------|-----------|
| `POLAR_ACCESS_TOKEN` | Sim | Token de acesso à API |
| `POLAR_ORGANIZATION_ID` | Sim | Identificador da organização |
| `POLAR_WEBHOOK_SECRET` | Recomendado | Verificação de assinatura de webhook |
| `POLAR_SANDBOX` | Não | Defina `false` para produção (padrão: `true`) |
| `POLAR_API_URL` | Não | Substituir URL base da API |

### Solidgate

Requer configuração manual de variáveis de ambiente.

| Variável de Ambiente | Obrigatório | Descrição |
|----------------------|-------------|-----------|
| `SOLIDGATE_API_KEY` | Sim | Chave de API |
| `SOLIDGATE_SECRET_KEY` | Sim | Chave secreta para assinatura |
| `SOLIDGATE_WEBHOOK_SECRET` | Sim | Verificação de webhook |
| `SOLIDGATE_MERCHANT_ID` | Sim | Identificador do comerciante |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | Não | Chave do lado do cliente |

## Cobrança Multi-Moeda

Cada provedor suporta preços por moeda através dos módulos de configuração de cobrança em `lib/config/billing/`.

### Tipos de Configuração de Cobrança

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // ID de preço/variante para cobrança mensal
  yearly?: string;    // ID de preço/variante para cobrança anual
  setupFee?: string;  // ID de preço de taxa de instalação opcional
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // Código ISO 4217 (ex.: 'USD')
  symbol?: string;    // Símbolo de exibição (ex.: '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Moedas Suportadas

O array `SUPPORTED_CURRENCIES` em `lib/config/billing/types.ts` lista todos os 32 códigos ISO 4217 aceitos pelo sistema (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF e mais).

### Funções de Resolução de Preços

Cada provedor exporta uma função de configuração de preços:

| Provedor | Função | Fonte |
|----------|--------|-------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

Todas as funções recorrem ao USD se a moeda solicitada não estiver configurada.

## Configuração do Fluxo de Pagamento

Definido em `lib/config/payment-flows.ts`, o array `PAYMENT_FLOWS` configura as duas opções de fluxo de pagamento com suas propriedades de UI:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Nome do ícone Lucide
  color: string;           // Classes de gradiente Tailwind
  features: string[];      // Pontos de recurso
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Rótulo de badge opcional
  isDefault?: boolean;     // Se este é o fluxo padrão
}
```

Funções auxiliares:
- `getDefaultPaymentFlow()` -- retorna o valor `PaymentFlow` padrão
- `getPaymentFlowConfig(flowId)` -- retorna o `PaymentFlowConfig` para um determinado fluxo

## Gerenciador de Provedor de Pagamento

A classe `PaymentProviderManager` em `lib/payment/config/payment-provider-manager.ts` fornece acesso singleton às instâncias de provedores:

```typescript
// Obter um provedor específico
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// Ou usar a função genérica
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Páginas Relacionadas

- [Tipos de Pagamento](../types/payment-types.md) -- definições de tipo para operações de pagamento
- [Tipos de Assinatura](../types/subscription-types.md) -- tipos de ciclo de vida de assinatura
- [Referência de Ambiente](./environment-reference.md) -- listagem completa de variáveis de ambiente
