---
id: theme-system-deep-dive
title: "מערכת נושאים Deep Dive"
sidebar_label: "מערכת נושאים Deep Dive"
sidebar_position: 46
---

# מערכת נושאים Deep Dive

## סקירה כללית

מערכת ערכת הנושא מספקת תשתית ערכת נושא מקיפה ורב-שכבתית המניעה לוחות צבעים דינמיים, קביעות מוכנות מראש של ערכות נושא, מחלקות שירות CSS ומטא-נתונים של ערכת נושא עבור בוררי ממשק משתמש. הוא משתרע על פני שלושה מודולים: `theme-color-manager.ts` עבור יישום פלטת זמן ריצה, `theme-utils.ts` עבור מחלקות שירות Tailwind ופונקציות עוזר, ו-`themes.tsx` עבור הגדרות ערכת נושא עם רכיבי תצוגה מקדימה של React.

## אדריכלות

מערכת העיצוב מונחת על גבי [מחולל הצבע](./color-generator-system) ונצרכת על ידי `LayoutThemeContext`:

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

כל שלושת המודולים מתייחסים ל-@@TOK000@@@ ו-`ThemeConfig` מ-`@/components/context/LayoutThemeContext`, מה שמבטיח עקביות סוג בכל מערכת הנושא.

### ערכות נושא זמינות

|מפתח|תווית|ראשוני|משני|
|-----|-------|---------|-----------|
|`everworks`|ברירת מחדל|`#3d70ef`|`#00c853`|
|`corporate`|תאגידי|`#00c853`|`#e74c3c`|
|`material`|חומר|`#673ab7`|`#ff9800`|
|`funny`|מצחיק|`#ff4081`|`#ffeb3b`|

## הפניה ל-API

### ייצוא מ-`lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

השלם תצורות צבע עבור כל נושא, כולל ערכים ראשיים, משני, מבטא, רקע, משטח, טקסט וטקסט.

#### `applyColorPalette(colorName: string, baseColor: string): void`

יוצר פלטה מלאה מ-`baseColor` ומחיל אותה על `document.documentElement` כמאפייני CSS מותאמים אישית. גם מגדיר משתנה `-rgb` לתמיכה באטימות.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

מחיל ערכת נושא שלם על ידי קריאה ל-`applyColorPalette()` עבור צבעים ראשוניים, משניים והדגשה, בתוספת הגדרת משתני רקע, משטח וטקסט. נופל בחזרה ל-`everworks` אם העיצוב שצוין נכשל.

#### `generateThemeCss(themeKey: ThemeKey): string`

יוצר מחרוזת CSS המכילה את כל הצהרות המאפיינים המותאמות אישית עבור ערכת נושא, המתאימה להזרקה לתג או גיליון סגנונות `<style>`.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

מעטפת פשוטה שקוראת ל-`applyThemeWithPalettes()` בצד הלקוח (בודקת `typeof window`). מתאים לשימוש באפקטים של React.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

מחיל צבעים שרירותיים (לא מתוך ערכות נושא מוגדרות מראש) על ידי יצירת פלטות עבור כל צבע שסופק.

#### `previewThemeColors(baseColor: string): void`

כלי ניפוי באגים שמתעד את כל גווני הצבעים לקונסולה עם רקעים צבעוניים לבדיקה ויזואלית.

### ייצוא מ-`lib/theme-utils.ts`

#### `themeClasses`

מפות מחלקות Tailwind CSS מובנות מראש, מאורגנות לפי סוג רכיב:

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

אובייקט התייחסות מלא ללוח הצבעים של Tailwind CSS המכיל את כל הצבעים הסטנדרטיים (צפחה, אפור, אבץ, ניטרלי, אבן, אדום, כתום, ענבר, צהוב, ליים, ירוק, אמרלד, צהבהב, ציאן, שמיים, כחול, אינדיגו, סגול, סגול, פוקסיה, ורוד, ורד) עם גוונים 50 עד 950.

#### `opacities`

מפה של ערכי אטימות מ-5 עד 95 כעשרונים של מחרוזת.

#### `animationClasses`

שילובי כיתות אנימציה מובנים מראש: `fadeIn`, `slideIn`, `scaleIn`, `hover`, `press`.

#### `responsiveClasses`

שיעורי פריסה רספונסיביים בנויים מראש: `container`, `grid.responsive`, `grid.auto`, `flex.center`, `flex.between`, `flex.start`.

#### `getCssVariable(name: string): string`

מחזירה מחרוזת התייחסות למשתנה CSS `var(--name)`.

#### `withOpacity(colorClass: string, opacity: number | string): string`

מוסיף משנה אטימות Tailwind למחלקה (למשל, `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

מחזירה את ערך צבע הhex עבור ערכת נושא וסוג צבע ספציפיים.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

מחזירה אובייקט עם `--theme-primary` ו-`--theme-secondary` ערכי מאפיין CSS עבור ערכת נושא.

#### `cn(...classes: (string | undefined | null | false)[]): string`

כלי עזר להצטרפות מותנית של שמות מחלקות, סינון ערכים כוזבים.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

משלב מחלקות בסיס, מחלקות נושא ומחלקות מותנות למחרוזת מחלקה אחת.

#### `THEME_PRESETS`

רשומות קבועות מראש פשוטות של שני צבעים עבור כל מקש ערכת נושא (ראשי + משני בלבד).

### ייצוא מ-`lib/themes.tsx`

#### `ThemeMetadata` (ממשק)

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

רכיבי תגובה המציגים תמונות ממוזערות צבעוניות קטנות עבור כל ערכת נושא.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

מטא נתונים של ערכת נושא ללא תצורה, כולל תוויות, תיאורים ורכיבי תצוגה מקדימה.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

ממזג הגדרות ערכת נושא עם תצורה כדי לייצר מטא נתונים מלאים.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

מחזירה מערך של מטא נתונים של ערכות נושא עבור כל ערכות הנושא, שימושי לעיבוד בוררי ערכות נושא.

## פרטי יישום

**מניפולציה של DOM**: `applyColorPalette()` משנה ישירות את `document.documentElement.style` כדי להגדיר מאפייני CSS מותאמים אישית. זה מאפשר החלפת נושא מיידית ללא טעינת עמוד מחדש.

**משתנה RGB לאטימות**: כל פלטת צבעים מגדירה גם משתנה `--{name}-rgb` המכיל ערכי RGB מופרדים בפסיקים (למשל, `59, 130, 246`), המאפשר שימוש `rgba()` עם אטימות ב-CSS.

**אסטרטגיית החזרה**: `applyThemeWithPalettes()` תופס שגיאות ונופל חזרה לנושא `everworks`. אם אפילו ה-fallback נכשל, הוא רושם את השגיאה ויוצא בחן.

**הגדרות קבועות מראש בלתי ניתנות לשינוי**: `THEME_PRESETS` ו-`EXTENDED_THEME_CONFIGS` מוכרזים `as const` כדי למנוע מוטציה מקרית.

## תצורה

בחירת הנושא מנוהלת על ידי ההקשר `LayoutThemeContext` React. ארבעת ערכות הנושא המובנות מוגדרות ישירות ב-`EXTENDED_THEME_CONFIGS`. ניתן להחיל ערכות נושא מותאמות אישית בזמן ריצה באמצעות `applyCustomTheme()`.

## דוגמאות לשימוש

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

## שיטות עבודה מומלצות

- השתמש ב-`themeClasses` מ-`theme-utils.ts` לעיצוב עקבי של רכיבים במקום לכתוב שיעורים מודעים לנושא באופן ידני.
- החל תמיד ערכות נושא דרך `applyThemeWithPalettes()` כדי להבטיח שכל לוחות הצבעים (ראשוני, משני, מבטא) ומשתנים שאינם פלטות (רקע, משטח, טקסט) מוגדרים יחד.
- השתמש ב-`generateThemeCss()` לעיבוד בצד השרת כדי למנוע הבזק של תוכן לא מעוצב לפני ש-JavaScript בצד הלקוח יחיל את ערכת הנושא.
- בעת הוספת ערכת נושא חדשה, עדכן את כל שלושת הקבצים: `EXTENDED_THEME_CONFIGS` ב-`theme-color-manager.ts`, `THEME_PRESETS` ב-`theme-utils.ts`, ו-`THEME_DEFINITIONS` ב-`themes.tsx`.
- השתמש בכלי השירות `cn()` להרכב כיתה מותנה כדי לשמור על JSX נקי וקריא.

## מודולים קשורים

- [מערכת מחולל צבע](./color-generator-system) - בסיס מתמטי ליצירת פלטות
- [מערכת צבע](/template/architecture/color-system) -- סקירה כללית של מערכת צבע ברמה גבוהה יותר
