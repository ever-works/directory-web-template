---
id: webhooks
title: Zahlungs-Webhooks
sidebar_label: Webhooks
sidebar_position: 7
---

# Zahlungs-Webhooks

Die Ever Works-Vorlage verarbeitet Zahlungs-Webhooks von allen vier unterstützten Anbietern über dedizierte API-Routen. Jeder Webhook-Endpunkt übernimmt die Signaturüberprüfung, die Ereignisweiterleitung, die Verwaltung des Abonnementlebenszyklus und E-Mail-Benachrichtigungen.

## Quellorte

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Webhook-Architektur

Alle Webhook-Routen des Anbieters folgen demselben Muster:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Jede Route delegiert die Geschäftslogik an die gemeinsame `WebhookSubscriptionService` , die anbieterspezifische Daten in ein gemeinsames Format normalisiert, bevor die Datenbank aktualisiert wird.

## Webhook-Ereignistypen

Die Vorlage definiert einen umfassenden Satz von Ereignistypen, denen alle Anbieter zuordnen:

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

## Solidgate Webhook-Handler

### Endpunkt

```
POST /api/solidgate/webhook
```

### Signaturüberprüfung

Die Solidgate-Webhook-Route liest die Signatur aus dem `x-signature` - oder `solidgate-signature` -Header:

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

Der Anbieter überprüft die Signatur mithilfe von HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Idempotenz

Der Handler implementiert eine speicherinterne Idempotenzprüfung, um eine doppelte Ereignisverarbeitung zu verhindern:

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
Ersetzen Sie in einer serverlosen Produktionsumgebung den speicherinternen `Set` durch Redis oder eine Datenbanktabelle für zuverlässige Idempotenz über Instanzen hinweg.
:::

### Ereignisweiterleitung

Nach der Überprüfung werden Ereignisse an bestimmte Handler weitergeleitet:

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

### Solidgate-Ereigniszuordnung

Der Anbieter ordnet Solidgate-spezifische Ereignisnamen den generischen Typen der Vorlage zu:

| Solidgate-Ereignis | Vorlagenereignis |
|-----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## WebhookSubscriptionService

Alle Webhook-Handler delegieren an die gemeinsame `WebhookSubscriptionService` . Dieser Dienst wird pro Anbieter instanziiert:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Datennormalisierung

Der Dienst normalisiert Webhook-Nutzlasten in ein gemeinsames `WebhookSubscriptionData` -Format:

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

### Handler-Methoden

Der Dienst stellt Handler für jeden Webhook-Ereignistyp bereit:

| Methode | Veranstaltung | Beschreibung |
|--------|-------|-------------|
| `handlePaymentSucceeded` | Zahlung abgeschlossen | Aktualisiert den Zahlungsdatensatz und löst eine Bestätigungs-E-Mail aus |
| `handlePaymentFailed` | Zahlung fehlgeschlagen | Fehler protokolliert, Benutzer möglicherweise benachrichtigt |
| `handleSubscriptionCreated` | Neues Abonnement | Erstellt einen Abonnementdatensatz in der Datenbank |
| `handleSubscriptionUpdated` | Planänderung | Aktualisiert die Abonnementdetails |
| `handleSubscriptionCancelled` | Stornierung | Aktualisiert den Status und legt das Kündigungsdatum fest |
| `handleSubscriptionPaymentSucceeded` | Wiederkehrende Zahlung | Verlängert den Abonnementzeitraum |
| `handleSubscriptionPaymentFailed` | Wiederkehrender Fehler | Markiert es als überfällig und benachrichtigt den Benutzer |
| `handleSubscriptionTrialEnding` | Testende | Sendet eine Benachrichtigung über das Ende der Testversion |

## Webhook-Antwortformat

Alle Webhook-Endpunkte geben ein konsistentes Format zurück:

**Erfolg (200):**
```json
{ "received": true }
```

**Client-Fehler (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Die Rückgabe des Status 200 ist für die Empfangsbestätigung von entscheidender Bedeutung. Wenn eine 400 oder 500 zurückgegeben wird, versuchen Zahlungsanbieter in der Regel die Webhook-Zustellung erneut.

## GET Endpunkt

Jede Webhook-Route verarbeitet auch GET-Anfragen zu Diagnosezwecken:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Konfigurieren von Webhooks in Anbieter-Dashboards

### Solidgate

1. Navigieren Sie zu Ihrem Solidgate-Dashboard
2. Gehen Sie zu **Einstellungen** und dann zu **Webhooks**
3. Fügen Sie Ihre Webhook-URL hinzu: `https://yourdomain.com/api/solidgate/webhook` 4. Wählen Sie Ereignisse aus, die Sie abonnieren möchten: Zahlungen, Abonnements, Rückerstattungen
5. Kopieren Sie das Webhook-Geheimnis in Ihre Umgebungsvariable `SOLIDGATE_WEBHOOK_SECRET` ### Webhook-URL-Muster

Jeder Anbieter verfügt über einen eigenen dedizierten Endpunkt:

| Anbieter | Webhook-URL |
|----------|-------------|
| Streifen | `/api/stripe/webhook` |
| Solidgate | `/api/solidgate/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| Polar | `/api/polar/webhook` |

## Webhooks lokal testen

### Verwenden von ngrok oder einem ähnlichen Tunnel

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

Konfigurieren Sie dann die ngrok-URL als Ihren Webhook-Endpunkt im Anbieter-Dashboard (z. B. `https://abc123.ngrok.io/api/solidgate/webhook` ).

### Manuelles Testen mit Curl

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

## Fehlerbehandlung

Jede Handlerfunktion ist in try/catch eingeschlossen, um zu verhindern, dass ein einzelner Handlerfehler eine 400/500-Antwort verursacht:

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

Dadurch wird sichergestellt, dass der Webhook immer mit einer 200-Antwort bestätigt wird, auch wenn die interne Verarbeitung fehlschlägt. Verarbeitungsfehler werden zur Untersuchung protokolliert, ohne dass es beim Anbieter zu Wiederholungsschleifen kommt.

## Sicherheitsüberlegungen

- **Signaturen immer überprüfen** – Webhook-Nutzlasten niemals ohne Signaturvalidierung verarbeiten
- **Rohtext verwenden** – Analysieren Sie den rohen Anforderungstext zur Signaturüberprüfung, nicht den JSON-analysierten Text
- **Idempotenz** – Deduplizierung implementieren, um Provider-Wiederholungsversuche ordnungsgemäß abzuwickeln
- **Protokollierung** – Webhook-IDs und Ereignistypen für Audit-Trails protokollieren
- **Nur HTTPS** – Webhook-Endpunkte müssen in der Produktion über HTTPS bereitgestellt werden
