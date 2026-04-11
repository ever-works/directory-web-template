---
id: dark-mode
title: מצב כהה ושינוי ערכת נושא
sidebar_label: מצב כהה
sidebar_position: 25
---

# מצב כהה והחלפת ערכות נושא

התבנית תומכת במערכת נושאים דו-שכבתיים: **מצב כהה/אור** המופעל על ידי `next-themes` , ו-**ערכות נושא צבע** (למשל, Everworks, Corporate, Material, Funny) המנוהלים באמצעות `LayoutThemeContext` מותאם אישית. שתי המערכות פועלות יחד - מצב כהה מחליף את ערכת הצבעים, בעוד ערכות צבעים משנות את לוחות הצבעים הראשיים, המשניים והדגשים.

## סקירה כללית של אדריכלות

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

## החלפת מצב כהה/בהיר

הרכיב `ThemeToggler` ב- `components/theme-toggler.tsx` משתמש ב- `next-themes` כדי לעבור בין מצב כהה ומצב אור:

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

### וריאציות רכיבים

| פרופס | התנהגות |
|------|--------|
| `iconOnly` | לחצן החלפה בודד (סמל שמש/ירח), בשימוש בכותרת |
| `compact` | מתג בסגנון גלולות לשימוש מוטבע |
| ברירת מחדל | תפריט נפתח עם אפשרויות אור וחושך |

### בטיחות הידרציה

הרכיב מחזיר את `null` עד לאחר mount (מצב `mounted` ) כדי למנוע אי התאמה של הידרציה בין שרת ללקוח, מכיוון שהערכת נושא תלויה ב `localStorage` או בהעדפות מערכת הזמינות רק בלקוח.

### נגישות

- `aria-label` על לחצני החלפה מתאר את מצב היעד
- `aria-expanded` ו- `aria-controls` על ההדק הנפתח
- מקש Escape סוגר את התפריט הנפתח
- טיפים של מיקוד ורחף השתמשו ב- `createPortal` כדי למנוע בעיות פריסה

### בינלאומי

התוויות משתמשות ב- `next-intl` תרגומים:

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## מערכת ערכות נושא צבע

### תצורת ערכת נושא

ערכות נושא צבע מוגדרות ב- `components/context/LayoutThemeContext.tsx` :

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

### מאפייני CSS מותאמים אישית

כאשר נבחר ערכת נושא צבעונית, מאפייני CSS מותאמים אישית מוחלים על `document.documentElement` :

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

רכיבים מתייחסים למשתנים אלה באמצעות מחלקות Tailwind כמו `text-theme-primary` , `bg-theme-accent` וכו'.

### התמדה בנושא

בחירת ערכת הנושא נמשכת ל- `localStorage` ומתוך לחות על ההר:

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

העטיפה `safeLocalStorage` מטפלת בשגיאות בחן (למשל, כאשר localStorage מושבת או מלא).

### יצירת לוח נושאים

הפונקציה `applyThemeWithPalettes` מ- `lib/theme-color-manager.ts` מייצרת פלטת צבעים מלאה (גוונים 50 עד 950) מכל צבע בסיס ומחילה אותם כמשתני CSS. זה מאפשר שיעורים כמו `bg-theme-primary-100` ו- `text-theme-primary-800` .

## השתמש ב-Theme Hook

ה- `hooks/use-theme.ts` הוק מספק מטא נתונים ופעולות של נושא עבור ממשק המשתמש של ההגדרות:

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

המפה `THEME_INFO` כוללת תוויות ותיאורים הניתנים לקריאה על ידי אדם:

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

## מצב כהה ב-CSS

התבנית משתמשת במצב כהה של Tailwind CSS עם האסטרטגיה `class` . גרסאות כהות מיושמות באמצעות הקידומת `dark:` :

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

הספק `next-themes` מוסיף מחלקה `dark` לאלמנט `<html>` כאשר מצב כהה פעיל.

## איתור העדפות מערכת `next-themes` מזהה אוטומטית את העדפת ערכת הצבעים של המערכת באמצעות שאילתת מדיה `prefers-color-scheme` . משתמשים יכולים לעקוף זאת באמצעות בחירה מפורשת בהירה או כהה, שנמשכת ב- `localStorage` מתחת למקש `theme` .

## נקודות אינטגרציה

מערכת הנושא מתחברת למספר חלקים של האפליקציה:

| רכיב | אינטגרציה |
|----------------|----------------|
| `ThemeToggler` | כותרת עליונה וכותרת תחתונה כהה/בהירה |
| `SettingsModal` | ממשק משתמש לבחירת נושאים מלאה בחלונית ההגדרות הצפה |
| `LayoutThemeProvider` | עוטף את עץ האפליקציות, מנהל את כל העדפות ממשק המשתמש |
| `ContainerWidthProvider` | מקונן בתוך LayoutThemeProvider עבור רוחב מיכל |

## הפניה לקובץ

| קובץ | מטרה |
|------|--------|
| `components/theme-toggler.tsx` | החלפת מצב כהה/בהיר (3 גרסאות) |
| `components/context/LayoutThemeContext.tsx` | הקשר ערכת נושא צבע, סנכרון משתנה CSS, אחסון מקומי |
| `hooks/use-theme.ts` | מטא נתונים של ערכות נושא, ערכות נושא זמינות, מטפל בשינויים |
| `lib/themes.tsx` | רכיבי תצוגה מקדימה של ערכת נושא עבור ממשק המשתמש של ההגדרות |
| `lib/theme-color-manager.ts` | יצירת פלטות מלא ויישום משתני CSS |
| `lib/theme-utils.ts` | פונקציות שירות ערכת נושא |
