---
id: payment-config
title: "Konfiguracja Płatności"
sidebar_label: "Płatności"
sidebar_position: 12
---

# Konfiguracja Płatności

Szablon obsługuje wielu dostawców płatności i elastyczne przepływy rozliczeniowe. Ten dokument referencyjny obejmuje wszystkie stałe, enumy i opcje konfiguracji związane z płatnościami.

## Stałe Płatności

Wszystkie podstawowe enumy i typy płatności są zdefiniowane w `lib/constants/payment.ts`. Ten plik jest celowo oddzielony od głównego modułu konfiguracji, aby można go było importować w skryptach działających poza środowiskiem Next.js (migracje, seeds, narzędzia CLI).

### PaymentFlow

Określa kiedy płatność jest pobierana w stosunku do procesu przesyłania.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Wartość | Opis |
|---------|------|
| `pay_at_start` | Użytkownik płaci przed przesłaniem; element jest natychmiast publikowany |
| `pay_at_end` | Użytkownik najpierw przesyła; płatność jest pobierana po zatwierdzeniu przez administratora |

### PaymentStatus

Śledzi stan próby płatności.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Opcje częstotliwości rozliczeń.

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

Dostępne poziomy subskrypcji.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Obsługiwane bramki płatności.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Schemat Konfiguracji Płatności

Zdefiniowany w `lib/config/schemas/payment.schema.ts` i walidowany przy uruchomieniu za pomocą Zod.

### Ceny Produktów (Wartości Wyświetlane)

```typescript
pricing: {
  free: number;       // Domyślnie: 0
  standard: number;   // Domyślnie: 10
  premium: number;    // Domyślnie: 20
}
```

| Zmienna środowiskowa | Pole | Domyślnie |
|----------------------|------|-----------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Konfiguracja Okresu Próbnego

| Zmienna środowiskowa | Pole | Opis |
|----------------------|------|------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | ID ceny dla standardowego okresu próbnego |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | ID ceny dla premium okresu próbnego |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Włącz kwoty próbne (`true`/`false`) |

## Konfiguracja Dostawców

### Stripe

Automatycznie włączany gdy obecne są zarówno `secretKey` jak i `publishableKey`.

| Zmienna środowiskowa | Wymagane | Opis |
|----------------------|----------|------|
| `STRIPE_SECRET_KEY` | Tak | Klucz API po stronie serwera |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Tak | Klucz publiczny po stronie klienta |
| `STRIPE_WEBHOOK_SECRET` | Zalecane | Weryfikacja podpisu webhooka |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Nie | ID ceny dla planu darmowego |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Nie | ID ceny dla planu standardowego |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Nie | ID ceny dla planu premium |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Nie | Ustaw `true` aby pobierać ceny z API Stripe |

### LemonSqueezy

Automatycznie włączany gdy obecne są zarówno `apiKey` jak i `storeId`.

| Zmienna środowiskowa | Wymagane | Opis |
|----------------------|----------|------|
| `LEMONSQUEEZY_API_KEY` | Tak | Klucz API z dashboardu LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | Tak | Identyfikator Twojego sklepu |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Zalecane | Weryfikacja podpisu webhooka |
| `LEMONSQUEEZY_WEBHOOK_URL` | Nie | Nadpisz URL punktu końcowego webhooka |
| `LEMONSQUEEZY_TEST_MODE` | Nie | Ustaw `true` dla trybu testowego |
| `LEMONSQUEEZY_VARIANT_ID` | Nie | Domyślny ID wariantu |

### Polar

Automatycznie włączany gdy obecne są zarówno `accessToken` jak i `organizationId`.

| Zmienna środowiskowa | Wymagane | Opis |
|----------------------|----------|------|
| `POLAR_ACCESS_TOKEN` | Tak | Token dostępu do API |
| `POLAR_ORGANIZATION_ID` | Tak | Identyfikator organizacji |
| `POLAR_WEBHOOK_SECRET` | Zalecane | Weryfikacja podpisu webhooka |
| `POLAR_SANDBOX` | Nie | Ustaw `false` dla produkcji (domyślnie: `true`) |
| `POLAR_API_URL` | Nie | Nadpisz bazowy URL API |

### Solidgate

Wymaga ręcznej konfiguracji zmiennych środowiskowych.

| Zmienna środowiskowa | Wymagane | Opis |
|----------------------|----------|------|
| `SOLIDGATE_API_KEY` | Tak | Klucz API |
| `SOLIDGATE_SECRET_KEY` | Tak | Tajny klucz do podpisywania |
| `SOLIDGATE_WEBHOOK_SECRET` | Tak | Weryfikacja webhooka |
| `SOLIDGATE_MERCHANT_ID` | Tak | Identyfikator sprzedawcy |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | Nie | Klucz po stronie klienta |

## Rozliczenia w Wielu Walutach

Każdy dostawca obsługuje ceny dla poszczególnych walut za pośrednictwem modułów konfiguracji rozliczeń w `lib/config/billing/`.

### Typy Konfiguracji Rozliczeń

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // ID ceny/wariantu dla rozliczeń miesięcznych
  yearly?: string;    // ID ceny/wariantu dla rozliczeń rocznych
  setupFee?: string;  // Opcjonalny ID ceny opłaty instalacyjnej
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // Kod ISO 4217 (np. 'USD')
  symbol?: string;    // Symbol wyświetlany (np. '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Obsługiwane Waluty

Tablica `SUPPORTED_CURRENCIES` w `lib/config/billing/types.ts` zawiera wszystkie 32 kody ISO 4217 akceptowane przez system (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF i więcej).

### Funkcje Rozwiązywania Cen

Każdy dostawca eksportuje funkcję konfiguracji cen:

| Dostawca | Funkcja | Źródło |
|----------|---------|--------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

Wszystkie funkcje powracają do USD, jeśli żądana waluta nie jest skonfigurowana.

## Konfiguracja Przepływu Płatności

Zdefiniowana w `lib/config/payment-flows.ts`, tablica `PAYMENT_FLOWS` konfiguruje dwie opcje przepływu płatności z właściwościami UI:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Nazwa ikony Lucide
  color: string;           // Klasy gradientu Tailwind
  features: string[];      // Punkty funkcji
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Opcjonalna etykieta plakietki
  isDefault?: boolean;     // Czy jest to domyślny przepływ
}
```

Funkcje pomocnicze:
- `getDefaultPaymentFlow()` -- zwraca domyślną wartość `PaymentFlow`
- `getPaymentFlowConfig(flowId)` -- zwraca `PaymentFlowConfig` dla danego przepływu

## Menedżer Dostawców Płatności

Klasa `PaymentProviderManager` w `lib/payment/config/payment-provider-manager.ts` zapewnia dostęp w trybie singleton do instancji dostawców:

```typescript
// Pobierz konkretnego dostawcę
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// Lub użyj funkcji generycznej
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Powiązane Strony

- [Typy Płatności](../types/payment-types.md) -- definicje typów dla operacji płatności
- [Typy Subskrypcji](../types/subscription-types.md) -- typy cyklu życia subskrypcji
- [Odniesienie do Środowiska](./environment-reference.md) -- pełna lista zmiennych środowiskowych
