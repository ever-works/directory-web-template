---
id: configuration
title: Configuração de Pagamento
sidebar_label: Guia de Configuração
sidebar_position: 6
description: Guia completo para configurar provedores de pagamento (Stripe, LemonSqueezy, Polar, Solidgate) com suporte multi-moeda
keywords: [pagamento, configuração, stripe, lemonsqueezy, polar, solidgate, multi-moeda]
---

# Configuração de Pagamento

Este guia explica como configurar os diferentes provedores de pagamento suportados pela aplicação.

## Índice

- [Visão Geral](#overview)
- [Provedores Suportados](#supported-providers)
- [Configuração Comum](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Multi-Moeda](#multi-currency)
- [Períodos de Teste e Taxas de Configuração](#trials-and-setup-fees)
- [Seleção de Provedor](#provider-selection)
- [Solução de Problemas](#troubleshooting)

---

## Visão Geral

A aplicação suporta múltiplos provedores de pagamento para assinaturas:

| Provedor     | Tipo          | Multi-Moeda    | Testes |
|--------------|---------------|----------------|--------|
| Stripe       | Assinatura    | ✅ Sim         | ✅ Sim |
| LemonSqueezy | Assinatura    | ✅ Sim         | ✅ Sim |
| Polar        | Assinatura    | ❌ Não         | ❌ Não |
| Solidgate    | Assinatura    | ⚠️ Parcial    | ❌ Não |

### Planos Disponíveis

- **Gratuito** - Gratuito, funcionalidades básicas
- **Padrão** - Plano intermediário com mais visibilidade
- **Premium** - Plano completo com todas as funcionalidades

---

## Provedores Suportados

### Arquitetura

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Exportações
│       ├── types.ts              # Tipos comuns
│       ├── stripe.config.ts      # Configuração multi-moeda Stripe
│       ├── lemonsqueezy.config.ts # Configuração multi-moeda LemonSqueezy
│       └── solidgate.config.ts   # Configuração Solidgate (WIP)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (WIP)
└── utils/
    └── payment-provider.ts       # Seleção de provedor
```

---

## Configuração Comum

### Preços Exibidos (para a UI)

Essas variáveis definem os preços exibidos na interface do usuário:

```bash
# Preços em dólares (ou moeda principal) - apenas para exibição
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Testes (Período de Teste)

```bash
# IDs de valor de teste (taxas iniciais durante o período de teste)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Habilitar/desabilitar testes com valor autorizado
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Pré-requisitos

1. Criar uma conta no [Stripe Dashboard](https://dashboard.stripe.com)
2. Recuperar as chaves de API (Configurações → Chaves de API)
3. Configurar o webhook

### Variáveis de Ambiente Básicas

```bash
# ============================================
# STRIPE - Configuração Básica
# ============================================

# Chaves de API (obrigatório)
STRIPE_SECRET_KEY=sk_live_xxx           # Chave secreta (servidor)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Chave publicável
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Chave publicável (cliente)

# Webhook (obrigatório para eventos)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Configuração de Produto (Legacy - apenas USD)

```bash
# Preços simples (para compatibilidade com versões anteriores, apenas USD)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Configuração Multi-Moeda (Recomendada)

#### Plano Padrão

```bash
# ============================================
# STRIPE PLANO PADRÃO
# ============================================

# ID do Produto
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Preços mensais por moeda
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Preços anuais por moeda
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Taxas de configuração / Valores de teste por moeda
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Plano Premium

```bash
# ============================================
# STRIPE PLANO PREMIUM
# ============================================

# ID do Produto
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Preços mensais por moeda
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Preços anuais por moeda
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Taxas de configuração / Valores de teste por moeda
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Criando Preços no Stripe

1. Vá para **Produtos** → Crie um produto
2. Adicione preços para cada moeda:
   - Clique em "Adicionar outro preço"
   - Selecione a moeda (EUR, GBP, CAD)
   - Defina o valor equivalente
3. Copie cada `price_xxx` para as variáveis correspondentes

### Webhook do Stripe

Configure o webhook no Stripe Dashboard:

- **URL**: `https://seu-dominio.com/api/stripe/webhook`
- **Eventos para ouvir**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Pré-requisitos

1. Criar uma conta no [LemonSqueezy](https://lemonsqueezy.com)
2. Criar uma loja
3. Criar produtos e variantes

### Variáveis de Ambiente

```bash
# ============================================
# LEMONSQUEEZY - Configuração Básica
# ============================================

# API (obrigatório)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://seu-dominio.com/api/lemonsqueezy/webhook

# Modo de teste
LEMONSQUEEZY_TEST_MODE=false
```

### Configuração de Variantes (Legacy)

```bash
# Variantes simples
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Variantes com taxa de configuração (para testes)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Configuração Multi-Moeda

#### Plano Padrão

```bash
# ============================================
# LEMONSQUEEZY PLANO PADRÃO
# ============================================

# ID do Produto
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx

# Preços mensais por moeda
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx

# Preços anuais por moeda
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx

# Taxas de configuração por moeda
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Plano Premium

```bash
# ============================================
# LEMONSQUEEZY PLANO PREMIUM
# ============================================

# ID do Produto
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx

# Preços mensais por moeda
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx

# Preços anuais por moeda
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx

# Taxas de configuração por moeda
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Pré-requisitos

1. Criar uma conta no [Polar](https://polar.sh)
2. Criar uma organização
3. Criar planos de assinatura

### Variáveis de Ambiente

```bash
# ============================================
# POLAR - Configuração
# ============================================

# API (obrigatório)
POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx

# Webhook
POLAR_WEBHOOK_SECRET=xxx

# Modo sandbox (true para testes, false para produção)
POLAR_SANDBOX=true

# URL da API (opcional, padrão: api.polar.sh)
POLAR_API_URL=https://api.polar.sh

# IDs de planos
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx

# Valores de teste (opcional)
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning Em Desenvolvimento
A integração do Solidgate está atualmente em desenvolvimento. Alguns recursos podem não estar totalmente funcionais ainda.
:::

### Pré-requisitos

1. Criar uma conta no [Solidgate](https://solidgate.com)
2. Recuperar credenciais de API do portal do comerciante
3. Configurar o endpoint do webhook

### Variáveis de Ambiente

```bash
# ============================================
# SOLIDGATE - Configuração (WIP)
# ============================================

# Credenciais de API (obrigatório)
SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx

# Webhook
SOLIDGATE_WEBHOOK_SECRET=xxx

# Ambiente (test ou live)
SOLIDGATE_ENVIRONMENT=test
```

### Configuração de Produto

```bash
# ============================================
# PLANOS SOLIDGATE (WIP)
# ============================================

# IDs de produto
NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx

# IDs de preço (atualmente apenas USD)
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Limitações Atuais

| Recurso          | Status         | Notas                              |
|------------------|----------------|------------------------------------|
| Pagamentos Básicos | ✅ Implementado | Pagamentos únicos e assinatura |
| Multi-Moeda      | ⚠️ Parcial    | Atualmente apenas USD             |
| Períodos de Teste | ❌ Ainda não  | Planejado para versão futura      |
| Webhooks         | ⚠️ Parcial    | Apenas eventos básicos            |
| Reembolsos       | ❌ Ainda não  | Planejado para versão futura      |

---

## Multi-Moeda

### Moedas Suportadas

| Código | Moeda            | Símbolo |
|------|------------------|--------|
| USD  | Dólar americano  | $      |
| EUR  | Euro             | €      |
| GBP  | Libra esterlina  | £      |
| CAD  | Dólar canadense  | CA$    |

### Como Funciona

1. A moeda do usuário é detectada automaticamente (geolocalização, preferências)
2. O sistema seleciona o `price_id` correspondente à moeda
3. Se a moeda não estiver configurada, retorna ao USD

### Exemplo de Uso

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  
  // Recupera automaticamente o ID de preço correto para a moeda
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Assinar por {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Períodos de Teste e Taxas de Configuração

### Conceito

- **Teste**: Período de teste gratuito ou com desconto
- **Taxa de Configuração**: Taxas iniciais cobradas no início do período de teste

### Configuração

```bash
# Habilitar testes com valor autorizado
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Importante: Consistência de Moeda

:::caution
Todos os preços em uma sessão de checkout devem estar na mesma moeda.
:::

Se você usar testes com taxas de configuração, você deve criar uma taxa de configuração para cada moeda:

```bash
# ❌ ERRO: Taxa de configuração em USD + Preço principal em GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx  # USD
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP

# ✅ CORRETO: Ambos em GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx  # GBP
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP
```

---

## Seleção de Provedor

### Prioridade

1. **Provedor selecionado pelo usuário** (Configurações)
2. **Provedor padrão** (configuração)
3. **Fallback**: Stripe

### Configuração do Provedor Padrão

No arquivo de configuração do site:

```typescript
// Na configuração do site
pricing: {
  provider: PaymentProvider.STRIPE  // ou LEMONSQUEEZY, POLAR
}
```

### Exemplo de Uso

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## Solução de Problemas

### Erro: Conflito de moeda

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Causa**: O preço principal e a taxa de configuração estão em moedas diferentes.

**Solução**: Criar taxas de configuração para cada moeda suportada.

### Erro: ID de preço inválido

```
Error: Invalid price ID
```

**Causa**: O `price_id` não existe ou não está configurado.

**Solução**: Verificar se a variável de ambiente contém um ID válido.

### Webhook não está recebendo eventos

1. Verifique a URL do webhook no painel do provedor
2. Confirme se `WEBHOOK_SECRET` está correto
3. Teste com as ferramentas de depuração do provedor

### Preços não exibidos corretamente

1. Verifique `NEXT_PUBLIC_PRODUCT_PRICE_*` para valores exibidos
2. Confirme se os valores `price_id` correspondem às moedas corretas
3. Reinicie o servidor de desenvolvimento após modificar arquivos `.env`
