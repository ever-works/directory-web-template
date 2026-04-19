---
id: solidgate-deep-dive
title: "Solidgate – szczegółowe omówienie"
sidebar_label: "Solidgate"
---

# Solidgate – szczegółowe omówienie

Ta strona omawia kompletną integrację Solidgate, w tym tworzenie sesji kasy, przetwarzanie webhooków, weryfikację płatności i osadzony formularz płatności.

## Przegląd

Solidgate to dostawca infrastruktury płatniczej obsługujący zarówno hostowane przepływy kasowe, jak i osadzalny React SDK dla inline'owych formularzy płatności. Integracja tworzy intencje płatności przez API Solidgate i obsługuje przetwarzanie zdarzeń webhook z ochroną przed idempotencją. Solidgate używa HMAC-SHA512 do weryfikacji podpisów webhooków.

## Tabela tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `POST` | `/api/solidgate/checkout` | Wymagana sesja | Utwórz sesję kasy / intencję płatności |
| `POST` | `/api/solidgate/webhook` | Wymagany podpis | Przetwórz przychodzące zdarzenia webhooka |
| `GET` | `/api/solidgate/webhook` | Brak | Zwraca dokumentację punktu końcowego |

## Tworzenie sesji kasy (POST)

### Treść żądania

Punkt końcowy kasy używa walidacji Zod do ścisłego sprawdzania danych wejściowych:

```typescript
const checkoutSchema = z.object({
  amount: z.number().positive(),               // Payment amount
  currency: z.string().default('USD'),         // Currency code
  mode: z.enum(['one_time', 'subscription']).default('one_time'),
  successUrl: z.string().url(),                // Redirect URL
  cancelUrl: z.string().url(),                 // Cancel URL
  metadata: z.record(z.string(), z.any()).optional()
});
```

### Przykładowe żądanie

```bash
curl -X POST /api/solidgate/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "mode": "one_time",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Jak to działa

1. Uwierzytelnia użytkownika przez `auth()`
2. Waliduje treść żądania za pomocą schematu Zod
3. Rozwiązuje lub tworzy klienta Solidgate
4. Tworzy intencję płatności przez API Solidgate
5. Zwraca ID płatności i client secret dla osadzonego SDK

### Implementacja dostawcy

Metoda `createPaymentIntent` konstruuje żądanie API:

```typescript
const paymentRequest: SolidgatePaymentRequest = {
  amount: paymentAmount,                    // Amount in cents
  currency: currency.toUpperCase(),
  order_id: `order_${crypto.randomUUID()}`,
  order_description: metadata?.planName || 'Payment',
  customer_email: metadata?.email,
  customer_id: customerId,
  redirect_url: successUrl || `${appUrl}/payment/success`,
  callback_url: `${appUrl}/api/solidgate/webhook`,
  metadata: { ...metadata, customerId, paymentIntentId }
};

const response = await this.makeApiRequest<SolidgatePaymentResponse>(
  '/payments', 'POST', paymentRequest
);
```

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_abc123-def456"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

Pole `url` zawiera ID intencji płatności używane do inicjalizacji Solidgate React SDK.

## Osadzony formularz płatności

Solidgate dostarcza React SDK dla inline'owych formularzy płatności. Dostawca generuje podpis do inicjalizacji SDK:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

Metoda `getUIComponents()` zwraca skonfigurowany wrapper formularza płatności:

```typescript
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature
    });
  };
  return { PaymentForm: SolidgatePaymentFormWithConfig, ... };
}
```

## Przetwarzanie webhooka

### Weryfikacja podpisu

Solidgate używa HMAC-SHA512 do podpisów webhooków. Nagłówek podpisu może być `x-signature` lub `solidgate-signature`:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

Dostawca weryfikuje podpis na podstawie surowej treści:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### Ochrona przed idempotencją

Punkt końcowy webhooka zawiera wbudowaną pamięciową ochronę przed idempotencją, aby zapobiec zduplikowanemu przetwarzaniu:

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true }); // Acknowledge without processing
}

if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
W produkcyjnym środowisku bezserwerowym pamięciowy Set powinien być zastąpiony Redisem lub tabelą bazy danych dla idempotencji między instancjami.
:::

### Mapowanie zdarzeń

| Zdarzenie Solidgate | Typ wewnętrzny |
|--------------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

### Struktura obsługi

Każda obsługa deleguje do `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

`WebhookSubscriptionService` jest inicjalizowany ze stałą dostawcy `SOLIDGATE`:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## Weryfikacja płatności

Dostawca obsługuje weryfikację płatności przez API Solidgate:

```typescript
async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
  const response = await this.makeApiRequest<SolidgatePaymentStatus>(
    `/payments/${paymentId}`, 'GET'
  );
  const isSuccess = response.transaction_status === 'success'
    || response.transaction_status === 'completed';

  return {
    isValid: isSuccess,
    paymentId: response.payment_id,
    status: response.transaction_status,
    details: {
      amount: response.amount / 100,
      currency: response.currency.toLowerCase(),
      orderId: response.order_id
    }
  };
}
```

## Zarządzanie subskrypcjami

### Tworzenie subskrypcji

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const response = await this.makeApiRequest('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: priceId,
    metadata
  });
  // Returns SubscriptionInfo with mapped status
}
```

### Anulowanie subskrypcji

Obsługuje zarówno natychmiastowe anulowanie, jak i anulowanie na koniec okresu:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Aktualizacja subskrypcji

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## Komunikacja API

Wszystkie wywołania API Solidgate używają scentralizowanej metody `makeApiRequest`:

```typescript
private async makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<T> {
  const url = `${this.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  // Error handling and JSON parsing
}
```

## Obsługa błędów

| Status | Błąd | Przyczyna |
|--------|------|-----------|
| 400 | `Invalid request body` | Walidacja Zod nie powiodła się |
| 400 | `Invalid JSON` | Zniekształcona treść żądania |
| 400 | `Failed to create customer` | Rozwiązywanie klienta nie powiodło się |
| 400 | `No signature provided` | Brak podpisu w webhookу |
| 400 | `Webhook not processed` | Weryfikacja podpisu nie powiodła się |
| 401 | `Unauthorized` | Brak uwierzytelnionej sesji |
| 500 | `Failed to create checkout session` | Błąd API Solidgate |

Błędy walidacji Zod zwracają szczegółowe komunikaty na poziomie pola:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## Wymagania dotyczące konfiguracji

| Zmienna | Wymagane | Opis |
|---------|----------|------|
| `SOLIDGATE_API_KEY` | Tak | Klucz API Solidgate |
| `SOLIDGATE_SECRET_KEY` | Tak | Tajny klucz do podpisów |
| `SOLIDGATE_MERCHANT_ID` | Tak | ID sprzedawcy Solidgate |
| `SOLIDGATE_WEBHOOK_SECRET` | Tak | Tajny klucz podpisu webhooka |
