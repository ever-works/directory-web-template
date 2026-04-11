---
id: checkout-utilities
title: "Utilità di Checkout"
sidebar_label: "Utilità di Checkout"
sidebar_position: 7
---

# Utilità di Checkout

Il modulo `checkout-utils` (`lib/utils/checkout-utils.ts`) fornisce funzioni helper per aprire i flussi di pagamento checkout nel browser. Gestisce il blocco dei popup, i reindirizzamenti di fallback, la gestione degli errori e crea handler di clic riutilizzabili per i pulsanti di checkout.

## Concetti fondamentali

Le utilità di checkout risolvono le sfide comuni del browser quando si aprono le pagine di checkout dei provider di pagamento:

- **Blocco popup** -- I browser possono bloccare le chiamate `window.open()`. Le utilità lo rilevano e ricorrono alla navigazione diretta.
- **Gestione degli errori** -- Gli errori di rete e gli errori imprevisti vengono catturati e segnalati tramite callback.
- **Handler riutilizzabili** -- Una funzione factory crea handler di clic che possono essere collegati a qualsiasi componente pulsante.

## Tipi

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // Predefinito: '_blank'
  windowFeatures?: string;   // Predefinito: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // Predefinito: true
}
```

## Funzioni

### openCheckoutInNewTab

Apre un URL di checkout in una nuova scheda del browser con rilevamento popup e fallback:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // Sia il popup che il reindirizzamento sono falliti
  console.error('Impossibile aprire il checkout');
}
```

#### Implementazione

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

#### Flusso di comportamento

1. **Guardia SSR** -- Restituisce `false` immediatamente se in esecuzione sul server
2. **Apertura popup** -- Tenta `window.open()` con le funzionalità specificate
3. **Popup bloccato** -- Se `window.open()` restituisce `null`, il popup è stato bloccato
4. **Reindirizzamento fallback** -- Se `fallbackToRedirect` è `true` (predefinito), naviga la pagina corrente all'URL di checkout
5. **Tentativo di focus** -- Tenta di mettere a fuoco la nuova finestra (potrebbe fallire in alcuni browser senza causare un errore)
6. **Cattura errori** -- Qualsiasi eccezione ricorre al reindirizzamento se abilitato

#### Opzioni

| Opzione | Predefinito | Descrizione |
|--------|---------|-------------|
| `url` | Obbligatorio | L'URL di checkout da aprire |
| `windowName` | `'_blank'` | Nome della finestra di destinazione |
| `windowFeatures` | `'noopener,noreferrer'` | Funzionalità di sicurezza per la nuova finestra |
| `fallbackToRedirect` | `true` | Naviga la pagina corrente se il popup è bloccato |

### openCheckoutWithErrorHandling

Un wrapper attorno a `openCheckoutInNewTab` che aggiunge un callback di errore:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Mostra l'errore all'utente
  }
);
```

#### Implementazione

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

Una funzione factory che crea un handler di clic per il checkout con callback di successo, errore e toast. È progettata per essere passata direttamente alle prop `onClick` dei pulsanti:

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
    showAlert: true, // Mostra notifica toast in caso di errore
  });

  return (
    <button onClick={handleCheckout}>
      Abbonati ora
    </button>
  );
}
```

#### Implementazione

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

#### Opzioni

| Opzione | Tipo | Descrizione |
|--------|------|-------------|
| `onSuccess` | `() => void` | Chiamato quando il checkout si apre con successo |
| `onError` | `(error: string) => void` | Chiamato con messaggio di errore in caso di fallimento |
| `showAlert` | `boolean` | Mostra una notifica toast usando `sonner` in caso di errore |

## Pattern di utilizzo

### Pulsante di checkout di base

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Vai al checkout
    </button>
  );
}
```

### Checkout con analytics

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
      Scegli {plan.name}
    </button>
  );
}
```

### Disabilitare il fallback popup

Se vuoi impedire alla pagina corrente di navigare (ad es. in un modal), disabilita il fallback di reindirizzamento:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Mostra messaggio inline invece di navigare
  setShowPopupBlockedMessage(true);
}
```

## Considerazioni sulla sicurezza

- Le funzionalità della finestra `noopener,noreferrer` impediscono alla pagina aperta di accedere a `window.opener`, proteggendo dagli attacchi di tabnapping
- Il `fallbackToRedirect` usa l'assegnazione `window.location.href` (non `window.open`) che non è soggetta ai blocchi popup
- La guardia SSR previene l'accesso a `window` durante il rendering lato server

## File sorgente

| File | Scopo |
|------|---------|
| `lib/utils/checkout-utils.ts` | Gestione finestre checkout e handler di clic |
