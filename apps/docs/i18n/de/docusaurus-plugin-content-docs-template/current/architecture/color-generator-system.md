---
id: color-generator-system
title: "Farbgeneratorsystem"
sidebar_label: "Farbgeneratorsystem"
sidebar_position: 42
---

# Farbgeneratorsystem

## Übersicht

Das Farbgeneratorsystem ermöglicht die algorithmische Generierung vollständiger Farbpaletten (Farbtöne 50 bis 950) aus einer einzigen Hex-Basisfarbe. Es verarbeitet Farbraumkonvertierungen zwischen Hex, RGB und HSL und erstellt benutzerdefinierte CSS-Eigenschaften und Tailwind-CSS-Konfigurationsobjekte. Dieses Modul ist die mathematische Grundlage, auf der das Themensystem seine dynamischen Farbpaletten aufbaut.

## Architektur

Das Modul (`lib/color-generator.ts`) ist eine reine Utility-Bibliothek ohne Nebenwirkungen und ohne externe Abhängigkeiten. Es befindet sich unterhalb der Themenebene und wird verwendet von:

- **`lib/theme-color-manager.ts`** – Verwendet `generateColorPalette()` und `generateCssVariables()`, um Themenpaletten auf das DOM anzuwenden.
- **Theme-Konfiguration** – Bietet Tailwind-Konfigurationsgenerierung für die Theme-Integration zur Build-Zeit.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## API-Referenz

### Exporte

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Konvertiert eine hexadezimale Farbzeichenfolge (mit oder ohne `#`-Präfix) in ein RGB-Objekt. Gibt `{ r: 0, g: 0, b: 0 }` zurück, wenn das Parsen fehlschlägt.

#### `rgbToHex(r: number, g: number, b: number): string`

Konvertiert ganzzahlige RGB-Werte (0–255) in eine hexadezimale Farbzeichenfolge mit dem Präfix `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Konvertiert RGB-Werte (0-255) in HSL. Gibt den Farbton in Grad (0–360), die Sättigung und die Helligkeit als Prozentsätze (0–100) zurück.

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Konvertiert HSL-Werte (h: 0–360, s: 0–100, l: 0–100) in RGB-Ganzzahlen (0–255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Erzeugt eine vollständige Palette mit 11 Farbtönen aus einer Hex-Basisfarbe. Die Grundfarbe wird dem Farbton `500` zugeordnet. Hellere Farbtöne (50–400) erhöhen die Helligkeit und verringern die Sättigung. Dunklere Farbtöne (600–950) verringern die Helligkeit und erhöhen die Sättigung.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Erzeugt benutzerdefinierte CSS-Eigenschaftsdeklarationen aus einer Palette. Gibt eine durch Zeilenumbrüche getrennte Zeichenfolge zurück.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Erzeugt ein Tailwind-CSS-Farbkonfigurationsobjekt, das auf CSS-Variablen verweist.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

Batch generiert CSS-Variablen und Tailwind-Konfigurationen für mehrere benannte Farben gleichzeitig.

## Implementierungsdetails

**Schattierungsalgorithmus**: Die Palette wird durch Anpassen der HSL-Helligkeit und Sättigung der Grundfarbe gemäß vordefinierter Offsets generiert:

|Schatten|Helligkeit anpassen|Sättigungsanpassung|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (Basis)|0 (Basis)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

Alle berechneten Werte werden auf den gültigen Bereich (0-100) begrenzt, um einen Überlauf zu verhindern.

**Farbraumkonvertierung**: Das Modul führt Konvertierungen über das Standard-HSL-Farbmodell durch. RGB-zu-HSL verwendet den Min/Max-Kanalalgorithmus und HSL-zu-RGB verwendet den hue2rgb-Helfer für die stückweise lineare Interpolation.

## Konfiguration

Es ist keine Konfiguration erforderlich. Die Farbtondefinitionen sind hartcodierte Konstanten, die dazu dienen, optisch ausgewogene Paletten ähnlich den Tailwind-CSS-Standards zu erzeugen.

## Anwendungsbeispiele

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

## Best Practices

- Verwenden Sie `generateColorPalette()` als einzige Quelle für alle Farbwerte, anstatt Farben manuell auszuwählen.
- Bevorzugen Sie `generateCssVariables()` gegenüber Inline-Stilen, damit Themen zur Laufzeit dynamisch geändert werden können.
- Verwenden Sie bei der Integration mit Tailwind `generateTailwindConfig()`, damit Dienstprogrammklassen auf CSS-Variablen und nicht auf hartcodierte Hexadezimalwerte verweisen.
- Übergeben Sie immer gültige 6-stellige Hexadezimalfarben (z. B. `#3b82f6`); Kurzschrift-Hex (z. B. `#38f`) wird vom Regex-Parser nicht unterstützt.
- Testen Sie generierte Paletten auf WCAG-Kontrastkonformität, insbesondere die hellen (50–200) und dunklen (800–950) Enden.

## Verwandte Module

- [Theme System Deep Dive](./theme-system-deep-dive) – Verbraucht die Palettengenerierung für dynamisches Theme
- [Farbsystem](/template/architecture/color-system) – Dokumentation des Farbsystems auf höherer Ebene
