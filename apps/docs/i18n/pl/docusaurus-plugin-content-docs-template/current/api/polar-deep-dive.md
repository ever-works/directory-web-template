---
id: polar-deep-dive
title: "Polar – szczegółowe omówienie"
sidebar_label: "Polar"
---

# Polar – szczegółowe omówienie

Ta strona omawia kompletną integrację Polar, w tym tworzenie sesji kasy, zarządzanie subskrypcjami, portal klienta i przetwarzanie webhooków.

## Przegląd

Polar to nowoczesna platforma płatnicza zaprojektowana dla oprogramowania i produktów cyfrowych. Integracja obsługuje zarówno jednorazowe płatności, jak i subskrypcje za pośrednictwem systemu kasy Polar, z zarządzaniem cyklem życia sterowanym webhookami. Polar używa produktów przypisanych do organizacji i pakietu `@polar-sh/sdk` do interakcji z API.

## Tabela tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `POST` | `/api/polar/checkout` | Wymagana sesja | Utwórz sesję kasy (subskrypcja lub jednorazowa) |
| `GET` | `/api/polar/checkout` | Wymagana sesja | Pobierz status sesji kasy |
| `POST` | `/api/polar/webhook` | Wymagany podpis | Przetwórz przychodzące zdarzenia webhooka |

## Tworzenie sesji kasy (POST)

### Treść żądania

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // Polar product ID
  mode?: 'one_time' | 'subscription';       // Defaults to "subscription"
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### Przykładowe żądanie

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Jak to działa

Punkt końcowy kasy obsługuje dwa przepływy:

**Tryb subskrypcji:**
1. Uwierzytelnia użytkownika i rozwiązuje klienta Polar
2. Oczyszcza metadane (usuwa wartości `undefined` -- Polar odrzuca je)
3. Wywołuje `polarProvider.createSubscription()`, który tworzy sesję kasy
4. Zwraca URL kasy z wyniku subskrypcji

**Tryb jednorazowej płatności:**
1. Uwierzytelnia użytkownika i rozwiązuje klienta Polar
2. Używa Polar SDK bezpośrednio, aby utworzyć kasę
3. Zwraca URL kasy

### Oczyszczanie metadanych

Polar wymaga, aby wszystkie wartości metadanych były non-null i non-undefined:

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Only include defined values
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Pobieranie sesji kasy (GET)

### Parametry zapytania

| Parametr | Wymagane | Opis |
|----------|----------|------|
| `checkout_id` | Tak | ID sesji kasy Polar |

### Odpowiedź sukcesu (200)

```json
{
  "checkout": { "...full Polar checkout object..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## Zarządzanie subskrypcjami

### Tworzenie subskrypcji

Metoda `PolarProvider.createSubscription()` tworzy kasę dla subskrypcji:

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### Anulowanie subskrypcji

Polar obsługuje dwie strategie anulowania:

```typescript
// Cancel at period end (soft cancel)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Cancel immediately (hard cancel)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

Dostawca sprawdza stan subskrypcji przed anulowaniem:

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### Reaktywacja subskrypcji

Subskrypcje zaplanowane do anulowania można reaktywować:

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### Aktualizacja subskrypcji

Zmiany planu są obsługiwane przez `polar.subscriptions.update()`:

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## Przetwarzanie webhooka

### Weryfikacja podpisu

Polar używa funkcji `validateEvent` z pakietu `@polar-sh/sdk/webhooks` do weryfikacji. Webhook wymaga trzech nagłówków:

| Nagłówek | Opis |
|---------|------|
| `webhook-signature` | Podpis HMAC SHA256 (format: `v1,<hex_signature>`) |
| `webhook-timestamp` | Znacznik czasu Unix zdarzenia |
| `webhook-id` | Unikalny identyfikator dostarczenia webhooka |

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // Parsed JSON
  signatureHeader, // Full "v1,..." signature
  bodyText,        // Raw body for verification
  timestampHeader,
  webhookIdHeader
);
```

### Typy zdarzeń

| Zdarzenie Polar | Mapowanie wewnętrzne |
|----------------|---------------------|
| `checkout.succeeded` | Płatność zakończona sukcesem |
| `checkout.failed` | Płatność nieudana |
| `subscription.created` | Subskrypcja utworzona |
| `subscription.updated` | Subskrypcja zaktualizowana |
| `subscription.canceled` | Subskrypcja anulowana |
| `invoice.paid` | Płatność subskrypcji zakończona |
| `invoice.payment_failed` | Płatność subskrypcji nieudana |

### Router webhooka

Zdarzenia są przekazywane przez dedykowany moduł routera:

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

Router mapuje typy zdarzeń na funkcje obsługi, które aktualizują bazę danych przez `WebhookSubscriptionService` i wysyłają powiadomienia e-mail.

### Walidacja ładunku

Punkt końcowy webhooka weryfikuje strukturę ładunku przed przetworzeniem:

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## Zarządzanie klientami

Dostawca stosuje standardowy trójkrokowy wzorzec rozwiązywania:

1. Sprawdź metadane użytkownika w poszukiwaniu ID klienta Polar
2. Zapytaj tabelę bazy danych `PaymentAccount`
3. Utwórz nowego klienta przez SDK Polar

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## Obsługa błędów

| Status | Błąd | Przyczyna |
|--------|------|-----------|
| 400 | `Product ID is required` | Brak `productId` w żądaniu |
| 400 | `Checkout ID is required` | Żądanie GET bez `checkout_id` |
| 400 | `No signature provided` | Brak nagłówka podpisu w webhooку |
| 401 | `Unauthorized` | Brak uwierzytelnionej sesji |
| 500 | `Failed to create checkout` | Adres URL kasy niedostępny |
| 500 | `Configuration error` | Dostawca Polar nie jest skonfigurowany |
| 503 | Niepełna konfiguracja płatności | Organizacja nie ukończyła konfiguracji płatności w Polar |

Punkt końcowy kasy zawiera specjalne wykrywanie błędów konfiguracyjnych płatności:

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## Wymagania dotyczące konfiguracji

| Zmienna | Wymagane | Opis |
|---------|----------|------|
| `POLAR_ACCESS_TOKEN` | Tak | Token dostępu do API Polar |
| `POLAR_WEBHOOK_SECRET` | Tak | Tajny klucz podpisu webhooka |
| `POLAR_ORGANIZATION_ID` | Tak | ID organizacji Polar |

## Rozważania dotyczące bezpieczeństwa

- Podpisy webhooków są weryfikowane przy użyciu funkcji `validateEvent` z oficjalnego SDK
- Surowy tekst treści jest zachowywany do weryfikacji podpisu (ponowna serializacja JSON może zmodyfikować treść)
- Sprawdzane są trzy osobne nagłówki: podpis, znacznik czasu i ID webhooka
- Metadane są oczyszczane po stronie serwera, aby zapobiec wstrzykiwaniu wartości niezdefiniowanych
- Odpowiedzi błędów używają `safeErrorResponse`, aby zapobiec wyciekom informacji

## Powiązane strony

- [LemonSqueezy – szczegółowe omówienie](./lemonsqueezy-deep-dive.md)
- [Solidgate – szczegółowe omówienie](./solidgate-deep-dive.md)
- [Stripe Checkout – szczegółowe omówienie](./stripe-checkout-deep-dive.md)
- [Architektura dostawcy płatności](./payment-provider-architecture.md)
