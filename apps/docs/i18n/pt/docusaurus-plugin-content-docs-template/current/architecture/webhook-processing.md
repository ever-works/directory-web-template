---
id: webhook-processing
title: Processamento de webhook
sidebar_label: Webhooks
sidebar_position: 67
---

# Processamento de webhook

## Visão geral

O modelo Ever Works processa webhooks recebidos de três provedores de pagamento: **Stripe**, **Lemon Squeezy** e **Polar**. Cada provedor tem uma rota de API dedicada que verifica assinaturas, normaliza tipos de eventos para um enum `WebhookEventType` comum e despacha para funções de manipulador para gerenciamento de assinaturas, rastreamento de pagamentos e notificações por e-mail.

## Arquitetura

```mermaid
flowchart TD
    A[Payment Provider] -->|POST| B{Which Provider?}

    B -->|stripe-signature header| C[/api/stripe/webhook]
    B -->|x-signature header| D[/api/lemonsqueezy/webhook]
    B -->|webhook-signature header| E[/api/polar/webhook]

    C --> F[Stripe Provider]
    D --> G[LemonSqueezy Provider]
    E --> H[Polar Provider]

    F --> I[Verify Signature]
    G --> I
    H --> I

    I -->|Valid| J[Normalize to WebhookEventType]
    I -->|Invalid| K[400 Bad Request]

    J --> L{Event Type Router}

    L -->|SUBSCRIPTION_CREATED| M[handleSubscriptionCreated]
    L -->|SUBSCRIPTION_UPDATED| N[handleSubscriptionUpdated]
    L -->|SUBSCRIPTION_CANCELLED| O[handleSubscriptionCancelled]
    L -->|PAYMENT_SUCCEEDED| P[handlePaymentSucceeded]
    L -->|PAYMENT_FAILED| Q[handlePaymentFailed]
    L -->|TRIAL_ENDING| R[handleTrialEnding]

    M --> S{Is Sponsor Ad?}
    S -->|Yes| T[Sponsor Ad Handlers]
    S -->|No| U[WebhookSubscriptionService]
    U --> V[Database Update]
    U --> W[Email Notification]
```

## Arquivos de origem

|Arquivo|Objetivo|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Manipulador de webhook de distribuição|
|`template/app/api/lemonsqueezy/webhook/route.ts`|Manipulador de webhook LemonSqueezy|
|`template/app/api/polar/webhook/route.ts`|Ponto de entrada do webhook Polar|
|`template/app/api/polar/webhook/router.ts`|Roteamento de eventos polares|
|`template/app/api/polar/webhook/handlers.ts`|Manipuladores de eventos polares|
|`template/app/api/polar/webhook/types.ts`|Definições de tipo de webhook Polar|
|`template/app/api/polar/webhook/utils.ts`|Funções utilitárias polares|

## Tipos de eventos comuns

Todos os provedores normalizam seus eventos para o enum `WebhookEventType` compartilhado:

|WebhookEventType|Listra|Espremedor de Limão|Polar|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Processamento de Stripe Webhook

### Verificação de assinatura

```typescript
export async function POST(request: NextRequest) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    const stripeProvider = getOrCreateStripeProvider();
    const webhookResult = await stripeProvider.handleWebhook(body, signature);

    if (!webhookResult.received) {
        return NextResponse.json({ error: 'Webhook not processed' }, { status: 400 });
    }

    // Route to handler based on event type
    switch (webhookResult.type) {
        case WebhookEventType.SUBSCRIPTION_CREATED:
            await handleSubscriptionCreated(webhookResult.data);
            break;
        // ... other cases
    }

    return NextResponse.json({ received: true });
}
```

### Padrão de manipulador (faixa)

Cada manipulador segue um padrão consistente:

1. Verifique se é uma assinatura de anúncio de patrocinador (tratamento especial)
2. Atualizar registros de assinatura via `WebhookSubscriptionService`
3. Extraia informações do cliente e prepare dados de e-mail
4. Enviar e-mail de notificação apropriado
5. Registrar sucesso ou falha

```typescript
async function handleSubscriptionCreated(data: any) {
    // Check for sponsor ad
    if (isSponsorAdSubscription(data)) {
        await handleSponsorAdActivation(data);
        return;
    }

    // Update database
    await webhookSubscriptionService.handleSubscriptionCreated(data);

    // Send email notification
    const customerInfo = extractCustomerInfo(data);
    const emailData = {
        customerName: customerInfo.customerName,
        planName: getPlanName(priceId),
        amount: formatAmount(unitAmount, currency),
        // ...
    };
    await paymentEmailService.sendNewSubscriptionEmail(emailData);
}
```

## Processamento de webhook LemonSqueezy

### Mapeamento de tipo de evento

LemonSqueezy usa nomes de eventos diferentes que são mapeados para o enum comum:

```typescript
function mapLemonSqueezyEventType(lemonsqueezyEventType: string): string {
    const eventMapping: Record<string, string> = {
        'subscription_created': WebhookEventType.SUBSCRIPTION_CREATED,
        'subscription_updated': WebhookEventType.SUBSCRIPTION_UPDATED,
        'subscription_cancelled': WebhookEventType.SUBSCRIPTION_CANCELLED,
        'subscription_payment_success': WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED,
        'subscription_payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
        'order_created': WebhookEventType.PAYMENT_SUCCEEDED,
        'order_refunded': WebhookEventType.REFUND_SUCCEEDED,
    };
    return eventMapping[lemonsqueezyEventType] || lemonsqueezyEventType;
}
```

### Acesso a dados personalizados

LemonSqueezy usa `custom_data` e `meta.custom_data` para metadados (em vez de `metadata` do Stripe):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Processamento de Webhook Polar

Polar usa uma arquitetura mais estruturada com arquivos separados para roteamento, manuseio e tipos.

### Padrão de roteador

```typescript
// router.ts
function isValidWebhookEventType(eventType: string): eventType is WebhookEventType {
    const allowedEventTypes: Set<WebhookEventType> = new Set([
        WebhookEventType.SUBSCRIPTION_CREATED,
        WebhookEventType.SUBSCRIPTION_UPDATED,
        // ... all handled types
    ]);
    return allowedEventTypes.has(eventType as WebhookEventType);
}

export async function routeWebhookEvent(
    eventType: string,
    data: PolarWebhookData
): Promise<void> {
    if (!isValidWebhookEventType(eventType)) {
        logger.warn('Invalid or unhandled webhook event type', { eventType });
        return;
    }

    const eventHandlers: Partial<Record<WebhookEventType, Handler>> = {
        [WebhookEventType.SUBSCRIPTION_CREATED]: handleSubscriptionCreated,
        [WebhookEventType.SUBSCRIPTION_UPDATED]: handleSubscriptionUpdated,
        // ... handler map
    };

    const handler = eventHandlers[eventType];
    if (handler) await handler(data);
}
```

O roteador valida os tipos de eventos em uma lista de permissões antes do envio, evitando chamadas de métodos dinâmicos não validadas.

### Verificação de assinatura (Polar)

```typescript
const WEBHOOK_SIGNATURE_HEADER = 'webhook-signature';
const WEBHOOK_TIMESTAMP_HEADER = 'webhook-timestamp';
const WEBHOOK_ID_HEADER = 'webhook-id';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);

    // Validate payload structure
    if (!validateWebhookPayload(body)) {
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Verify signature with all three headers
    const polarProvider = getOrCreatePolarProvider();
    const webhookResult = await polarProvider.handleWebhook(
        body,
        signatureHeader,
        bodyText,           // Raw body for signature verification
        timestampHeader,
        webhookIdHeader
    );

    await routeWebhookEvent(webhookResult.type, webhookResult.data);
    return NextResponse.json({ received: true });
}
```

### Tratamento de e-mail resiliente

Os manipuladores Polar agrupam operações de e-mail em blocos try/catch aninhados para que falhas de e-mail nunca falhem no webhook:

```typescript
export async function handleSubscriptionCreated(data: PolarWebhookData): Promise<void> {
    try {
        await webhookSubscriptionService.handleSubscriptionCreated(data);

        try {
            // Email sending - isolated failure domain
            const emailResult = await paymentEmailService.sendNewSubscriptionEmail(emailData);
        } catch (emailError) {
            // Log but don't fail the webhook
            logger.warn('Skipping email notification due to configuration error');
        }
    } catch (error) {
        logger.error('Error handling subscription created');
        throw error;  // Re-throw: database failures should fail the webhook
    }
}
```

## Tratamento de anúncios do patrocinador

Todos os três provedores detectam assinaturas de anúncios de patrocinadores por meio de metadados e os encaminham para manipuladores dedicados:

|Ação|Função|Descrição|
|--------|----------|-------------|
|Pagamento confirmado|`handleSponsorAdActivation()`|Define o status do anúncio como revisão pendente|
|Assinatura cancelada|`handleSponsorAdCancellation()`|Cancela o anúncio do patrocinador|
|Pagamento renovado|`handleSponsorAdRenewal()`|Estende a data de término do anúncio|

## Melhores práticas

1. **Sempre verifique assinaturas** – nunca processe webhooks não verificados
2. **Use o corpo bruto para verificação de assinatura** – analise JSON separadamente após a verificação
3. **Retorne 200 rapidamente** – os provedores de pagamento tentam novamente em respostas que não sejam 2xx
4. **Isolar falhas de e-mail** - agrupar o envio de e-mail em try/catch aninhados
5. **Validar tipos de eventos** – verifique uma lista de permissões antes de enviar
6. **Registro com dados estruturados**: inclui IDs e tipos de eventos em todas as entradas de registro
7. **Use provedores singleton** -- `getOrCreateStripeProvider()` evita múltiplas instâncias
