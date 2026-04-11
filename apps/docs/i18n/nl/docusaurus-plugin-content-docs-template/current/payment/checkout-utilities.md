---
id: checkout-utilities
title: "Checkout Hulpprogramma's"
sidebar_label: "Checkout Hulpprogramma's"
sidebar_position: 7
---

# Checkout Hulpprogramma's

De module `checkout-utils` (`lib/utils/checkout-utils.ts`) biedt helperfuncties voor het openen van betalings-checkout-flows in de browser. Het verwerkt popup-blokkering, fallback-omleidingen, foutafhandeling en maakt herbruikbare klik-handlers voor checkout-knoppen.

## Kernconcepten

De checkout-hulpprogramma's lossen veelvoorkomende browser-uitdagingen op bij het openen van betaalproviderpagina's:

- **Popup-blokkering** -- Browsers kunnen `window.open()`-aanroepen blokkeren. De hulpprogramma's detecteren dit en vallen terug op directe navigatie.
- **Foutafhandeling** -- Netwerkfouten en onverwachte fouten worden opgevangen en gerapporteerd via callbacks.
- **Herbruikbare handlers** -- Een factory-functie maakt klik-handlers die aan elke knopcomponent kunnen worden gekoppeld.

## Typen

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // Standaard: '_blank'
  windowFeatures?: string;   // Standaard: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // Standaard: true
}
```

## Functies

### openCheckoutInNewTab

Opent een checkout-URL in een nieuw browsertabblad met popup-detectie en fallback:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // Zowel popup als omleiding mislukt
  console.error('Kon checkout niet openen');
}
```

#### Implementatie

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

#### Gedragsstroom

1. **SSR-bewaking** -- Geeft onmiddellijk `false` terug bij uitvoering op de server
2. **Popup openen** -- Probeert `window.open()` met de opgegeven features
3. **Popup geblokkeerd** -- Als `window.open()` `null` retourneert, is de popup geblokkeerd
4. **Fallback-omleiding** -- Als `fallbackToRedirect` `true` is (standaard), navigeert de huidige pagina naar de checkout-URL
5. **Focuspoging** -- Probeert het nieuwe venster te focussen (kan in sommige browsers mislukken zonder een fout te veroorzaken)
6. **Fout opvangen** -- Elke uitzondering valt terug op omleiding als ingeschakeld

#### Opties

| Optie | Standaard | Beschrijving |
|--------|---------|-------------|
| `url` | Verplicht | De te openen checkout-URL |
| `windowName` | `'_blank'` | Doelvenster naam |
| `windowFeatures` | `'noopener,noreferrer'` | Beveiligingsfeatures voor het nieuwe venster |
| `fallbackToRedirect` | `true` | Navigeer huidige pagina als popup geblokkeerd is |

### openCheckoutWithErrorHandling

Een wrapper rondom `openCheckoutInNewTab` die een fout-callback toevoegt:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Fout aan gebruiker tonen
  }
);
```

#### Implementatie

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

Een factory-functie die een checkout-klik-handler maakt met succes-, fout- en toast-callbacks. Deze is ontworpen om direct doorgegeven te worden aan `onClick`-props van knoppen:

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
    showAlert: true, // Toast-melding tonen bij mislukking
  });

  return (
    <button onClick={handleCheckout}>
      Nu abonneren
    </button>
  );
}
```

#### Implementatie

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

#### Opties

| Optie | Type | Beschrijving |
|--------|------|-------------|
| `onSuccess` | `() => void` | Aangeroepen wanneer checkout succesvol geopend is |
| `onError` | `(error: string) => void` | Aangeroepen met foutmelding bij mislukking |
| `showAlert` | `boolean` | Toast-melding tonen met `sonner` bij mislukking |

## Gebruikspatronen

### Eenvoudige checkout-knop

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Naar checkout
    </button>
  );
}
```

### Checkout met analytics

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
      Kies {plan.name}
    </button>
  );
}
```

### Popup-fallback uitschakelen

Als u wilt voorkomen dat de huidige pagina navigeert (bijv. in een modal), schakel dan de omleidingsfallback uit:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Inline bericht tonen in plaats van navigeren
  setShowPopupBlockedMessage(true);
}
```

## Beveiligingsoverwegingen

- De `noopener,noreferrer`-vensterfeatures voorkomen dat de geopende pagina toegang heeft tot `window.opener`, ter bescherming tegen tabnapping-aanvallen
- De `fallbackToRedirect` gebruikt `window.location.href`-toewijzing (niet `window.open`) wat niet onderhevig is aan popup-blokkers
- SSR-bewaking voorkomt `window`-toegang tijdens server-side rendering

## Bronbestanden

| Bestand | Doel |
|------|---------|
| `lib/utils/checkout-utils.ts` | Checkout-vensterbeheer en klik-handlers |
