---
id: surveys
title: מערכת סקרים
sidebar_label: סקרים
sidebar_position: 11
---

# מערכת סקרים

תבנית Ever Works כוללת מערכת סקרים מובנית התומכת הן בסקרים גלובליים (משוב לכל האתר) והן בסקרים ספציפיים לפריט (מצורף לפריטי ספרייה בודדים). הסקרים מנוהלים דרך לוח המחוונים של הניהול והתגובות נאספות ממשתמשים מאומתים.

## אדריכלות

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## סוגי סקרים

| הקלד | תיאור | מקרה שימוש |
|------|----------------|--------|
| **גלובלי** | סקר כלל-אתר, לא קשור לאף פריט | משוב כללי, סקרי NPS, שביעות רצון משתמשים |
| **ספציפי לפריט** | מקושר לפריט ספציפי באמצעות `itemId` | משוב על מוצר, סקירות שירות, בקשות לתכונות |

## שירות סקר

המחלקה `SurveyService` ( `lib/services/survey.service.ts` ) מטפלת בכל ההיגיון העסקי. זהו שירות בצד השרת בלבד (אין לייבא ברכיבי לקוח).

### פעולות CRUD

| שיטה | תיאור |
|--------|----------------|
| `create(data)` | צור סקר חדש עם slug שנוצר אוטומטית |
| `getOne(id)` | קבל סקר לפי תעודת זהות |
| `getBySlug(slug)` | קבל סקר על ידי שבלול ידידותי לכתובות אתרים |
| `getMany(filters?, userId?)` | רשימת סקרים עם סטטוס עימוד, סינון והשלמה |
| `update(id, data)` | עדכן שדות סקר וטפל במעברי סטטוס |
| `delete(id)` | מחק סקר (חסום אם קיימות תגובות) |

### פעולות תגובה

| שיטה | תיאור |
|--------|----------------|
| `submitResponse(data)` | שלח תגובת סקר (מאמת שהסקר פורסם) |
| `getResponses(surveyId, filters?)` | קבל תשובות מעומדות לסקר |
| `getResponseById(id)` | קבל תגובה אחת |

### דור שבלולים

שבלולים של סקר נוצרים אוטומטית מהכותרת עם תמיכה ב-Unicode:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

השירות מבטיח יחודיות של הקלעים על ידי הוספת מונה אם מתגלה התנגשות.

## מחזור חיי הסקר

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| סטטוס | תיאור |
|--------|----------------|
| `draft` | הסקר עובר עריכה, לא גלוי למשתמשים |
| `published` | הסקר חי ומקבל תגובות |
| `closed` | הסקר אינו מקבל יותר תגובות |

מעברי סטטוס עדכון חותמות זמן של מטא נתונים:

- הגדרת המצב ל- `published` קובע `publishedAt` - הגדרת המצב ל- `closed` קובע `closedAt` ## מבנה נתוני הסקר

סקרים משתמשים בהגדרת שאלה מבוססת JSON המאוחסנת בעמודה `surveyJson` . זה מאפשר מבני סקרים גמישים ללא שינויי סכימה.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### מבנה תגובת הסקר

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## ניהול אדמין

דפי הסקר לניהול מספקים ממשק ניהול מחזור חיים מלא:

### מסלולי ניהול

| מסלול | תיאור |
|-------|-------------|
| `/admin/surveys` | רישום סקר עם כרטיסיות סטטוס |
| `/admin/surveys/create` | טופס יצירת סקר חדש |
| `/admin/surveys/[slug]/edit` | ערוך סקר קיים |
| `/admin/surveys/[slug]/preview` | תצוגה מקדימה של סקר לפני פרסום |
| `/admin/surveys/[slug]/responses` | הצג ונתח תגובות |

### יכולות ניהול

- **צור סקרים** עם כותרת, תיאור, סוג ושאלה JSON
- **ערוך סקרים** במצב טיוטה או פורסם
- **תצוגה מקדימה** לפני הפרסום כדי לאמת את המראה
- **פרסם/סגור** סקרים כדי לשלוט באיסוף התגובות
- **הצג תגובות** עם סינון ועימוד
- **מחק סקרים** (רק אם לא נאספו תשובות)

שיטת `getMany` תומכת בשאילתה יעילה עם:

- **ספירת תגובות** באמצעות SQL JOIN (שאילתה בודדת, ללא N+1)
- **סטטוס השלמה** לכל משתמש (מציג אם המשתמש הנוכחי כבר הגיב)
- **Pgination** עם פרמטרים של עמוד/מגבלה
- **סינון** לפי סטטוס וסוג

## טיפול בשגיאות

השירות כולל טיפול בשגיאות חזק עבור בעיות נפוצות במסד הנתונים:

| מצב שגיאה | התנהגות |
|----------------|--------|
| הטבלה לא נמצאה | הודעה ברורה: "הפעל העברות של מסד נתונים" |
| חיבור סירב | "חיבור מסד הנתונים נכשל" |
| DATABASE_URL חסר | "מסד נתונים לא מוגדר" |
| הסקר לא נמצא | שגיאה בסגנון 404 |
| הסקר לא פורסם | "הסקר הוא [סטטוס] ואינו מקבל תגובות" |
| מחק עם תגובות | "לא ניתן למחוק סקר עם N תגובות" |

## דגלי תכונה

הסקרים נשלטים על ידי מערכת דגלי התכונות. הדגל `surveys` מופעל אוטומטית כאשר `DATABASE_URL` מוגדר:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## שימוש בצד הלקוח

רכיבי לקוח משתמשים במעטפת הלקוח של API במקום בשירות ישירות:

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## בדיקת E2E

סקרים מכוסים על ידי מספר קובצי בדיקה של E2E:

- `e2e/tests/admin/surveys.spec.ts` -- זרימות עבודה לניהול ניהול
- `e2e/tests/public/surveys.spec.ts` -- תצוגה והגשה של סקר ציבורי
- `e2e/page-objects/admin/surveys.page.ts` -- אובייקט דף סקר מנהל מערכת

## קבצים קשורים

- `lib/services/survey.service.ts` -- שירות לוגיקה עסקית
- `lib/db/schema.ts` -- `surveys` ו- `survey_responses` הגדרות טבלה
- `lib/db/queries/` -- שאילתות מסד נתונים של סקר
- `lib/types/survey.ts` -- הגדרות סוג TypeScript
- `lib/api/survey-api.client.ts` -- מעטפת API בצד הלקוח
- `app/[locale]/admin/surveys/` -- דפי ניהול
- `components/admin/` -- רכיבי ממשק משתמש לניהול
- `e2e/tests/admin/surveys.spec.ts` -- בדיקות Admin E2E
- `e2e/tests/public/surveys.spec.ts` -- בדיקות E2E ציבוריות
