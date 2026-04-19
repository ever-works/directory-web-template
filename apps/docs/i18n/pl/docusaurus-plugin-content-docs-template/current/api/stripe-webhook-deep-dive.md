---
id: stripe-webhook-deep-dive
title: "Webhook Stripe – szczegółowe omówienie"
sidebar_label: "Webhook Stripe"
---

# Webhook Stripe – szczegółowe omówienie

Ta strona omawia kompletną implementację webhooka Stripe, w tym weryfikację podpisu, mapowanie zdarzeń, obsługę powiadomień e-mail i obsługę reklam sponsorowanych.

## Tabela tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `POST` | `/api/stripe/webhook` | Podpis Stripe | Przetwórz zdarzenia webhooka Stripe |

## Weryfikacja podpisu

Punkt końcowy webhooka weryfikuje autentyczność nadchodzącej treści używając Stripe SDK:

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  stripeSignature,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

Nagłówek `stripe-signature` musi być obecny — w przeciwnym razie żądanie jest odrzucane z błędem `400`.

## Mapowanie typów zdarzeń

| Zdarzenie Stripe | Akcja |
|----------------|-------|
| `customer.subscription.created` | Utwórz/zaktualizuj rekord subskrypcji |
| `customer.subscription.updated` | Zaktualizuj status subskrypcji i cechy planu |
| `customer.subscription.deleted` | Oznacz subskrypcję jako anulowaną |
| `invoice.payment_succeeded` | Zarejestruj pomyślną płatność, wyślij e-mail z potwierdzeniem |
| `invoice.payment_failed` | Zarejestruj nieudaną płatność, wyślij e-mail z powiadomieniem |
| `invoice.paid` (subskrypcja) | Odśwież cechy planu subskrypcji |
| `invoice.payment_failed` (subskrypcja) | Oznacz braki w płatności za subskrypcję |
| `customer.subscription.trial_will_end` | Wyślij przypomnienie o końcu okresu próbnego |
| `payment_intent.succeeded` | Zarejestruj pomyślną intencję płatności |

## Przepływ przetwarzania webhooka

```
POST /api/stripe/webhook
        |
        v
  Pobierz surową treść (text())
        |
        v
  Zweryfikuj podpis (stripe.webhooks.constructEvent)
        |
        v
  Zmapuj typ zdarzenia na obsługę
        |
        +---> handleSubscriptionCreated()
        +---> handleSubscriptionUpdated()
        +---> handleSubscriptionCancelled()
        +---> handlePaymentSucceeded()
        +---> handlePaymentFailed()
        +---> handleTrialWillEnd()
        |
        v
  Zwróć { received: true }
```

## Obsługa zdarzeń

### Subskrypcja created/updated

Oba zdarzenia delegują do `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  await webhookSubscriptionService.handleSubscriptionCreated(subscription);
}
```

`WebhookSubscriptionService` jest inicjalizowany ze stałą dostawcy `STRIPE`:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.STRIPE);
```

### Zdarzenia płatności

Zdarzenie `invoice.payment_succeeded` obsługuje zarówno jednorazowe płatności, jak i opłaty za subskrypcje:

```typescript
async function handlePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  if (isSponsorAdSubscription(invoice)) {
    await handleSponsorAdPayment(invoice);
    return;
  }

  await paymentEmailService.sendPaymentConfirmation(
    createEmailData(invoice, 'succeeded')
  );
}
```

## Powiadomienia e-mail

Serwis e-mail wysyła powiadomienia dla zdarzeń płatności:

```typescript
const emailData = createEmailData(invoice, eventType);
await paymentEmailService.sendPaymentConfirmation(emailData);
```

Metoda pomocnicza `createEmailData` wyodrębniania danych e-mail z faktury:

```typescript
function createEmailData(invoice: Stripe.Invoice, eventType: string) {
  return {
    userEmail: invoice.customer_email,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    invoiceUrl: invoice.hosted_invoice_url,
    eventType
  };
}
```

## Obsługa reklam sponsorowanych

Punkt końcowy webhooka wykrywa zdarzenia powiązane z reklamami sponsorowanymi za pomocą metadanych faktury:

```typescript
function isSponsorAdSubscription(invoice: Stripe.Invoice): boolean {
  const metadata = invoice.metadata || {};
  return metadata.type === 'sponsor_ad' || !!metadata.sponsorAdId;
}
```

Gdy reklama sponsorowana jest wykryta, webhook aktualizuje status reklamy zamiast wysyłać standardowy e-mail płatniczy:

```typescript
async function handleSponsorAdPayment(invoice: Stripe.Invoice) {
  const adId = invoice.metadata?.sponsorAdId;
  if (adId) {
    await sponsorAdService.activateAd(adId);
  }
}
```

## Cechy planu

`getSubscriptionFeatures` mapuje ID cennika Stripe na cechy planu aplikacji:

```typescript
const features = await getSubscriptionFeatures(subscription.items.data[0].price.id);
await updateUserPlanFeatures(userId, features);
```

## Obsługa błędów

| Kod | Treść | Przyczyna |
|-----|-------|-----------|
| 400 | `No signature provided` | Brak nagłówka `stripe-signature` |
| 400 | `Webhook verification failed` | Nieprawidłowy podpis lub nieaktualny webhook |
| 400 | `Invalid payload` | Zniekształcona treść webhooka |
| 500 | `Webhook handler error` | Nieoczekiwany błąd przetwarzania |

Błędy obsługi zdarzeń są rejestrowane, ale nie powodują zwrócenia kodu błędu — Stripe wymaga odpowiedzi `200` lub ponowi próbę zdarzenia:

```typescript
try {
  await handleEvent(event);
} catch (error) {
  console.error(`Webhook handler error for ${event.type}:`, error);
  // Still return 200 to prevent Stripe retries for handler errors
}
return NextResponse.json({ received: true });
```

## Wymagania dotyczące konfiguracji

| Zmienna | Wymagane | Opis |
|---------|----------|------|
| `STRIPE_SECRET_KEY` | Tak | Tajny klucz API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Tak | Tajny klucz weryfikacji webhooka (whsec_xxx) |

## Instrukcja konfiguracji

1. Utwórz punkt końcowy webhooka w dashboardzie Stripe
2. Ustaw URL na `https://twoja-domena.com/api/stripe/webhook`
3. Wybierz zdarzenia do nasłuchiwania (wymienione w tabeli powyżej)
4. Skopiuj tajny klucz podpisywania do `STRIPE_WEBHOOK_SECRET`

## Kwestie bezpieczeństwa

- **Surowa treść** — użyj `request.text()`, a nie `request.json()` do weryfikacji podpisu
- **Tajny klucz webhooka** — każde środowisko powinno mieć własny tajny klucz
- **Limity czasowe obsługi** — obsługi webhooków powinny odpowiadać szybko; obsługuj długie operacje asynchronicznie
- **Idempotencja** — zdarzenia webhooka mogą być wysyłane wielokrotnie; `WebhookSubscriptionService` obsługuje idempotencję
