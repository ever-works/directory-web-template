---
id: webhook-api-endpoints
title: "Endpoints de API de Webhook"
sidebar_label: "Webhooks"
sidebar_position: 27
---

# Endpoints de API de Webhook

Os endpoints de webhook recebem notificações de eventos de provedores de pagamento externos. Cada provedor possui um mecanismo de verificação de assinatura próprio e mapeamento de eventos para o sistema interno.

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|----------|
| POST | `/api/stripe/webhook` | Processar eventos de webhook do Stripe |
| POST | `/api/lemonsqueezy/webhook` | Processar eventos de webhook do LemonSqueezy |
| POST | `/api/polar/webhook` | Processar eventos de webhook do Polar |
| POST | `/api/solidgate/webhook` | Processar eventos de webhook do Solidgate |
| GET | `/api/solidgate/webhook` | Retornar mensagem informativa do Solidgate |

---

## Tipos de Evento Compartilhados

Todos os provedores mapeiam seus eventos nativos para o enum `WebhookEventType`:

| Valor | Descrição |
|-------|----------|
| `subscription_created` | Nova assinatura criada |
| `subscription_updated` | Assinatura atualizada |
| `subscription_cancelled` | Assinatura cancelada |
| `subscription_expired` | Assinatura expirou |
| `subscription_paused` | Assinatura pausada |
| `subscription_trial_started` | Período de teste iniciado |
| `subscription_trial_ended` | Período de teste encerrado |
| `payment_succeeded` | Pagamento realizado com sucesso |
| `payment_failed` | Pagamento falhou |
| `payment_refunded` | Pagamento reembolsado |
| `checkout_completed` | Processo de checkout concluído |
| `order_created` | Novo pedido criado |
| `order_refunded` | Pedido reembolsado |

---

## Webhook do Stripe

**Arquivo:** `template/app/api/stripe/webhook/route.ts`

### Verificação de Assinatura

O cabeçalho `stripe-signature` é validado com `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)`.

Erros de assinatura retornam `400 Bad Request`.

### Mapeamento de Eventos Stripe

| Evento Stripe | WebhookEventType |
|---------------|------------------|
| `checkout.session.completed` | `checkout_completed` |
| `customer.subscription.created` | `subscription_created` |
| `customer.subscription.updated` | `subscription_updated` |
| `customer.subscription.deleted` | `subscription_cancelled` |
| `invoice.paid` | `payment_succeeded` |
| `invoice.payment_failed` | `payment_failed` |
| `invoice.payment_action_required` | `payment_failed` |
| `charge.refunded` | `payment_refunded` |
| `customer.subscription.trial_will_end` | `subscription_trial_ended` |

### Anúncios Patrocinados via Stripe

O webhook do Stripe também trata pagamentos de anúncios patrocinados. Detectado via `metadata.type === "sponsor_ad"` nas sessões de checkout:

```ts
if (session.metadata?.type === 'sponsor_ad') {
  // Rotear para o handler de anúncios patrocinados
  await handleSponsorAdCheckout(session);
}
```

---

## Webhook do LemonSqueezy

**Arquivo:** `template/app/api/lemonsqueezy/webhook/route.ts`

### Verificação de Assinatura

O cabeçalho `x-signature` (HMAC-SHA256 do corpo bruto) é verificado usando `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Mapeamento de Eventos LemonSqueezy

| Evento LemonSqueezy | WebhookEventType |
|---------------------|------------------|
| `subscription_created` | `subscription_created` |
| `subscription_updated` | `subscription_updated` |
| `subscription_cancelled` | `subscription_cancelled` |
| `subscription_expired` | `subscription_expired` |
| `subscription_paused` | `subscription_paused` |
| `subscription_payment_success` | `payment_succeeded` |
| `subscription_payment_failed` | `payment_failed` |
| `subscription_payment_refunded` | `payment_refunded` |
| `order_created` | `order_created` |
| `order_refunded` | `order_refunded` |

---

## Webhook do Polar

**Arquivo:** `template/app/api/polar/webhook/route.ts`

### Verificação de Assinatura

Usa `validateEvent()` do `@polar-sh/sdk/webhooks` com três cabeçalhos requeridos:

| Cabeçalho | Descrição |
|-----------|----------|
| `webhook-signature` | Assinatura HMAC |
| `webhook-timestamp` | Timestamp do evento (prevenindo replays) |
| `webhook-id` | ID único do evento |

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

### Módulo Router Polar

Aproveitando `routeWebhookEvent()` para despachar para handlers específicos do evento:

```ts
import { routeWebhookEvent } from './router';

const result = await routeWebhookEvent(webhookEvent, {
  onSubscriptionCreated: handleSubscriptionCreated,
  onSubscriptionUpdated: handleSubscriptionUpdated,
  // ...
});
```

---

## Webhook do Solidgate

**Arquivo:** `template/app/api/solidgate/webhook/route.ts`

### Verificação de Assinatura

HMAC-SHA512 verificado com `SOLIDGATE_WEBHOOK_SECRET`. Aceita assinatura via cabeçalho `x-signature` ou `solidgate-signature`.

### Idempotência em Memória

IDs de evento processados são armazenados por 24 horas em um `Set` em memória para evitar reprocessamento:

```ts
const processedEvents = new Set<string>();
// Expira automaticamente após 24 horas
```

:::warning Límitação Serverless
A idempotência em memória não persiste entre reinicializações em ambientes serverless. Para produção, use um armazenamento persistente (banco de dados ou cache Redis).
:::

### Mapeamento de Eventos Solidgate

| Tipo de Evento Solidgate | WebhookEventType |
|-------------------------|------------------|
| `payment_approved` | `payment_succeeded` |
| `payment_declined` | `payment_failed` |
| `refund_approved` | `payment_refunded` |
| `subscription_activated` | `subscription_created` |
| `subscription_updated` | `subscription_updated` |
| `subscription_cancelled` | `subscription_cancelled` |

### GET `/api/solidgate/webhook`

Retorna apenas uma mensagem informativa:

```json
{
  "message": "Solidgate webhook endpoint. Send POST requests to process events."
}
```

---

## Arquivos Fonte Relacionados

| Arquivo | Descrição |
|---------|----------|
| `template/app/api/stripe/webhook/route.ts` | Handler do webhook Stripe |
| `template/app/api/lemonsqueezy/webhook/route.ts` | Handler do webhook LemonSqueezy |
| `template/app/api/polar/webhook/route.ts` | Handler do webhook Polar |
| `template/app/api/solidgate/webhook/route.ts` | Handler do webhook Solidgate |
| `template/lib/services/webhook.service.ts` | Lógica de processamento de webhooks |
| `template/lib/types/payment.ts` | Tipos e enum `WebhookEventType` |
