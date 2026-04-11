---
id: solidgate
title: Integração Solidgate
sidebar_label: Solidgate
sidebar_position: 5
---

# Integração Solidgate

Solidgate é um dos quatro provedores de pagamento suportados no modelo Ever Works. Ele fornece sessões de checkout, manipulação de webhook, gerenciamento de assinaturas e suporte multimoeda por meio de uma interface de provedor unificada.

## Locais de origem

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## Variáveis de ambiente

Configure o Solidgate definindo as seguintes variáveis de ambiente:

```bash
# Required
SOLIDGATE_API_KEY=your_api_key
SOLIDGATE_SECRET_KEY=your_secret_key
SOLIDGATE_MERCHANT_ID=your_merchant_id
SOLIDGATE_WEBHOOK_SECRET=your_webhook_secret

# Optional
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=your_publishable_key
SOLIDGATE_API_BASE_URL=https://api.solidgate.com/v1
```

O `ConfigManager` em `payment-provider-manager.ts` valida-os no primeiro acesso. Se alguma variável obrigatória estiver faltando, será gerado um erro com uma mensagem descritiva:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## Arquitetura do provedor

O `SolidgateProvider` implementa o `PaymentProviderInterface` , tornando-o intercambiável com Stripe, LemonSqueezy e Polar:

```ts
export class SolidgateProvider implements PaymentProviderInterface {
  private apiKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private publishableKey: string;
  private apiBaseUrl: string;
  private merchantId: string;

  constructor(config: PaymentProviderConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey || '';
    this.webhookSecret = config.webhookSecret || '';
    this.publishableKey = config.options?.publishableKey || '';
    this.apiBaseUrl = config.options?.apiBaseUrl || SOLIDGATE_API_BASE_URL;
    this.merchantId = config.options?.merchantId || '';
  }
  // ... interface methods
}
```

### Inicialização

Acesse o provedor Solidgate através do gerenciador singleton:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## Fluxo de check-out

### 1. Cliente cria checkout

O cliente inicia uma finalização de compra postando no endpoint da API:

```ts
const response = await fetch('/api/solidgate/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 29.99,
    currency: 'USD',
    mode: 'one_time',          // or 'subscription'
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      planId: 'pro_plan',
      planName: 'Pro Plan',
    },
  }),
});
```

### 2. Servidor valida e cria intenção de pagamento

A rota de checkout ( `app/api/solidgate/checkout/route.ts` ) executa estas etapas:

1. **Autentica** o usuário via `auth()` (sessão NextAuth)
2. **Valida** o corpo da solicitação com Zod:
   ```ts
   const checkoutSchema = z.object({
     quantidade: z.número().positivo(),
     moeda: z.string().default('USD'),
     modo: z.enum(['one_time', 'subscrição']).default('one_time'),
     URL de sucesso: z.string().url(),
     cancelarUrl: z.string().url(),
     metadados: z.record(z.string(), z.any()).opcional(),
   });
   ```
3. **Recupera ou cria** um ID de cliente Solidgate
4. **Cria uma intenção de pagamento** por meio da API Solidgate
5. **Retorna** o ID de pagamento e o segredo do cliente para o SDK

### 3. Estrutura de resposta

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_generated-uuid_secret"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

### 4. Cliente entrega o formulário de pagamento

Use o ID de intenção de pagamento retornado para inicializar o Solidgate React SDK.

## Integração React SDK

O modelo envolve o `@solidgate/react-sdk` oficial em um componente personalizado:

```tsx
// lib/payment/ui/solidgate/solidgate-elements.tsx
import Payment from '@solidgate/react-sdk';

export function SolidgatePaymentForm({
  onSuccess,
  onError,
  merchantId,
  paymentIntent,
  signature,
}: SolidgateElementsWrapperProps) {
  const merchantData = {
    merchant: merchantId,
    signature: signature,
    paymentIntent: paymentIntent,
  };

  return (
    <div className="solidgate-payment-form space-y-4">
      <Payment
        merchantData={merchantData}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

O método `SolidgateProvider.getUIComponents()` injeta automaticamente o ID do comerciante, a intenção de pagamento e a assinatura HMAC no wrapper:

```ts
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(
      paymentIntent, merchantId
    );

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature,
    });
  };

  return {
    PaymentForm: SolidgatePaymentFormWithConfig,
    logo: '/assets/payment/solidgate/solidgate-logo.svg',
    cardBrands: solidgateCardBrands,
    supportedPaymentMethods: ['card'],
    translations: solidgateTranslations,
  };
}
```

## Geração de Assinatura

Solidgate requer assinaturas HMAC-SHA512 para autenticação de API e verificação de webhook:

```ts
// Generic signature
private generateSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha512', secret)
    .update(data)
    .digest('hex');
}

// Payment intent signature for the React SDK
private generatePaymentIntentSignature(
  paymentIntent: string,
  merchantId: string
): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto
    .createHmac('sha512', this.secretKey)
    .update(data)
    .digest('hex');
}
```

## Gestão de Clientes

O provedor segue uma estratégia de pesquisa de três níveis para IDs de clientes:

1. **Metadados do usuário** -- marque `user.user_metadata.solidgate_customer_id` 2. **Banco de dados** -- consulte a tabela `PaymentAccount` via `paymentAccountClient` 3. **Criar novo** -- chame a API Solidgate `/customers` e sincronize de volta com o banco de dados

```ts
async getCustomerId(user: User | null): Promise<string | null> {
  // 1. Check metadata
  const fromMetadata = this.extractCustomerIdFromMetadata(user);
  if (fromMetadata) return fromMetadata;

  // 2. Check database
  const fromDatabase = await this.retrieveCustomerIdFromDatabase(user.id);
  if (fromDatabase) return fromDatabase;

  // 3. Create new customer
  const newCustomer = await this.createNewSolidgateCustomer(user);
  await this.synchronizePaymentAccount(user.id, newCustomer.id);
  return newCustomer.id;
}
```

## Gerenciamento de assinaturas

### Criar assinatura

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### Cancelar assinatura

O provedor oferece suporte ao cancelamento imediato e no final do período:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

O método cancel seleciona o endpoint de API apropriado com base na sinalização:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Mapeamento de status

Os status de assinatura do Solidgate são mapeados para o enum `SubscriptionStatus` do modelo:

| Status do Solidgate | Status do modelo |
|------------------|-----------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## Marcas de cartões suportadas

O provedor declara suporte para Visa, Mastercard, Amex e Discover com ícones de tema claro/escuro:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## Localização

O provedor inclui traduções integradas para inglês e francês:

```ts
const solidgateTranslations = {
  en: {
    cardNumber: 'Card number',
    cardExpiry: 'Expiry date',
    cardCvc: 'CVV',
    submit: 'Pay securely',
    processingPayment: 'Processing your payment...',
    paymentSuccessful: 'Payment completed successfully',
    paymentFailed: 'Your payment could not be processed',
  },
  fr: {
    cardNumber: 'Numero de carte',
    cardExpiry: "Date d'expiration",
    // ...
  },
};
```

## Reembolsos

Emitir um reembolso total ou parcial através do provedor:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

Os valores são convertidos em centavos antes de serem enviados para a API Solidgate.

## Tratamento de erros

Todos os métodos do provedor usam tratamento de erros consistente com um registrador estruturado:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

Os erros da API incluem o código de status HTTP e o corpo da resposta para depuração:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
