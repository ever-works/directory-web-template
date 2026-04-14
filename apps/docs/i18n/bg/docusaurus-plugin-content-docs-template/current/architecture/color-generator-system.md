---
id: color-generator-system
title: "Система за генериране на цветове"
sidebar_label: "Система за генериране на цветове"
sidebar_position: 42
---

# Система за генериране на цветове

## Преглед

Системата за генериране на цветове осигурява алгоритмично генериране на пълни цветови палитри (нюанси 50 до 950) от един основен шестнадесетичен цвят. Той обработва преобразувания на цветово пространство между Hex, RGB и HSL и произвежда CSS персонализирани свойства и Tailwind CSS конфигурационни обекти. Този модул е ​​математическата основа, върху която тематичната система изгражда своите динамични цветови палитри.

## Архитектура

Модулът (`lib/color-generator.ts`) е чиста помощна библиотека без странични ефекти и външни зависимости. Той се намира под слоя с темата и се консумира от:

- **`lib/theme-color-manager.ts`** -- Използва `generateColorPalette()` и `generateCssVariables()` за прилагане на палитри с теми към DOM.
- **Конфигурация на тема** -- Осигурява генериране на конфигурация на Tailwind за интегриране на тема по време на изграждане.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## Справка за API

### Износ

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Преобразува шестнадесетичен цветен низ (със или без префикс `#`) в RGB обект. Връща `{ r: 0, g: 0, b: 0 }`, ако анализът е неуспешен.

#### `rgbToHex(r: number, g: number, b: number): string`

Преобразува RGB цели числа (0-255) в шестнадесетичен цветен низ с префикс `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Преобразува RGB стойности (0-255) в HSL. Връща нюанса в градуси (0-360), наситеността и светлотата като проценти (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Преобразува HSL стойности (h: 0-360, s: 0-100, l: 0-100) в RGB цели числа (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Генерира пълна палитра от 11 нюанса от основен шестнадесетичен цвят. Базовият цвят се преобразува в нюанс `500`. По-светлите нюанси (50-400) увеличават лекотата и намаляват наситеността. По-тъмните нюанси (600-950) намаляват лекотата и увеличават наситеността.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Генерира CSS персонализирани декларации за свойства от палитра. Връща низ, разделен с нов ред.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Генерира обект за цветова конфигурация на Tailwind CSS, който препраща към CSS променливи.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

Пакетът генерира CSS променливи и конфигурация на Tailwind за множество именувани цветове наведнъж.

## Подробности за изпълнението

**Алгоритъм за нюанси**: Палитрата се генерира чрез регулиране на HSL светлотата и наситеността на основния цвят според предварително зададени отмествания:

|Сянка|Регулиране на лекотата|Настройване на наситеността|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (база)|0 (база)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

Всички изчислени стойности са фиксирани към валидния диапазон (0-100), за да се предотврати препълване.

**Преобразуване на цветовото пространство**: Модулът извършва преобразувания чрез стандартния цветови модел HSL. RGB към HSL използва алгоритъма за мин./максимален канал, а HSL към RGB използва помощника hue2rgb за частична линейна интерполация.

## Конфигурация

Не е необходима конфигурация. Дефинициите на нюансите са твърдо кодирани константи, предназначени да създават визуално балансирани палитри, подобни на CSS по подразбиране на Tailwind.

## Примери за използване

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

## Най-добри практики

- Използвайте `generateColorPalette()` като единствен източник за всички стойности на нюанса, вместо ръчно избиране на цветове.
- Предпочитайте `generateCssVariables()` пред вградените стилове, така че темите да могат да се променят динамично по време на изпълнение.
- Когато се интегрирате с Tailwind, използвайте `generateTailwindConfig()`, така че класовете на помощните програми да препращат към CSS променливи, а не към твърдо кодирани шестнадесетични стойности.
- Винаги предавайте валидни 6-цифрени шестнадесетични цветове (напр. `#3b82f6`); съкратен шестнадесетичен (напр. `#38f`) не се поддържа от синтактичния анализатор на регулярен израз.
- Тествайте генерираните палитри за съответствие с WCAG контраста, особено светлите (50-200) и тъмните (800-950) краища.

## Свързани модули

- [Дълбоко потапяне в тематична система](./theme-system-deep-dive) -- Консумира генериране на палитри за динамично оформяне на теми
- [Цветова система](/template/architecture/color-system) -- Документация за цветовата система от по-високо ниво
