---
id: stripe-checkout-deep-dive
title: "Stripe Checkout — Análise Aprofundada"
sidebar_label: "Stripe Checkout"
sidebar_position: 1
---

# Stripe Checkout — Análise Aprofundada

Esta página descreve os endpoints do Stripe Checkout em detalhes, incluindo criação de sessão, resolução de cliente e recuperação de sessão.

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|----------|
| POST | `/api/stripe/checkout` | Criar uma sessão de checkout |
| GET | `/api/stripe/checkout` | Recuperar uma sessão de checkout |

**Arquivo fonte:** `template/app/api/stripe/checkout/route.ts`

---

## POST `/api/stripe/checkout`

Cria uma nova sessão Stripe Checkout.

### Corpo da Solicitação

```typescript
{
  priceId: string;                         // Obrigatório: ID do preço Stripe
  mode?: "one_time" | "subscription";      // Padrão: "subscription"
  successUrl: string;                      // Obrigatório: URL de retorno após sucesso
  cancelUrl: string;                       // Obrigatório: URL de retorno ao cancelar
  trialDays?: number;                      // Dias de avaliação gratuita
  trialAmountId?: string;                  // ID de preço para cobrança durante avaliação
  billingInterval?: "monthly" | "yearly";  // Intervalo de cobrança
  metadata?: Record<string, string>;       // Metadados adicionais
}
```

### Mapeamento de Modo

| Modo de Entrada | Modo Stripe |
|----------------|-------------|
| `one_time` | `payment` |
| `subscription` | `subscription` |

### Resolução de Cliente (3 Etapas)

O endpoint resolve o cliente Stripe em três etapas:

1. **Metadados da sessão**: Verifica se `userId` está nos metadados
2. **Banco de dados**: Busca `stripeCustomerId` do usuário no banco de dados
3. **Criar novo**: Se nenhum cliente existir, cria via `stripe.customers.create()`

```typescript
async function resolveStripeCustomer(
  userId?: string,
  email?: string
): Promise<string> {
  // 1. Verificar usuário autenticado com stripeCustomerId
  if (userId) {
    const user = await getUserById(userId);
    if (user?.stripeCustomerId) return user.stripeCustomerId;
  }

  // 2. Buscar por e-mail no Stripe
  if (email) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) return customers.data[0].id;
  }

  // 3. Criar novo cliente
  const customer = await stripe.customers.create({
    email,
    metadata: userId ? { userId } : {},
  });
  return customer.id;
}
```

### Suporte a Período de Avaliação

Quando `trialDays` e `trialAmountId` são fornecidos, um item de preço adicional é incluído para cobrar durante a avaliação:

```typescript
const lineItems = [{ price: priceId, quantity: 1 }];

if (trialDays && trialAmountId) {
  lineItems.push({ price: trialAmountId, quantity: 1 });
}

const session = await stripe.checkout.sessions.create({
  // ...
  line_items: lineItems,
  subscription_data: {
    trial_period_days: trialDays,
  },
});
```

### Metadados da Sessão

Os metadados da sessão são mesclados: metadados do usuário da sessão + metadados fornecidos no corpo:

```typescript
const sessionMetadata = {
  userId: session.user?.id,
  userEmail: session.user?.email,
  ...metadata, // Metadados do corpo da solicitação
};
```

### Suporte a Múltiplas Moedas

A moeda é determinada pela configuração `STRIPE_CONFIG` com base no `billingInterval`:

```typescript
const currency = STRIPE_CONFIG[billingInterval]?.currency ?? 'usd';
```

### Resposta

```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

---

## GET `/api/stripe/checkout`

Recupera os detalhes de uma sessão de checkout existente pelo seu ID.

### Parâmetros de Consulta

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|------------|----------|
| `session_id` | string | **Sim** | ID da sessão (`cs_...`) |

### Resposta

```typescript
{
  id: string;              // ID da sessão Stripe
  status: string;          // "open" | "complete" | "expired"
  payment_status: string;  // "paid" | "unpaid" | "no_payment_required"
  customer_email: string | null;
  metadata: Record<string, string>;
  amount_total: number | null;   // Em unidades menores (centavos)
  currency: string | null;
}
```

---

## Erros Comuns

| Código | Motivo |
|--------|--------|
| 400 | `priceId`, `successUrl` ou `cancelUrl` ausente |
| 400 | `session_id` ausente (GET) |
| 500 | Erro da API Stripe |

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|----------|
| `STRIPE_SECRET_KEY` | Chave secreta da API Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública da API Stripe |

---

## Arquivos Fonte

| Arquivo | Descrição |
|---------|----------|
| `template/app/api/stripe/checkout/route.ts` | Handler do checkout |
| `template/lib/payment/stripe/stripe.service.ts` | Lógica de checkout |
| `template/lib/payment/stripe/stripe.config.ts` | Configuração e mapa de moedas |
