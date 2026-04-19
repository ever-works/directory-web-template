---
id: webhook-api-endpoints
title: "Webhook API Endpoints"
sidebar_label: "Webhook API Endpoints"
---

# Webhook-API-Endpunkte

Die Vorlage stellt Webhook-Endpunkte für vier Zahlungsanbieter bereit: Stripe, LemonSqueezy, Polar und Solidgate. Alle Endpunkte folgen demselben Architekturmuster.

## Übersicht

| Endpunkt | Methode | Zahlungsanbieter |
|----------|---------|------------------|
| `/api/payment/stripe/webhook` | POST | Stripe |
| `/api/payment/lemonsqueezy/webhook` | POST | LemonSqueezy |
| `/api/payment/polar/webhook` | POST | Polar |
| `/api/payment/solidgate/webhook` | POST, GET | Solidgate |

## Gemeinsame Architektur

Alle Webhook-Endpunkte folgen diesem Muster:

```typescript
export async function POST(request: NextRequest) {
  // 1. Raw Body als Text lesen
  const rawBody = await request.text();

  // 2. Provider-spezifische Signatur verifizieren
  const isValid = verifySignature(rawBody, request.headers);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 3. Event parsen
  const event = JSON.parse(rawBody);

  // 4. Event-Typ verarbeiten
  await handleEvent(event);

  // 5. Immer 200 OK zurückgeben (verhindert erneute Zustellung)
  return NextResponse.json({ received: true });
}
```

:::important
Webhook-Endpunkte geben immer `200 OK` zurück, auch bei internen Fehlern. Fehler werden protokolliert, aber nicht an den Anbieter weitergegeben, um unnötige Wiederholungen zu vermeiden.
:::

## `WebhookEventType` Enum

Alle Anbieter mappen ihre Events auf interne `WebhookEventType`-Werte:

```typescript
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  SUBSCRIPTION_EXPIRED = 'subscription.expired',
}
```

## Stripe-Webhook

```
POST /api/payment/stripe/webhook
```

Verifiziert Signatur über `stripe.webhooks.constructEvent()` mit `STRIPE_WEBHOOK_SECRET`.

**Verarbeitete Events:**

| Stripe-Event | `WebhookEventType` |
|---|---|
| `checkout.session.completed` | `PAYMENT_SUCCEEDED` |
| `invoice.payment_succeeded` | `SUBSCRIPTION_RENEWED` |
| `invoice.payment_failed` | `PAYMENT_FAILED` |
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` |
| `charge.refunded` | `PAYMENT_REFUNDED` |

**Umgebungsvariablen:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Quelle:** `template/app/api/payment/stripe/webhook/route.ts`

## LemonSqueezy-Webhook

```
POST /api/payment/lemonsqueezy/webhook
```

Verifiziert Signatur über HMAC-SHA256 mit dem `X-Signature`-Header.

**Verarbeitete Events:**

| LemonSqueezy-Event | `WebhookEventType` |
|---|---|
| `order_created` | `PAYMENT_SUCCEEDED` |
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_resumed` | `SUBSCRIPTION_UPDATED` |
| `subscription_expired` | `SUBSCRIPTION_EXPIRED` |
| `subscription_renewed` | `SUBSCRIPTION_RENEWED` |

**Umgebungsvariablen:**
- `LEMON_SQUEEZY_WEBHOOK_SECRET`

**Quelle:** `template/app/api/payment/lemonsqueezy/webhook/route.ts`

## Polar-Webhook

```
POST /api/payment/polar/webhook
```

Verifiziert Signatur über die drei Header `webhook-signature`, `webhook-timestamp` und `webhook-id`.

**Verarbeitete Events:**

| Polar-Event | `WebhookEventType` |
|---|---|
| `checkout.created` | `PAYMENT_SUCCEEDED` |
| `subscription.created` | `SUBSCRIPTION_CREATED` |
| `subscription.updated` | `SUBSCRIPTION_UPDATED` |
| `subscription.canceled` | `SUBSCRIPTION_CANCELLED` |
| `subscription.revoked` | `SUBSCRIPTION_EXPIRED` |

**Umgebungsvariablen:**
- `POLAR_WEBHOOK_SECRET`

**Quelle:** `template/app/api/payment/polar/webhook/route.ts`

## Solidgate-Webhook

```
POST /api/payment/solidgate/webhook
GET  /api/payment/solidgate/webhook
```

Solidgate unterstützt zusätzlich `GET` für die URL-Verifizierung beim Einrichten des Webhooks im Dashboard. Verifiziert Signatur über HMAC-SHA512.

**Idempotenz:** Solidgate implementiert zusätzlich In-Memory-Idempotenzschutz (24-Stunden-Fenster). Siehe [Solidgate Deep Dive](/api/solidgate-deep-dive) für Details.

**Verarbeitete Events:**

| Solidgate-Event | `WebhookEventType` |
|---|---|
| `order_approved` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `PAYMENT_REFUNDED` |
| `order_failed` | `PAYMENT_FAILED` |
| `subscription_renewed` | `SUBSCRIPTION_RENEWED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |

**Umgebungsvariablen:**
- `SOLIDGATE_MERCHANT_ID`
- `SOLIDGATE_SECRET_KEY`

**Quelle:** `template/app/api/payment/solidgate/webhook/route.ts`

## Sicherheitshinweise

- Alle Webhooks validieren die Signatur mit `crypto.timingSafeEqual()` gegen Timing-Angriffe
- Raw Bodies werden als Text gelesen, bevor sie geparst werden (Signatur basiert auf exaktem Body)
- Alle Endpunkte sind von CSRF-Schutz ausgenommen (externe Aufrufer)
- Webhook-Secrets werden nur aus Umgebungsvariablen gelesen, nie aus dem Request
