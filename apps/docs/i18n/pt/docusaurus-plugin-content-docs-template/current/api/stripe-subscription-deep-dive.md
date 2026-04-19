---
id: stripe-subscription-deep-dive
title: "Assinatura Stripe — Análise Aprofundada"
sidebar_label: "Assinaturas Stripe"
sidebar_position: 2
---

# Assinatura Stripe — Análise Aprofundada

Esta página descreve os endpoints do ciclo de vida de assinaturas Stripe: criar, atualizar e cancelar assinaturas.

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|----------|
| POST | `/api/stripe/subscription` | Criar uma nova assinatura |
| PUT | `/api/stripe/subscription` | Atualizar uma assinatura existente |
| DELETE | `/api/stripe/subscription` | Cancelar uma assinatura |

---

## POST `/api/stripe/subscription`

Cria uma nova assinatura Stripe para o usuário autenticado, vinculando um método de pagamento e um preço.

### Corpo da Solicitação

```typescript
{
  priceId: string;           // ID do preço Stripe (price_...)
  paymentMethodId: string;  // ID do método de pagamento (pm_...)
  trialDays?: number;        // Dias de avaliação gratuita
  trialAmountId?: string;    // ID de preço para pagamento do período de avaliação
}
```

### Lógica de Implementação

1. Verifica a sessão do usuário
2. Anexa o método de pagamento ao cliente: `stripe.paymentMethods.attach()`
3. Define como método padrão na fatura: `stripe.customers.update()`
4. Cria a assinatura: `stripe.subscriptions.create()`
5. Se `trialDays` for fornecido e `trialAmountId` existir, adiciona uma linha extra de julgamento
6. `metadata.userId` é sempre incluído na assinatura

```typescript
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: priceId }],
  trial_period_days: trialDays,
  default_payment_method: paymentMethodId,
  metadata: { userId: user.id },
});
```

### Resposta

```typescript
interface SubscriptionInfo {
  subscriptionId: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  currentPeriodEnd: string;    // ISO 8601
  currentPeriodStart: string;  // ISO 8601
  cancelAtPeriodEnd: boolean;
  priceId: string;
  planName: string;
  amount: number;
  currency: string;
  interval: "month" | "year" | "week" | "day";
}
```

---

## PUT `/api/stripe/subscription`

Atualiza uma assinatura existente, geralmente para trocar de plano ou alterar o comportamento de cancelamento.

### Corpo da Solicitação

```typescript
{
  subscriptionId: string;          // Obrigatório
  newPriceId?: string;             // Para troca de plano
  cancelAtPeriodEnd?: boolean;     // true = cancelamento suave ao fim do período
}
```

### Lógica de Implementação

**Troca de plano** (`newPriceId` fornecido):
1. Busca a assinatura atual: `stripe.subscriptions.retrieve()`
2. Obtém o item da assinatura atual
3. Atualiza substituindo o item pelo novo preço:

```typescript
await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: currentItem.id,
    price: newPriceId,
  }],
  proration_behavior: 'create_prorations',
});
```

**Atualização de `cancelAtPeriodEnd`** (sem `newPriceId`):
```typescript
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: cancelAtPeriodEnd,
});
```

### Resposta

Retorna um objeto `SubscriptionInfo` atualizado (mesma estrutura do POST).

---

## DELETE `/api/stripe/subscription`

Cancela uma assinatura imediatamente ou ao final do período atual.

### Parâmetros de Consulta

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|------------|----------|
| `subscriptionId` | string | **Sim** | ID da assinatura a cancelar |
| `immediately` | `"true"` | Não | Se `"true"`, cancela imediatamente |

### Lógica de Implementação

**Cancelamento suave** (padrão — ao fim do período):
```typescript
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
});
```

**Cancelamento imediato** (`immediately=true`):
```typescript
await stripe.subscriptions.cancel(subscriptionId);
```

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Subscription cancellation scheduled"
}
```

---

## Erros Comuns

| Código | Motivo |
|--------|--------|
| 400 | Parâmetros ausentes ou inválidos |
| 401 | Usuário não autenticado |
| 404 | Assinatura ou cliente Stripe não encontrado |
| 500 | Erro da API Stripe |

---

## Arquivos Fonte

| Arquivo | Descrição |
|---------|----------|
| `template/app/api/stripe/subscription/route.ts` | Handler principal |
| `template/lib/payment/stripe/stripe.service.ts` | Lógica de assinatura |
| `template/lib/payment/stripe/stripe.types.ts` | Tipos TypeScript |
