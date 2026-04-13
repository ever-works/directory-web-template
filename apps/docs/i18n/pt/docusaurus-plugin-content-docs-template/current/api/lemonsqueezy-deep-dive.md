---
id: lemonsqueezy-deep-dive
title: Análise Aprofundada do LemonSqueezy
sidebar_label: LemonSqueezy
sidebar_position: 5
---

# Análise Aprofundada do LemonSqueezy

Esta página abrange a integração completa do LemonSqueezy, incluindo criação de checkout, gerenciamento de assinaturas, processamento de webhooks e sincronização de produtos.

## Visão geral

O LemonSqueezy é um provedor de pagamento merchant-of-record que gerencia cobranças de impostos, conformidade e processamento de pagamentos. A integração usa o fluxo de checkout hospedado do LemonSqueezy, modelo de produto baseado em variantes e sistema de webhooks. Ao contrário do Stripe, o LemonSqueezy não suporta setup intents ou gerenciamento direto de métodos de pagamento — todo o processamento de pagamento ocorre por meio de sua interface hospedada.

## Tabela de Rotas

| Método | Caminho | Autenticação | Descrição |
|--------|---------|-------------|----------|
| `POST` | `/api/lemonsqueezy/checkout` | Sessão obrigatória | Criar sessão de checkout a partir do corpo JSON |
| `GET` | `/api/lemonsqueezy/checkout` | Nenhuma | Criar sessão de checkout a partir dos parâmetros de consulta |
| `POST` | `/api/lemonsqueezy/webhook` | Assinatura obrigatória | Processar eventos de webhook recebidos |

## Criação de Checkout (POST)

### Corpo da Solicitação

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // ID da variante do produto LemonSqueezy
  dark?: boolean;                           // Habilitar checkout no modo escuro
  customPrice?: number;                     // Preço personalizado em centavos (opcional)
  metadata?: Record<string, string>;        // Metadados adicionais
}
```

### Exemplo de Solicitação

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### Como Funciona

1. Autentica o usuário via `auth()`
2. Valida o corpo da solicitação usando `validateCheckoutRequestBody()`
3. Chama `lemonsqueezyProvider.createCustomCheckout()` com metadados do usuário
4. Retorna a URL de checkout

### Implementação do Provedor

O método `createCustomCheckout` cria um checkout do LemonSqueezy com configuração abrangente:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### Resposta de Sucesso (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## Checkout via Parâmetros de Consulta (GET)

O endpoint GET suporta criação de checkouts via parâmetros de consulta para cenários de link direto:

| Parâmetro | Obrigatório | Descrição |
|-----------|------------|----------|
| `variantId` | Sim | ID da variante LemonSqueezy |
| `email` | Sim | E-mail do cliente |
| `customPrice` | Não | Preço personalizado em centavos |
| `metadata` | Não | String JSON de metadados |

## Gerenciamento de Assinaturas

### Criação de Assinaturas

As assinaturas são criadas pelo fluxo de checkout. O método `createSubscription` encapsula a API de checkout do LemonSqueezy:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### Cancelamento de Assinaturas

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### Atualização de Assinaturas

O método de atualização suporta mudanças de plano, pausas, retomadas e reativação:

```typescript
// Mudança de plano via ID de variante
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Pausar assinatura
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Retomar assinatura
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## Processamento de Webhooks

### Verificação de Assinatura

O LemonSqueezy usa HMAC SHA-256 para verificação de assinatura de webhook. O provedor verifica as assinaturas usando a Web Crypto API:

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### Mapeamento de Eventos

| Evento LemonSqueezy | Tipo Interno |
|---------------------|-------------|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

### Estrutura do Manipulador de Webhook

Cada manipulador segue um padrão consistente:

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... registrar resultado
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### Detecção de Anúncio Patrocinado

O LemonSqueezy usa `custom_data` em vez de `metadata` do Stripe:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Gerenciamento de Clientes

O provedor segue o mesmo padrão de resolução de cliente em três etapas de outros provedores:

1. Verificar metadados do usuário para `lemonsqueezy_customer_id`
2. Consultar a tabela `PaymentAccount` do banco de dados
3. Criar um novo cliente via API do LemonSqueezy

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## Tratamento de Erros

| Status | Código de Erro | Causa |
|--------|---------------|-------|
| 400 | `VALIDATION_ERROR` | Corpo ou parâmetros de solicitação inválidos |
| 401 | `Unauthorized` | Sem sessão autenticada |
| 500 | `CONFIGURATION_ERROR` | Variáveis de ambiente ausentes |
| 500 | `INTERNAL_ERROR` | Erro não tratado |
| 503 | `PAYMENT_SERVICE_ERROR` | API do LemonSqueezy indisponível |

## Requisitos de Configuração

| Variável | Obrigatório | Descrição |
|----------|------------|----------|
| `LEMONSQUEEZY_API_KEY` | Sim | Chave de API do LemonSqueezy |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Sim | Segredo de assinatura do webhook |
| `LEMONSQUEEZY_STORE_ID` | Sim | ID numérico da loja |

## Limitações

- **Sem setup intents**: O LemonSqueezy não suporta salvar cartões sem uma compra. O método `createSetupIntent` lança um erro.
- **Sem API de reembolso direta**: Os reembolsos devem ser processados pelo painel do LemonSqueezy.
- **Precificação baseada em variantes**: Os produtos usam IDs de variantes em vez de IDs de preço. Mudanças de plano usam `variantId`.

## Considerações de Segurança

- As assinaturas de webhook são verificadas usando HMAC SHA-256
- O texto do corpo bruto é usado para verificação de assinatura para evitar problemas de re-serialização JSON
- As chaves de API nunca são expostas ao cliente
- O registro no modo de desenvolvimento sanitiza PII (endereços de e-mail são parcialmente ocultados)

## Páginas Relacionadas

- [Análise Aprofundada do Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Análise Aprofundada do Polar](./polar-deep-dive.md)
- [Análise Aprofundada do Solidgate](./solidgate-deep-dive.md)
- [Arquitetura de Provedores de Pagamento](./payment-provider-architecture.md)
