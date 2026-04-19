---
id: theme-system
title: "نظام الموضوع"
sidebar_label: "نظام الموضوع"
sidebar_position: 20
---

# نظام الموضوع

يوفر القالب نظامًا متعدد السمات مع أربعة سمات مدمجة. تتحكم السمات في الألوان، ومتغيرات CSS، وأدوات Tailwind، وتتضمن مكونات المعاينة والبيانات التعريفية لواجهات المستخدم الخاصة باختيار السمات.

## نظرة عامة على الهندسة المعمارية

```mermaid
graph TD
    A[LayoutThemeContext] --> B[ThemeKey]
    B --> C[THEME_DEFINITIONS]
    B --> D[EXTENDED_THEME_CONFIGS]
    B --> E[THEME_PRESETS]
    C --> F[ThemeMetadata - label, description, preview]
    D --> G[ThemeConfig - full color set]
    G --> H[theme-color-manager.ts]
    H --> I[applyThemeWithPalettes]
    I --> J[CSS Variables on :root]
    E --> K[theme-utils.ts]
    K --> L[Utility Classes]
    K --> M[Animation Classes]
    K --> N[Responsive Classes]
```

## ملفات المصدر

|ملف|الغرض|
|------|---------|
|`lib/themes.tsx`|تعريفات السمات والبيانات التعريفية ومكونات المعاينة|
|`lib/theme-color-manager.ts`|التكوينات الموسعة، وتطبيق DOM، وتوليد CSS|
|`lib/theme-utils.ts`|الأدوات المساعدة من فئة Tailwind والإعدادات المسبقة والوظائف المساعدة|
|`components/context/LayoutThemeContext`|سياق التفاعل لحالة السمة (مرجع)|

## السمات المتاحة

|مفتاح الموضوع|التسمية|الابتدائية|ثانوي|الوصف|
|-----------|-------|---------|-----------|-------------|
|`everworks`|الافتراضي|`#3d70ef`|`#00c853`|حديثة واحترافية باللونين الأزرق والأخضر|
|`corporate`|الشركات|`#00c853`|`#e74c3c`|الأعمال المهنية مع الأخضر والأحمر|
|`material`|مادة|`#673ab7`|`#ff9800`|تصميم المواد من Google باللونين الأرجواني والبرتقالي|
|`funny`|مضحك|`#ff4081`|`#ffeb3b`|مرحة وحيوية مع اللون الوردي والأصفر|

## تكوين الموضوع

يحدد كل سمة سبع فتحات ألوان:

```typescript
export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}
```

### تكوينات الموضوع الموسعة

يوفر `EXTENDED_THEME_CONFIGS` في `theme-color-manager.ts` تعريفات الألوان الكاملة:

```typescript
export const EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig> = {
  everworks: {
    primary: "#3d70ef",
    secondary: "#00c853",
    accent: "#0056b3",
    background: "#ffffff",
    surface: "#f8f9fa",
    text: "#1a1a1a",
    textSecondary: "#6c757d",
  },
  // ... other themes
};
```

## البيانات الوصفية للموضوع

توفر الوحدة `themes.tsx` عرض البيانات التعريفية ومكونات المعاينة:

```typescript
export interface ThemeMetadata {
  readonly key: ThemeKey;
  readonly label: string;
  readonly description: string;
  readonly preview: React.ReactNode;
  readonly config: ThemeConfig;
}
```

### تعريفات الموضوع

```typescript
export const THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>> = {
  everworks: {
    key: "everworks",
    label: "Default",
    description: "Modern and professional theme with blue and green accents",
    preview: ThemePreviews.everworks,
  },
  // ... other themes
};
```

### مكونات المعاينة

يحتوي كل سمة على معاينة مرئية صغيرة يتم تقديمها على شكل `div`:

```typescript
export const ThemePreviews: Record<ThemeKey, React.ReactNode> = {
  everworks: (
    <div className="w-12 h-8 bg-[#3d70ef] rounded-sm overflow-hidden relative">
      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-black/10" />
      <div className="absolute bottom-1 left-1 w-2 h-1 bg-white/80 rounded-xs" />
      <div className="absolute top-1 right-1 w-1 h-1 bg-white/60 rounded-full" />
    </div>
  ),
  // ... other previews
};
```

### وظائف الاستعلام عن بيانات التعريف

```typescript
// Get metadata for a single theme
export const getThemeMetadata = (themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata;

// Get metadata for all themes
export const getAllThemeMetadata = (configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[];
```

## تطبيق متغير CSS

عند تطبيق سمة، يقوم مدير الألوان بتعيين خصائص CSS المخصصة على `document.documentElement`:

```mermaid
sequenceDiagram
    participant App
    participant Manager as theme-color-manager
    participant ColorGen as color-generator
    participant DOM

    App->>Manager: applyThemeWithPalettes('everworks')
    Manager->>Manager: Look up EXTENDED_THEME_CONFIGS
    Manager->>ColorGen: generateColorPalette(primary)
    Manager->>ColorGen: generateColorPalette(secondary)
    Manager->>ColorGen: generateColorPalette(accent)
    ColorGen-->>Manager: 11-shade palettes
    Manager->>DOM: setProperty('--theme-primary', ...)
    Manager->>DOM: setProperty('--theme-primary-50', ...)
    Manager->>DOM: setProperty('--theme-primary-rgb', ...)
    Note over DOM: 33+ CSS variables set
    Manager->>DOM: setProperty('--theme-background', ...)
    Manager->>DOM: setProperty('--theme-surface', ...)
    Manager->>DOM: setProperty('--theme-text', ...)
    Manager->>DOM: setProperty('--theme-text-secondary', ...)
```

### متغيرات CSS التي تم إنشاؤها

لكل موضوع، يتم إنشاء متغيرات CSS التالية:

|نمط متغير|عد|مثال|
|-----------------|-------|---------|
|`--theme-primary-{50-950}`| 11 |`--theme-primary-500: #3d70ef`|
|`--theme-primary-rgb`| 1 |`--theme-primary-rgb: 61, 112, 239`|
|`--theme-secondary-{50-950}`| 11 |`--theme-secondary-500: #00c853`|
|`--theme-accent-{50-950}`| 11 |`--theme-accent-500: #0056b3`|
|`--theme-background`| 1 |`--theme-background: #ffffff`|
|`--theme-surface`| 1 |`--theme-surface: #f8f9fa`|
|`--theme-text`| 1 |`--theme-text: #1a1a1a`|
|`--theme-text-secondary`| 1 |`--theme-text-secondary: #6c757d`|

## فئات المرافق Tailwind

مجموعات الفصول المعدة مسبقًا للاستخدام المتسق للموضوع:

### المتغيرات زر

```typescript
themeClasses.button.primary   // "bg-theme-primary hover:bg-theme-accent text-white"
themeClasses.button.secondary // "bg-theme-secondary hover:bg-theme-secondary/80 text-white"
themeClasses.button.outline   // "border-2 border-theme-primary text-theme-primary ..."
themeClasses.button.ghost     // "text-theme-primary hover:bg-theme-primary/10"
```

### دروس الرسوم المتحركة

```typescript
export const animationClasses = {
  fadeIn: "animate-in fade-in duration-200",
  slideIn: "animate-in slide-in-from-top-2 duration-200",
  scaleIn: "animate-in zoom-in-95 duration-200",
  hover: "transition-all duration-200 hover:scale-105",
  press: "transition-all duration-100 active:scale-95",
};
```

### فئات التخطيط المستجيبة

```typescript
export const responsiveClasses = {
  container: "container max-w-7xl px-4 sm:px-6 lg:px-8",
  grid: {
    responsive: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
    auto: "grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4",
  },
  flex: {
    center: "flex items-center justify-center",
    between: "flex items-center justify-between",
    start: "flex items-center justify-start",
  },
};
```

## بناء الصف المدرك للموضوع

تجمع الدالة `buildThemeClasses` بين الفئات الأساسية والموضوع والفئات الشرطية:

```typescript
import { buildThemeClasses } from '@/lib/theme-utils';

const className = buildThemeClasses(
  'px-4 py-2 rounded',           // Base classes
  'bg-theme-primary text-white',  // Theme classes
  {
    'opacity-50 cursor-not-allowed': isDisabled,
    'ring-2 ring-theme-accent': isFocused,
  }
);
```

## الإعدادات المسبقة للون الموضوع

الوصول السريع إلى الألوان الأساسية/الثانوية للموضوع:

```typescript
export const THEME_PRESETS = {
  everworks: { primary: "#3d70ef", secondary: "#00c853" },
  corporate: { primary: "#2c3e50", secondary: "#e74c3c" },
  material: { primary: "#673ab7", secondary: "#ff9800" },
  funny: { primary: "#ff4081", secondary: "#ffeb3b" },
} as const;

// Query function
export const getThemeColor = (
  themeKey: ThemeKey,
  colorType: "primary" | "secondary"
) => colorMap[themeKey][colorType];
```

## مرجع لون الرياح الخلفية

تقوم الوحدة `theme-utils.ts` أيضًا بتصدير المجموعة الكاملة من قيم ألوان Tailwind CSS ككائن `tailwindColors` يغطي جميع عائلات الألوان الـ 22 (من الأردواز إلى الوردي) بظلال من 50 إلى 950، بالإضافة إلى خريطة `opacities` من 5% إلى 95%.
