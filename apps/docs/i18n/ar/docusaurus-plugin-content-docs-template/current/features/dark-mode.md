---
id: dark-mode
title: الوضع الداكن وتبديل السمات
sidebar_label: الوضع المظلم
sidebar_position: 25
---

# الوضع الداكن وتبديل السمات

يدعم القالب نظام سمات مزدوج الطبقة: **الوضع الداكن/الفاتح** مدعوم من `next-themes` ، و**سمات الألوان** (على سبيل المثال، Everworks، Corporate، Material، Funny) تتم إدارتها من خلال `LayoutThemeContext` مخصص. يعمل كلا النظامين معًا - يعمل الوضع المظلم على تبديل نظام الألوان، بينما تعمل سمات الألوان على تغيير اللوحات الأساسية والثانوية واللوحات المميزة.

## نظرة عامة على الهندسة المعمارية

```
components/
  theme-toggler.tsx                     -- Dark/light mode toggle component
  context/LayoutThemeContext.tsx         -- Color theme context and provider
  settings-modal.tsx                    -- Full settings modal (includes theme)

hooks/
  use-theme.ts                          -- Theme metadata and helpers

lib/
  themes.tsx                            -- Theme preview components
  theme-color-manager.ts               -- CSS variable application
  theme-utils.ts                        -- Theme utility functions
```

## تبديل الوضع الداكن / الفاتح

يستخدم المكون 0 في 1 2 للتبديل بين الوضعين الداكن والفاتح:

```tsx
// components/theme-toggler.tsx
import { useTheme } from "next-themes";

export function ThemeToggler({ compact, openUp, iconOnly }: ThemeTogglerProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  // Icon-only mode: single toggle button
  if (iconOnly) {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </button>
    );
  }

  // Compact mode: pill-style toggle switch
  if (compact) {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="relative h-10 w-20 rounded-full ..."
      >
        <span className={`transform rounded-full ${theme === "dark" ? "translate-x-11" : "translate-x-1"}`}>
          {theme === "dark" ? <Moon /> : <Sun />}
        </span>
      </button>
    );
  }

  // Default: dropdown with Light/Dark options
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        {theme === "light" ? <Sun /> : <Moon />}
      </button>
      {isOpen && (
        <div className="absolute bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl ...">
          <button onClick={() => handleThemeChange("light")}>
            <Sun /> Light
          </button>
          <button onClick={() => handleThemeChange("dark")}>
            <Moon /> Dark
          </button>
        </div>
      )}
    </div>
  );
}
```

### متغيرات المكونات

| الدعامة | السلوك |
|------|----------|
| `iconOnly` | زر تبديل واحد (رمز الشمس/القمر)، يستخدم في الرأس |
| `compact` | مفتاح على شكل حبوب منع الحمل للاستخدام المضمن |
| الافتراضي | القائمة المنسدلة مع خيارات الضوء والظلام |

### سلامة الترطيب

يعود المكون حتى بعد التثبيت (حالة 3) لمنع عدم تطابق الترطيب بين الخادم والعميل، نظرًا لأن السمة تعتمد على 4 أو تفضيلات النظام المتوفرة فقط على العميل.

### إمكانية الوصول

- `aria-label` على أزرار التبديل تصف الحالة المستهدفة
- 6 و 7 على مشغل القائمة المنسدلة
- مفتاح الهروب يغلق القائمة المنسدلة
- تستخدم تلميحات أدوات التركيز والتحويم 8 لتجنب مشكلات التخطيط

### التدويل

تستخدم التسميات ترجمات `next-intl` :

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## نظام موضوع اللون

### تكوين الموضوع

يتم تعريف سمات الألوان في `components/context/LayoutThemeContext.tsx` :

```tsx
// components/context/LayoutThemeContext.tsx
export type ThemeKey = "everworks" | "corporate" | "material" | "funny";

export const THEME_CONFIGS: Record<ThemeKey, ThemeConfig> = {
  everworks: {
    primary: "#0070f3",
    secondary: "#00c853",
    accent: "#0056b3",
    background: "#ffffff",
    surface: "#f8f9fa",
    text: "#1a1a1a",
    textSecondary: "#6c757d",
  },
  corporate: {
    primary: "#2c3e50",
    secondary: "#e74c3c",
    accent: "#34495e",
    // ...
  },
  material: {
    primary: "#673ab7",
    secondary: "#ff9800",
    accent: "#9c27b0",
    // ...
  },
  funny: {
    primary: "#ff4081",
    secondary: "#ffeb3b",
    accent: "#e91e63",
    // ...
  },
};
```

### خصائص CSS المخصصة

عند تحديد سمة لون، يتم تطبيق خصائص CSS المخصصة على `document.documentElement` :

```tsx
const CSS_VARIABLES = {
  "--theme-primary": "primary",
  "--theme-secondary": "secondary",
  "--theme-accent": "accent",
  "--theme-background": "background",
  "--theme-surface": "surface",
  "--theme-text": "text",
  "--theme-text-secondary": "textSecondary",
};

const applyThemeVariables = (theme: ThemeConfig) => {
  const root = document.documentElement;
  Object.entries(CSS_VARIABLES).forEach(([cssVar, configKey]) => {
    root.style.setProperty(cssVar, theme[configKey]);
  });
};
```

تشير المكونات إلى هذه المتغيرات عبر فئات Tailwind مثل `text-theme-primary` ، `bg-theme-accent` ، وما إلى ذلك.

### ثبات الموضوع

يستمر اختيار السمة حتى `localStorage` ويتم ترطيبها على الحامل:

```tsx
const useThemeManager = () => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>("everworks");

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem('themeKey');
    if (saved && isValidThemeKey(saved)) {
      setThemeKeyState(saved);
    }
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    safeLocalStorage.setItem('themeKey', key);
    applyThemeWithPalettes(key);
  }, []);
};
```

يعالج المجمّع الأخطاء بأمان (على سبيل المثال، عندما يكون التخزين المحلي معطلاً أو ممتلئًا).

### إنشاء لوحة السمات

تقوم الدالة 1 من 2 بإنشاء لوحة ألوان كاملة (ظلال من 50 إلى 950) من كل لون أساسي وتطبيقها كمتغيرات CSS. وهذا يتيح فئات مثل `bg-theme-primary-100` و `text-theme-primary-800` .

## استخدام الموضوع هوك

يوفر الخطاف 5 بيانات تعريف السمة والإجراءات الخاصة بواجهة مستخدم الإعدادات:

```tsx
// hooks/use-theme.ts
export const useTheme = () => {
  const { themeKey, setThemeKey, currentTheme } = useLayoutTheme();

  const currentThemeInfo = useMemo(() => THEME_INFO[themeKey], [themeKey]);
  const availableThemes = useMemo(() => Object.values(THEME_INFO), []);

  const changeTheme = useCallback((newThemeKey: ThemeKey) => {
    if (newThemeKey === themeKey) return;
    setThemeKey(newThemeKey);
  }, [themeKey, setThemeKey]);

  return {
    themeKey,
    currentTheme,
    currentThemeInfo,
    availableThemes,
    changeTheme,
    isThemeActive,
    getThemeInfo,
  };
};
```

تشتمل الخريطة 0 على تسميات وأوصاف يمكن قراءتها بواسطة الإنسان:

```tsx
export const THEME_INFO: Record<ThemeKey, ThemeInfo> = {
  everworks: {
    key: "everworks",
    label: "Default",
    description: "Modern and professional theme with blue and green accents",
    colors: { primary: "#3d70ef", secondary: "#00c853", accent: "#0056b3", ... },
  },
  corporate: {
    key: "corporate",
    label: "Corporate",
    description: "Professional business theme with dark gray and red accents",
    colors: { ... },
  },
  // ...
};
```

## الوضع المظلم في CSS

يستخدم القالب وضع Tailwind CSS المظلم مع الإستراتيجية `class` . يتم تطبيق المتغيرات الداكنة باستخدام البادئة `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

يضيف الموفر فئة 1 إلى العنصر 2 عندما يكون الوضع المظلم نشطًا.

## الكشف عن تفضيلات النظام

3 يكتشف تلقائيًا تفضيل نظام ألوان النظام عبر استعلام الوسائط. يمكن للمستخدمين تجاوز هذا من خلال تحديد ضوء أو داكن صريح، والذي يستمر في 5 تحت المفتاح 6.

## نقاط التكامل

يتصل نظام السمات بعدة أجزاء من التطبيق:

| مكون | التكامل |
|-----------|------------|
| `ThemeToggler` | تبديل الرأس والتذييل إلى اللون الداكن/الفاتح |
| 8ـ | واجهة المستخدم الكاملة لاختيار السمة في لوحة الإعدادات العائمة |
| `LayoutThemeProvider` | يلتف حول شجرة التطبيق، ويدير جميع تفضيلات واجهة المستخدم |
| `ContainerWidthProvider` | متداخل داخل LayoutThemeProvider لعرض الحاوية |

## مرجع الملف

| ملف | الغرض |
|------|---------|
| `components/theme-toggler.tsx` | تبديل الوضع الداكن/الفاتح (3 أنواع) |
| ‹‹١٢› | سياق سمة اللون، مزامنة متغير CSS، التخزين المحلي |
| 13 ــ | البيانات التعريفية للموضوع، والموضوعات المتاحة، ومعالج التغيير |
| 14 ــ | مكونات معاينة السمة لواجهة مستخدم الإعدادات |
| `lib/theme-color-manager.ts` | إنشاء لوحة كاملة وتطبيق متغير CSS |
| 16 ــ | وظائف فائدة الموضوع |
