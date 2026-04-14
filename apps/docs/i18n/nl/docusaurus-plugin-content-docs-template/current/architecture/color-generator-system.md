---
id: color-generator-system
title: "Kleurgeneratorsysteem"
sidebar_label: "Kleurgeneratorsysteem"
sidebar_position: 42
---

# Kleurgeneratorsysteem

## Overzicht

Het Color Generator System biedt algoritmische generatie van complete kleurenpaletten (tinten 50 tot en met 950) vanuit één enkele hex-basiskleur. Het verwerkt kleurruimteconversies tussen Hex, RGB en HSL, en produceert aangepaste CSS-eigenschappen en Tailwind CSS-configuratieobjecten. Deze module vormt de wiskundige basis waarop het themasysteem zijn dynamische kleurenpaletten bouwt.

## Architectuur

De module (`lib/color-generator.ts`) is een pure nutsbibliotheek zonder bijwerkingen en zonder externe afhankelijkheden. Het bevindt zich onder de themalaag en wordt gebruikt door:

- **`lib/theme-color-manager.ts`** -- Gebruikt `generateColorPalette()` en `generateCssVariables()` om themapaletten toe te passen op de DOM.
- **Themaconfiguratie** - Biedt Tailwind-configuratiegeneratie voor thema-integratie tijdens het bouwen.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## API-referentie

### Exporteert

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Converteert een hexadecimale kleurreeks (met of zonder het voorvoegsel `#`) naar een RGB-object. Retourneert `{ r: 0, g: 0, b: 0 }` als het parseren mislukt.

#### `rgbToHex(r: number, g: number, b: number): string`

Converteert gehele RGB-waarden (0-255) naar een hexadecimale kleurreeks met het voorvoegsel `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Converteert RGB-waarden (0-255) naar HSL. Retourneert tint in graden (0-360), verzadiging en lichtheid als percentages (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Converteert HSL-waarden (h: 0-360, s: 0-100, l: 0-100) naar RGB-gehele getallen (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Genereert een compleet palet van 11 tinten op basis van een hex-basiskleur. De basiskleur heeft de tint `500`. Lichtere tinten (50-400) verhogen de lichtheid en verminderen de verzadiging. Donkerdere tinten (600-950) verminderen de lichtheid en verhogen de verzadiging.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Genereert aangepaste CSS-eigenschapsdeclaraties vanuit een palet. Retourneert een door nieuwe regels gescheiden tekenreeks.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Genereert een Tailwind CSS-kleurconfiguratieobject dat verwijst naar CSS-variabelen.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

Batch genereert CSS-variabelen en Tailwind-configuratie voor meerdere benoemde kleuren tegelijk.

## Implementatiedetails

**Schaduwalgoritme**: Het palet wordt gegenereerd door de HSL-lichtheid en verzadiging van de basiskleur aan te passen volgens vooraf gedefinieerde verschuivingen:

|Schaduw|Lichtheid aanpassen|Verzadiging aanpassen|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (basis)|0 (basis)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

Alle berekende waarden worden beperkt tot het geldige bereik (0-100) om overstroming te voorkomen.

**Kleurruimteconversie**: De module voert conversies uit via het standaard HSL-kleurmodel. RGB-naar-HSL gebruikt het min/max-kanaalalgoritme, en HSL-naar-RGB gebruikt de hue2rgb-helper voor stuksgewijs lineaire interpolatie.

## Configuratie

Er is geen configuratie nodig. De tintdefinities zijn hardgecodeerde constanten die zijn ontworpen om visueel uitgebalanceerde paletten te produceren, vergelijkbaar met de standaardinstellingen van Tailwind CSS.

## Gebruiksvoorbeelden

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

## Beste praktijken

- Gebruik `generateColorPalette()` als enige bron voor alle kleurwaarden in plaats van handmatig kleuren te kiezen.
- Geef de voorkeur aan `generateCssVariables()` boven inline-stijlen, zodat thema's tijdens runtime dynamisch kunnen worden gewijzigd.
- Gebruik bij integratie met Tailwind `generateTailwindConfig()` zodat de hulpprogrammaklassen verwijzen naar CSS-variabelen in plaats van naar hardgecodeerde hexadecimale waarden.
- Geef altijd geldige 6-cijferige hexadecimale kleuren door (bijvoorbeeld `#3b82f6`); verkorte hex (bijvoorbeeld `#38f`) wordt niet ondersteund door de regex-parser.
- Test gegenereerde paletten op naleving van WCAG-contrast, vooral de lichte (50-200) en donkere (800-950) uiteinden.

## Gerelateerde modules

- [Theme System Deep Dive](./theme-system-deep-dive) - Verbruikt paletgeneratie voor dynamische thema's
- [Kleursysteem](/template/architecture/color-system) -- Documentatie over kleursystemen op een hoger niveau
