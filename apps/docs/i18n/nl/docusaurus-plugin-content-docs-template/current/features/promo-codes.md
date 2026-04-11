---
id: promo-codes
title: Promotiecodesysteem
sidebar_label: Promotiecodes
sidebar_position: 14
---

# Promocodesysteem

De Ever Works-sjabloon bevat een uitgebreid promotiecodesysteem voor het weergeven van promotiekortingen, couponcodes en speciale aanbiedingen op itemlijstpagina's. Het systeem ondersteunt meerdere kortingstypen, het bijhouden van vervaldata, het kopiëren van het klembord, analyse-integratie en responsieve UI-varianten.

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | UI-component voor het weergeven van promotiecodes |
| `usePromoCode` | `hooks/use-promo-code.ts` | Haak voor beheer van enkele promotiecodes |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Hook voor het beheren van meerdere promotiecodes |
| `PromoCode` soort | `lib/content` | Typedefinitie voor promotiecodegegevens |

## Kortingstypen

Het systeem ondersteunt drie kortingstypen:

| Typ | Weergave | Voorbeeld |
|---|---|---|
| `percentage` | `X% OFF` | "25% KORTING" |
| `fixed` | `$X OFF` | "$ 10 KORTING" |
| `free_shipping` | `FREE SHIPPING` | "GRATIS VERZENDING" |

## De `usePromoCode` haak

### Interface

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

### Gebruik

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

## Statistieken bijhouden

De hook houdt kopieer- en klikstatistieken bij, bewaard in `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

Statistieken worden automatisch opgeslagen en hersteld tussen sessies:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Analytics-integratie

De hook activeert automatisch Google Analytics-gebeurtenissen wanneer deze beschikbaar zijn:

| Evenement | Categorie | Trigger |
|---|---|---|
| `promo_code_copied` | `engagement` | Wanneer een code naar het klembord |
| `promo_code_used` | `conversion` | Wanneer een code wordt geactiveerd/geklikt |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Meerdere promotiecodes beheren

De haak `usePromoCodes` schuift `usePromoCode` uit voor verzamelingen:

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

### Beste kortingsalgoritme

De functie `getBestDiscount()` selecteert de best beschikbare korting:
1. Filtert alleen op actieve (niet-verlopen) codes
2. Vergelijkt procentuele kortingen op waarde (hoger is beter)
3. Vergelijkt vaste kortingen op waarde (hoger is beter)
4. Codes voor gratis verzending worden altijd als concurrerend beschouwd

## PromoCode-component

De `PromoCodeComponent` geeft een gestileerde promotiecodekaart weer met drie varianten:

### Varianten

| Variant | Beschrijving |
|---|---|
| `default` | Kaart op volledige grootte met beschrijving, voorwaarden, kopieerknop en gebruiksknop |
| `compact` | Inline-badge met code- en kopieerpictogram |
| `featured` | Verbeterde standaard met ringmarkering en grotere schaduw |

### Gebruik

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

### Component-rekwisieten

| Prop | Typ | Standaard | Beschrijving |
|---|---|---|---|
| `promoCode` | `PromoCode` | vereist | Het promotiecodegegevensobject |
| `className` | `string?` | `undefined` | Extra CSS-klassen |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Weergavevariant |
| `showDescription` | `boolean` | `true` | Toon de codebeschrijving |
| `showTerms` | `boolean` | `true` | Algemene voorwaarden tonen |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Terugbellen wanneer code wordt gekopieerd |

## Klembordondersteuning

De kopieerfunctie bevat een fallback voor oudere browsers:

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

## Internationalisering

De component gebruikt `next-intl` voor alle gebruikersgerichte tekenreeksen:

| Vertaalsleutel | Gebruik |
|---|---|
| `common.EXPIRES` | Vervaldatumlabel |
| `common.EXPIRED` | Verlopen badgetekst |
| `common.PROMO_CODE` | Codeveldlabel |
| `common.COPIED` | Bevestigingstekst kopiëren |
| `common.COPY` | Knoptekst kopiëren |
| `common.USE_CODE` | Gebruik codeknoptekst |
| `common.TERMS` | Termenlabel |

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Promotiecodecomponent | `components/promo-code/promo-code.tsx` |
| Promotiecode Haken | `hooks/use-promo-code.ts` |
| Promocodetype | `lib/content` (geëxporteerd type) |
