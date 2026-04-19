---
id: color-generator-system
title: "System generatora kolorów"
sidebar_label: "System generatora kolorów"
sidebar_position: 42
---

# System generatora kolorów

## Przegląd

System generatora kolorów zapewnia algorytmiczne generowanie kompletnych palet kolorów (odcienie od 50 do 950) z jednego podstawowego koloru szesnastkowego. Obsługuje konwersje przestrzeni kolorów pomiędzy Hex, RGB i HSL, a także tworzy niestandardowe właściwości CSS i obiekty konfiguracyjne CSS Tailwind. Moduł ten stanowi matematyczną podstawę, na której system motywów buduje swoje dynamiczne palety kolorów.

## Architektura

Moduł (`lib/color-generator.ts`) to czysta biblioteka narzędziowa, bez skutków ubocznych i zewnętrznych zależności. Znajduje się poniżej warstwy motywu i jest używany przez:

- **`lib/theme-color-manager.ts`** — Używa `generateColorPalette()` i `generateCssVariables()` do stosowania palet motywów w DOM.
- **Konfiguracja motywu** — umożliwia generowanie konfiguracji Tailwind w celu integracji motywów w czasie kompilacji.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## Dokumentacja API

### Eksport

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Konwertuje szesnastkowy ciąg kolorów (z przedrostkiem `#` lub bez) na obiekt RGB. Zwraca `{ r: 0, g: 0, b: 0 }`, jeśli analiza nie powiedzie się.

#### `rgbToHex(r: number, g: number, b: number): string`

Konwertuje wartości całkowite RGB (0-255) na ciąg kolorów szesnastkowych z przedrostkiem `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Konwertuje wartości RGB (0-255) na HSL. Zwraca odcień w stopniach (0-360), nasycenie i jasność w procentach (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Konwertuje wartości HSL (h: 0-360, s: 0-100, l: 0-100) na liczby całkowite RGB (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Generuje kompletną paletę 11 odcieni z podstawowego koloru szesnastkowego. Bazowy kolor odwzorowuje odcień `500`. Jaśniejsze odcienie (50-400) zwiększają jasność i zmniejszają nasycenie. Ciemniejsze odcienie (600-950) zmniejszają jasność i zwiększają nasycenie.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Generuje deklaracje właściwości niestandardowych CSS z palety. Zwraca ciąg znaków oddzielony znakami nowej linii.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Generuje obiekt konfiguracji kolorów CSS Tailwind, który odwołuje się do zmiennych CSS.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

Batch generuje zmienne CSS i konfigurację Tailwind dla wielu nazwanych kolorów jednocześnie.

## Szczegóły wdrożenia

**Algorytm cieniowania**: Paleta generowana jest poprzez dostosowanie jasności i nasycenia koloru bazowego HSL zgodnie z predefiniowanymi przesunięciami:

|Cień|Regulacja jasności|Regulacja nasycenia|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (podstawa)|0 (podstawa)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

Wszystkie obliczone wartości są ograniczane do prawidłowego zakresu (0-100), aby zapobiec przepełnieniu.

**Konwersja przestrzeni barw**: Moduł dokonuje konwersji poprzez standardowy model kolorów HSL. RGB-to-HSL wykorzystuje algorytm kanału min/max, a HSL-to-RGB wykorzystuje pomocnika hue2rgb do fragmentacyjnej interpolacji liniowej.

## Konfiguracja

Nie jest wymagana żadna konfiguracja. Definicje cieni to zakodowane na stałe stałe zaprojektowane w celu tworzenia wizualnie zrównoważonych palet podobnych do domyślnych ustawień CSS Tailwind.

## Przykłady użycia

```typescript
import {
  generateColorPalette,
  generateCssVariables,
  generateTailwindConfig,
  generateThemeColors,
  hexToRgb,
} from '@/lib/color-generator';

// Generate a full palette from a brand color
const palette = generateColorPalette('#3b82f6');
console.log(palette[500]); // '#3b82f6' (base)
console.log(palette[100]); // lighter shade
console.log(palette[900]); // darker shade

// Generate CSS variables for injection into <style>
const css = generateCssVariables('brand', palette);
// --brand: #3b82f6;
// --brand-50: #e8f0fe;
// ...

// Generate Tailwind config for tailwind.config.ts
const tailwind = generateTailwindConfig('brand');
// { DEFAULT: 'var(--brand)', 50: 'var(--brand-50)', ... }

// Batch generate for an entire theme
const theme = generateThemeColors({
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
});
// theme.css -- all CSS variable declarations
// theme.tailwind -- Tailwind config for all colors

// Convert colors for custom processing
const rgb = hexToRgb('#3b82f6');
// { r: 59, g: 130, b: 246 }
```

## Najlepsze praktyki

- Użyj `generateColorPalette()` jako pojedynczego źródła wszystkich wartości odcieni, zamiast ręcznie wybierać kolory.
- Preferuj styl `generateCssVariables()` zamiast stylów wbudowanych, aby motywy można było dynamicznie zmieniać w czasie wykonywania.
- Podczas integracji z Tailwind użyj `generateTailwindConfig()`, aby klasy narzędzi odwoływały się do zmiennych CSS, a nie zakodowanych na stałe wartości szesnastkowych.
- Zawsze przekazuj prawidłowe 6-cyfrowe kolory szesnastkowe (np. `#3b82f6`); skrót szesnastkowy (np. `#38f`) nie jest obsługiwany przez parser wyrażeń regularnych.
- Przetestuj wygenerowane palety pod kątem zgodności z kontrastem WCAG, szczególnie jasne (50-200) i ciemne (800-950) końcówki.

## Powiązane moduły

- [Theme System Deep Dive](./theme-system-deep-dive) – Zużywa generację palety dla dynamicznych motywów
- [System kolorów](/template/architecture/color-system) — Dokumentacja systemu kolorów wyższego poziomu
