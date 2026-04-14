---
id: color-generator-system
title: "Sistema di generazione del colore"
sidebar_label: "Sistema di generazione del colore"
sidebar_position: 42
---

# Sistema di generazione del colore

## Panoramica

Il Color Generator System fornisce la generazione algoritmica di tavolozze di colori complete (tonalità da 50 a 950) da un singolo colore esadecimale di base. Gestisce le conversioni dello spazio colore tra Hex, RGB e HSL e produce proprietà personalizzate CSS e oggetti di configurazione CSS Tailwind. Questo modulo è la base matematica su cui il sistema tematico costruisce le sue tavolozze di colori dinamici.

## Architettura

Il modulo (`lib/color-generator.ts`) è una libreria di pura utilità senza effetti collaterali e senza dipendenze esterne. Si trova sotto il livello del tema ed è consumato da:

- **`lib/theme-color-manager.ts`** -- Utilizza `generateColorPalette()` e `generateCssVariables()` per applicare le tavolozze dei temi al DOM.
- **Configurazione del tema**: fornisce la generazione della configurazione Tailwind per l'integrazione del tema in fase di compilazione.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## Riferimento API

### Esportazioni

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Converte una stringa di colori esadecimali (con o senza prefisso `#`) in un oggetto RGB. Restituisce `{ r: 0, g: 0, b: 0 }` se l'analisi fallisce.

#### `rgbToHex(r: number, g: number, b: number): string`

Converte i valori interi RGB (0-255) in una stringa di colori esadecimali con prefisso `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Converte i valori RGB (0-255) in HSL. Restituisce la tonalità in gradi (0-360), la saturazione e la luminosità in percentuale (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Converte i valori HSL (h: 0-360, s: 0-100, l: 0-100) in numeri interi RGB (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Genera una tavolozza completa di 11 tonalità da un colore esadecimale di base. Il colore di base viene mappato all'ombra `500`. Le tonalità più chiare (50-400) aumentano la luminosità e diminuiscono la saturazione. Le tonalità più scure (600-950) diminuiscono la luminosità e aumentano la saturazione.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Genera dichiarazioni di proprietà personalizzate CSS da una tavolozza. Restituisce una stringa separata da una nuova riga.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Genera un oggetto di configurazione del colore CSS Tailwind che fa riferimento alle variabili CSS.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

Batch genera variabili CSS e configurazione Tailwind per più colori con nome contemporaneamente.

## Dettagli di implementazione

**Algoritmo della tonalità**: la tavolozza viene generata regolando la luminosità e la saturazione HSL del colore di base in base agli offset predefiniti:

|Ombra|Regolazione luminosità|Regolazione della saturazione|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (base)|0 (base)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

Tutti i valori calcolati vengono limitati all'intervallo valido (0-100) per evitare l'overflow.

**Conversione dello spazio colore**: il modulo esegue conversioni tramite il modello di colore HSL standard. Da RGB a HSL utilizza l'algoritmo del canale min/max e da HSL a RGB utilizza l'helper hue2rgb per l'interpolazione lineare a tratti.

## Configurazione

Non è necessaria alcuna configurazione. Le definizioni delle tonalità sono costanti codificate progettate per produrre tavolozze visivamente bilanciate simili alle impostazioni predefinite CSS Tailwind.

## Esempi di utilizzo

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

## Migliori pratiche

- Utilizza `generateColorPalette()` come unica fonte per tutti i valori di tonalità anziché selezionare manualmente i colori.
- Preferisci `generateCssVariables()` agli stili in linea in modo che i temi possano essere modificati dinamicamente in fase di runtime.
- Durante l'integrazione con Tailwind, utilizza `generateTailwindConfig()` in modo che le classi di utilità facciano riferimento a variabili CSS anziché a valori esadecimali codificati.
- Trasmetti sempre colori esadecimali validi a 6 cifre (ad esempio, `#3b82f6`); l'esadecimale abbreviato (ad esempio, `#38f`) non è supportato dal parser regex.
- Testare le tavolozze generate per la conformità al contrasto WCAG, in particolare le estremità chiare (50-200) e scure (800-950).

## Moduli correlati

- [Theme System Deep Dive](./theme-system-deep-dive) -- Utilizza la generazione di tavolozze per temi dinamici
- [Sistema colore](/template/architecture/color-system) -- Documentazione del sistema colore di livello superiore
