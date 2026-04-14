---
id: stripe-payment-methods-deep-dive
title: "Métodos de Pagamento Stripe — Análise Aprofundada"
sidebar_label: "Métodos de Pagamento Stripe"
sidebar_position: 3
---

# Métodos de Pagamento Stripe — Análise Aprofundada

Esta página descreve os endpoints para gerenciar métodos de pagamento Stripe salvos e criar setup intents para adicionar novos métodos de pagamento.

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|----------|
| GET | `/api/stripe/payment-methods/list` | Listar métodos de pagamento do usuário |
| POST | `/api/stripe/setup-intent` | Criar um setup intent |

---

## GET `/api/stripe/payment-methods/list`

Recupera todos os métodos de pagamento salvos para o usuário autenticado atual. O método de pagamento padrão aparece primeiro na lista.

### Autenticação

Obrigatória — requer sessão válida do usuário.

### Interface de Resposta

```typescript
interface PaymentMethodItem {
  id: string;               // ID do método de pagamento Stripe (pm_...)
  brand: string;            // ex: "visa", "mastercard", "amex"
  last4: string;            // Últimos 4 dígitos
  exp_month: number;        // Mês de expiração
  exp_year: number;         // Ano de expiração
  is_default: boolean;      // true se este é o método de pagamento padrão
}
```

### Resposta de Exemplo

```json
[
  {
    "id": "pm_1234567890",
    "brand": "visa",
    "last4": "4242",
    "exp_month": 12,
    "exp_year": 2027,
    "is_default": true
  },
  {
    "id": "pm_0987654321",
    "brand": "mastercard",
    "last4": "5555",
    "exp_month": 8,
    "exp_year": 2026,
    "is_default": false
  }
]
```

### Lógica de Implementação

O endpoint:
1. Verifica a sessão do usuário via `auth()`
2. Busca o cliente Stripe via `stripe.customers.retrieve()` usando o `stripeCustomerId` do usuário
3. Lista os métodos de pagamento com `stripe.paymentMethods.list({ customer, type: "card" })`
4. Determina o método padrão comparando com `customer.invoice_settings.default_payment_method`
5. Ordena: método padrão primeiro, seguido pelo restante

### Erros

| Código | Motivo |
|--------|--------|
| 401 | Usuário não autenticado |
| 404 | Nenhum cliente Stripe associado ao usuário |
| 500 | Falha na chamada da API Stripe |

---

## POST `/api/stripe/setup-intent`

Cria um Stripe SetupIntent para registrar um novo método de pagamento sem cobrar o usuário. O `client_secret` retornado deve ser usado com o SDK Stripe.js para confirmar o método de pagamento no frontend.

### Autenticação

Obrigatória — requer sessão válida do usuário.

### Corpo da Solicitação

Nenhum corpo necessário. O endpoint usa a sessão para identificar o usuário.

### Resposta de Exemplo

```json
{
  "clientSecret": "seti_1234567890_secret_abcdefgh"
}
```

### Uso no Frontend

```typescript
// 1. Criar o setup intent
const { clientSecret } = await fetch('/api/stripe/setup-intent', {
  method: 'POST'
}).then(r => r.json());

// 2. Confirmar o método de pagamento com Stripe.js
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'Nome do portador' }
  }
});

if (!error) {
  // Método de pagamento adicionado com sucesso
}
```

### Lógica de Implementação

```typescript
export async function createSetupIntent(userId: string) {
  const user = await getUserById(userId);
  
  if (!user?.stripeCustomerId) {
    throw new Error('No Stripe customer found for user');
  }
  
  const setupIntent = await stripe.setupIntents.create({
    customer: user.stripeCustomerId,
    payment_method_types: ['card'],
  });
  
  return { clientSecret: setupIntent.client_secret };
}
```

### Erros

| Código | Motivo |
|--------|--------|
| 401 | Usuário não autenticado |
| 404 | Nenhum cliente Stripe associado ao usuário |
| 500 | Falha ao criar SetupIntent |

---

## Arquivos Fonte

| Arquivo | Descrição |
|---------|----------|
| `template/app/api/stripe/payment-methods/list/route.ts` | Handler de listagem |
| `template/app/api/stripe/setup-intent/route.ts` | Handler de setup intent |
| `template/lib/payment/stripe/stripe.service.ts` | Lógica de serviço |
| `template/lib/payment/stripe/stripe.client.ts` | Cliente Stripe inicializado |
