---
id: stripe-webhook-deep-dive
title: "Webhook Stripe — Análise Aprofundada"
sidebar_label: "Webhooks Stripe"
sidebar_position: 4
---

# Webhook Stripe — Análise Aprofundada

Esta página descreve em detalhes o processamento de webhooks do Stripe, incluindo verificação de assinatura, mapeamento de eventos e lógica de handler.

## Endpoint

| Método | Caminho | Descrição |
|--------|---------|----------|
| POST | `/api/stripe/webhook` | Receber e processar eventos Stripe |

**Arquivo fonte:** `template/app/api/stripe/webhook/route.ts`

---

## Verificação de Assinatura

Todo webhook Stripe deve incluir o cabeçalho `stripe-signature`. O corpo bruto (não parseado) é usado para verificação:

```typescript
const rawBody = await request.text();
const signature = request.headers.get('stripe-signature');

let event: Stripe.Event;
try {
  event = stripe.webhooks.constructEvent(
    rawBody,
    signature!,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
} catch (err) {
  return NextResponse.json(
    { error: 'Webhook signature verification failed' },
    { status: 400 }
  );
}
```

---

## Mapeamento de Eventos

| Evento Stripe | WebhookEventType | Ação Executada |
|---------------|------------------|----------------|
| `checkout.session.completed` | `checkout_completed` | Ativa plano do usuário, envia e-mail de boas-vindas |
| `customer.subscription.created` | `subscription_created` | Registra assinatura no banco de dados |
| `customer.subscription.updated` | `subscription_updated` | Atualiza status e período no banco de dados |
| `customer.subscription.deleted` | `subscription_cancelled` | Cancela assinatura, reverte para plano gratuito |
| `invoice.paid` | `payment_succeeded` | Registra pagamento bem-sucedido |
| `invoice.payment_failed` | `payment_failed` | Registra falha de pagamento, envia notificação |
| `invoice.payment_action_required` | `payment_failed` | Requer ação do usuário |
| `charge.refunded` | `payment_refunded` | Registra reembolso |
| `customer.subscription.trial_will_end` | `subscription_trial_ended` | Notifica sobre fim de avaliação |

---

## Fluxo do Handler de Checkout

Quando um evento `checkout.session.completed` é recebido:

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Detectar anúncios patrocinados
  if (session.metadata?.type === 'sponsor_ad') {
    await handleSponsorAdCheckout(session);
    return;
  }

  // Resolver usuário do metadado ou e-mail do cliente
  const userId = session.metadata?.userId;
  const customerEmail = session.customer_details?.email;

  // Determinar plano a partir do preço
  const planFeatures = PLAN_FEATURES_MAP[priceId];

  // Ativar plano no banco de dados
  await WebhookSubscriptionService.activateSubscription({
    userId,
    planId: planFeatures.planId,
    stripeCustomerId: session.customer as string,
    subscriptionId: session.subscription as string,
  });

  // Enviar e-mail de boas-vindas com detalhes do plano
  await sendWelcomeEmail({
    email: customerEmail,
    planName: planFeatures.name,
    features: planFeatures.features,
  });
}
```

---

## Detecção de Anúncios Patrocinados

Pagamentos de anúncios patrocinados são distinguidos por `metadata.type === "sponsor_ad"` na sessão de checkout:

```typescript
// Durante a criação do checkout de anúncios patrocinados
const session = await stripe.checkout.sessions.create({
  // ...
  metadata: {
    type: 'sponsor_ad',
    sponsorAdId: ad.id,
    userId: user.id,
  },
});

// No handler do webhook
if (session.metadata?.type === 'sponsor_ad') {
  await SponsorAdService.activateAfterPayment({
    sponsorAdId: session.metadata.sponsorAdId,
    sessionId: session.id,
  });
}
```

---

## Mapa de Funcionalidades do Plano

Um mapa estático associa IDs de preço Stripe às informações do plano para e-mails de boas-vindas:

```typescript
const PLAN_FEATURES_MAP: Record<string, PlanFeatures> = {
  'price_standard_monthly': {
    planId: 'standard',
    name: 'Standard Plan',
    billingInterval: 'monthly',
    features: ['Feature A', 'Feature B'],
  },
  'price_premium_yearly': {
    planId: 'premium',
    name: 'Premium Plan',
    billingInterval: 'yearly',
    features: ['Feature A', 'Feature B', 'Feature C'],
  },
  // ... outros preços
};
```

---

## Resposta do Webhook

O endpoint retorna `200 OK` para todos os eventos processados com sucesso:

```json
{ "received": true }
```

Erros de verificação de assinatura retornam `400 Bad Request`.

:::tip Boas Práticas
Sempre retorne `200` para eventos recebidos, mesmo que você não os processe. O Stripe retentará a entrega em caso de erros `5xx`.
:::

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|----------|
| `STRIPE_SECRET_KEY` | Chave secreta da API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do webhook (`whsec_...`) |

---

## Arquivos Fonte

| Arquivo | Descrição |
|---------|----------|
| `template/app/api/stripe/webhook/route.ts` | Handler principal do webhook |
| `template/lib/services/webhook-subscription.service.ts` | Serviço de processamento de assinaturas |
| `template/lib/payment/stripe/stripe.client.ts` | Cliente Stripe inicializado |
