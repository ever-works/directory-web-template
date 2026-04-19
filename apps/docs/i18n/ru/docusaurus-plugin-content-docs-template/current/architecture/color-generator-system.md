---
id: color-generator-system
title: "Система цветного генератора"
sidebar_label: "Система цветного генератора"
sidebar_position: 42
---

# Система цветного генератора

## Обзор

Система генератора цветов обеспечивает алгоритмическое создание полных цветовых палитр (оттенков от 50 до 950) из одного базового шестнадцатеричного цвета. Он обрабатывает преобразования цветового пространства между Hex, RGB и HSL, а также создает пользовательские свойства CSS и объекты конфигурации CSS Tailwind. Этот модуль представляет собой математическую основу, на которой система тем строит свои динамические цветовые палитры.

## Архитектура

Модуль (`lib/color-generator.ts`) представляет собой чистую служебную библиотеку без побочных эффектов и внешних зависимостей. Он находится под слоем темы и используется:

- **`lib/theme-color-manager.ts`** — использует `generateColorPalette()` и `generateCssVariables()` для применения палитр тем к DOM.
- **Конфигурация темы** – обеспечивает создание конфигурации Tailwind для интеграции темы во время сборки.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## Справочник по API

### Экспорт

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

Преобразует шестнадцатеричную цветовую строку (с префиксом `#` или без него) в объект RGB. Возвращает `{ r: 0, g: 0, b: 0 }`, если анализ не удался.

#### `rgbToHex(r: number, g: number, b: number): string`

Преобразует целочисленные значения RGB (0–255) в шестнадцатеричную цветовую строку с префиксом `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

Преобразует значения RGB (0–255) в HSL. Возвращает оттенок в градусах (0–360), насыщенность и яркость в процентах (0–100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

Преобразует значения HSL (h: 0–360, s: 0–100, l: 0–100) в целые числа RGB (0–255).

#### `generateColorPalette(baseColor: string): ColorPalette`

Создает полную палитру из 11 оттенков на основе базового шестнадцатеричного цвета. Базовые цвета соответствуют оттенку `500`. Более светлые оттенки (50–400) увеличивают яркость и уменьшают насыщенность. Более темные оттенки (600-950) уменьшают яркость и увеличивают насыщенность.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

Генерирует объявления пользовательских свойств CSS из палитры. Возвращает строку, разделенную символом новой строки.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

Создает объект конфигурации цвета CSS Tailwind, который ссылается на переменные CSS.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

Пакетная обработка генерирует переменные CSS и конфигурацию Tailwind для нескольких именованных цветов одновременно.

## Детали реализации

**Алгоритм затенения**: палитра создается путем регулировки яркости и насыщенности HSL основного цвета в соответствии с предопределенными смещениями:

|Тень|Регулировка яркости|Настройка насыщенности|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (базовый)|0 (базовый)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

Все вычисленные значения ограничиваются допустимым диапазоном (0–100), чтобы предотвратить переполнение.

**Преобразование цветового пространства**: модуль выполняет преобразование с помощью стандартной цветовой модели HSL. Для преобразования RGB в HSL используется алгоритм канала мин/макс, а для преобразования HSL в RGB используется помощник hue2rgb для кусочно-линейной интерполяции.

## Конфигурация

Никакой настройки не требуется. Определения оттенков — это жестко закодированные константы, предназначенные для создания визуально сбалансированных палитр, аналогичных настройкам CSS Tailwind по умолчанию.

## Примеры использования

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

## Лучшие практики

- Используйте `generateColorPalette()` в качестве единого источника для всех значений оттенков, а не выбирайте цвета вручную.
- Предпочитайте `generateCssVariables()` встроенным стилям, чтобы темы можно было динамически изменять во время выполнения.
- При интеграции с Tailwind используйте `generateTailwindConfig()`, чтобы служебные классы ссылались на переменные CSS, а не на жестко запрограммированные шестнадцатеричные значения.
- Всегда передавайте допустимые шестизначные шестнадцатеричные цвета (например, `#3b82f6`); сокращенное шестнадцатеричное выражение (например, `#38f`) не поддерживается анализатором регулярных выражений.
- Тестируйте сгенерированные палитры на соответствие контрастности WCAG, особенно на светлых (50-200) и темных (800-950) концах.

## Связанные модули

- [Подробное описание системы тем](./theme-system-deep-dive) — использует генерацию палитры для динамического оформления тем.
- [Цветовая система](/template/architecture/color-system) — документация по цветовой системе более высокого уровня.
