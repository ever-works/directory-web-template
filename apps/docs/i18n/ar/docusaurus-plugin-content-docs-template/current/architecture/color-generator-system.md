---
id: color-generator-system
title: "نظام مولد اللون"
sidebar_label: "نظام مولد اللون"
sidebar_position: 42
---

# نظام مولد اللون

## نظرة عامة

يوفر نظام مولد الألوان توليدًا خوارزميًا للوحات الألوان الكاملة (الظلال من 50 إلى 950) من لون سداسي أساسي واحد. فهو يعالج تحويلات مساحة اللون بين Hex وRGB وHSL، وينتج خصائص CSS المخصصة وكائنات تكوين Tailwind CSS. هذه الوحدة هي الأساس الرياضي الذي يقوم عليه نظام السمات ببناء لوحات الألوان الديناميكية الخاصة به.

## الهندسة المعمارية

الوحدة (`lib/color-generator.ts`) عبارة عن مكتبة أدوات مساعدة خالصة بدون آثار جانبية ولا تبعيات خارجية. يقع أسفل طبقة السمة ويتم استهلاكه بواسطة:

- **`lib/theme-color-manager.ts`** - يستخدم `generateColorPalette()` و`generateCssVariables()` لتطبيق لوحات السمات على DOM.
- **تكوين السمة** - يوفر إنشاء تكوين Tailwind لتكامل السمة في وقت البناء.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## مرجع واجهة برمجة التطبيقات

### الصادرات

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

يحول سلسلة ألوان سداسية عشرية (مع أو بدون بادئة `#`) إلى كائن RGB. يُرجع `{ r: 0, g: 0, b: 0 }` في حالة فشل التحليل.

#### `rgbToHex(r: number, g: number, b: number): string`

يحول قيم عدد صحيح RGB (0-255) إلى سلسلة ألوان سداسية مع البادئة `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

يحول قيم RGB (0-255) إلى HSL. إرجاع تدرج اللون بالدرجات (0-360)، والتشبع والخفة كنسب مئوية (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

يحول قيم HSL (h: 0-360، s: 0-100، l: 0-100) إلى أعداد صحيحة RGB (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

ينشئ لوحة ألوان كاملة مكونة من 11 لونًا من اللون الأساسي السداسي. يتم تعيين اللون الأساسي للتظليل `500`. تعمل الظلال الفاتحة (50-400) على زيادة الإضاءة وتقليل التشبع. تعمل الظلال الداكنة (600-950) على تقليل الإضاءة وزيادة التشبع.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

يُنشئ إعلانات خصائص CSS المخصصة من لوحة الألوان. إرجاع سلسلة مفصولة بسطر جديد.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

يُنشئ كائن تكوين ألوان Tailwind CSS الذي يشير إلى متغيرات CSS.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

يقوم Batch بإنشاء متغيرات CSS وتكوين Tailwind لعدة ألوان مسماة في وقت واحد.

## تفاصيل التنفيذ

**خوارزمية الظل**: يتم إنشاء اللوحة عن طريق ضبط إضاءة HSL وتشبع اللون الأساسي وفقًا للإزاحات المحددة مسبقًا:

|الظل|ضبط الخفة|ضبط التشبع|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (قاعدة)|0 (قاعدة)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

يتم تثبيت كافة القيم المحسوبة على النطاق الصالح (0-100) لمنع التجاوز.

** تحويل مساحة اللون **: تقوم الوحدة بإجراء التحويلات من خلال نموذج ألوان HSL القياسي. يستخدم RGB-to-HSL خوارزمية القناة min/max، ويستخدم HSL-to-RGB المساعد hue2rgb للاستكمال الخطي المتعدد التعريف.

## التكوين

ليس هناك حاجة إلى التكوين. تعريفات الظل هي ثوابت مضمنة مصممة لإنتاج لوحات متوازنة بصريًا تشبه إعدادات Tailwind CSS الافتراضية.

## أمثلة الاستخدام

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

## أفضل الممارسات

- استخدم `generateColorPalette()` كمصدر واحد لجميع قيم الظل بدلاً من اختيار الألوان يدويًا.
- تفضل `generateCssVariables()` على الأنماط المضمنة بحيث يمكن تغيير السمات ديناميكيًا في وقت التشغيل.
- عند التكامل مع Tailwind، استخدم `generateTailwindConfig()` بحيث تشير فئات الأدوات المساعدة إلى متغيرات CSS بدلاً من القيم السداسية المضمنة.
- قم دائمًا بتمرير الألوان السداسية الصحيحة المكونة من 6 أرقام (على سبيل المثال، `#3b82f6`)؛ السداسي المختصر (على سبيل المثال، `#38f`) غير مدعوم من قبل محلل regex.
- تم اختبار اللوحات التي تم إنشاؤها للتأكد من توافق تباين WCAG، خاصة الأطراف الفاتحة (50-200) والداكنة (800-950).

## الوحدات ذات الصلة

- [الغوص العميق في نظام السمات](./theme-system-deep-dive) - يستهلك إنشاء لوحة الألوان للسمات الديناميكية
- [نظام الألوان](/template/architecture/color-system) - وثائق نظام الألوان ذات المستوى الأعلى
