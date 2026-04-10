---
id: configuration
title: Konfiguracja Płatności
sidebar_label: Przewodnik Konfiguracji
sidebar_position: 6
description: Kompletny przewodnik konfiguracji dostawców płatności (Stripe, LemonSqueezy, Polar, Solidgate) z obsługą wielu walut
keywords: [płatność, konfiguracja, stripe, lemonsqueezy, polar, solidgate, multi-waluta]
---

# Konfiguracja Płatności

Ten przewodnik wyjaśnia, jak konfigurować różnych dostawców płatności obsługiwanych przez aplikację.

## Spis treści

- [Przegląd](#overview)
- [Obsługiwani dostawcy](#supported-providers)
- [Wspólna konfiguracja](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Multi-waluta](#multi-currency)
- [Okresy próbne i opłaty konfiguracyjne](#trials-and-setup-fees)
- [Wybór dostawcy](#provider-selection)
- [Rozwiązywanie problemów](#troubleshooting)

---

## Przegląd

Aplikacja obsługuje wielu dostawców płatności dla subskrypcji:

| Dostawca     | Typ           | Multi-waluta   | Okresy próbne |
|--------------|---------------|----------------|---------------|
| Stripe       | Subskrypcja   | ✅ Tak         | ✅ Tak        |
| LemonSqueezy | Subskrypcja   | ✅ Tak         | ✅ Tak        |
| Polar        | Subskrypcja   | ❌ Nie         | ❌ Nie        |
| Solidgate    | Subskrypcja   | ⚠️ Częściowo  | ❌ Nie        |

### Dostępne plany

- **Bezpłatny** - Darmowy, podstawowe funkcje
- **Standardowy** - Plan pośredni z większą widocznością
- **Premium** - Pełny plan ze wszystkimi funkcjami

---

## Obsługiwani dostawcy

### Architektura

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Eksporty
│       ├── types.ts              # Wspólne typy
│       ├── stripe.config.ts      # Konfiguracja multi-walutowa Stripe
│       ├── lemonsqueezy.config.ts # Konfiguracja multi-walutowa LemonSqueezy
│       └── solidgate.config.ts   # Konfiguracja Solidgate (WIP)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (WIP)
└── utils/
    └── payment-provider.ts       # Wybór dostawcy
```

---

## Wspólna konfiguracja

### Wyświetlane ceny (dla interfejsu użytkownika)

Te zmienne definiują ceny wyświetlane w interfejsie użytkownika:

```bash
# Ceny w dolarach (lub głównej walucie) - tylko do wyświetlania
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Okresy próbne (trial)

```bash
# Identyfikatory kwot testowych (opłaty wstępne podczas okresu próbnego)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Włącz/wyłącz okresy próbne z autoryzowaną kwotą
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Wymagania wstępne

1. Utwórz konto na [Stripe Dashboard](https://dashboard.stripe.com)
2. Pobierz klucze API (Ustawienia → Klucze API)
3. Skonfiguruj webhook

### Podstawowe zmienne środowiskowe

```bash
# ============================================
# STRIPE - Konfiguracja podstawowa
# ============================================

# Klucze API (wymagane)
STRIPE_SECRET_KEY=sk_live_xxx           # Klucz tajny (serwer)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Klucz publikowalny
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Klucz publikowalny (klient)

# Webhook (wymagane dla zdarzeń)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Konfiguracja produktu (Legacy - tylko USD)

```bash
# Proste ceny (dla kompatybilności wstecznej, tylko USD)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Konfiguracja multi-walutowa (Zalecana)

#### Plan standardowy

```bash
# ============================================
# STRIPE PLAN STANDARDOWY
# ============================================

# Identyfikator produktu
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Ceny miesięczne według waluty
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Ceny roczne według waluty
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Opłaty konfiguracyjne / kwoty próbne według waluty
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Plan Premium

```bash
# ============================================
# STRIPE PLAN PREMIUM
# ============================================

# Identyfikator produktu
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Ceny miesięczne według waluty
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Ceny roczne według waluty
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Opłaty konfiguracyjne / kwoty próbne według waluty
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Tworzenie cen w Stripe

1. Przejdź do **Produkty** → Utwórz produkt
2. Dodaj ceny dla każdej waluty:
   - Kliknij "Dodaj kolejną cenę"
   - Wybierz walutę (EUR, GBP, CAD)
   - Ustaw równoważną kwotę
3. Skopiuj każdy `price_xxx` do odpowiednich zmiennych

### Webhook Stripe

Skonfiguruj webhook w Stripe Dashboard:

- **URL**: `https://twoja-domena.com/api/stripe/webhook`
- **Zdarzenia do nasłuchiwania**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Wymagania wstępne

1. Utwórz konto na [LemonSqueezy](https://lemonsqueezy.com)
2. Utwórz sklep
3. Utwórz produkty i warianty

### Zmienne środowiskowe

```bash
# ============================================
# LEMONSQUEEZY - Konfiguracja podstawowa
# ============================================

# API (wymagane)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://twoja-domena.com/api/lemonsqueezy/webhook

# Tryb testowy
LEMONSQUEEZY_TEST_MODE=false
```

### Konfiguracja wariantów (Legacy)

```bash
# Proste warianty
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Warianty z opłatą konfiguracyjną (dla okresów próbnych)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Konfiguracja multi-walutowa

#### Plan standardowy

```bash
# ============================================
# LEMONSQUEEZY PLAN STANDARDOWY
# ============================================

# Identyfikator produktu
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx

# Ceny miesięczne według waluty
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx

# Ceny roczne według waluty
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx

# Opłaty konfiguracyjne według waluty
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Plan Premium

```bash
# ============================================
# LEMONSQUEEZY PLAN PREMIUM
# ============================================

# Identyfikator produktu
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx

# Ceny miesięczne według waluty
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx

# Ceny roczne według waluty
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx

# Opłaty konfiguracyjne według waluty
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Wymagania wstępne

1. Utwórz konto na [Polar](https://polar.sh)
2. Utwórz organizację
3. Utwórz plany subskrypcji

### Zmienne środowiskowe

```bash
# ============================================
# POLAR - Konfiguracja
# ============================================

# API (wymagane)
POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx

# Webhook
POLAR_WEBHOOK_SECRET=xxx

# Tryb sandbox (true dla testów, false dla produkcji)
POLAR_SANDBOX=true

# URL API (opcjonalne, domyślnie: api.polar.sh)
POLAR_API_URL=https://api.polar.sh

# Identyfikatory planów
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx

# Kwoty testowe (opcjonalne)
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning W trakcie opracowywania
Integracja Solidgate jest obecnie w fazie opracowywania. Niektóre funkcje mogą nie być jeszcze w pełni operacyjne.
:::

### Wymagania wstępne

1. Utwórz konto na [Solidgate](https://solidgate.com)
2. Pobierz poświadczenia API z portalu sprzedawcy
3. Skonfiguruj endpoint webhook

### Zmienne środowiskowe

```bash
# ============================================
# SOLIDGATE - Konfiguracja (WIP)
# ============================================

# Poświadczenia API (wymagane)
SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx

# Webhook
SOLIDGATE_WEBHOOK_SECRET=xxx

# Środowisko (test lub live)
SOLIDGATE_ENVIRONMENT=test
```

### Konfiguracja produktu

```bash
# ============================================
# PLANY SOLIDGATE (WIP)
# ============================================

# Identyfikatory produktów
NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx

# Identyfikatory cen (obecnie tylko USD)
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Obecne ograniczenia

| Funkcja          | Status          | Uwagi                              |
|------------------|--------|-------------------------------------|
| Podstawowe płatności | ✅ Zaimplementowane | Płatności jednorazowe i subskrypcja |
| Multi-waluta     | ⚠️ Częściowe   | Obecnie tylko USD                 |
| Okresy próbne    | ❌ Jeszcze nie | Planowane w przyszłej wersji       |
| Webhooks         | ⚠️ Częściowe   | Tylko podstawowe zdarzenia        |
| Zwroty           | ❌ Jeszcze nie | Planowane w przyszłej wersji       |

---

## Multi-waluta

### Obsługiwane waluty

| Kod  | Waluta              | Symbol |
|------|---------------------|--------|
| USD  | Dolar amerykański   | $      |
| EUR  | Euro                | €      |
| GBP  | Funt szterling      | £      |
| CAD  | Dolar kanadyjski    | CA$    |

### Jak to działa

1. Waluta użytkownika jest wykrywana automatycznie (geolokalizacja, preferencje)
2. System wybiera `price_id` odpowiadający walucie
3. Jeśli waluta nie jest skonfigurowana, powraca do USD

### Przykład użycia

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  
  // Automatycznie pobiera poprawny identyfikator ceny dla waluty
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Subskrybuj za {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Okresy próbne i opłaty konfiguracyjne

### Koncepcja

- **Okres próbny**: Bezpłatny lub zniżkowy okres testowy
- **Opłata konfiguracyjna**: Wstępne opłaty pobierane na początku okresu próbnego

### Konfiguracja

```bash
# Włącz okresy próbne z autoryzowaną kwotą
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Ważne: Spójność waluty

:::caution
Wszystkie ceny w sesji checkoutu muszą być w tej samej walucie.
:::

Jeśli używasz okresów próbnych z opłatami konfiguracyjnymi, musisz utworzyć opłatę konfiguracyjną dla każdej waluty:

```bash
# ❌ BŁĄD: Opłata konfiguracyjna w USD + Główna cena w GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx  # USD
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP

# ✅ POPRAWNIE: Obie w GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx  # GBP
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP
```

---

## Wybór dostawcy

### Priorytet

1. **Dostawca wybrany przez użytkownika** (Ustawienia)
2. **Domyślny dostawca** (konfiguracja)
3. **Fallback**: Stripe

### Konfiguracja domyślnego dostawcy

W pliku konfiguracyjnym witryny:

```typescript
// W konfiguracji witryny
pricing: {
  provider: PaymentProvider.STRIPE  // lub LEMONSQUEEZY, POLAR
}
```

### Przykład użycia

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## Rozwiązywanie problemów

### Błąd: Konflikt waluty

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Przyczyna**: Główna cena i opłata konfiguracyjna są w różnych walutach.

**Rozwiązanie**: Utwórz opłaty konfiguracyjne dla każdej obsługiwanej waluty.

### Błąd: Nieprawidłowy identyfikator ceny

```
Error: Invalid price ID
```

**Przyczyna**: `price_id` nie istnieje lub nie jest skonfigurowany.

**Rozwiązanie**: Sprawdź, czy zmienna środowiskowa zawiera prawidłowy identyfikator.

### Webhook nie odbiera zdarzeń

1. Sprawdź URL webhooka w panelu dostawcy
2. Potwierdź, że `WEBHOOK_SECRET` jest poprawny
3. Testuj narzędziami debugowania dostawcy

### Ceny nie wyświetlają się poprawnie

1. Sprawdź `NEXT_PUBLIC_PRODUCT_PRICE_*` dla wyświetlanych wartości
2. Sprawdź, czy wartości `price_id` odpowiadają poprawnym walutom
3. Uruchom ponownie serwer deweloperski po modyfikacji plików `.env`
