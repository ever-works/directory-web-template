---
id: polar-deep-dive
title: "Polar Deep Dive"
sidebar_label: "Polar Deep Dive"
---

# Polar – technischer Deep Dive

Diese Seite dokumentiert die technische Implementierung der Polar-Zahlungsintegration, einschließlich Checkout-Flow, Abonnementverwaltung und Webhook-Handling.

## Checkout

### Checkout-Session erstellen

```
POST /api/payment/polar/checkout
```

Erstellt eine Polar-Checkout-Session und gibt die Checkout-URL zurück.

**Anfragekörper:**

```json
{
  "planId": "polarPlanId_monthly",
  "planInterval": "month",
  "currency": "USD",
  "successUrl": "https://example.com/success"
}
```

**Implementierung:**

```typescript
const checkout = await polar.checkouts.create({
  productId: polarProductId,
  successUrl: params.successUrl,
  customerEmail: session.user.email,
  metadata: {
    userId: session.user.id,
    planId: params.planId,
    planInterval: params.planInterval,
  },
});

return { checkoutUrl: checkout.url };
```

### Metadaten-Bereinigung

Polar erlaubt nur String-Werte in Metadaten. Die Vorlage bereinigt automatisch Nicht-String-Werte:

```typescript
function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) {
      sanitized[key] = String(value);
    }
  }
  return sanitized;
}
```

### Checkout-Status abrufen

```
GET /api/payment/polar/checkout?checkoutId=...
```

Ruft den aktuellen Status einer Checkout-Session ab.

**Abfrageparameter:**

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--|--------------|
| `checkoutId` | string | Ja | Polar Checkout-ID |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "chk_abc123",
    "status": "succeeded",
    "customerId": "cus_xyz",
    "productId": "prod_abc"
  }
}
```

## Abonnementverwaltung

### Abonnement kündigen

```typescript
await polar.subscriptions.cancel({
  id: subscriptionId,
});
// Kündigt zum Periodenende (cancelAtPeriodEnd: true)
```

### Abonnement reaktivieren

```typescript
await polar.subscriptions.update({
  id: subscriptionId,
  cancelAtPeriodEnd: false,
});
```

### Plan wechseln

```typescript
await polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId,
  productPriceId: newPriceId,
});
```

## Webhook-Handling

```
POST /api/payment/polar/webhook
```

### Signaturverifizierung

Polar-Webhooks werden über drei Header verifiziert:

```typescript
const webhookId = request.headers.get('webhook-id');
const webhookTimestamp = request.headers.get('webhook-timestamp');
const webhookSignature = request.headers.get('webhook-signature');

// Signierte Nachricht zusammensetzen
const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;

// Base64-dekodierter Secret-Schlüssel
const secretBytes = Buffer.from(
  process.env.POLAR_WEBHOOK_SECRET!.replace(/^whsec_/, ''),
  'base64'
);

// HMAC-SHA256 berechnen
const expectedSignature = crypto
  .createHmac('sha256', secretBytes)
  .update(signedContent)
  .digest('base64');

// Mehrere Signaturen möglich (durch Leerzeichen getrennt)
const signatures = webhookSignature.split(' ').map(s => s.split(',')[1]);
const isValid = signatures.some(sig =>
  crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSignature)
  )
);
```

### Verarbeitete Events

| Polar-Event | Interne Aktion |
|---|---|
| `checkout.created` | Neue Zahlung verbuchen, ggf. Abonnement anlegen |
| `subscription.created` | Abonnement in DB anlegen |
| `subscription.updated` | Abonnement-Status aktualisieren |
| `subscription.canceled` | Abonnement als gekündigt markieren |
| `subscription.revoked` | Zugang sofort entziehen |

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `POLAR_ACCESS_TOKEN` | API-Zugriffstoken aus dem Polar-Dashboard |
| `POLAR_WEBHOOK_SECRET` | Webhook-Signatur-Secret (beginnt mit `whsec_`) |
| `POLAR_SERVER` | `sandbox` oder `production` (Standard: `production`) |

## Fehlerbehandlung

Fehler der Polar-API werden über `safeErrorResponse` abgefangen:

```typescript
try {
  const result = await polar.checkouts.create(params);
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  if (error instanceof PolarError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }
  return safeErrorResponse(error);
}
```

**Quellen:**
- `template/app/api/payment/polar/checkout/route.ts`
- `template/app/api/payment/polar/webhook/route.ts`
- `template/lib/payment/polar/`
