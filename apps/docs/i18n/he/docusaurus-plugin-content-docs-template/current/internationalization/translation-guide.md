---
id: translation-guide
title: מדריך תרגום
sidebar_label: מדריך תרגום
sidebar_position: 2
---

# מדריך תרגום

מדריך זה מסביר כיצד להשתמש ולהרחיב את מערכת התרגום הרב-לשונית של Ever Works המבוססת על next-intl.

## שפות נתמכות

Ever Works תומך ביותר מ-13 שפות:

| שפה | קוד | דגל |
|----------|------|------|
| 🇬🇧 אנגלית | `en` | ברירת מחדל |
| 🇫🇷 צרפתית | `fr` | |
| 🇪🇸 ספרדית | `es` | |
| 🇩🇪 גרמנית | `de` | |
| 🇨🇳 סינית | `zh` | |
| 🇸🇦 ערבית | `ar` | תמיכת RTL |
| 🇮🇹 איטלקית | `it` | |
| 🇵🇹 פורטוגזית | `pt` | |
| 🇷🇺 רוסית | `ru` | |
| 🇳🇱 הולנדית | `nl` | |
| 🇵🇱 פולנית | `pl` | |

## שימוש

### ברכיבי React

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('help');

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

## הוספת תרגומים חדשים

### שלב 1: הוסף מפתחות באנגלית

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### שלב 2: תרגם לשפות אחרות

```json
{
  "help": {
    "NEW_SECTION_TITLE": "חלק חדש",
    "NEW_SECTION_DESC": "תיאור של החלק החדש"
  }
}
```

## מרחבי שמות לתרגום

### כללי (`common`)
- פריטי ניווט
- פעולות נפוצות (שמור, בטל, מחק)

### אימות (`auth`)
- כניסה והרשמה
- ניהול סיסמה

### עזרה (`help`)
- תוכן מרכז העזרה
- חלקי שאלות נפוצות

## שיטות עבודה מומלצות

### 1. מוסכמות שמות

```json
{
  // ✅ טוב
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ רע
  "FAQ_1": "How long does setup take?"
}
```

### 2. משתנים וסטאי מקום

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. ריבוי

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## הוספת שפה חדשה

### שלב 1: צור קובץ הודעות

```bash
cp messages/en.json messages/he.json
```

### שלב 2: עדכן תצורה

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'he'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### שלב 3: הוסף אייקון דגל

שמור קובץ SVG ב-`/public/flags/he.svg`

### שלב 4: תרגם תוכן

תרגם את כל המפתחות ב-`messages/he.json` לעברית

## כלים מומלצים

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - תוסף VS Code לניהול תרגומים
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - עורך תרגום ויזואלי
- **[Crowdin](https://crowdin.com/)** - פלטפורמת תרגום שיתופית

## רשימת תרגום לבדיקה

בעת הוספת תכונות חדשות עם טקסט:

- [ ] הוסף מפתחות באנגלית (`en.json`)
- [ ] תרגם לצרפתית (`fr.json`)
- [ ] תרגם לספרדית (`es.json`)
- [ ] תרגם לגרמנית (`de.json`)
