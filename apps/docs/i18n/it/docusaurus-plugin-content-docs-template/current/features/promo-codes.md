---
id: promo-codes
title: Sistema di codici promozionali
sidebar_label: Codici promozionali
sidebar_position: 14
---

# Sistema di codici promozionali

Il modello Ever Works include un sistema completo di codici promozionali per la visualizzazione di sconti promozionali, codici coupon e offerte speciali nelle pagine di elenco degli articoli. Il sistema supporta più tipi di sconto, monitoraggio della scadenza, copia degli appunti, integrazione di analisi e varianti dell'interfaccia utente reattiva.

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | Componente dell'interfaccia utente per la visualizzazione dei codici promozionali |
| `usePromoCode` | `hooks/use-promo-code.ts` | Gancio per gestione codici promozionali singoli |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Hook per la gestione di più codici promozionali |
| `PromoCode` digitare | `lib/content` | Definizione del tipo per i dati del codice promozionale |

## Tipi di sconto

Il sistema supporta tre tipi di sconto:

| Digitare | Visualizza | Esempio |
|---|---|---|
| `percentage` | `X% OFF` | "25% DI SCONTO" |
| `fixed` | `$X OFF` | "10$ DI SCONTO" |
| `free_shipping` | `FREE SHIPPING` | "SPEDIZIONE GRATUITA" |

## Il gancio `usePromoCode` ### Interfaccia

```tsx
interface UsePromoCodeOptions {
  trackCopies?: boolean;    // Track copy events (default: true)
  trackClicks?: boolean;    // Track click events (default: true)
  onCodeCopied?: (code: string) => void;
  onCodeUsed?: (code: string) => void;
}

interface UsePromoCodeReturn {
  stats: PromoCodeStats;
  copyCode: (code: string) => Promise<boolean>;
  useCode: (code: string, url?: string) => void;
  isExpired: (promoCode: PromoCode) => boolean;
  getDiscountText: (promoCode: PromoCode) => string;
  clearStats: () => void;
}
```

### Utilizzo

```tsx
import { usePromoCode } from '@/hooks/use-promo-code';

function PromoDisplay({ promoCode }) {
  const { copyCode, useCode, isExpired, getDiscountText } = usePromoCode({
    onCodeCopied: (code) => console.log(`Copied: ${code}`),
    onCodeUsed: (code) => console.log(`Used: ${code}`)
  });

  if (isExpired(promoCode)) {
    return <span>This code has expired</span>;
  }

  return (
    <div>
      <span>{getDiscountText(promoCode)}</span>
      <code>{promoCode.code}</code>
      <button onClick={() => copyCode(promoCode.code)}>Copy</button>
      <button onClick={() => useCode(promoCode.code, promoCode.url)}>Use Code</button>
    </div>
  );
}
```

## Monitoraggio delle statistiche

L'hook tiene traccia delle statistiche di copia e clic, persistente in `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

Le statistiche vengono salvate e ripristinate automaticamente tra le sessioni:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Integrazione di analisi

L'hook attiva automaticamente gli eventi di Google Analytics quando disponibili:

| Evento | Categoria | Trigger |
|---|---|---|
| `promo_code_copied` | `engagement` | Quando un codice viene copiato negli appunti |
| `promo_code_used` | `conversion` | Quando si attiva/clicca su un codice |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Gestione di più codici promozionali

Il gancio `usePromoCodes` si estende `usePromoCode` per le collezioni:

```tsx
import { usePromoCodes } from '@/hooks/use-promo-code';

function PromoCodeList({ promoCodes }) {
  const {
    activePromoCodes,
    expiredPromoCodes,
    getBestDiscount,
    hasActivePromoCodes,
    totalPromoCodes,
    copyCode,
    isExpired,
    getDiscountText
  } = usePromoCodes(promoCodes);

  const bestDeal = getBestDiscount();

  return (
    <div>
      <h3>{totalPromoCodes} promo codes ({activePromoCodes.length} active)</h3>
      {bestDeal && <div>Best deal: {getDiscountText(bestDeal)}</div>}
      {activePromoCodes.map(code => (
        <PromoCodeComponent key={code.code} promoCode={code} />
      ))}
    </div>
  );
}
```

### Miglior algoritmo di sconto

La funzione `getBestDiscount()` seleziona il miglior sconto disponibile:
1. Filtra solo i codici attivi (non scaduti).
2. Confronta gli sconti percentuali in base al valore (più alto è, meglio è)
3. Confronta gli sconti fissi in base al valore (più alto è, meglio è)
4. I codici di spedizione gratuiti sono sempre considerati competitivi

## Componente codice promozionale

Il `PromoCodeComponent` visualizza una carta codice promozionale con tre varianti:

### Varianti

| Variante | Descrizione |
|---|---|
| `default` | Scheda di dimensioni standard con descrizione, termini, pulsante Copia e pulsante Utilizza |
| `compact` | Badge in linea con codice e icona di copia |
| `featured` | Impostazione predefinita migliorata con evidenziazione dell'anello e ombra più grande |

### Utilizzo

```tsx
import { PromoCodeComponent } from '@/components/promo-code/promo-code';

// Default variant
<PromoCodeComponent promoCode={code} />

// Compact inline variant
<PromoCodeComponent promoCode={code} variant="compact" />

// Featured with all options
<PromoCodeComponent
  promoCode={code}
  variant="featured"
  showDescription={true}
  showTerms={true}
  onCodeCopied={(code) => console.log(`Copied: ${code}`)}
/>
```

### Oggetti di scena dei componenti

| Prop | Digitare | Predefinito | Descrizione |
|---|---|---|---|
| `promoCode` | `PromoCode` | richiesto | L'oggetto dati del codice promozionale |
| `className` | `string?` | `undefined` | Classi CSS aggiuntive |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Variante di visualizzazione |
| `showDescription` | `boolean` | `true` | Mostra la descrizione del codice |
| `showTerms` | `boolean` | `true` | Mostra termini e condizioni |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Richiamata quando il codice viene copiato |

## Supporto per gli appunti

La funzione di copia include un fallback per i browser più vecchi:

```tsx
const copyCode = async (code: string): Promise<boolean> => {
  try {
    // Modern Clipboard API
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    // Fallback: hidden textarea + execCommand
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  }
};
```

## Internazionalizzazione

Il componente utilizza `next-intl` per tutte le stringhe rivolte all'utente:

| Chiave di traduzione | Utilizzo |
|---|---|
| `common.EXPIRES` | Etichetta con data di scadenza |
| `common.EXPIRED` | Testo del badge scaduto |
| `common.PROMO_CODE` | Etichetta campo codice |
| `common.COPIED` | Copia testo di conferma |
| `common.COPY` | Copia il testo del pulsante |
| `common.USE_CODE` | Utilizza il testo del pulsante codice |
| `common.TERMS` | Etichetta termini |

## File chiave

| File | Percorso |
|---|---|
| Componente codice promozionale | `components/promo-code/promo-code.tsx` |
| Ganci per codici promozionali | `hooks/use-promo-code.ts` |
| Tipo codice promozionale | `lib/content` (tipo esportato) |
