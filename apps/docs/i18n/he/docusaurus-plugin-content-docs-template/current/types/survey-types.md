---
id: survey-types
title: הגדרות סוג הסקר
sidebar_label: סוגי סקרים
sidebar_position: 6
---

# הגדרות סוג הסקר

**מקור:** `lib/types/survey.ts`

מודול זה מגדיר את כל הגדרות הסוג המשותפות עבור סקרים ותשובות לסקר. הוא משמש כמקור האמת היחיד עבור מבני נתונים הקשורים לסקר המשמשים את שירות הסקר, לקוח ה-API של הסקר ומטפלי נתיב ה-API.

## תקצירים

### `SurveyTypeEnum`

מגדיר אם סקר חל באופן גלובלי או בהיקף של פריט ספציפי.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|ערך|תיאור|
|-------|-------------|
|`GLOBAL`|הסקר מופיע בכל האתר, לא קשור לאף פריט ספציפי|
|`ITEM`|הסקר משויך לפריט ספציפי (דרך `itemId`)|

### `SurveyStatusEnum`

מצבי מחזור חיים עבור סקר.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|ערך|תיאור|
|-------|-------------|
|`DRAFT`|הסקר נמצא בתהליך יצירה/עריכה ואינו גלוי למשיבים|
|`PUBLISHED`|הסקר הוא חי ומקבל תגובות|
|`CLOSED`|הסקר כבר לא מקבל תגובות אבל הנתונים נשמרים|

## ממשקים

### `CreateSurveyData`

הנתונים הנדרשים ליצירת סקר חדש.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}
```

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`title`|`string`|כן|הצגת כותרת הסקר|
|`description`|`string`|לא|אופציונלי תיאור/כותרת משנה|
|`type`|`SurveyTypeEnum`|כן|האם הסקר הוא גלובלי או בהיקף פריט|
|`itemId`|`string`|לא|מזהה פריט (נדרש כאשר `type` הוא `ITEM`)|
|`status`|`SurveyStatusEnum`|לא|מצב התחלתי (ברירת המחדל היא `DRAFT`)|
|`surveyJson`|`any`|כן|הגדרת JSON תואמת Survey.js|

### `UpdateSurveyData`

נתונים לעדכון סקר קיים. כל השדות הם אופציונליים.

```typescript
interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}
```

### `SubmitResponseData`

נתונים להגשת תגובת סקר ממשיב.

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}
```

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`surveyId`|`string`|כן|מזהה הסקר שעליו נענה|
|`userId`|`string`|לא|מזהה משתמש מאומת (ריק עבור אנונימי)|
|`itemId`|`string`|לא|הקשר של פריט עבור סקרים בהיקף פריט|
|`data`|`any`|כן|אובייקט נתוני תגובה Survey.js|
|`ipAddress`|`string`|לא|IP של המשיב לניתוח/ביטול כפילויות|
|`userAgent`|`string`|לא|מחרוזת סוכן משתמש בדפדפן|

### `SurveyFilters`

מסננים לשאילתת סקרים בנקודות קצה של רשימה.

```typescript
interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}
```

### `ResponseFilters`

מסננים לשאילתת תשובות לסקר.

```typescript
interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`itemId`|`string?`|סנן תגובות לפי פריט|
|`userId`|`string?`|סנן תגובות לפי משתמש|
|`startDate`|`string?`|מחרוזת תאריך ISO לתחילת הטווח|
|`endDate`|`string?`|מחרוזת תאריך ISO עבור סוף טווח|
|`page`|`number?`|מספר עמוד עימוד|
|`limit`|`number?`|תוצאות לכל עמוד|

## דוגמאות לשימוש

### יצירת סקר גלובלי

```typescript
import type { CreateSurveyData } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const surveyData: CreateSurveyData = {
  title: 'User Satisfaction Survey',
  description: 'Help us improve by sharing your experience',
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.DRAFT,
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you with our platform?',
            rateMin: 1,
            rateMax: 5,
          },
          {
            type: 'comment',
            name: 'feedback',
            title: 'Any additional feedback?',
          },
        ],
      },
    ],
  },
};
```

### יצירת סקר בהיקף פריט

```typescript
import { SurveyTypeEnum } from '@/lib/types/survey';

const itemSurvey: CreateSurveyData = {
  title: 'Product Review',
  type: SurveyTypeEnum.ITEM,
  itemId: 'my-tool-slug',
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'quality',
            title: 'Rate this product',
          },
        ],
      },
    ],
  },
};
```

### סינון סקרים

```typescript
import type { SurveyFilters } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const filters: SurveyFilters = {
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.PUBLISHED,
  page: 1,
  limit: 10,
};
```

### הגשת תגובה

```typescript
import type { SubmitResponseData } from '@/lib/types/survey';

const response: SubmitResponseData = {
  surveyId: 'survey-uuid-123',
  userId: 'user-uuid-456',
  data: {
    satisfaction: 4,
    feedback: 'The platform is easy to use!',
  },
};
```

### סינון תגובות לפי טווח תאריכים

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## הערות עיצוב

### שילוב Survey.js

השדה `surveyJson` משתמש בסוג `any` כדי לקבל הגדרות Survey.js JSON. Survey.js היא ספריית צד שלישי המגדירה סקרים כאובייקטי JSON המתארים דפים, אלמנטים ותצורתם. התבנית מאחסנת את ה-JSON הזה כפי שהוא ומציגה אותו באמצעות רכיב Survey.js React.

### מחזור חיים של סקר

1. **טיוטה** - הסקר נוצר וניתן לערוך אותו באופן חופשי
2. **פורסם** - הסקר בשידור חי; ניתן להגיש תגובות
3. **סגור** - הסקר מפסיק לקבל תגובות; הנתונים הקיימים נשמרים

### סקרים גלובליים לעומת פריטים

- **סקרים גלובליים** (`SurveyTypeEnum.GLOBAL`) מופיעים בכל האתר ואינם קשורים לאף פריט
- **סקרי פריט** (`SurveyTypeEnum.ITEM`) מוצגים בדפי פרטי פריט ספציפיים ודורשים `itemId`

השדה `ItemData.showSurveys` (מ`item.ts`) שולט אם קטע הסקרים יוצג בדף פריט.

## סוגים קשורים

- [`ItemData.showSurveys`](./item-types.md) - שולט בנראות הסקר לכל פריט
- [`ItemData.action`](./item-types.md) - הפעולה `'start-survey'` מקשרת לסקר
