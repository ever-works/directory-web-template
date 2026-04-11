---
id: promo-codes
title: System kodów promocyjnych
sidebar_label: Kody promocyjne
sidebar_position: 14
---

# System kodów promocyjnych

Szablon Ever Works zawiera kompleksowy system kodów promocyjnych umożliwiający wyświetlanie zniżek promocyjnych, kodów kuponów i ofert specjalnych na stronach z listami przedmiotów. System obsługuje wiele typów rabatów, śledzenie wygaśnięcia, kopiowanie do schowka, integrację analityczną i responsywne warianty interfejsu użytkownika.

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | Komponent interfejsu użytkownika do wyświetlania kodów promocyjnych |
| `usePromoCode` | `hooks/use-promo-code.ts` | Hook do zarządzania pojedynczym kodem promocyjnym |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Hak do zarządzania wieloma kodami promocyjnymi |
| `PromoCode` wpisz | `lib/content` | Definicja typu danych kodu promocyjnego |

## Typy rabatów

System obsługuje trzy rodzaje rabatów:

| Wpisz | Wyświetl | Przykład |
|---|---|---|
| `percentage` | `X% OFF` | „25% ZNIŻKI” |
| `fixed` | `$X OFF` | „10 USD ZNIŻKI” |
| `free_shipping` | `FREE SHIPPING` | „DARMOWA WYSYŁKA” |

## Hak `usePromoCode` ### Interfejs

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

### Użycie

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

## Śledzenie statystyk

Hak śledzi statystyki kopiowania i kliknięcia, utrzymywane w `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

Statystyki są automatycznie zapisywane i przywracane podczas sesji:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Integracja z analityką

Hook automatycznie uruchamia zdarzenia Google Analytics, jeśli są dostępne:

| Wydarzenie | Kategoria | Wyzwalacz |
|---|---|---|
| `promo_code_copied` | `engagement` | Gdy kod zostanie skopiowany do schowka |
| `promo_code_used` | `conversion` | Po aktywowaniu/kliknięciu kodu |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Zarządzanie wieloma kodami promocyjnymi

Hak `usePromoCodes` wysuwa się `usePromoCode` do kolekcji:

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

### Najlepszy algorytm rabatowy

Funkcja `getBestDiscount()` wybiera najlepszy dostępny rabat:
1. Filtruje tylko aktywne (nie wygasłe) kody
2. Porównuje rabaty procentowe według wartości (im wyższe, tym lepsze)
3. Porównuje stałe rabaty pod względem wartości (im wyższe, tym lepsze)
4. Kody bezpłatnej wysyłki są zawsze uważane za konkurencyjne

## Komponent kodu promocyjnego `PromoCodeComponent` renderuje stylizowaną kartę z kodem promocyjnym w trzech wariantach:

### Warianty

| Wariant | Opis |
|---|---|
| `default` | Pełnowymiarowa karta z opisem, warunkami, przyciskiem kopiowania i przyciskiem użycia |
| `compact` | Wbudowana plakietka z kodem i ikoną kopiowania |
| `featured` | Ulepszone ustawienie domyślne z podświetleniem pierścienia i większym cieniem |

### Użycie

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

### Rekwizyty komponentów

| Podpora | Wpisz | Domyślne | Opis |
|---|---|---|---|
| `promoCode` | `PromoCode` | wymagane | Obiekt danych kodu promocyjnego |
| `className` | `string?` | `undefined` | Dodatkowe klasy CSS |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Wariant wyświetlania |
| `showDescription` | `boolean` | `true` | Pokaż opis kodu |
| `showTerms` | `boolean` | `true` | Pokaż regulamin |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Oddzwonienie po skopiowaniu kodu |

## Obsługa schowka

Funkcja kopiowania obejmuje opcję zastępczą dla starszych przeglądarek:

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

## Internacjonalizacja

Komponent używa `next-intl` dla wszystkich ciągów znaków dostępnych dla użytkownika:

| Klucz do tłumaczenia | Użycie |
|---|---|
| `common.EXPIRES` | Etykieta z datą ważności |
| `common.EXPIRED` | Wygasły tekst plakietki |
| `common.PROMO_CODE` | Etykieta pola kodu |
| `common.COPIED` | Skopiuj tekst potwierdzenia |
| `common.COPY` | Kopiuj tekst przycisku |
| `common.USE_CODE` | Użyj tekstu przycisku kodu |
| `common.TERMS` | Etykieta terminów |

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Komponent kodu promocyjnego | `components/promo-code/promo-code.tsx` |
| Haki z kodami promocyjnymi | `hooks/use-promo-code.ts` |
| Typ kodu promocyjnego | `lib/content` (typ eksportowany) |
