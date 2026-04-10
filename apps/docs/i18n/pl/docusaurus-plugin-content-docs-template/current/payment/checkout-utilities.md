---
id: checkout-utilities
title: "Narzędzia Checkout"
sidebar_label: "Narzędzia Checkout"
sidebar_position: 7
---

# Narzędzia Checkout

Moduł `checkout-utils` (`lib/utils/checkout-utils.ts`) dostarcza funkcje pomocnicze do otwierania przepływów płatności checkout w przeglądarce. Obsługuje blokowanie okien wyskakujących, awaryjne przekierowania, obsługę błędów oraz tworzy wielokrotnie używalne handlery kliknięć dla przycisków checkout.

## Podstawowe koncepcje

Narzędzia checkout rozwiązują typowe wyzwania przeglądarki przy otwieraniu stron checkout dostawców płatności:

- **Blokowanie okien wyskakujących** -- Przeglądarki mogą blokować wywołania `window.open()`. Narzędzia wykrywają to i wracają do bezpośredniej nawigacji.
- **Obsługa błędów** -- Błędy sieciowe i nieoczekiwane błędy są przechwytywane i zgłaszane przez callbacki.
- **Wielokrotnie używalne handlery** -- Funkcja fabryczna tworzy handlery kliknięć, które można dołączyć do dowolnego komponentu przycisku.

## Typy

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // Domyślnie: '_blank'
  windowFeatures?: string;   // Domyślnie: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // Domyślnie: true
}
```

## Funkcje

### openCheckoutInNewTab

Otwiera URL checkout w nowej karcie przeglądarki z wykrywaniem okien wyskakujących i awaryjnym rozwiązaniem:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // Zarówno okno wyskakujące jak i przekierowanie nie powiodły się
  console.error('Nie można otworzyć checkout');
}
```

#### Implementacja

```ts
export function openCheckoutInNewTab(
  options: CheckoutWindowOptions
): boolean {
  const {
    url,
    windowName = '_blank',
    windowFeatures = 'noopener,noreferrer',
    fallbackToRedirect = true,
  } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const newWindow = window.open(url, windowName, windowFeatures);

    if (!newWindow) {
      console.warn('Popup blocked by browser');

      if (fallbackToRedirect) {
        window.location.href = url;
        return true;
      }

      return false;
    }

    try {
      newWindow.focus();
    } catch (focusError) {
      console.warn('Could not focus new window:', focusError);
    }

    return true;
  } catch {
    if (fallbackToRedirect) {
      window.location.href = url;
      return true;
    }
    return false;
  }
}
```

#### Przepływ zachowania

1. **Ochrona SSR** -- Natychmiast zwraca `false` podczas działania na serwerze
2. **Otwieranie okna wyskakującego** -- Próbuje `window.open()` z podanymi funkcjami
3. **Okno zablokowane** -- Jeśli `window.open()` zwraca `null`, okno wyskakujące zostało zablokowane
4. **Awaryjne przekierowanie** -- Jeśli `fallbackToRedirect` wynosi `true` (domyślnie), nawiguje bieżącą stronę do URL checkout
5. **Próba skupienia** -- Próbuje skupić nowe okno (może nie powieść się w niektórych przeglądarkach bez wywoływania błędu)
6. **Przechwytywanie błędów** -- Każdy wyjątek wraca do przekierowania jeśli jest włączone

#### Opcje

| Opcja | Domyślnie | Opis |
|--------|---------|-------------|
| `url` | Wymagany | URL checkout do otwarcia |
| `windowName` | `'_blank'` | Nazwa okna docelowego |
| `windowFeatures` | `'noopener,noreferrer'` | Funkcje bezpieczeństwa dla nowego okna |
| `fallbackToRedirect` | `true` | Nawiguj bieżącą stronę jeśli okno wyskakujące jest zablokowane |

### openCheckoutWithErrorHandling

Opakowanie wokół `openCheckoutInNewTab` dodające callback błędu:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Wyświetl błąd użytkownikowi
  }
);
```

#### Implementacja

```ts
export function openCheckoutWithErrorHandling(
  url: string,
  onError?: (error: string) => void
): boolean {
  const success = openCheckoutInNewTab({ url });

  if (!success && onError) {
    onError(
      'Unable to open checkout. Please check your popup blocker settings.'
    );
  }

  return success;
}
```

### createCheckoutClickHandler

Funkcja fabryczna tworząca handler kliknięcia checkout z callbackami sukcesu, błędu i toast. Zaprojektowana do bezpośredniego przekazania do właściwości `onClick` przycisków:

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';

function PricingCard({ checkoutUrl }: { checkoutUrl: string }) {
  const handleCheckout = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_opened');
    },
    onError: (error) => {
      console.error(error);
    },
    showAlert: true, // Pokaż powiadomienie toast przy niepowodzeniu
  });

  return (
    <button onClick={handleCheckout}>
      Subskrybuj teraz
    </button>
  );
}
```

#### Implementacja

```ts
export function createCheckoutClickHandler(
  checkoutUrl: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    showAlert?: boolean;
  }
) {
  return () => {
    const success = openCheckoutWithErrorHandling(
      checkoutUrl,
      options?.onError
    );

    if (success && options?.onSuccess) {
      options.onSuccess();
    }

    if (!success && options?.showAlert) {
      toast.error(
        'Unable to open checkout. Please try again or contact support.'
      );
    }
  };
}
```

#### Opcje

| Opcja | Typ | Opis |
|--------|------|-------------|
| `onSuccess` | `() => void` | Wywoływany gdy checkout otwiera się pomyślnie |
| `onError` | `(error: string) => void` | Wywoływany z komunikatem błędu przy niepowodzeniu |
| `showAlert` | `boolean` | Pokaż powiadomienie toast używając `sonner` przy niepowodzeniu |

## Wzorce użycia

### Podstawowy przycisk checkout

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Przejdź do checkout
    </button>
  );
}
```

### Checkout z analytics

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';
import { analytics } from '@/lib/analytics';

function PricingTier({ plan, checkoutUrl }) {
  const handleClick = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_initiated', {
        plan: plan.name,
        price: plan.price,
      });
    },
    onError: (error) => {
      analytics.captureException(new Error(error), {
        plan: plan.name,
      });
    },
    showAlert: true,
  });

  return (
    <button onClick={handleClick}>
      Wybierz {plan.name}
    </button>
  );
}
```

### Wyłączanie awaryjnego okna wyskakującego

Jeśli chcesz zapobiec nawigacji bieżącej strony (np. w modalu), wyłącz awaryjne przekierowanie:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Pokaż wiadomość inline zamiast nawigować
  setShowPopupBlockedMessage(true);
}
```

## Kwestie bezpieczeństwa

- Funkcje okna `noopener,noreferrer` uniemożliwiają otwieranej stronie dostęp do `window.opener`, chroniąc przed atakami tabnapping
- `fallbackToRedirect` używa przypisania `window.location.href` (nie `window.open`), które nie podlega blokownikom okien wyskakujących
- Ochrona SSR zapobiega dostępowi do `window` podczas renderowania po stronie serwera

## Pliki źródłowe

| Plik | Cel |
|------|---------|
| `lib/utils/checkout-utils.ts` | Zarządzanie oknami checkout i handlery kliknięć |
