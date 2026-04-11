---
id: promo-codes
title: Promo-Code-System
sidebar_label: Promo-Codes
sidebar_position: 14
---

# Promo-Code-System

Die Ever Works-Vorlage enthält ein umfassendes Aktionscodesystem zur Anzeige von Aktionsrabatten, Gutscheincodes und Sonderangeboten auf Artikellistenseiten. Das System unterstützt mehrere Rabattarten, Ablaufverfolgung, Kopieren in die Zwischenablage, Analyseintegration und reaktionsfähige UI-Varianten.

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | UI-Komponente zur Anzeige von Promo-Codes |
| `usePromoCode` | `hooks/use-promo-code.ts` | Hook für die Verwaltung einzelner Promo-Codes |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Hook zum Verwalten mehrerer Promo-Codes |
| `PromoCode` Typ | `lib/content` | Typdefinition für Promo-Code-Daten |

## Rabattarten

Das System unterstützt drei Rabattarten:

| Geben Sie | ein Anzeige | Beispiel |
|---|---|---|
| `percentage` | `X% OFF` | „25 % RABATT“ |
| `fixed` | `$X OFF` | „10 $ RABATT“ |
| `free_shipping` | `FREE SHIPPING` | „KOSTENLOSER VERSAND“ |

## Der `usePromoCode` Haken

### Schnittstelle

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

### Nutzung

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

## Statistikverfolgung

Der Hook verfolgt Kopier- und Klickstatistiken, die in `localStorage` bestehen bleiben:

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

Statistiken werden automatisch über Sitzungen hinweg gespeichert und wiederhergestellt:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Analytics-Integration

Der Hook löst automatisch Google Analytics-Ereignisse aus, sofern verfügbar:

| Veranstaltung | Kategorie | Auslöser |
|---|---|---|
| `promo_code_copied` | `engagement` | Wenn ein Code in die Zwischenablage kopiert wird |
| `promo_code_used` | `conversion` | Wenn ein Code aktiviert/angeklickt wird |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Mehrere Promo-Codes verwalten

Der `usePromoCodes` -Hook erweitert `usePromoCode` für Sammlungen:

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

### Bester Rabattalgorithmus

Die `getBestDiscount()` -Funktion wählt den besten verfügbaren Rabatt aus:
1. Filtert nur nach aktiven (nicht abgelaufenen) Codes
2. Vergleicht prozentuale Rabatte nach Wert (höher ist besser)
3. Vergleicht feste Rabatte nach Wert (höher ist besser)
4. Kostenlose Versandcodes gelten immer als konkurrenzfähig

## PromoCode-Komponente

Der `PromoCodeComponent` stellt eine gestaltete Promo-Code-Karte mit drei Varianten dar:

### Varianten

| Variante | Beschreibung |
|---|---|
| `default` | Karte in voller Größe mit Beschreibung, Bedingungen, Schaltfläche „Kopieren“ und Schaltfläche „Verwenden“ |
| `compact` | Inline-Abzeichen mit Code und Kopiersymbol |
| `featured` | Erweiterte Standardeinstellung mit Ringhervorhebung und größerem Schatten |

### Nutzung

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

### Komponenten-Requisiten

| Stütze | Geben Sie | ein Standard | Beschreibung |
|---|---|---|---|
| `promoCode` | `PromoCode` | erforderlich | Das Aktionscode-Datenobjekt |
| `className` | `string?` | `undefined` | Zusätzliche CSS-Klassen |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Anzeigevariante |
| `showDescription` | `boolean` | `true` | Codebeschreibung anzeigen |
| `showTerms` | `boolean` | `true` | AGB anzeigen |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Rückruf beim Kopieren des Codes |

## Unterstützung für die Zwischenablage

Die Kopierfunktion beinhaltet einen Fallback für ältere Browser:

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

## Internationalisierung

Die Komponente verwendet `next-intl` für alle benutzerseitigen Zeichenfolgen:

| Übersetzungsschlüssel | Verwendung |
|---|---|
| `common.EXPIRES` | Etikett mit Ablaufdatum |
| `common.EXPIRED` | Abgelaufener Abzeichentext |
| `common.PROMO_CODE` | Codefeldbeschriftung |
| `common.COPIED` | Bestätigungstext kopieren |
| `common.COPY` | Schaltflächentext kopieren |
| `common.USE_CODE` | Code-Schaltflächentext verwenden |
| `common.TERMS` | Begriffsbezeichnung |

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Promo-Code-Komponente | `components/promo-code/promo-code.tsx` |
| Promo-Code-Hooks | `hooks/use-promo-code.ts` |
| PromoCode-Typ | `lib/content` (Exporttyp) |
