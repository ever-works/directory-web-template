---
id: locale-detection
title: זיהוי שפה וניתוב
sidebar_label: זיהוי שפה
sidebar_position: 3
---

# זיהוי שפה וניתוב

התבנית משתמשת ב-`next-intl` לזיהוי שפה עם התאמת דפדפן אוטומטית, ניתוב מבוסס-URL, שמירה בעוגיות ומערכת הודעות גיבוי.

## תהליך הזיהוי

כאשר בקשה מגיעה, שפה נקבעת כך:

1. **קידומת URL** — אם ה-URL מכיל קידומת שפה (לדוגמה `/fr/about`), שפה זו משמשת ישירות
2. **עוגייה** — אם אין קידומת URL, המערכת בודקת עוגיית שפה שהוגדרה על ידי רכיב LanguageSwitcher
3. **כותרת Accept-Language** — אם אין עוגייה, נקראת כותרת העדפות השפה של הדפדפן
4. **גיבוי** — אם לא נמצאה התאמה, משתמשים בשפת ברירת המחדל (`en`)

## קבצי מקור

| קובץ | תפקיד בזיהוי |
|------|-------------------|
| `i18n/routing.ts` | מגדיר לוקאלים נתמכים, אסטרטגיית קידומת |
| `i18n/request.ts` | מאמת שפה שזוהתה, טוען הודעות |
| `i18n/navigation.ts` | מספק Link, router, redirect עם תמיכת שפה |
| `lib/constants.ts` | מקור האמת היחיד למערכי LOCALES ו-RTL_LOCALES |
| `components/language-switcher.tsx` | מגדיר עוגיית שפה דרך router.replace |
| `app/[locale]/layout.tsx` | מאמת שפה, דוחה כתובות לא חוקיות דרך notFound() |

## תצורת ניתוב

```typescript
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
  localePrefix: "as-needed",
});
```

### אסטרטגיית קידומת

| בקשה | שפה שזוהתה | URL מוצג |
|---------|-----------------|-----------|
| `/about` | `en` | `/about` (ללא קידומת לברירת המחדל) |
| `/fr/about` | `fr` | `/fr/about` (קידומת נדרשת לשפות אחרות) |
| `/en/about` | `en` | מופנה ל-`/about` |

## לוגיקת הודעות גיבוי

- הודעות אנגלית משמשות כשכבת בסיס עם כל המפתחות
- הודעות שפה ספציפית מחליפות רק מפתחות מוגדרים
- מפתחות חסרים בקובץ שפה שומרים על ערך אנגלי
- אובייקטים מקוננים מוזגים רקורסיבית

## שמירת עוגיות

כאשר משתמש בוחר שפה דרך LanguageSwitcher, `next-intl` מגדיר עוגייה:

```typescript
const changeLanguage = useCallback(
  (locale: string) => {
    if (locale === currentLocale || isPending) return;

    startTransition(() => {
      router.replace(pathname, { locale });
    });
    setIsOpen(false);
  },
  [currentLocale, isPending, router, pathname]
);
```

## זיהוי Accept-Language

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

המערכת מחפשת התאמה במערך `LOCALES` הנתמך. השפה הראשונה שמתאימה מנצחת.

## פתרון בעיות לוקאל

| בעיה | סיבה אפשרית | פתרון |
|---------|-------------|----------|
| מפתחות תרגום במקום טקסט | מפתח חסר בקובץ שפה | הוסף מפתח ל-`messages/en.json` (גיבוי) |
| מוצגת שפה שגויה | עוגייה עוקפת URL | נקה עוגיות או השתמש במצב גלישה פרטית |
| 404 בכתובות URL של שפה | שפה לא במערך LOCALES | הוסף קוד ל-`lib/constants.ts` |
| פריסת RTL לא מוחלת | שפה לא ב-RTL_LOCALES | הוסף ל-`RTL_LOCALES` ב-`lib/constants.ts` |

## שיטות עבודה מומלצות

1. **תמיד השתמש ב-`Link` מ-`@/i18n/navigation`** במקום `next/link`
2. **הוסף את כל המפתחות החדשים תחילה ל-`en.json`** שכן זו שפת הגיבוי
3. **בדוק את הזיהוי** על ידי הגדרת העדפות שפה בדפדפן
4. **הסתמך על גיבוי `deepmerge`** — קבצים מתורגמים חלקית צפויים ומטופלים
