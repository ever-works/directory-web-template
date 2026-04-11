---
id: webhooks
title: Betalingswebhooks
sidebar_label: Webhaken
sidebar_position: 7
---

# Betalingswebhooks

De Ever Works-sjabloon verwerkt betalingswebhooks van alle vier de ondersteunde providers via speciale API-routes. Elk webhook-eindpunt zorgt voor handtekeningverificatie, gebeurtenisroutering, beheer van de levenscyclus van abonnementen en e-mailmeldingen.

## Bronlocaties

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Webhook-architectuur

Alle webhookroutes van providers volgen hetzelfde patroon:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Elke route delegeert bedrijfslogica naar de gedeelde `WebhookSubscriptionService` , die providerspecifieke gegevens normaliseert in een gemeenschappelijk formaat voordat de database wordt bijgewerkt.

## Webhook-gebeurtenistypen

De sjabloon definieert een uitgebreide set gebeurtenistypen waar alle providers in kaart in brengen:

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

## Solidgate Webhook-handler

### Eindpunt

```
POST /api/solidgate/webhook
```

### Handtekeningverificatie

De Solidgate-webhookroute leest de handtekening uit de `x-signature` - of `solidgate-signature` -header:

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

De provider verifieert de handtekening met behulp van HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Idempotentie

De handler implementeert idempotentiecontrole in het geheugen om dubbele gebeurtenisverwerking te voorkomen:

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

:::opmerking
In een serverloze productieomgeving vervangt u de in-memory `Set` door Redis of een databasetabel voor betrouwbare idempotentie tussen instanties.
:::

### Gebeurtenisroutering

Na verificatie worden gebeurtenissen doorgestuurd naar specifieke handlers:

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

### Solidgate-gebeurtenistoewijzing

De provider wijst Solidgate-specifieke gebeurtenisnamen toe aan de algemene typen van de sjabloon:

| Solidgate-evenement | Sjabloonevenement |
|----------------|---------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## WebhookAbonnementsservice

Alle webhookhandlers delegeren naar de gedeelde `WebhookSubscriptionService` . Deze dienst wordt geïnstantieerd per provider:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Gegevensnormalisatie

De service normaliseert webhook-payloads naar een gebruikelijk `WebhookSubscriptionData` -formaat:

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

### Handlermethoden

De service biedt handlers voor elk type webhook-gebeurtenis:

| Werkwijze | Evenement | Beschrijving |
|--------|-------|-------------|
| `handlePaymentSucceeded` | Betaling voltooid | Werkt het betalingsrecord bij, activeert bevestigingsmail |
| `handlePaymentFailed` | Betaling mislukt | Logboekfout, kan gebruiker op de hoogte stellen |
| `handleSubscriptionCreated` | Nieuw abonnement | Creëert abonnementsrecord in database |
| `handleSubscriptionUpdated` | Planwijziging | Updates abonnementsgegevens |
| `handleSubscriptionCancelled` | Annulering | Updates status, stelt annuleringsdatum in |
| `handleSubscriptionPaymentSucceeded` | Terugkerende betaling | Verlengt abonnementsperiode |
| `handleSubscriptionPaymentFailed` | Terugkerende mislukking | Markeert als achterstallig, waarschuwt gebruiker |
| `handleSubscriptionTrialEnding` | Proefeinde | Verstuurt een melding dat de proefperiode eindigt |

## Webhook-antwoordformaat

Alle webhookeindpunten retourneren een consistent formaat:

**Succes (200):**
```json
{ "received": true }
```

**Clientfout (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Het retourneren van een 200-status is van cruciaal belang om de ontvangst te bevestigen. Als een 400 of 500 wordt geretourneerd, proberen betalingsproviders de webhook-levering doorgaans opnieuw.

## KRIJG eindpunt

Elke webhookroute verwerkt ook GET-verzoeken voor diagnostische doeleinden:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Webhooks configureren in providerdashboards

### Solidgate

1. Navigeer naar uw Solidgate-dashboard
2. Ga naar **Instellingen** en vervolgens naar **Webhooks**
3. Voeg uw webhook-URL toe: `https://yourdomain.com/api/solidgate/webhook` 4. Selecteer evenementen waarop u zich wilt abonneren: betalingen, abonnementen, terugbetalingen
5. Kopieer het webhookgeheim naar uw omgevingsvariabele `SOLIDGATE_WEBHOOK_SECRET` ### Webhook-URL-patroon

Elke provider heeft zijn eigen specifieke eindpunt:

| Aanbieder | Webhook-URL |
|----------|------------|
| Streep | `/api/stripe/webhook` |
| Solidgate | `/api/solidgate/webhook` |
| CitroenSqueezy | `/api/lemonsqueezy/webhook` |
| Polair | `/api/polar/webhook` |

## Webhooks lokaal testen

### Met behulp van ngrok of een soortgelijke tunnel

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

Configureer vervolgens de ngrok-URL als uw webhook-eindpunt in het providerdashboard (bijvoorbeeld `https://abc123.ngrok.io/api/solidgate/webhook` ).

### Handmatig testen met krul

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

## Foutafhandeling

Elke handlerfunctie is verpakt in try/catch om te voorkomen dat een enkele handlerfout een 400/500-reactie veroorzaakt:

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

Dit zorgt ervoor dat de webhook altijd wordt bevestigd met een 200-antwoord, zelfs als de interne verwerking mislukt. Verwerkingsfouten worden geregistreerd voor onderzoek zonder dat de provider opnieuw probeert.

## Beveiligingsoverwegingen

- **Verifieer altijd handtekeningen**: verwerk nooit webhook-payloads zonder handtekeningvalidatie
- **Gebruik onbewerkte hoofdtekst**: parseer de onbewerkte verzoektekst voor handtekeningverificatie, niet de door JSON geparseerde hoofdtekst
- **Idempotency** - implementeer deduplicatie om nieuwe pogingen van providers netjes af te handelen
- **Logging** - log webhook-ID's en gebeurtenistypen voor audittrails
- **Alleen HTTPS** -- webhookeindpunten moeten in productie via HTTPS worden aangeboden
