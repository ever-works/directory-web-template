---
id: color-generator-system
title: "Système générateur de couleurs"
sidebar_label: "Système générateur de couleurs"
sidebar_position: 42
---

# Système générateur de couleurs

## Aperçu

Le système générateur de couleurs permet la génération algorithmique de palettes de couleurs complètes (nuances 50 à 950) à partir d'une seule couleur hexadécimale de base. Il gère les conversions d'espace colorimétrique entre Hex, RVB et HSL, et produit des propriétés personnalisées CSS et des objets de configuration CSS Tailwind. Ce module constitue la base mathématique sur laquelle le système thématique construit ses palettes de couleurs dynamiques.

## Architecture

Le module (`lib/color-generator.ts`) est une pure bibliothèque d'utilitaires sans effets secondaires ni dépendances externes. Il se trouve sous la couche thématique et est consommé par :

- **`lib/theme-color-manager.ts`** -- Utilise `generateColorPalette()` et `generateCssVariables()` pour appliquer des palettes de thèmes au DOM.
- **Configuration du thème** -- Fournit la génération de configuration Tailwind pour l'intégration du thème au moment de la construction.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## Référence API

### Exportations

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Convertit une chaîne de couleurs hexadécimale (avec ou sans préfixe `#`) en un objet RVB. Renvoie `{ r: 0, g: 0, b: 0 }` si l'analyse échoue.

#### `rgbToHex(r: number, g: number, b: number): string`

Convertit les valeurs entières RVB (0-255) en une chaîne de couleurs hexadécimale avec le préfixe `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Convertit les valeurs RVB (0-255) en HSL. Renvoie la teinte en degrés (0-360), la saturation et la luminosité en pourcentages (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Convertit les valeurs HSL (h : 0-360, s : 0-100, l : 0-100) en entiers RVB (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Génère une palette complète de 11 nuances à partir d'une couleur hexagonale de base. La couleur de base correspond à la teinte `500`. Les nuances plus claires (50-400) augmentent la luminosité et diminuent la saturation. Les nuances plus foncées (600-950) diminuent la luminosité et augmentent la saturation.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Génère des déclarations de propriétés personnalisées CSS à partir d'une palette. Renvoie une chaîne séparée par une nouvelle ligne.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Génère un objet de configuration de couleur CSS Tailwind qui fait référence aux variables CSS.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

Batch génère des variables CSS et une configuration Tailwind pour plusieurs couleurs nommées à la fois.

## Détails de mise en œuvre

**Algorithme de nuances** : La palette est générée en ajustant la luminosité HSL et la saturation de la couleur de base selon des décalages prédéfinis :

|Ombre|Ajustement de la luminosité|Ajustement de la saturation|
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

Toutes les valeurs calculées sont limitées à la plage valide (0-100) pour éviter tout débordement.

**Conversion de l'espace colorimétrique** : le module effectue des conversions via le modèle de couleur HSL standard. RVB vers HSL utilise l'algorithme de canal min/max, et HSL vers RVB utilise l'assistant hue2rgb pour une interpolation linéaire par morceaux.

## Configuration

Aucune configuration n'est nécessaire. Les définitions de nuances sont des constantes codées en dur conçues pour produire des palettes visuellement équilibrées similaires aux valeurs par défaut CSS de Tailwind.

## Exemples d'utilisation

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

## Meilleures pratiques

- Utilisez `generateColorPalette()` comme source unique pour toutes les valeurs de teinte plutôt que de sélectionner manuellement les couleurs.
- Préférez `generateCssVariables()` aux styles en ligne afin que les thèmes puissent être modifiés dynamiquement au moment de l'exécution.
- Lors de l'intégration avec Tailwind, utilisez `generateTailwindConfig()` afin que les classes utilitaires fassent référence à des variables CSS plutôt qu'à des valeurs hexadécimales codées en dur.
- Transmettez toujours des couleurs hexadécimales valides à 6 chiffres (par exemple, `#3b82f6`) ; Le raccourci hexadécimal (par exemple, `#38f`) n'est pas pris en charge par l'analyseur d'expressions régulières.
- Testez les palettes générées pour vérifier la conformité des contrastes WCAG, en particulier les extrémités claires (50-200) et sombres (800-950).

## Modules associés

- [Theme System Deep Dive](./theme-system-deep-dive) - Consomme la génération de palettes pour les thèmes dynamiques
- [Système de couleurs](/template/architecture/color-system) -- Documentation du système de couleurs de niveau supérieur
