---
id: pricing-pages
title: Páginas de preços e checkout
sidebar_label: Páginas de preços
sidebar_position: 19
---

# Páginas de preços e checkout

O modelo Ever Works inclui um sistema de página de preços completo com suporte para checkout de vários provedores (Stripe, LemonSqueezy, Polar), alternância de intervalo de faturamento, preços dinâmicos de produtos Stripe, formatação de moeda, cartões de comparação de planos, seções de anúncios de patrocinadores e fluxos de pagamento incorporados ou baseados em redirecionamento.

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Planeje configurações, listas de recursos e getters de texto de ação |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Orquestra todo o estado de preços, checkout e lógica de pagamento |
| `PricingSection` | `components/pricing/pricing-section.tsx` | UI completa da página de preços com cartões de plano e fluxo de checkout |
| `PlanCard` | `components/pricing/plan-card.tsx` | Cartão de exibição de plano individual |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Modal de formulário de pagamento incorporado |
| `PaymentFlowSelectorModal` | `components/payment/` | Modal de seleção de fluxo (pague agora vs. pague no final) |

## Configuração do plano

O sistema suporta três níveis de plano configurados através de `usePricingFeatures` :

| Plano | Texto de ação (logado) | Texto de ação (não conectado) |
|---|---|---|
| `free` | "Comece gratuitamente" | "Enviar gratuitamente" |
| `standard` | "Atualizar para Padrão" | "Inscreva-se agora" |
| `premium` | "Seja Premium" | "Inscreva-se agora" |

### Interface de configuração do plano

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Listas de recursos

Cada plano possui uma lista de recursos digitada:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| Plano | Contagem de recursos | Inclusões notáveis ​​|
|---|---|---|
| Grátis | 9 recursos | Enviar produto, descrição básica, uma imagem, link do site |
| Padrão | 9 recursos | Todos os recursos gratuitos, selo verificado, revisão prioritária, estatísticas mensais |
| Prémio | 11 recursos | Todos os recursos padrão, posição patrocinada, página inicial em destaque, galeria ilimitada |

## O Gancho `usePricingSection` Este gancho abrangente orquestra toda a lógica da página de preços:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### Estado

| Propriedade | Tipo | Descrição |
|---|---|---|
| `showSelector` | `boolean` | Se o seletor de fluxo de pagamento está visível |
| `billingInterval` | `PaymentInterval` | Intervalo de faturação atual (mensal/anual) |
| `processingPlan` | `string \| null` | ID do plano atualmente em processamento |
| `selectedPlan` | `PaymentPlan \| null` | Plano atualmente selecionado |
| `selectedFlow` | `PaymentFlow` | Tipo de fluxo de pagamento (pagar agora vs. pagar no final) |
| `isButton` | `boolean` | Se o fluxo selecionado usa o modo de botão |

### Ações

| Método | Descrição |
|---|---|
| `setBillingInterval(interval)` | Alternar entre faturamento mensal e anual |
| `handleSelectPlan(plan)` | Selecione um plano e notifique os pais por meio de retorno de chamada |
| `handleCheckout(plan)` | Iniciar check-out para uma determinada configuração de plano |
| `calculatePrice(plan)` | Calcule o preço com base no intervalo de faturamento e desconto anual |
| `getSavingsText(plan)` | Obtenha texto de economia anual (por exemplo, "Economize $ 24/ano") |
| `cancelCurrentProcess()` | Cancelar checkout em andamento e redefinir estado |
| `formatPrice(amount)` | Formatar valor com símbolo de moeda |

### Cálculo de preço

O gancho calcula os preços com base no intervalo de faturamento:

```tsx
const calculatePrice = (plan: PricingConfig): number => {
  if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
    return plan.price;
  }
  const annualPrice = plan.price * 12;
  const discountMultiplier = 1 - plan.annualDiscount / 100;
  return Math.round(annualPrice * discountMultiplier);
};
```

## Provedores de pagamento

O sistema oferece suporte a três provedores de pagamento, selecionados por configuração ou preferência por usuário:

| Provedor | Gancho de checkout | Suporte incorporado |
|---|---|---|
| Listra | `useCreateCheckoutSession` | Sim (SetupIntent) |
| Espremedor de Limão | `useCheckoutButton` | Sim (sobreposição) |
| polares | `usePolarCheckout` | Sim (URL incorporado) |

### Seleção de Provedor

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Fluxo de finalização de compra

Quando um usuário clica no botão de ação de um plano:

1. Verifique se o usuário está logado (abra o modal de login se não estiver)
2. Cancele qualquer processo de checkout existente
3. Determine o provedor de pagamento
4. Obtenha o ID do preço ou ID da variante com reconhecimento de moeda
5. Abra o formulário de pagamento incorporado ou redirecione para a finalização da compra do provedor

```tsx
const handleCheckout = async (plan: PricingConfig) => {
  if (!user?.id) {
    loginModal.onOpen('Please sign in to continue with your purchase.');
    return;
  }

  if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
    await lemonsqueezyHook.handleSubmitWithParams({ variantId, metadata, embedded });
  } else if (paymentProvider === PaymentProvider.POLAR) {
    await polarHook.createCheckoutSession(priceId, user, plan, billingInterval);
  } else if (paymentProvider === PaymentProvider.STRIPE) {
    await stripeHook.createCheckoutSession(plan, user, billingInterval);
  }
};
```

## Preço Dinâmico (Stripe)

Quando Stripe é o fornecedor ativo e o preço dinâmico está habilitado, o gancho busca dados do produto em tempo real:

```tsx
const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE
  && isStripeDynamicPricingEnabled();

const { data: stripeProductsData } = useStripeProducts({
  enabled: isDynamicPricingEnabled && !isReview
});

// Merge: dynamic values override static, but keep static as fallback
const { FREE, STANDARD, PREMIUM } = useMemo(() => {
  if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
    const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
    return {
      FREE: dynamicPlans.FREE ?? staticPlans.FREE,
      STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
      PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
    };
  }
  return staticPlans;
}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);
```

## Suporte à moeda

O sistema de preços oferece suporte à exibição em várias moedas:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Os IDs de variantes com reconhecimento de moeda são resolvidos por meio de funções de configuração específicas do provedor:

| Provedor | Função de configuração |
|---|---|
| Espremedor de Limão | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| polares | `getPolarPriceConfig(planName, currency, interval)` |

## Modal de Formulário de Pagamento

O formulário de pagamento incorporado oferece suporte a todos os três provedores:

```tsx
<PaymentFormModal
  isOpen={paymentForm.isOpen}
  onClose={paymentForm.closePaymentForm}
  onSuccess={paymentForm.onPaymentSuccess}
  onError={paymentForm.onPaymentError}
  planName={paymentForm.planForPayment?.name}
  planPrice={formatPrice(calculatePrice(paymentForm.planForPayment))}
  amount={calculatePrice(paymentForm.planForPayment)}
  currency={currency}
  clientSecret={clientSecret}
  checkoutUrl={paymentForm.checkoutUrl}
  provider={provider}
  theme={theme}
/>
```

## Componente da seção de preços

O componente `PricingSection` renderiza a página de preços completa:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Recursos visuais

| Recurso | Descrição |
|---|---|
| Alternar intervalo de faturamento | Controle deslizante animado entre Mensal e Anual |
| Grade de cartões de plano | Layout responsivo de 1 coluna (móvel) a 3 colunas (desktop) |
| Distintivo popular | O plano padrão é marcado como "popular" com efeitos de brilho |
| Emblemas de poupança | Pílulas verdes mostrando economia anual quando aplicável |
| Indicadores de confiança | Ícones para "Sem taxas ocultas", "Ativação instantânea", "Suporte Premium" |
| Seção de anúncios do patrocinador | Círculos de radar animados com preços para colocação patrocinada |
| Continuar seção | Exibido após a seleção do plano com call to action |

### Renderização Condicional

O componente mostra condicionalmente planos pagos com base na disponibilidade de pagamento:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Internacionalização

Todas as strings voltadas ao usuário usam `next-intl` com dois namespaces de tradução:

| Espaço para nome | Uso |
|---|---|
| `pricing` | Nomes do plano, recursos, conteúdo da página, seção do patrocinador |
| `billing` | Etiquetas mensais/anuais, estados de processamento, mensagens de erro |

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Gancho de recursos de preços | `hooks/use-pricing-features.ts` |
| Gancho da seção de preços | `hooks/use-pricing-section.ts` |
| Componente da seção de preços | `components/pricing/pricing-section.tsx` |
| Componente do cartão de plano | `components/pricing/plan-card.tsx` |
| Modal de Formulário de Pagamento | `components/payment/stripe-payment-modal.tsx` |
| Constantes de Pagamento | `lib/constants.ts` |
| Tipo de configuração de preços | `lib/content.ts` |
