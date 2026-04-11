---
id: multi-currency
title: Integracja wielowalutowa
sidebar_label: Wielowalutowy
sidebar_position: 5
---

# Przewodnik integracji wielu walut

W tym dokumencie wyjaśniono, w jaki sposób system wielowalutowy jest zintegrowany z aplikacją i jak współpracuje z dostawcami usług płatniczych (Stripe, LemonSqueezy i Polar).

## Architektura

System wielowalutowy działa na wielu poziomach:

1. **Konfiguracja podstawowa** ( `lib/types.ts` ): Konfiguracja domyślna z obsługą wielu walut
2. **ConfigProvider** ( `app/[locale]/config.tsx` ): Wzbogaca konfigurację o walutę użytkownika
3. **Haki przy kasie**: Użyj konfiguracji wielowalutowych, aby uzyskać prawidłowe identyfikatory cen

## Przepływ danych

```
CurrencyProvider (user currency)
    ↓
ConfigProvider (enriches config.pricing with currency)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (currency + plan)
    ↓
Correct Price ID for the user's currency
```

## Zmodyfikowane pliki

### 1. `app/[locale]/config.tsx` - Używa `useCurrencyContext()` , aby uzyskać walutę użytkownika
- Automatycznie generuje konfigurację cenową na podstawie waluty, jeśli nie podano konfiguracji
- Używa `getDefaultPricingConfigWithCurrency()` do utworzenia konfiguracji wielowalutowej

### 2. `hooks/use-create-checkout.ts` - Używa `useCurrencyContext()` , aby uzyskać walutę
- Wywołuje `getStripePriceConfig()` , aby uzyskać prawidłowy identyfikator ceny w oparciu o walutę
- Wraca do `plan.stripePriceId` , jeśli konfiguracja wielowalutowa nie jest dostępna

### 3. `hooks/use-pricing-section.ts` - Używa `useCurrencyContext()` , aby uzyskać walutę
- Dzwoni pod numer `getLemonSqueezyPriceConfig()` i dzwoni do LemonSqueezy
- Używa identyfikatorów cen opartych na walucie w momencie realizacji transakcji

## Użycie

### Dla programistów

System działa automatycznie. Istniejące komponenty nie wymagają żadnych modyfikacji.

**Przykład użycia w komponencie:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing is automatically enriched with the user's currency
  // Price IDs are based on the user's currency
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Currency symbol is automatically updated
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### Do haczyków kasowych

Haki kasowe automatycznie korzystają z konfiguracji wielowalutowych:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Konfiguracja zmiennych środowiskowych

Aby system działał należy skonfigurować zmienne środowiskowe dla każdej waluty w:

- `lib/config/billing/stripe.config.ts` : `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` zmiennych
- `lib/config/billing/lemonsqueezy.config.ts` : `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` zmienne

**Przykład dla paska:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Obsługiwane waluty

Obsługiwane waluty są zdefiniowane w `lib/config/billing/types.ts` :

- USD, EUR, GBP, CAD (skonfigurowane w konfiguracjach rozliczeń)
- Inne waluty ISO 4217 (powrót do USD)

## Powrót

Jeśli waluta nie jest obsługiwana lub jeśli konfiguracje wielowalutowe nie są dostępne:

1. System używa `plan.stripePriceId` / `plan.lemonVariantId` (konfiguracja statyczna)
2. Domyślną walutą jest USD
3. Domyślnym symbolem jest $

## Testowanie

Aby przetestować system wielowalutowy:

1. Zmień walutę użytkownika za pomocą `/api/user/currency` 2. Sprawdź, czy identyfikatory cen zmieniają się w zależności od waluty
3. Przetestuj płatność w różnych walutach

## Ważne uwagi

- Identyfikatory cen są rozpoznawane **w momencie realizacji transakcji**, a nie w momencie wyświetlania
- Konfiguracja cen w `content/config.yml` ma pierwszeństwo przed konfiguracją domyślną
- Konfiguracje wielowalutowe są używane tylko wtedy, gdy skonfigurowane są zmienne środowiskowe

## Integracja z dostawcami płatności

System wielowalutowy współpracuje bezproblemowo ze wszystkimi dostawcami usług płatniczych:

- **Pasek**: Używa `getStripePriceConfig()` do uzyskania identyfikatorów cen dla danej waluty
- **LemonSqueezy**: Używa `getLemonSqueezyPriceConfig()` , aby uzyskać identyfikatory wariantów dla konkretnej waluty
- **Polar**: obsługuje wiele walut poprzez konfigurację produktu

Aby zapoznać się ze szczegółową konfiguracją specyficzną dla dostawcy, zobacz:
- [Konfiguracja pasków](./pasek)
- [Konfiguracja LemonSqueezy](./lemonsqueezy)
- [Konfiguracja polarna](./polar)
