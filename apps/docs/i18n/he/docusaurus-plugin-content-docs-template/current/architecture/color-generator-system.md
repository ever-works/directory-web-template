---
id: color-generator-system
title: "מערכת מחולל צבע"
sidebar_label: "מערכת מחולל צבע"
sidebar_position: 42
---

# מערכת מחולל צבע

## סקירה כללית

מערכת מחולל הצבעים מספקת יצירה אלגוריתמית של פלטות צבעים שלמות (גוונים 50 עד 950) מצבע משושה בסיס אחד. הוא מטפל בהמרות מרחב צבע בין Hex, RGB ו-HSL, ומייצר מאפייני CSS מותאמים אישית ואובייקטי תצורה של Tailwind CSS. מודול זה הוא הבסיס המתמטי שעליו בונה מערכת הנושא את לוחות הצבעים הדינמיים שלה.

## אדריכלות

המודול (`lib/color-generator.ts`) הוא ספריית שירות טהורה ללא תופעות לוואי וללא תלות חיצונית. הוא יושב מתחת לשכבת הנושא ונצרך על ידי:

- **`lib/theme-color-manager.ts`** -- משתמש ב-@@TOK001@@@ וב-`generateCssVariables()` כדי להחיל פלטות ערכות נושא על ה-DOM.
- **תצורת ערכת נושא** - מספקת יצירת תצורת Tailwind לשילוב ערכת נושא בזמן בנייה.

```
color-generator.ts
  |-- hexToRgb(), rgbToHex()         (Hex <-> RGB conversion)
  |-- rgbToHsl(), hslToRgb()         (RGB <-> HSL conversion)
  |-- generateColorPalette()          (Base color -> 11 shades)
  |-- generateCssVariables()          (Palette -> CSS variable strings)
  |-- generateTailwindConfig()        (Palette -> Tailwind config object)
  |-- generateThemeColors()           (Batch: multiple colors at once)
```

## הפניה ל-API

### יצוא

#### `hexToRgb(hex: string): { r: number; g: number; b: number }`

ממירה מחרוזת צבע hex (עם או בלי `#` קידומת) לאובייקט RGB. מחזירה `{ r: 0, g: 0, b: 0 }` אם הניתוח נכשל.

#### `rgbToHex(r: number, g: number, b: number): string`

ממירה ערכי RGB שלמים (0-255) למחרוזת צבע משושה עם הקידומת `#`.

#### `rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }`

ממירה ערכי RGB (0-255) ל-HSL. מחזיר גוון במעלות (0-360), רוויה ובהירות באחוזים (0-100).

#### `hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }`

ממירה ערכי HSL (h: 0-360, s: 0-100, l: 0-100) למספרי RGB שלמים (0-255).

#### `generateColorPalette(baseColor: string): ColorPalette`

מייצר פלטה שלמה של 11 גוונים מצבע משושה בסיס. צבע הבסיס ממפה לגוון `500`. גוונים בהירים יותר (50-400) מגבירים את הבהירות ומקטינים את הרוויה. גוונים כהים יותר (600-950) מפחיתים בהירות ומגבירים את הרוויה.

```typescript
interface ColorPalette {
  50: string;   100: string;  200: string;
  300: string;  400: string;  500: string;  // Base color
  600: string;  700: string;  800: string;
  900: string;  950: string;
}
```

#### `generateCssVariables(variableName: string, palette: ColorPalette): string`

יוצר הצהרות מאפיינים מותאמים אישית של CSS מלוח. מחזירה מחרוזת מופרדת בשורה חדשה.

```css
--theme-primary: #3b82f6;
--theme-primary-50: #e8f0fe;
--theme-primary-100: #d4e4fd;
/* ... */
--theme-primary-950: #0a1a3d;
```

#### `generateTailwindConfig(className: string): Record<string, string>`

יוצר אובייקט תצורת צבע של Tailwind CSS המפנה למשתני CSS.

```typescript
{
  DEFAULT: 'var(--theme-primary)',
  50: 'var(--theme-primary-50)',
  100: 'var(--theme-primary-100)',
  // ...
}
```

#### `generateThemeColors(colors: Record<string, string>): { css: string; tailwind: Record<string, any> }`

אצווה מייצרת משתני CSS ותצורת Tailwind עבור צבעים בעלי שם מרובים בו-זמנית.

## פרטי יישום

**אלגוריתם גוון**: הפלטה נוצרת על ידי התאמת בהירות HSL ורוויה של צבע הבסיס בהתאם לקיזוזים מוגדרים מראש:

|צל|התאם קלות|התאמת הרוויה|
|-------|-----------------|-------------------|
| 50    | +45             | -30               |
| 100   | +40             | -25               |
| 200   | +30             | -20               |
| 300   | +20             | -10               |
| 400   | +10             | -5                |
| 500   |0 (בסיס)|0 (בסיס)|
| 600   | -10             | +5                |
| 700   | -20             | +10               |
| 800   | -30             | +15               |
| 900   | -40             | +20               |
| 950   | -45             | +25               |

כל הערכים המחושבים מוצמדים לטווח החוקי (0-100) כדי למנוע הצפת יתר.

**המרת מרחב צבע**: המודול מבצע המרות באמצעות מודל הצבעים הסטנדרטי של HSL. RGB-to-HSL משתמש באלגוריתם ערוץ min/max, ו-HSL-to-RGB משתמש ב-hue2rgb עוזר לאינטרפולציה ליניארית חלקית.

## תצורה

אין צורך בתצורה. הגדרות הגוון הן קבועים מקודדים שנועדו לייצר פלטות מאוזנות ויזואלית בדומה לברירות המחדל של Tailwind CSS.

## דוגמאות לשימוש

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

## שיטות עבודה מומלצות

- השתמש ב-`generateColorPalette()` כמקור יחיד עבור כל ערכי הגוונים במקום לבחור צבעים באופן ידני.
- העדיפו `generateCssVariables()` על פני סגנונות מוטבעים כך שניתן יהיה לשנות ערכות נושא באופן דינמי בזמן ריצה.
- בעת אינטגרציה עם Tailwind, השתמש ב-`generateTailwindConfig()` כדי שמחלקות שירות יפנו למשתני CSS ולא לערכי hex מקודדים.
- העבר תמיד צבעי hex תקפים בני 6 ספרות (לדוגמה, `#3b82f6`); הקיצור הקיצור (למשל, `#38f`) אינו נתמך על ידי מנתח הביטויים הרגולריים.
- בדוק פלטות שנוצרו עבור תאימות לניגודיות WCAG, במיוחד הקצוות הבהירים (50-200) והכהים (800-950).

## מודולים קשורים

- [Theme System Deep Dive](./theme-system-deep-dive) -- צורכת יצירת פלטות לעיצוב נושא דינמי
- [מערכת צבע](/template/architecture/color-system) -- תיעוד מערכת צבע ברמה גבוהה יותר
