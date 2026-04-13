---
id: polar-deep-dive
title: "Polar — Análise Aprofundada"
sidebar_label: "Polar"
sidebar_position: 6
---

# Polar — Análise Aprofundada

Esta página descreve os endpoints da integração Polar em detalhes: checkout, webhook com verificação de assinatura e roteamento de eventos.

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| POST | `/api/polar/checkout` | Criar uma sessão de checkout Polar |
| GET | `/api/polar/checkout` | Recuperar informações de checkout |
| POST | `/api/polar/webhook` | Receber eventos de webhook Polar |

**Arquivos fonte:**
- `template/app/api/polar/checkout/route.ts`
- `template/app/api/polar/webhook/route.ts`

---

## POST `/api/polar/checkout`

Cria uma sessão de checkout Polar para assinaturas ou pagamentos únicos.

### Autenticação

Requer sessão válida do usuário.

### Corpo da Solicitação

```typescript
{
  priceId: string;              // Obrigatório: ID do preço Polar
  mode?: "one_time" | "subscription"; // Padrão: "subscription"
  successUrl: string;           // Obrigatório: URL de retorno após sucesso
  cancelUrl: string;            // Obrigatório: URL de retorno ao cancelar
  metadata?: Record<string, string | number | boolean>; // Opcional
}
```

### Sanitização de Metadados

O Polar não aceita valores `undefined` nos metadados. Todos os valores são sanitizados antes do envio:

```typescript
const sanitizedMetadata = Object.fromEntries(
  Object.entries(metadata ?? {}).filter(([, v]) => v !== undefined)
);
```

### Resolução de Cliente (3 Etapas)

O endpoint resolve o cliente Polar em três etapas:

1. **Metadados da sessão**: Verifica `userId` nos metadados
2. **Banco de dados**: Busca `polarCustomerId` do usuário
3. **Criar novo**: Cria via `polar.customers.create()`

```typescript
async function resolvePolarCustomer(
  userId?: string,
  email?: string
): Promise<string> {
  if (userId) {
    const user = await getUserById(userId);
    if (user?.polarCustomerId) return user.polarCustomerId;
  }

  if (email) {
    try {
      const customers = await polar.customers.list({ email });
      if (customers.result.items.length > 0) {
        return customers.result.items[0].id;
      }
    } catch {}
  }

  const customer = await polar.customers.create({
    email: email!,
    externalId: userId,
  });
  return customer.id;
}
```

### Resposta

```json
{
  "url": "https://checkout.polar.sh/..."
}
```

---

## GET `/api/polar/checkout`

Recupera informações de uma sessão de checkout Polar.

### Parâmetros de Consulta

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|------------|-----------|
| `session_id` | string | **Sim** | ID da sessão de checkout |

### Resposta

```typescript
{
  id: string;
  status: "open" | "confirmed" | "succeeded" | "failed";
  productId: string;
  priceId: string;
  customerId: string | null;
  customerEmail: string | null;
  metadata: Record<string, string>;
}
```

---

## POST `/api/polar/webhook`

Recebe e processa eventos de webhook do Polar.

### Verificação de Assinatura

Usa `validateEvent()` do SDK `@polar-sh/sdk/webhooks`. Três cabeçalhos são obrigatórios:

| Cabeçalho | Descrição |
|-----------|-----------|
| `webhook-signature` | Assinatura HMAC do payload |
| `webhook-timestamp` | Timestamp Unix (protege contra replays) |
| `webhook-id` | ID único do evento (idempotência) |

```typescript
import { validateEvent } from '@polar-sh/sdk/webhooks';

const rawBody = await request.text();
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET!;

let event: WebhookVerifiedPayload;
try {
  event = validateEvent(rawBody, request.headers, webhookSecret);
} catch (err) {
  return NextResponse.json(
    { error: 'Webhook signature verification failed' },
    { status: 400 }
  );
}
```

### Mapeamento de Eventos Polar

| Evento Polar | WebhookEventType |
|--------------|------------------|
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.active` | `subscription_created` |
| `subscription.canceled` | `subscription_cancelled` |
| `subscription.revoked` | `subscription_expired` |
| `order.created` | `order_created` |
| `checkout.created` | `checkout_completed` |

### Módulo Router

O módulo router despacha eventos para handlers específicos:

```typescript
import { routeWebhookEvent } from './router';

const result = await routeWebhookEvent(event, {
  onSubscriptionCreated: async (subscription) => {
    await WebhookSubscriptionService.activateSubscription({
      userId: subscription.metadata?.userId,
      planId: resolvePlanId(subscription.priceId),
      polarCustomerId: subscription.customerId,
    });
  },
  onSubscriptionCancelled: async (subscription) => {
    await WebhookSubscriptionService.cancelSubscription({
      subscriptionId: subscription.id,
    });
  },
  onOrderCreated: async (order) => {
    await WebhookSubscriptionService.recordPayment(order);
  },
});
```

### Resposta do Webhook

```json
{ "received": true }
```

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `POLAR_ACCESS_TOKEN` | Token de acesso da API Polar |
| `POLAR_WEBHOOK_SECRET` | Segredo para verificação de webhook |
| `POLAR_ORGANIZATION_ID` | ID da organização Polar |

---

## Arquivos Fonte

| Arquivo | Descrição |
|---------|-----------|
| `template/app/api/polar/checkout/route.ts` | Handler de checkout |
| `template/app/api/polar/webhook/route.ts` | Handler de webhook |
| `template/app/api/polar/webhook/router.ts` | Módulo de roteamento de eventos |
| `template/lib/payment/polar/polar.service.ts` | Lógica de serviço |
| `template/lib/payment/polar/polar.client.ts` | Cliente Polar inicializado |
