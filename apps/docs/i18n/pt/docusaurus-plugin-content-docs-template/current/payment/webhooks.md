---
id: webhooks
title: Webhooks de pagamento
sidebar_label: Webhooks
sidebar_position: 7
---

# Webhooks de pagamento

O modelo Ever Works processa webhooks de pagamento de todos os quatro provedores suportados por meio de rotas de API dedicadas. Cada endpoint de webhook lida com verificação de assinatura, roteamento de eventos, gerenciamento do ciclo de vida de assinatura e notificações por email.

## Locais de origem

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Arquitetura de webhook

Todas as rotas de webhook do provedor seguem o mesmo padrão:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Cada rota delega a lógica de negócios ao `WebhookSubscriptionService` compartilhado, que normaliza os dados específicos do provedor em um formato comum antes de atualizar o banco de dados.

## Tipos de eventos de webhook

O modelo define um conjunto abrangente de tipos de eventos que todos os provedores mapeiam:

```ts
enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',

  // Stripe-specific
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent_succeeded',
  CHARGE_SUCCEEDED = 'charge_succeeded',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',

  // Billing portal
  BILLING_PORTAL_SESSION_CREATED = 'billing_portal_session_created',
  // ... additional billing portal events
}
```

## Manipulador de Webhook Solidgate

### Ponto final

```
POST /api/solidgate/webhook
```

### Verificação de assinatura

A rota do webhook Solidgate lê a assinatura do cabeçalho `x-signature` ou `solidgate-signature` :

```ts
const headersList = await headers();
const signature =
  headersList.get('x-signature') ||
  headersList.get('solidgate-signature');

if (!signature) {
  return NextResponse.json(
    { error: 'No signature provided' },
    { status: 400 }
  );
}
```

O provedor verifica a assinatura usando HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Idempotência

O manipulador implementa verificação de idempotência na memória para evitar processamento duplicado de eventos:

```ts
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check for duplicates
const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true });
}

// Track and auto-expire
if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
Em um ambiente de produção sem servidor, substitua o `Set` na memória por Redis ou uma tabela de banco de dados para obter idempotência confiável entre instâncias.
:::

### Roteamento de eventos

Após a verificação, os eventos são roteados para manipuladores específicos:

```ts
switch (webhookResult.type) {
  case 'payment_succeeded':
    await handlePaymentSucceeded(webhookResult.data);
    break;
  case 'payment_failed':
    await handlePaymentFailed(webhookResult.data);
    break;
  case 'subscription_created':
    await handleSubscriptionCreated(webhookResult.data);
    break;
  case 'subscription_updated':
    await handleSubscriptionUpdated(webhookResult.data);
    break;
  case 'subscription_cancelled':
    await handleSubscriptionCancelled(webhookResult.data);
    break;
  case 'subscription_payment_succeeded':
    await handleSubscriptionPaymentSucceeded(webhookResult.data);
    break;
  case 'subscription_payment_failed':
    await handleSubscriptionPaymentFailed(webhookResult.data);
    break;
  case 'subscription_trial_ending':
    await handleSubscriptionTrialEnding(webhookResult.data);
    break;
  default:
    console.log(`Unhandled webhook event: ${webhookResult.type}`);
}
```

### Mapeamento de eventos Solidgate

O provedor mapeia nomes de eventos específicos do Solidgate para os tipos genéricos do modelo:

| Evento Solidgate | Evento de modelo |
|-----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## WebhookSubscriptionService

Todos os manipuladores de webhook delegam para o `WebhookSubscriptionService` compartilhado. Este serviço é instanciado por provedor:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Normalização de dados

O serviço normaliza cargas de webhook em um formato `WebhookSubscriptionData` comum:

```ts
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  priceId: string;
  customerId: string;
  currency: string;
  amount: number;
  interval: string;
  intervalCount: number;
  trialStart: number;
  trialEnd: number;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  cancelReason: string;
  metadata: Record<string, any>;
  // ... additional fields
}
```

### Métodos de manipulador

O serviço fornece manipuladores para cada tipo de evento de webhook:

| Método | Evento | Descrição |
|--------|-------|------------|
| `handlePaymentSucceeded` | Pagamento concluído | Atualiza registro de pagamento, aciona e-mail de confirmação |
| `handlePaymentFailed` | Falha no pagamento | Falha nos logs, pode notificar o usuário |
| `handleSubscriptionCreated` | Nova assinatura | Cria registro de assinatura em banco de dados |
| `handleSubscriptionUpdated` | Mudança de plano | Atualiza detalhes da assinatura |
| `handleSubscriptionCancelled` | Cancelamento | Atualiza status, define data de cancelamento |
| `handleSubscriptionPaymentSucceeded` | Pagamento recorrente | Estende o período de assinatura |
| `handleSubscriptionPaymentFailed` | Falha recorrente | Marca como vencido, notifica o usuário |
| `handleSubscriptionTrialEnding` | Fim do teste | Envia notificação de encerramento do teste |

## Formato de resposta do webhook

Todos os endpoints do webhook retornam um formato consistente:

**Sucesso (200):**
```json
{ "received": true }
```

**Erro do cliente (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Retornar o status 200 é fundamental para confirmar o recebimento. Se 400 ou 500 forem retornados, os provedores de pagamento normalmente tentarão novamente a entrega do webhook.

## OBTER ponto final

Cada rota de webhook também lida com solicitações GET para fins de diagnóstico:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Configurando Webhooks em painéis de provedores

### Solidgate

1. Navegue até o painel do Solidgate
2. Vá para **Configurações** e depois **Webhooks**
3. Adicione o URL do seu webhook: `https://yourdomain.com/api/solidgate/webhook` 4. Selecione eventos para assinar: pagamentos, assinaturas, reembolsos
5. Copie o segredo do webhook para sua variável de ambiente `SOLIDGATE_WEBHOOK_SECRET` ### Padrão de URL do webhook

Cada provedor tem seu próprio endpoint dedicado:

| Provedor | URL do webhook |
|----------|------------|
| Listra | `/api/stripe/webhook` |
| Solidgate | `/api/solidgate/webhook` |
| Espremedor de Limão | `/api/lemonsqueezy/webhook` |
| polares | `/api/polar/webhook` |

## Testando webhooks localmente

### Usando ngrok ou túnel semelhante

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

Em seguida, configure a URL do ngrok como seu endpoint do webhook no painel do provedor (por exemplo, `https://abc123.ngrok.io/api/solidgate/webhook` ).

### Teste manual com curl

```bash
# Test the GET diagnostic endpoint
curl http://localhost:3000/api/solidgate/webhook

# Send a test webhook (requires valid signature)
curl -X POST http://localhost:3000/api/solidgate/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: your-computed-hmac-signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_456",
      "amount": 2999,
      "currency": "USD"
    }
  }'
```

## Tratamento de erros

Cada função do manipulador é encapsulada em try/catch para evitar que uma única falha do manipulador cause uma resposta 400/500:

```ts
async function handlePaymentSucceeded(data: any) {
  console.log('Payment succeeded:', data.id);
  try {
    await webhookSubscriptionService.handlePaymentSucceeded(data);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}
```

Isso garante que o webhook seja sempre confirmado com uma resposta 200, mesmo se o processamento interno falhar. Os erros de processamento são registrados para investigação sem causar loops de repetição do provedor.

## Considerações de segurança

- **Sempre verifique assinaturas** - nunca processe cargas úteis de webhook sem validação de assinatura
- **Usar corpo bruto** - analisa o texto bruto da solicitação para verificação de assinatura, não o corpo analisado em JSON
- **Idempotência** – implemente a desduplicação para lidar com novas tentativas do provedor normalmente
- **Registro** – registra IDs de webhook e tipos de eventos para trilhas de auditoria
- **Somente HTTPS** – os endpoints do webhook devem ser servidos por HTTPS na produção
