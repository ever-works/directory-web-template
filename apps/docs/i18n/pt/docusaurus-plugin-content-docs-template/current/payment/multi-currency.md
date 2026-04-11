---
id: multi-currency
title: Integração multimoeda
sidebar_label: Multi-moeda
sidebar_position: 5
---

# Guia de integração multimoeda

Este documento explica como o sistema multimoeda está integrado ao aplicativo e como funciona com provedores de pagamento (Stripe, LemonSqueezy e Polar).

## Arquitetura

O sistema multimoeda funciona em vários níveis:

1. **Configuração básica** ( `lib/types.ts` ): Configuração padrão com suporte a várias moedas
2. **ConfigProvider** ( `app/[locale]/config.tsx` ): Enriquece a configuração com a moeda do usuário
3. **Ganchos de checkout**: use configurações de várias moedas para obter os IDs de preço corretos

## Fluxo de dados

```
CurrencyProvider (user currency)
    ↓
ConfigProvider (enriches config.pricing with currency)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (currency + plan)
    ↓
Correct Price ID for the user's currency
```

## Arquivos Modificados

### 1. `app/[locale]/config.tsx` - Usa `useCurrencyContext()` para obter a moeda do usuário
- Gera automaticamente uma configuração de preços com base na moeda se nenhuma configuração for fornecida
- Usa `getDefaultPricingConfigWithCurrency()` para criar uma configuração multimoeda

### 2. `hooks/use-create-checkout.ts` - Usa `useCurrencyContext()` para obter a moeda
- Chama `getStripePriceConfig()` para obter o ID do preço correto com base na moeda
- Volta para `plan.stripePriceId` se a configuração multimoeda não estiver disponível

### 3. `hooks/use-pricing-section.ts` - Usa `useCurrencyContext()` para obter a moeda
- Chama `getLemonSqueezyPriceConfig()` para LemonSqueezy
- Usa IDs de preços baseados em moeda no momento da finalização da compra

## Uso

### Para desenvolvedores

O sistema funciona automaticamente. Nenhuma modificação é necessária nos componentes existentes.

**Exemplo de uso em um componente:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing is automatically enriched with the user's currency
  // Price IDs are based on the user's currency
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Currency symbol is automatically updated
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### Para ganchos de checkout

Os ganchos de checkout usam automaticamente configurações de várias moedas:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Configuração de variáveis de ambiente

Para que o sistema funcione, você deve configurar variáveis de ambiente para cada moeda em:

- `lib/config/billing/stripe.config.ts` : `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` variáveis
- `lib/config/billing/lemonsqueezy.config.ts` : `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` variáveis

**Exemplo para Stripe:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Moedas Suportadas

As moedas suportadas são definidas em `lib/config/billing/types.ts` :

- USD, EUR, GBP, CAD (configurado nas configurações de faturamento)
- Outras moedas ISO 4217 (substituição para USD)

## Reserva

Se uma moeda não for suportada ou se as configurações de várias moedas não estiverem disponíveis:

1. O sistema usa `plan.stripePriceId` / `plan.lemonVariantId` (configuração estática)
2. A moeda padrão é USD
3. O símbolo padrão é $

## Teste

Para testar o sistema multimoeda:

1. Altere a moeda do usuário através de `/api/user/currency` 2. Verifique se os IDs de preços mudam de acordo com a moeda
3. Teste o checkout com moedas diferentes

## Notas importantes

- Os IDs de preços são resolvidos **no momento da finalização da compra**, não no momento da exibição
- A configuração de preços em `content/config.yml` tem prioridade sobre a configuração padrão
- As configurações de várias moedas serão usadas apenas se as variáveis de ambiente estiverem configuradas

## Integração com provedores de pagamento

O sistema multimoeda funciona perfeitamente com todos os provedores de pagamento:

- **Stripe**: usa `getStripePriceConfig()` para obter IDs de preços específicos de cada moeda
- **LemonSqueezy**: usa `getLemonSqueezyPriceConfig()` para obter IDs de variantes específicas de moeda
**Polar**: suporta várias moedas por meio da configuração do produto

Para obter configuração detalhada específica do provedor, consulte:
- [Configuração de faixa](./stripe)
- [Configuração do LemonSqueezy](./lemonsqueezy)
- [Configuração Polar](./polar)
