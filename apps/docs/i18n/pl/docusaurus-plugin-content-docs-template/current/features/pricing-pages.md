---
id: pricing-pages
title: Strony z cenami i kasami
sidebar_label: Strony z cenami
sidebar_position: 19
---

# Strony z cenami i kasami

Szablon Ever Works zawiera w pełni funkcjonalny system strony z cenami z obsługą płatności u wielu dostawców (Stripe, LemonSqueezy, Polar), przełączaniem interwałów rozliczeniowych, dynamicznymi cenami z produktów Stripe, formatowaniem walut, kartami porównania planów, sekcjami reklam sponsorów oraz przepływami płatności osadzonymi lub opartymi na przekierowaniach.

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Planuj konfiguracje, listy funkcji i moduły pobierające tekst akcji |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Organizuje cały stan cen, realizację transakcji i logikę płatności |
| `PricingSection` | `components/pricing/pricing-section.tsx` | Interfejs strony z pełnym cennikiem z kartami planów i przepływem transakcji |
| `PlanCard` | `components/pricing/plan-card.tsx` | Karta ekspozycyjna planu indywidualnego |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Wbudowany modalny formularz płatności |
| `PaymentFlowSelectorModal` | `components/payment/` | Modalny wybór przepływu (zapłać teraz vs. zapłać na koniec) |

## Konfiguracja planu

System obsługuje trzy poziomy planów skonfigurowane poprzez `usePricingFeatures` :

| Zaplanuj | Tekst akcji (zalogowany) | Tekst akcji (niezalogowany) |
|---|---|---|
| `free` | „Rozpocznij za darmo” | „Prześlij za darmo” |
| `standard` | „Aktualizacja do standardu” | „Zasubskrybuj teraz” |
| `premium` | „Przejdź na Premium” | „Zasubskrybuj teraz” |

### Interfejs konfiguracji planu

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Listy funkcji

Każdy plan ma wpisaną listę funkcji:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| Zaplanuj | Liczba funkcji | Godne uwagi włączenia |
|---|---|---|
| Bezpłatne | 9 funkcji | Prześlij produkt, podstawowy opis, jedno zdjęcie, link do strony |
| Standardowe | 9 funkcji | Wszystkie bezpłatne funkcje, zweryfikowana odznaka, przegląd priorytetowy, statystyki miesięczne |
| Premium | 11 funkcji | Wszystkie standardowe funkcje, pozycja sponsorowana, wyróżniona strona główna, nieograniczona galeria |

## Hak `usePricingSection` Ten kompleksowy hak organizuje całą logikę strony z cenami:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### Stan

| Nieruchomość | Wpisz | Opis |
|---|---|---|
| `showSelector` | `boolean` | Czy widoczny jest selektor przepływu płatności |
| `billingInterval` | `PaymentInterval` | Aktualny okres rozliczeniowy (miesięczny/roczny) |
| `processingPlan` | `string \| null` | Identyfikator aktualnie przetwarzanego planu |
| `selectedPlan` | `PaymentPlan \| null` | Aktualnie wybrany plan |
| `selectedFlow` | `PaymentFlow` | Typ przepływu płatności (zapłać teraz vs. zapłać na koniec) |
| `isButton` | `boolean` | Czy wybrany przepływ korzysta z trybu przycisku |

### Działania

| Metoda | Opis |
|---|---|
| `setBillingInterval(interval)` | Przełączanie między rozliczeniami miesięcznymi i rocznymi |
| `handleSelectPlan(plan)` | Wybierz plan i powiadom rodzica poprzez oddzwonienie |
| `handleCheckout(plan)` | Rozpocznij realizację transakcji dla danej konfiguracji planu |
| `calculatePrice(plan)` | Oblicz cenę na podstawie okresu rozliczeniowego i rocznego rabatu |
| `getSavingsText(plan)` | Uzyskaj tekst dotyczący rocznych oszczędności (np. „Zaoszczędź 24 USD rocznie”) |
| `cancelCurrentProcess()` | Anuluj trwającą transakcję i zresetuj stan |
| `formatPrice(amount)` | Formatuj kwotę za pomocą symbolu waluty |

### Kalkulacja ceny

Hook wylicza ceny na podstawie interwału rozliczeniowego:

```tsx
const calculatePrice = (plan: PricingConfig): number => {
  if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
    return plan.price;
  }
  const annualPrice = plan.price * 12;
  const discountMultiplier = 1 - plan.annualDiscount / 100;
  return Math.round(annualPrice * discountMultiplier);
};
```

## Dostawcy płatności

System obsługuje trzech dostawców płatności, wybranych według konfiguracji lub preferencji użytkownika:

| Dostawca | Hak kasowy | Wbudowane wsparcie |
|---|---|---|
| Pasek | `useCreateCheckoutSession` | Tak (Intencja instalacji) |
| Wyciskacz cytrynowy | `useCheckoutButton` | Tak (nakładka) |
| Polarny | `usePolarCheckout` | Tak (osadzony adres URL) |

### Wybór dostawcy

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Przebieg płatności

Gdy użytkownik kliknie przycisk akcji planu:

1. Sprawdź, czy użytkownik jest zalogowany (jeśli nie, otwórz moduł logowania)
2. Anuluj istniejący proces realizacji transakcji
3. Określ dostawcę płatności
4. Uzyskaj identyfikator ceny lub wariantu uwzględniający walutę
5. Otwórz osadzony formularz płatności lub przekieruj do kasy dostawcy

```tsx
const handleCheckout = async (plan: PricingConfig) => {
  if (!user?.id) {
    loginModal.onOpen('Please sign in to continue with your purchase.');
    return;
  }

  if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
    await lemonsqueezyHook.handleSubmitWithParams({ variantId, metadata, embedded });
  } else if (paymentProvider === PaymentProvider.POLAR) {
    await polarHook.createCheckoutSession(priceId, user, plan, billingInterval);
  } else if (paymentProvider === PaymentProvider.STRIPE) {
    await stripeHook.createCheckoutSession(plan, user, billingInterval);
  }
};
```

## Ceny dynamiczne (pasek)

Gdy Stripe jest aktywnym dostawcą i włączone są dynamiczne ceny, hak pobiera aktualne dane produktów:

```tsx
const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE
  && isStripeDynamicPricingEnabled();

const { data: stripeProductsData } = useStripeProducts({
  enabled: isDynamicPricingEnabled && !isReview
});

// Merge: dynamic values override static, but keep static as fallback
const { FREE, STANDARD, PREMIUM } = useMemo(() => {
  if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
    const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
    return {
      FREE: dynamicPlans.FREE ?? staticPlans.FREE,
      STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
      PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
    };
  }
  return staticPlans;
}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);
```

## Wsparcie walutowe

System cenowy obsługuje wyświetlanie wielowalutowe:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Identyfikatory wariantów uwzględniające walutę są rozpoznawane za pomocą funkcji konfiguracyjnych specyficznych dla dostawcy:

| Dostawca | Funkcja konfiguracji |
|---|---|
| Wyciskacz cytrynowy | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| Polarny | `getPolarPriceConfig(planName, currency, interval)` |

## Modalny formularz płatności

Wbudowany formularz płatności obsługuje wszystkich trzech dostawców:

```tsx
<PaymentFormModal
  isOpen={paymentForm.isOpen}
  onClose={paymentForm.closePaymentForm}
  onSuccess={paymentForm.onPaymentSuccess}
  onError={paymentForm.onPaymentError}
  planName={paymentForm.planForPayment?.name}
  planPrice={formatPrice(calculatePrice(paymentForm.planForPayment))}
  amount={calculatePrice(paymentForm.planForPayment)}
  currency={currency}
  clientSecret={clientSecret}
  checkoutUrl={paymentForm.checkoutUrl}
  provider={provider}
  theme={theme}
/>
```

## Komponent sekcji cenowej

Komponent `PricingSection` wyświetla pełną stronę cenową:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Funkcje wizualne

| Funkcja | Opis |
|---|---|
| Przełącznik interwału rozliczeniowego | Animowany suwak pomiędzy miesiącem i rokiem |
| Zaplanuj siatkę kart | Responsywny układ od 1 kolumny (mobilny) do 3 kolumn (komputer stacjonarny) |
| Popularna odznaka | Plan standardowy jest oznaczony jako „popularny” z efektami blasku |
| Odznaki oszczędnościowe | Zielone pigułki pokazujące roczne oszczędności, jeśli ma to zastosowanie |
| Wskaźniki zaufania | Ikony „Brak ukrytych opłat”, „Natychmiastowa aktywacja”, „Wsparcie Premium” |
| Sekcja ogłoszeń sponsorskich | Animowane kręgi radarowe z cenami za miejsca sponsorowane |
| Kontynuuj sekcję | Wyświetlane po wybraniu planu z wezwaniem do działania |

### Renderowanie warunkowe

Komponent warunkowo pokazuje płatne plany w oparciu o dostępność płatności:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Internacjonalizacja

Wszystkie ciągi skierowane do użytkownika używają `next-intl` z dwiema przestrzeniami nazw tłumaczeń:

| Przestrzeń nazw | Użycie |
|---|---|
| `pricing` | Nazwy planów, funkcje, zawartość strony, sekcja sponsorska |
| `billing` | Etykiety miesięczne/roczne, stany przetwarzania, komunikaty o błędach |

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Ceny Funkcje Hak | `hooks/use-pricing-features.ts` |
| Sekcja cenowa Hak | `hooks/use-pricing-section.ts` |
| Komponent sekcji cenowej | `components/pricing/pricing-section.tsx` |
| Komponent karty planu | `components/pricing/plan-card.tsx` |
| Modalny formularz płatności | `components/payment/stripe-payment-modal.tsx` |
| Stałe płatności | `lib/constants.ts` |
| Typ konfiguracji cenowej | `lib/content.ts` |
