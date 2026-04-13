---
id: solidgate-deep-dive
title: "Solidgate Deep Dive"
sidebar_label: "Solidgate Deep Dive"
---

# Solidgate – Diepgaande uitleg

Deze pagina behandelt de volledige Solidgate-integratie, inclusief het aanmaken van afrekenlinks, webhookverwerking, betalingsverificatie en het ingebedde betaalformulier.

## Overzicht

Solidgate is een betalingsinfrastructuurprovider die zowel gehoste afrekenflows als een insluitbare React SDK voor inline betaalformulieren ondersteunt. De integratie maakt betaalintents aan via de Solidgate API en ondersteunt webhookgestuurde evenementverwerking met idempotentiebescherming. Solidgate gebruikt HMAC-SHA512 voor webhookhandtekeningverificatie.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `POST` | `/api/solidgate/checkout` | Sessie vereist | Afrekeningssessie / betaalintent aanmaken |
| `POST` | `/api/solidgate/webhook` | Handtekening vereist | Inkomende webhook-evenementen verwerken |
| `GET` | `/api/solidgate/webhook` | Geen | Geeft eindpuntdocumentatie terug |

## Afrekening aanmaken (POST)

### Aanvraagbody

Het afrekeningseindpunt gebruikt Zod-validatie voor strikte invoercontrole:

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

### Voorbeeldaanvraag

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

### Hoe het werkt

1. Authenticeert de gebruiker via `auth()`
2. Valideert de aanvraagbody met het Zod-schema
3. Lost een Solidgate-klant op of maakt er een aan
4. Maakt een betaalintent aan via de Solidgate API
5. Geeft de betaal-ID en clientgeheim terug voor de ingebedde SDK

### Provider-implementatie

De methode `createPaymentIntent` bouwt de API-aanvraag op:

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

### Geslaagde reactie (200)

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

Het veld `url` bevat de betaalintent-ID die wordt gebruikt voor de initialisatie van de Solidgate React SDK.

## Ingebed betaalformulier

Solidgate biedt een React SDK voor inline betaalformulieren. De provider genereert een handtekening voor SDK-initialisatie:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

De methode `getUIComponents()` geeft een geconfigureerde betaalformulier-wrapper terug:

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

## Webhookverwerking

### Handtekeningverificatie

Solidgate gebruikt HMAC-SHA512 voor webhookhandtekeningen. De handtekeningheader kan `x-signature` of `solidgate-signature` zijn:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

De provider verifieert de handtekening aan de hand van de onbewerkte body:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### Idempotentiebescherming

Het webhook-eindpunt bevat in-memory idempotentiebescherming om dubbele verwerking te voorkomen:

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
In een serverloze productieomgeving moet de in-memory Set worden vervangen door Redis of een databasetabel voor cross-instantie idempotentie.
:::

### Evenementmapping

| Solidgate-evenement | Intern type |
|----------------|---------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

### Structuur van de verwerker

Elke verwerker delegeert naar de `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

De `WebhookSubscriptionService` wordt geïnitialiseerd met de `SOLIDGATE`-providerconstante:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## Betalingsverificatie

De provider ondersteunt betalingsverificatie via de Solidgate API:

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

## Abonnementsbeheer

### Abonnementen aanmaken

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

### Abonnementen opzeggen

Ondersteunt zowel onmiddellijke als periode-einde opzegging:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Abonnementen bijwerken

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## API-communicatie

Alle Solidgate API-aanroepen gebruiken een gecentraliseerde methode `makeApiRequest`:

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

## Foutafhandeling

| Status | Fout | Oorzaak |
|--------|-------|-------|
| 400 | `Invalid request body` | Zod-validatie mislukt |
| 400 | `Invalid JSON` | Misvormde aanvraagbody |
| 400 | `Failed to create customer` | Klantresolutie mislukt |
| 400 | `No signature provided` | Webhook mist handtekening |
| 400 | `Webhook not processed` | Handtekeningverificatie mislukt |
| 401 | `Unauthorized` | Geen geauthenticeerde sessie |
| 500 | `Failed to create checkout session` | Solidgate API-fout |

Zod-validatiefouten geven gedetailleerde veldniveauberichten terug:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## Configuratievereisten

| Variabele | Vereist | Beschrijving |
|----------|----------|-------------|
| `SOLIDGATE_API_KEY` | Ja | Solidgate API-sleutel |
| `SOLIDGATE_SECRET_KEY` | Ja | Geheime sleutel voor handtekeningaanmaak |
| `SOLIDGATE_WEBHOOK_SECRET` | Ja | Webhook-ondertekeningsgeheim |
| `SOLIDGATE_PUBLISHABLE_KEY` | Ja | Publiceerbare sleutel voor de React SDK |
| `SOLIDGATE_MERCHANT_ID` | Ja | Handelaar-identificator |
| `SOLIDGATE_API_BASE_URL` | Nee | API-basis-URL (standaard: `https://api.solidgate.com/v1`) |

## Beveiligingsoverwegingen

- HMAC-SHA512 wordt gebruikt voor zowel webhook- als betaalintenthandtekeningverificatie
- De geheime sleutel en het webhookgeheim worden nooit blootgesteld aan de client
- Idempotentiebescherming voorkomt dubbele webhookverwerking
- Zod-validatie zorgt voor strikte invoercontrole op het afrekeningseindpunt
- Stack traces in foutmeldingen worden alleen opgenomen in de ontwikkelingsmodus
- Het hulpprogramma `safeErrorMessage` saniteert foutberichten voor productie

## Gerelateerde pagina's

- [Stripe Checkout – Diepgaande uitleg](./stripe-checkout-deep-dive.md)
- [LemonSqueezy – Diepgaande uitleg](./lemonsqueezy-deep-dive.md)
- [Polar – Diepgaande uitleg](./polar-deep-dive.md)
- [Architectuur van betalingsproviders](./payment-provider-architecture.md)
