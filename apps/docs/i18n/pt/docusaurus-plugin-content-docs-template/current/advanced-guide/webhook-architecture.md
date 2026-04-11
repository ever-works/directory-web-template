---
id: webhook-architecture
title: Arquitetura de webhook
sidebar_label: Webhooks
sidebar_position: 3
---

# Arquitetura de webhook

Este guia aborda o sistema de tratamento de webhook usado para processar eventos de serviços externos como Stripe, LemonSqueezy e outros provedores de pagamento, incluindo verificação de assinatura, roteamento de eventos, idempotência e tratamento de novas tentativas.

## Visão geral da arquitetura

```
Webhook Processing Pipeline
=============================

  External Service (Stripe, LemonSqueezy, etc.)
       |
       | POST /api/webhook/{provider}
       v
  +------------------------+
  | Signature Verification |  <-- HMAC / asymmetric verification
  +------------------------+
       |
       v
  +------------------------+
  | Raw Body Parsing       |  <-- Read raw body for signature check
  +------------------------+
       |
       v
  +------------------------+
  | Event Routing          |  <-- Map event type to handler
  +------------------------+
       |
       v
  +------------------------+
  | Idempotency Check      |  <-- Prevent duplicate processing
  +------------------------+
       |
       v
  +------------------------+
  | Event Handler          |  <-- Business logic execution
  +------------------------+
       |
       v
  +------------------------+
  | Response (200 / 4xx)   |  <-- Acknowledge receipt
  +------------------------+
```

## Webhooks do provedor de pagamento

O modelo usa o padrão `PaymentServiceManager` para oferecer suporte a vários provedores de pagamento:

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;

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
}
```

### Padrão de manipulador de rota do Webhook

```typescript
// app/api/webhook/stripe/route.ts (typical pattern)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Step 2: Verify webhook signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Step 3: Route to appropriate handler
  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler failed:', error);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }
}
```

## Verificação de assinatura

### Stripe Webhooks

Stripe usa assinaturas HMAC-SHA256 com carimbo de data/hora para evitar ataques de repetição:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### Webhooks LemonSqueezy

```typescript
// HMAC verification for LemonSqueezy
import crypto from 'crypto';

function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## Roteamento de eventos

### Mapeamento de tipo de evento para manipulador

```typescript
type WebhookHandler = (event: WebhookEvent) => Promise<void>;

const eventHandlers: Record<string, WebhookHandler> = {
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Payment events
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,

  // Checkout events
  'checkout.session.completed': handleCheckoutCompleted,
};

async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  const handler = eventHandlers[event.type];

  if (!handler) {
    console.log(`Unhandled webhook event type: ${event.type}`);
    return; // Return 200 for unhandled events
  }

  await handler(event);
}
```

## Idempotência

### Prevenção de processamento duplicado

Os provedores de webhook podem reenviar eventos. Use o ID do evento para evitar processamento duplicado:

```typescript
async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  // Check if event was already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  if (existing) {
    console.log(`Duplicate webhook event: ${event.id}`);
    return;
  }

  // Record event before processing
  await db.insert(webhookEvents).values({
    eventId: event.id,
    type: event.type,
    status: 'processing',
    receivedAt: new Date(),
  });

  try {
    const handler = eventHandlers[event.type];
    if (handler) await handler(event);

    await db.update(webhookEvents)
      .set({ status: 'completed' })
      .where(eq(webhookEvents.eventId, event.id));
  } catch (error) {
    await db.update(webhookEvents)
      .set({ status: 'failed', error: String(error) })
      .where(eq(webhookEvents.eventId, event.id));
    throw error;
  }
}
```

## Tentar novamente o tratamento

### Comportamento de nova tentativa do provedor

| Provedor | Agendamento de novas tentativas | Máximo de tentativas | Tempo limite |
|----------|---------------|------------|---------|
| Listra | Recuo exponencial em 3 dias | ~16 tentativas | 20 segundos |
| Espremedor de Limão | Recuo exponencial | 5 tentativas | 15 segundos |

### Melhores práticas para manipuladores seguros para novas tentativas

1. **Devolva 200 rapidamente**: confirme o recebimento em 5 segundos. Descarregue o processamento pesado.
2. **Manipuladores idempotentes**: certifique-se de que o reprocessamento do mesmo evento produza o mesmo resultado.
3. **Retornar 4xx para falhas permanentes**: Retornar 400 para assinaturas inválidas. O provedor não tentará novamente.
4. **Retorne 5xx para falhas transitórias**: Retorne 500 se seu banco de dados estiver temporariamente indisponível. O provedor tentará novamente.

## Padrão de fila de cartas mortas

Para eventos que falham repetidamente no processamento, implemente um padrão de mensagens mortas:

```typescript
async function processWithDLQ(event: WebhookEvent): Promise<void> {
  const MAX_ATTEMPTS = 3;

  const record = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  const attempts = (record?.attempts ?? 0) + 1;

  if (attempts > MAX_ATTEMPTS) {
    // Move to dead letter queue for manual inspection
    await db.insert(deadLetterQueue).values({
      eventId: event.id,
      type: event.type,
      payload: JSON.stringify(event),
      failedAt: new Date(),
      attempts,
    });
    console.error(`Event ${event.id} moved to dead letter queue after ${MAX_ATTEMPTS} attempts`);
    return;
  }

  // Attempt processing...
}
```

## Considerações de segurança

1. **Sempre verifique as assinaturas** antes de processar qualquer carga útil do webhook.
2. **Use comparação segura de temporização** ( `crypto.timingSafeEqual` ) para evitar ataques de temporização.
3. **Leia o corpo bruto** antes da análise JSON – a verificação da assinatura requer os bytes exatos recebidos.
4. **Restringir os endpoints do webhook** somente ao POST.
5. **Não exponha segredos do webhook** em códigos ou logs do lado do cliente.
6. **Valide os dados do evento** antes de agir sobre eles – não confie cegamente nas cargas úteis do webhook.

## Considerações de desempenho

1. **Reconhecimento rápido**: Retorna 200 dentro da janela de tempo limite do provedor. Transfira o trabalho pesado para trabalhos em segundo plano.
2. **Gravações no banco de dados**: Minimize as operações do banco de dados no manipulador de webhook. Atualizações em lote sempre que possível.
3. **Registro**: registre IDs e tipos de eventos para depuração, mas evite registrar cargas completas (pode conter PII).

## Solução de problemas

### A verificação da assinatura falha

1. Certifique-se de ler o **corpo da solicitação bruta** (não analisado JSON).
2. Verifique se o segredo do webhook corresponde ao do painel do seu provedor.
3. Verifique se não há nenhum middleware modificando o corpo da solicitação antes que ela chegue ao manipulador.

### Eventos duplicados processados

1. Implemente a idempotência usando o ID do evento conforme descrito acima.
2. Verifique a tabela `webhookEvents` para ver se há entradas duplicadas.
3. Use restrições exclusivas no nível do banco de dados na coluna de ID do evento.

### Tempo limite dos eventos

1. Mova o processamento pesado para trabalhos em segundo plano usando `BackgroundJobManager` .
2. Reconheça o webhook imediatamente e processe de forma assíncrona.
3. Aumente o tempo limite para chamadas de API externas, se necessário.

## Documentação Relacionada

- [Padrões de recuperação de erros](./error-recovery-patterns.md)
- [Arquitetura de limitação de taxa](./rate-limiting-architecture.md)
- [Arquitetura de cliente API](./api-client-architecture.md)
