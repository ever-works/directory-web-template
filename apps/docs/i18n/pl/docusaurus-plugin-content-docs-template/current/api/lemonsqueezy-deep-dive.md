---
id: lemonsqueezy-deep-dive
title: "Szczegółowe omówienie LemonSqueezy"
sidebar_label: "LemonSqueezy"
---

# Szczegółowe omówienie LemonSqueezy

Integracja LemonSqueezy obsługuje tworzenie płatności jednorazowych i subskrypcyjnych, przełączanie planów, anulowanie subskrypcji i bezpieczne przetwarzanie webhooków. Wszystkie punkty końcowe LemonSqueezy są zlokalizowane w `app/api/lemonsqueezy/`.

## Mapa tras

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/lemonsqueezy/checkout` | Utwórz URL płatności LemonSqueezy |
| `GET` | `/api/lemonsqueezy/checkout` | Pobierz sesję checkout przez parametry zapytania |
| `POST` | `/api/lemonsqueezy/webhook` | Przetwórz webhooks LemonSqueezy |

---

## Tworzenie Checkout

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/lemonsqueezy/checkout` |
| **Uwierzytelnianie** | Wymagane |

### Treść żądania

```typescript
{
  variantId: string;       // ID wariantu produktu LemonSqueezy
  planId: string;          // ID planu wewnętrznego
  billingCycle: string;    // "monthly" lub "yearly"
}
```

### Odpowiedź

```json
{
  "checkoutUrl": "https://my-store.lemonsqueezy.com/checkout/buy/..."
}
```

URL checkout jest ważny przez ograniczony czas i zawiera wstępnie wypełnione dane użytkownika, w tym e-mail i ID klienta w metadanych.

### Przepływ tworzenia

1. Sprawdź sesję użytkownika
2. Pobierz lub utwórz rekord klienta dla użytkownika
3. Wywołaj LemonSqueezy API: `POST /v1/checkouts`
4. Dołącz metadane: `userId`, `planId`, `billingCycle`
5. Zwróć wygenerowany `checkoutUrl`

---

## Pobierz Checkout (GET)

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/lemonsqueezy/checkout` |
| **Uwierzytelnianie** | Wymagane |

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `variantId` | string | Tak | ID wariantu LemonSqueezy |
| `planId` | string | Tak | ID planu wewnętrznego |
| `billingCycle` | string | Tak | `"monthly"` lub `"yearly"` |

---

## Zarządzanie Subskrypcjami

Subskrypcje LemonSqueezy są zarządzane przez `LemonSqueezyPaymentService`. Obsługiwane operacje:

### Utwórz subskrypcję

```typescript
createSubscription(userId, variantId, planId, billingCycle): Promise<CheckoutResult>
```

Tworzy nową subskrypcję lub generuje URL checkout dla płatności jednorazowej.

### Anuluj subskrypcję

```typescript
cancelSubscription(subscriptionId): Promise<void>
```

Anuluje aktywną subskrypcję LemonSqueezy. Subskrypcja pozostaje aktywna do końca biezacego okresu rozliczeniowego.

Wywołuje `DELETE /v1/subscriptions/{id}` w API LemonSqueezy.

### Zmień Plan

```typescript
upgradeSubscription(subscriptionId, newVariantId, newPlanId): Promise<void>
```

Natychmiast aktualizuje wariant subskrypcji (przełączenie planu). LemonSqueezy automatycznie przelicza pozostały czas i wystawia korygującą fakturę.

Wywołuje `PATCH /v1/subscriptions/{id}` z nowym `variant_id`.

### Wznowienie subskrypcji (cofnięcie anulowania)

```typescript
resumeSubscription(subscriptionId): Promise<void>
```

Wznawia subskrypcję oczekującą na anulowanie przez ustawienie `cancelled = false`. Wywołuje `PATCH /v1/subscriptions/{id}` z `{ cancelled: false }`.

### Wstrzymanie subskrypcji

```typescript
pauseSubscription(subscriptionId): Promise<void>
```

Wstrzymuje subskrypcję od następnej daty odnowienia. Wywołuje `PATCH /v1/subscriptions/{id}` z `{ pause: { mode: "free" } }`.

---

## Przetwarzanie Webhooków

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/lemonsqueezy/webhook` |
| **Uwierzytelnianie** | podpis HMAC SHA-256 |

### Weryfikacja podpisu

Wszystkie webhooks są weryfikowane przy użyciu HMAC SHA-256:

```typescript
const digest = crypto
  .createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
  .update(rawBody)
  .digest('hex');

const signature = request.headers.get('x-signature');

if (digest !== signature) {
  return new Response('Invalid signature', { status: 401 });
}
```

### Obsługiwane zdarzenia webhooks

| Zdarzenie | Akcja |
|-----------|-------|
| `subscription_created` | Utwórz rekord subskrypcji w bazie danych |
| `subscription_updated` | Zaktualizuj status i metaadane subskrypcji |
| `subscription_cancelled` | Oznacz subskrypcję jako oczekującą na anulowanie |
| `subscription_expired` | Dezaktywuj subskrypcję i cofnij dostęp do planu |
| `subscription_payment_success` | Zarejestruj płatność i przedłuż subskrypcję |
| `subscription_payment_failed` | Oznacz subskrypcję jako zalegającą |
| `order_created` | Obsłuż jednorazowe zamachów zakupu |

### Mapowanie zdarzeń

Wehbooks LemonSqueezy są mapowane na wewnętrzne statusy:

| Status LemonSqueezy | Wewnętrzny status |
|---|---|
| `active` | `active` |
| `cancelled` | `cancelled` |
| `expired` | `expired` |
| `past_due` | `past_due` |
| `paused` | `paused` |
| `unpaid` | `past_due` |

---

## Uwagi bezpieczeństwa

- **Weryfikacja webhooks:** Zawsze weryfikuj nagłówek `x-signature` przed przetworzeniem żadnego webhooka.
- **Klucze API:** Klucz API LemonSqueezy (`LEMONSQUEEZY_API_KEY`) jest używany wyłącznie po stronie serwera i nigdy nie powinien być ujawniany klientom.
- **Idempotencja:** Do obsługi zduplikowanych dostarczeń webhooks używaj unikalnych ID zdarzeń.

## Ograniczenia

- LemonSqueezy nie obsługuje **płatności gwarantowanych** (np. Setup Intents do zbierania metod płatności bez natychmiastowego obciążenia).
- Brak wbudowanego **API zwrotów** -- zwroty muszą być przetwarzane ręcznie w panelu LemonSqueezy lub poprzez bezpośrednie wywołania API.
