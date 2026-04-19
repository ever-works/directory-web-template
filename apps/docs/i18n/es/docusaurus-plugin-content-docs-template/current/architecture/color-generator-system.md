---
id: color-generator-system
title: "Sistema generador de color"
sidebar_label: "Sistema generador de color"
sidebar_position: 42
---

# Sistema generador de color

## Descripción general

El sistema generador de colores proporciona generación algorítmica de paletas de colores completas (tonos 50 a 950) a partir de un único color hexadecimal base. Maneja conversiones de espacios de color entre Hex, RGB y HSL, y produce propiedades personalizadas de CSS y objetos de configuración de CSS de Tailwind. Este módulo es la base matemática sobre la cual el sistema temático construye sus paletas de colores dinámicas.

## Arquitectura

El módulo (`lib/color-generator.ts`) es una biblioteca de utilidad pura sin efectos secundarios ni dependencias externas. Se encuentra debajo de la capa del tema y es consumido por:

- **`lib/theme-color-manager.ts`** -- Utiliza `generateColorPalette()` y `generateCssVariables()` para aplicar paletas de temas al DOM.
- **Configuración del tema**: proporciona generación de configuración de Tailwind para la integración del tema en tiempo de compilación.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## Referencia de API

### Exportaciones

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Convierte una cadena de color hexadecimal (con o sin prefijo `#`) en un objeto RGB. Devuelve `{ r: 0, g: 0, b: 0 }` si falla el análisis.

#### `rgbToHex(r: number, g: number, b: number): string`

Convierte valores enteros RGB (0-255) en una cadena de color hexadecimal con el prefijo `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Convierte valores RGB (0-255) a HSL. Devuelve tono en grados (0-360), saturación y luminosidad como porcentajes (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Convierte valores HSL (h: 0-360, s: 0-100, l: 0-100) a enteros RGB (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Genera una paleta completa de 11 tonos a partir de un color hexadecimal base. El color base se asigna al tono `500`. Los tonos más claros (50-400) aumentan la luminosidad y disminuyen la saturación. Los tonos más oscuros (600-950) disminuyen la luminosidad y aumentan la saturación.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Genera declaraciones de propiedades personalizadas de CSS desde una paleta. Devuelve una cadena separada por una nueva línea.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Genera un objeto de configuración de color CSS de Tailwind que hace referencia a variables CSS.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

El lote genera variables CSS y la configuración de Tailwind para varios colores con nombre a la vez.

## Detalles de implementación

**Algoritmo de sombra**: la paleta se genera ajustando la luminosidad y saturación HSL del color base según compensaciones predefinidas:

|sombra|Ajuste de luminosidad|Ajuste de saturación|
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

Todos los valores calculados se limitan al rango válido (0-100) para evitar el desbordamiento.

**Conversión de espacio de color**: El módulo realiza conversiones a través del modelo de color estándar HSL. RGB a HSL utiliza el algoritmo de canal mínimo/máximo, y HSL a RGB utiliza el asistente hue2rgb para la interpolación lineal por partes.

## Configuración

No se necesita configuración. Las definiciones de tonos son constantes codificadas diseñadas para producir paletas visualmente equilibradas similares a los valores predeterminados de Tailwind CSS.

## Ejemplos de uso

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

## Mejores prácticas

- Utilice `generateColorPalette()` como fuente única para todos los valores de tono en lugar de seleccionar colores manualmente.
- Prefiera `generateCssVariables()` a los estilos en línea para que los temas se puedan cambiar dinámicamente en tiempo de ejecución.
- Al integrar con Tailwind, use `generateTailwindConfig()` para que las clases de utilidad hagan referencia a variables CSS en lugar de valores hexadecimales codificados.
- Pase siempre colores hexadecimales válidos de 6 dígitos (por ejemplo, `#3b82f6`); El analizador de expresiones regulares no admite la abreviatura hexadecimal (por ejemplo, `#38f`).
- Pruebe las paletas generadas para comprobar el cumplimiento del contraste WCAG, especialmente los extremos claros (50-200) y oscuros (800-950).

## Módulos relacionados

- [Theme System Deep Dive](./theme-system-deep-dive) -- Consume generación de paletas para temas dinámicos
- [Sistema de color](/template/architecture/color-system) -- Documentación del sistema de color de nivel superior
