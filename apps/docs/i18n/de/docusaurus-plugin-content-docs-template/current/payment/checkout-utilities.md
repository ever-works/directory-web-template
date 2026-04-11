---
id: checkout-utilities
title: "Checkout-Hilfsprogramme"
sidebar_label: "Checkout-Hilfsprogramme"
sidebar_position: 7
---

# Checkout-Hilfsprogramme

Das Modul `checkout-utils` (`lib/utils/checkout-utils.ts`) stellt Hilfsfunktionen zum Öffnen von Zahlungs-Checkout-Abläufen im Browser bereit. Es behandelt Popup-Blockierung, Fallback-Weiterleitungen, Fehlerbehandlung und erstellt wiederverwendbare Klick-Handler für Checkout-Schaltflächen.

## Grundlegende Konzepte

Die Checkout-Hilfsprogramme lösen häufige Browser-Herausforderungen beim Öffnen von Zahlungsanbieter-Checkout-Seiten:

- **Popup-Blockierung** -- Browser können `window.open()`-Aufrufe blockieren. Die Hilfsprogramme erkennen dies und fallen auf direkte Navigation zurück.
- **Fehlerbehandlung** -- Netzwerkfehler und unerwartete Fehler werden abgefangen und über Callbacks gemeldet.
- **Wiederverwendbare Handler** -- Eine Factory-Funktion erstellt Klick-Handler, die an beliebige Schaltflächenkomponenten angehängt werden können.

## Typen

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // Standard: '_blank'
  windowFeatures?: string;   // Standard: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // Standard: true
}
```

## Funktionen

### openCheckoutInNewTab

Öffnet eine Checkout-URL in einem neuen Browser-Tab mit Popup-Erkennung und Fallback:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // Sowohl Popup als auch Weiterleitung fehlgeschlagen
  console.error('Checkout konnte nicht geöffnet werden');
}
```

#### Implementierung

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

#### Verhaltensablauf

1. **SSR-Schutz** -- Gibt sofort `false` zurück, wenn serverseitig ausgeführt
2. **Popup öffnen** -- Versucht `window.open()` mit den angegebenen Features
3. **Popup blockiert** -- Wenn `window.open()` `null` zurückgibt, wurde das Popup blockiert
4. **Fallback-Weiterleitung** -- Wenn `fallbackToRedirect` `true` ist (Standard), navigiert die aktuelle Seite zur Checkout-URL
5. **Fokus-Versuch** -- Versucht, das neue Fenster zu fokussieren (kann in einigen Browsern fehlschlagen, ohne einen Fehler zu verursachen)
6. **Fehler-Catch** -- Jede Ausnahme fällt auf Weiterleitung zurück, falls aktiviert

#### Optionen

| Option | Standard | Beschreibung |
|--------|---------|-------------|
| `url` | Erforderlich | Die zu öffnende Checkout-URL |
| `windowName` | `'_blank'` | Ziel-Fenstername |
| `windowFeatures` | `'noopener,noreferrer'` | Sicherheitsfeatures für das neue Fenster |
| `fallbackToRedirect` | `true` | Aktuelle Seite navigieren, wenn Popup blockiert |

### openCheckoutWithErrorHandling

Ein Wrapper um `openCheckoutInNewTab`, der einen Fehler-Callback hinzufügt:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Fehler dem Benutzer anzeigen
  }
);
```

#### Implementierung

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

Eine Factory-Funktion, die einen Checkout-Klick-Handler mit Erfolgs-, Fehler- und Toast-Callbacks erstellt. Diese ist darauf ausgelegt, direkt an `onClick`-Props von Schaltflächen übergeben zu werden:

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
    showAlert: true, // Toast-Benachrichtigung bei Fehler anzeigen
  });

  return (
    <button onClick={handleCheckout}>
      Jetzt abonnieren
    </button>
  );
}
```

#### Implementierung

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

#### Optionen

| Option | Typ | Beschreibung |
|--------|------|-------------|
| `onSuccess` | `() => void` | Wird aufgerufen, wenn Checkout erfolgreich geöffnet wurde |
| `onError` | `(error: string) => void` | Wird mit Fehlermeldung bei Fehler aufgerufen |
| `showAlert` | `boolean` | Toast-Benachrichtigung mit `sonner` bei Fehler anzeigen |

## Verwendungsmuster

### Einfache Checkout-Schaltfläche

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Zum Checkout
    </button>
  );
}
```

### Checkout mit Analytics

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
      {plan.name} wählen
    </button>
  );
}
```

### Popup-Fallback deaktivieren

Wenn Sie verhindern möchten, dass die aktuelle Seite navigiert (z.B. in einem Modal), deaktivieren Sie den Weiterleitungs-Fallback:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Inline-Meldung anzeigen statt zu navigieren
  setShowPopupBlockedMessage(true);
}
```

## Sicherheitsüberlegungen

- Die `noopener,noreferrer`-Window-Features verhindern, dass die geöffnete Seite auf `window.opener` zugreift, und schützen vor Tabnapping-Angriffen
- Der `fallbackToRedirect` verwendet `window.location.href`-Zuweisung (nicht `window.open`), die nicht Popup-Blockern unterliegt
- Der SSR-Schutz verhindert `window`-Zugriff während server-seitigem Rendering

## Quelldateien

| Datei | Zweck |
|------|---------|
| `lib/utils/checkout-utils.ts` | Checkout-Fensterverwaltung und Klick-Handler |
