---
id: color-generator-system
title: "颜色生成系统"
sidebar_label: "颜色生成系统"
sidebar_position: 42
---

# 颜色生成系统

## 概述

颜色生成器系统提供从单一基本十六进制颜色算法生成完整调色板（色调 50 到 950）的功能。它处理 Hex、RGB 和 HSL 之间的颜色空间转换，并生成 CSS 自定义属性和 Tailwind CSS 配置对象。该模块是主题系统构建其动态调色板的数学基础。

## 建筑

该模块（`lib/color-generator.ts`）是一个纯粹的实用程序库，没有副作用，也没有外部依赖。它位于主题层下方，并由以下组件使用：

- **`lib/theme-color-manager.ts`** -- 使用 `generateColorPalette()` 和 `generateCssVariables()` 将主题调色板应用到 DOM。
- **主题配置** -- 为构建时主题集成提供 Tailwind 配置生成。

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## API参考

### 出口

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

将十六进制颜色字符串（带或不带 `#` 前缀）转换为 RGB 对象。如果解析失败，则返回`{ r: 0, g: 0, b: 0 }`。

#### `rgbToHex(r: number, g: number, b: number): string`

将 RGB 整数值 (0-255) 转换为带有 `#` 前缀的十六进制颜色字符串。

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

将 RGB 值 (0-255) 转换为 HSL。返回以度数 (0-360) 表示的色调，以百分比 (0-100) 表示的饱和度和亮度。

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

将 HSL 值（h：0-360、s：0-100、l：0-100）转换为 RGB 整数 (0-255)。

#### `generateColorPalette(baseColor: string): ColorPalette`

从基本十六进制颜色生成完整的 11 色调调色板。基色映射到阴影`500`。较浅的色调 (50-400) 会增加亮度并降低饱和度。较深的色调 (600-950) 会降低亮度并增加饱和度。

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

从调色板生成 CSS 自定义属性声明。返回一个以换行符分隔的字符串。

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

生成引用 CSS 变量的 Tailwind CSS 颜色配置对象。

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

批量生成多个命名颜色的 CSS 变量和 Tailwind 配置。

## 实施细节

**阴影算法**：根据预定义的偏移量调整基色的HSL亮度和饱和度来生成调色板：

|遮荫|亮度调节|饱和度调整|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0（基础）|0（基础）|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

所有计算值都被限制在有效范围（0-100）内以防止溢出。

**色彩空间转换**：模块通过标准HSL色彩模型进行转换。 RGB-to-HSL 使用最小/最大通道算法，HSL-to-RGB 使用hue2rgb 辅助函数进行分段线性插值。

## 配置

无需配置。阴影定义是硬编码常量，旨在生成类似于 Tailwind CSS 默认值的视觉平衡调色板。

## 使用示例

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

## 最佳实践

- 使用 `generateColorPalette()` 作为所有色调值的单一来源，而不是手动选取颜色。
- 优先使用 `generateCssVariables()` 而不是内联样式，以便可以在运行时动态更改主题。
- 与 Tailwind 集成时，请使用`generateTailwindConfig()`，以便实用程序类引用 CSS 变量而不是硬编码的十六进制值。
- 始终传递有效的 6 位十六进制颜色（例如，`#3b82f6`）；正则表达式解析器不支持简写十六进制（例如`#38f`）。
- 测试生成的调色板是否符合 WCAG 对比度合规性，特别是浅色 (50-200) 和深色 (800-950) 端。

## 相关模块

- [主题系统深度潜水](./theme-system-deep-dive) -- 使用调色板生成来实现动态主题
- [Color System](/template/architecture/color-system) -- 更高级别的颜色系统文档
