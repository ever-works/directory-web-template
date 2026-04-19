---
id: lemonsqueezy-deep-dive
title: "LemonSqueezy Deep Dive"
sidebar_label: "LemonSqueezy Deep Dive"
---

# LemonSqueezy – Detaillierte Übersicht

Diese Seite behandelt die vollständige LemonSqueezy-Integration, einschließlich Checkout-Erstellung, Abonnement-Verwaltung, Webhook-Verarbeitung und Produkt-Synchronisierung.

## Übersicht

LemonSqueezy ist ein Merchant-of-Record-Zahlungsanbieter, der Steuererhebung, Compliance und Zahlungsverarbeitung übernimmt. Die Integration verwendet LemonSqueezy's gehosteten Checkout-Ablauf, variantenbasiertes Produktmodell und Webhook-System. Im Gegensatz zu Stripe unterstützt LemonSqueezy keine Setup Intents oder direkte Zahlungsmethoden-Verwaltung.

## Routentabelle

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|-------------------|--------------|
| `POST` | `/api/lemonsqueezy/checkout` | Sitzung erforderlich | Checkout-Sitzung aus JSON-Body erstellen |
| `GET` | `/api/lemonsqueezy/checkout` | Keine | Checkout-Sitzung aus Abfrageparametern erstellen |
| `POST` | `/api/lemonsqueezy/webhook` | Signatur erforderlich | Eingehende Webhook-Events verarbeiten |

## Checkout-Erstellung (POST)

### Anfragekörper

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // LemonSqueezy-Produkt-Varianten-ID
  dark?: boolean;                           // Dunklen Checkout-Modus aktivieren
  customPrice?: number;                     // Benutzerdefinierter Preis in Cent (optional)
  metadata?: Record<string, string>;        // Zusätzliche Metadaten
}
```

### Beispielanfrage

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

### Funktionsweise

1. Authentifiziert den Benutzer via `auth()`
2. Validiert den Anfragekörper mit `validateCheckoutRequestBody()`
3. Ruft `lemonsqueezyProvider.createCustomCheckout()` mit Benutzer-Metadaten auf
4. Gibt die Checkout-URL zurück

### Erfolgsantwort (200)

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

## Checkout via Abfrageparameter (GET)

Der GET-Endpunkt unterstützt die Erstellung von Checkouts über Abfrageparameter:

| Parameter | Erforderlich | Beschreibung |
|-----------|--------------|-------------|
| `variantId` | Ja | LemonSqueezy-Varianten-ID |
| `email` | Ja | Kunden-E-Mail |
| `customPrice` | Nein | Benutzerdefinierter Preis in Cent |
| `metadata` | Nein | JSON-String mit Metadaten |

## Abonnement-Verwaltung

### Abonnements stornieren

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

### Abonnements aktualisieren

Die Aktualisierungsmethode unterstützt Planänderungen, Pausierung, Wiederaufnahme und Reaktivierung.

## Webhook-Verarbeitung

### Signaturverifizierung

LemonSqueezy verwendet HMAC SHA-256 für die Webhook-Signaturverifizierung.

### Event-Zuordnung

| LemonSqueezy-Event | Interner Typ |
|--------------------|-------------|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

## Fehlerbehandlung

| Status | Fehlercode | Ursache |
|--------|-----------|--------|
| 400 | `VALIDATION_ERROR` | Ungültiger Anfragekörper oder Parameter |
| 401 | `Unauthorized` | Keine authentifizierte Sitzung |
| 500 | `CONFIGURATION_ERROR` | Fehlende Umgebungsvariablen |
| 500 | `INTERNAL_ERROR` | Unbehandelter Fehler |
| 503 | `PAYMENT_SERVICE_ERROR` | LemonSqueezy-API nicht verfügbar |

## Konfigurationsanforderungen

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `LEMONSQUEEZY_API_KEY` | Ja | LemonSqueezy-API-Schlüssel |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Ja | Webhook-Signierungsgeheimnis |
| `LEMONSQUEEZY_STORE_ID` | Ja | Numerische Shop-ID |

## Einschränkungen

- **Keine Setup Intents**: LemonSqueezy unterstützt kein Speichern von Karten ohne Kauf.
- **Keine direkte Erstattungs-API**: Erstattungen müssen über das LemonSqueezy-Dashboard verarbeitet werden.
- **Variantenbasierte Preisgestaltung**: Produkte verwenden Varianten-IDs statt Preis-IDs.

## Sicherheitshinweise

- Webhook-Signaturen werden mit HMAC SHA-256 verifiziert
- API-Schlüssel werden nie dem Client exponiert
- Entwicklungsmodus-Protokollierung anonymisiert personenbezogene Daten

## Verwandte Seiten

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Polar Deep Dive](./polar-deep-dive.md)
- [Zahlungsanbieter-Architektur](./payment-provider-architecture.md)
