---
id: solidgate-deep-dive
title: "Solidgate Deep Dive"
sidebar_label: "Solidgate Deep Dive"
---

# Solidgate – technischer Deep Dive

Diese Seite dokumentiert die technische Implementierung der Solidgate-Zahlungsintegration, einschließlich Checkout-Verarbeitung, Webhook-Handling und Abonnementverwaltung.

## Checkout-Flow

### Zod-Validierungsschema

```typescript
const solidgateCheckoutSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  planInterval: z.enum(['month', 'year']),
  currency: z.string().length(3).optional().default('USD'),
  isRenew: z.boolean().optional().default(false),
});
```

### Embedded-Form-Signierung (HMAC-SHA512)

Solidgate erfordert eine signierte Payload für das Embedded Payment Form.

```typescript
const generateSolidgateSignature = (merchantId: string, secretKey: string, data: string): string => {
  const str = `${merchantId}${data}${merchantId}`;
  return crypto.createHmac('sha512', secretKey).update(str).digest('base64');
};

// Payload zusammenstellen
const paymentData = JSON.stringify({
  amount: planPrice,
  currency: currency,
  order_id: paymentIntent.id,
  order_description: `${planId} - ${planInterval}`,
  customer_email: session.user.email,
  // ... weitere Pflichtfelder
});

const signature = generateSolidgateSignature(
  process.env.SOLIDGATE_MERCHANT_ID!,
  process.env.SOLIDGATE_SECRET_KEY!,
  paymentData
);
```

Die Antwort enthält `paymentIntent`, `signature` und `merchantId`, die das Frontend für das Embedded Form benötigt.

## Webhook-Handling

### Idempotenz-Implementierung

Solidgate garantiert keine Einmalzustellung. Die Vorlage verhindert Doppelverarbeitung über ein In-Memory-Set mit 24-Stunden-Ablauf:

```typescript
// In-Memory-Idempotenzschutz
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 Stunden

function isAlreadyProcessed(eventId: string): boolean {
  const processedAt = processedEvents.get(eventId);
  if (!processedAt) return false;
  if (Date.now() - processedAt > IDEMPOTENCY_WINDOW_MS) {
    processedEvents.delete(eventId);
    return false;
  }
  return true;
}

function markAsProcessed(eventId: string): void {
  processedEvents.set(eventId, Date.now());
}
```

:::note
Das In-Memory-Set wird bei Server-Neustarts zurückgesetzt. Für Produktionsumgebungen empfiehlt sich die Speicherung verarbeiteter Event-IDs in der Datenbank.
:::

### Webhook-Signaturverifizierung

Solidgate-Webhooks werden über HMAC-SHA512 verifiziert:

```typescript
const verifyWebhookSignature = (
  body: string,
  signature: string,
  merchantId: string,
  secretKey: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha512', secretKey)
    .update(`${merchantId}${body}${merchantId}`)
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};
```

### Event-Typ-Mapping

| Solidgate-Event | Interne Aktion |
|-----------------|----------------|
| `order_approved` | Zahlung verarbeiten, Abonnement anlegen/verlängern |
| `order_refunded` | Abonnement deaktivieren, Zahlung-Status aktualisieren |
| `order_failed` | Zahlung als fehlgeschlagen markieren |
| `subscription_renewed` | Abonnementzeitraum verlängern |
| `subscription_cancelled` | Abonnement beenden |

### Webhook-Verarbeitungsablauf

```typescript
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-sign') ?? '';

  // 1. Signatur verifizieren
  const isValid = verifyWebhookSignature(
    body, signature,
    process.env.SOLIDGATE_MERCHANT_ID!,
    process.env.SOLIDGATE_SECRET_KEY!
  );
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventId = event.order?.order_id ?? event.subscription?.id;

  // 2. Idempotenzprüfung
  if (isAlreadyProcessed(eventId)) {
    return NextResponse.json({ status: 'already_processed' });
  }

  // 3. Event verarbeiten
  await handleSolidgateEvent(event);
  markAsProcessed(eventId);

  return NextResponse.json({ status: 'ok' });
}
```

## Zahlungsverifizierung

Nach einem erfolgreichen Checkout ruft das Frontend `GET /api/payment/solidgate/verify?orderId=...` auf:

```typescript
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId');
  // Sucht PaymentIntent anhand der orderId
  // Gibt Status und Metadaten zurück
  const payment = await getPaymentByOrderId(orderId);
  return NextResponse.json({ success: true, data: { status: payment.status } });
}
```

## Abonnementverwaltung (`makeApiRequest`)

Alle Solidgate Management API-Aufrufe werden über eine gemeinsame Hilfsfunktion abgewickelt:

```typescript
async function makeApiRequest<T>(
  endpoint: string,
  data: Record<string, unknown>
): Promise<T> {
  const body = JSON.stringify(data);
  const signature = generateSolidgateSignature(
    process.env.SOLIDGATE_MERCHANT_ID!,
    process.env.SOLIDGATE_SECRET_KEY!,
    body
  );
  const response = await fetch(`https://pay.solidgate.com/api/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Merchant': process.env.SOLIDGATE_MERCHANT_ID!,
      'Signature': signature,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Solidgate API error: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}
```

## Fehlerbehandlung

Alle Solidgate-Fehler werden abgefangen und über `safeErrorResponse` zurückgegeben. Der Webhook-Endpunkt gibt immer `200 OK` zurück, um eine erneute Zustellung durch Solidgate zu vermeiden, auch wenn die interne Verarbeitung fehlschlägt. Der Fehler wird stattdessen protokolliert.

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `SOLIDGATE_MERCHANT_ID` | Händler-ID aus dem Solidgate-Dashboard |
| `SOLIDGATE_SECRET_KEY` | Geheimschlüssel für HMAC-Signierung |
| `SOLIDGATE_API_URL` | Basis-URL der Solidgate API (Standard: `https://pay.solidgate.com/api/v1`) |

**Quellen:**
- `template/app/api/payment/solidgate/checkout/route.ts`
- `template/app/api/payment/solidgate/webhook/route.ts`
- `template/app/api/payment/solidgate/verify/route.ts`
- `template/lib/payment/solidgate/`
