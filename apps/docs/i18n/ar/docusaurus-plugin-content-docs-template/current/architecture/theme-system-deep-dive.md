---
id: theme-system-deep-dive
title: "نظام الموضوع الغوص العميق"
sidebar_label: "نظام الموضوع الغوص العميق"
sidebar_position: 46
---

# نظام الموضوع الغوص العميق

## نظرة عامة

يوفر نظام السمات بنية أساسية شاملة ومتعددة الطبقات تعمل على تشغيل لوحات الألوان الديناميكية والإعدادات المسبقة للسمات المعدة مسبقًا وفئات أدوات CSS المساعدة وبيانات تعريف السمات لمحددات واجهة المستخدم. وهو يشمل ثلاث وحدات: `theme-color-manager.ts` لتطبيق لوحة وقت التشغيل، `theme-utils.ts` لفئات الأداة المساعدة Tailwind والوظائف المساعدة، و`themes.tsx` لتعريفات السمات مع مكونات معاينة React.

## الهندسة المعمارية

تم وضع نظام السمات أعلى [Color Generator](./color-generator-system) ويتم استهلاكه بواسطة `LayoutThemeContext`:

```
themes.tsx                    -- Theme definitions, metadata, previews
  |
theme-color-manager.ts        -- Runtime palette application (DOM manipulation)
  |-- EXTENDED_THEME_CONFIGS  -- Full color configs per theme
  |-- applyColorPalette()     -- Apply single color palette to DOM
  |-- applyThemeWithPalettes()-- Apply full theme to DOM
  |-- generateThemeCss()      -- Generate CSS string
  |-- applyCustomTheme()      -- Apply arbitrary colors
  |-- useThemeWithPalettes()  -- React hook wrapper
  |
theme-utils.ts                -- Utility classes, color lookups, builders
  |-- themeClasses            -- Pre-built Tailwind class maps
  |-- tailwindColors          -- Full Tailwind color palette reference
  |-- animationClasses        -- Animation utility classes
  |-- responsiveClasses       -- Responsive layout classes
  |-- THEME_PRESETS           -- Simple color presets
  |
color-generator.ts            -- Mathematical palette generation (see separate doc)
```

تشير جميع الوحدات الثلاث إلى `ThemeKey` و`ThemeConfig` من `@/components/context/LayoutThemeContext`، مما يضمن اتساق النوع عبر نظام السمات.

### السمات المتاحة

|مفتاح|التسمية|الابتدائية|ثانوي|
|-----|-------|---------|-----------|
|`everworks`|الافتراضي|`#3d70ef`|`#00c853`|
|`corporate`|الشركات|`#00c853`|`#e74c3c`|
|`material`|مادة|`#673ab7`|`#ff9800`|
|`funny`|مضحك|`#ff4081`|`#ffeb3b`|

## مرجع واجهة برمجة التطبيقات

### الصادرات من `lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

تكوينات الألوان الكاملة لكل سمة، بما في ذلك القيم الأساسية والثانوية واللكنة والخلفية والسطح والنص والقيم الثانوية.

#### `applyColorPalette(colorName: string, baseColor: string): void`

ينشئ لوحة كاملة من `baseColor` ويطبقها على `document.documentElement` كخصائص CSS مخصصة. يقوم أيضًا بتعيين متغير `-rgb` لدعم العتامة.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

يطبق سمة كاملة عن طريق استدعاء `applyColorPalette()` للألوان الأساسية والثانوية وألوان التمييز، بالإضافة إلى تعيين متغيرات الخلفية والسطح والنص. يعود إلى `everworks` إذا فشل السمة المحددة.

#### `generateThemeCss(themeKey: ThemeKey): string`

يُنشئ سلسلة CSS تحتوي على جميع إعلانات الخصائص المخصصة لموضوع ما، ومناسبة لإدخالها في علامة `<style>` أو ورقة الأنماط.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

مجمع بسيط يستدعي `applyThemeWithPalettes()` من جانب العميل (يتحقق `typeof window`). مناسبة للاستخدام في تأثيرات React.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

يطبق ألوانًا عشوائية (وليس من سمات محددة مسبقًا) عن طريق إنشاء لوحات لكل لون متوفر.

#### `previewThemeColors(baseColor: string): void`

أداة تصحيح الأخطاء التي تسجل جميع ظلال اللوحة إلى وحدة التحكم بخلفيات ملونة للفحص البصري.

### الصادرات من `lib/theme-utils.ts`

#### `themeClasses`

خرائط فئة Tailwind CSS المعدة مسبقًا والتي يتم تنظيمها حسب نوع المكون:

```typescript
themeClasses.button.primary    // "bg-theme-primary hover:bg-theme-accent text-white"
themeClasses.button.secondary  // "bg-theme-secondary hover:bg-theme-secondary/80 text-white"
themeClasses.button.outline    // "border-2 border-theme-primary ..."
themeClasses.button.ghost      // "text-theme-primary hover:bg-theme-primary/10"
themeClasses.text.primary      // "text-theme-text"
themeClasses.text.secondary    // "text-theme-text-secondary"
themeClasses.text.accent       // "text-theme-primary"
themeClasses.background.*      // Background variants
themeClasses.border.*          // Border variants
```

#### `tailwindColors`

كائن مرجعي كامل للوحة ألوان Tailwind CSS يحتوي على جميع الألوان القياسية (أردوازي، رمادي، زنك، محايد، حجري، أحمر، برتقالي، كهرماني، أصفر، ليموني، أخضر، زمردي، أزرق مخضر، سماوي، سماوي، أزرق، نيلي، بنفسجي، أرجواني، فوشيا، وردي، وردي) بظلال من 50 إلى 950.

#### `opacities`

خريطة قيمة العتامة من 5 إلى 95 ككسور عشرية.

#### `animationClasses`

مجموعات فئات الرسوم المتحركة المعدة مسبقًا: `fadeIn`، `slideIn`، `scaleIn`، `hover`، `press`.

#### `responsiveClasses`

فئات التخطيط المستجيب المبنية مسبقًا: `container`، `grid.responsive`، `grid.auto`، `flex.center`، `flex.between`، `flex.start`.

#### `getCssVariable(name: string): string`

تُرجع سلسلة مرجعية متغيرة `var(--name)` CSS.

#### `withOpacity(colorClass: string, opacity: number | string): string`

إلحاق معدل عتامة Tailwind بفئة (على سبيل المثال، `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

إرجاع قيمة اللون السداسية لموضوع معين ونوع لون محدد.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

إرجاع كائن بقيم خصائص `--theme-primary` و@@TOK001@@@ لموضوع CSS.

#### `cn(...classes: (string | undefined | null | false)[]): string`

أداة مساعدة للانضمام المشروط لأسماء الفئات، وتصفية القيم الزائفة.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

يجمع بين الفئات الأساسية وفئات السمات والفئات الشرطية في سلسلة فئة واحدة.

#### `THEME_PRESETS`

سجلات بسيطة محددة مسبقًا بلونين لكل مفتاح سمة (أساسي + ثانوي فقط).

### الصادرات من `lib/themes.tsx`

#### `ThemeMetadata` (الواجهة)

```typescript
interface ThemeMetadata {
  readonly key: ThemeKey;
  readonly label: string;
  readonly description: string;
  readonly preview: React.ReactNode;
  readonly config: ThemeConfig;
}
```

#### `ThemePreviews: Record<ThemeKey, React.ReactNode>`

تعرض عناصر التفاعل صورًا مصغرة للمعاينة الملونة الصغيرة لكل سمة.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

البيانات الوصفية للموضوع بدون تكوين، بما في ذلك التصنيفات والأوصاف ومكونات المعاينة.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

يدمج تعريفات السمات مع التكوين لإنتاج بيانات تعريف كاملة.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

إرجاع مجموعة من البيانات التعريفية الكاملة للموضوع لجميع السمات، وهي مفيدة لعرض محددات السمات.

## تفاصيل التنفيذ

** معالجة DOM **: `applyColorPalette()` يعدل مباشرة `document.documentElement.style` لتعيين خصائص CSS المخصصة. يتيح ذلك التبديل الفوري للموضوع دون إعادة تحميل الصفحة.

**متغير RGB للتعتيم**: تقوم كل لوحة ألوان أيضًا بتعيين متغير `--{name}-rgb` الذي يحتوي على قيم RGB مفصولة بفواصل (على سبيل المثال، `59, 130, 246`)، مما يتيح استخدام `rgba()` مع العتامة في CSS.

**الإستراتيجية الاحتياطية**: `applyThemeWithPalettes()` تكتشف الأخطاء وتعود إلى السمة `everworks`. حتى إذا فشل الإجراء الاحتياطي، فإنه يسجل الخطأ ويخرج بأمان.

**الإعدادات المسبقة غير القابلة للتغيير**: تم الإعلان عن `THEME_PRESETS` و`EXTENDED_THEME_CONFIGS` `as const` لمنع حدوث طفرة غير مقصودة.

## التكوين

تتم إدارة اختيار السمة بواسطة `LayoutThemeContext` سياق React. تم تكوين السمات الأربعة المضمنة مباشرةً في `EXTENDED_THEME_CONFIGS`. يمكن تطبيق السمات المخصصة في وقت التشغيل باستخدام `applyCustomTheme()`.

## أمثلة الاستخدام

```typescript
// Apply a preset theme
import { applyThemeWithPalettes } from '@/lib/theme-color-manager';
applyThemeWithPalettes('material');

// Apply custom brand colors
import { applyCustomTheme } from '@/lib/theme-color-manager';
applyCustomTheme({
  primary: '#1a73e8',
  secondary: '#34a853',
  accent: '#ea4335',
});

// Use theme-aware utility classes
import { themeClasses, cn } from '@/lib/theme-utils';

function Button({ variant = 'primary', className, ...props }) {
  return (
    <button
      className={cn(themeClasses.button[variant], className)}
      {...props}
    />
  );
}

// Build a theme selector UI
import { getAllThemeMetadata } from '@/lib/themes';
import { EXTENDED_THEME_CONFIGS } from '@/lib/theme-color-manager';

function ThemeSelector() {
  const themes = getAllThemeMetadata(EXTENDED_THEME_CONFIGS);

  return (
    <div className={responsiveClasses.grid.responsive}>
      {themes.map((theme) => (
        <button key={theme.key} onClick={() => applyThemeWithPalettes(theme.key)}>
          {theme.preview}
          <span>{theme.label}</span>
          <p>{theme.description}</p>
        </button>
      ))}
    </div>
  );
}

// Generate theme CSS for server-side rendering
import { generateThemeCss } from '@/lib/theme-color-manager';

const css = generateThemeCss('everworks');
// Inject into <style> tag in document head
```

## أفضل الممارسات

- استخدم `themeClasses` من `theme-utils.ts` لتصميم المكونات المتسق بدلاً من كتابة فئات تراعي السمات يدويًا.
- قم دائمًا بتطبيق السمات من خلال `applyThemeWithPalettes()` لضمان تعيين جميع لوحات الألوان (الأساسية والثانوية واللكنة) والمتغيرات غير الموجودة في لوحة الألوان (الخلفية والسطح والنص) معًا.
- استخدم `generateThemeCss()` للعرض من جانب الخادم لتجنب وميض المحتوى غير المصمم قبل أن يقوم JavaScript من جانب العميل بتطبيق السمة.
- عند إضافة سمة جديدة، قم بتحديث جميع الملفات الثلاثة: `EXTENDED_THEME_CONFIGS` في `theme-color-manager.ts`، `THEME_PRESETS` في `theme-utils.ts`، و`THEME_DEFINITIONS` في `themes.tsx`.
- استخدم الأداة المساعدة `cn()` لتكوين الفئة الشرطية لإبقاء JSX نظيفًا وقابلاً للقراءة.

## الوحدات ذات الصلة

- [نظام مولد الألوان](./color-generator-system)-- الأساس الرياضي لتوليد لوحة الألوان
- [نظام الألوان](/template/architecture/color-system) - نظرة عامة على نظام الألوان عالي المستوى
