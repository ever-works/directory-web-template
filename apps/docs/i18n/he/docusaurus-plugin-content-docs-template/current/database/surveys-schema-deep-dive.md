---
id: surveys-schema-deep-dive
title: "סקרים סכימת צלילה עמוקה"
sidebar_label: "סכימת סקרים"
sidebar_position: 57
---

# סקרים סכימת צלילה עמוקה

## סקירה כללית

מודול הסקרים מספק מערכת סקרים גמישה עם שני סוגי טבלאות: `surveys` להגדרות הסקר ו-`survey_responses` לתשובות שנאספו. סקרים יכולים להיות גלובליים (ברחבי האתר) או ספציפיים לפריט. מבנה הסקר מאוחסן כ-JSON blob (`surveyJson`) תוך שימוש בסוג העמודה JSONB, מה שמאפשר סכימות שאלות דינמיות ללא מודלים נוקשים של מסד נתונים.

**קובץ מקור:** `template/lib/db/schema.ts`

---

## Table: `surveys`

Stores survey definitions with their question structure in a JSON column.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `slug` | `slug` | `text` | No | - | Unique |
| `title` | `title` | `text` | No | - | - |
| `description` | `description` | `text` | Yes | - | - |
| `type` | `type` | `text (enum)` | No | - | `global`, `item` |
| `itemId` | `item_id` | `text` | Yes | - | Item slug (for item surveys) |
| `status` | `status` | `text (enum)` | No | `'draft'` | `draft`, `published`, `closed` |
| `surveyJson` | `survey_json` | `jsonb` | No | - | Full survey structure |
| `createdAt` | `created_at` | `timestamp (tz)` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp (tz)` | No | `now()` | - |
| `publishedAt` | `published_at` | `timestamp (tz)` | Yes | - | - |
| `closedAt` | `closed_at` | `timestamp (tz)` | Yes | - | - |
| `deletedAt` | `deleted_at` | `timestamp (tz)` | Yes | - | Soft delete |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `surveys_slug_idx` | `slug` | B-tree |
| `surveys_type_idx` | `type` | B-tree |
| `surveys_item_id_idx` | `itemId` | B-tree |
| `surveys_status_idx` | `status` | B-tree |
| `surveys_created_at_idx` | `createdAt` | B-tree |

### Survey Type Enum

| Value | Description |
|---|---|
| `global` | Site-wide survey visible to all users |
| `item` | Survey attached to a specific item (referenced by `itemId`) |

### Survey Status Enum

| Value | Description |
|---|---|
| `draft` | Not yet published, only visible to admins |
| `published` | Live and accepting responses |
| `closed` | No longer accepting responses |

---

## טבלה: `survey_responses`

מאחסן תשובות משתמש בודדות לסקרים. נתוני התגובה מאוחסנים כ-JSONB blob.

### עמודות

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`id`|`id`|`text`|לא|`crypto.randomUUID()`|מפתח ראשי|
|`surveyId`|`survey_id`|`text`|לא| - |FK -> `surveys.id` (הגבלה)|
|`userId`|`user_id`|`text`|כן| - |FK -> `users.id` (SET NULL)|
|`itemId`|`item_id`|`text`|כן| - |שבלול ההקשר של פריט|
|`data`|`data`|`jsonb`|לא| - |תשובות תשובה|
|`completedAt`|`completed_at`|`timestamp (tz)`|לא| - |כשהמשתמש סיים|
|`ipAddress`|`ip_address`|`text`|כן| - |IP של שולח|
|`userAgent`|`user_agent`|`text`|כן| - |סוכן משתמש בדפדפן|
|`createdAt`|`created_at`|`timestamp (tz)`|לא|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|לא|`now()`| - |

### מפתחות זרים

|עמודה|הפניות|על מחק|
|---|---|---|
|`surveyId`|`surveys.id`|הגבלה|
|`userId`|`users.id`|הגדר NULL|

:::מידע מחק התנהגות
המפתח הזר `surveyId` משתמש ב-`RESTRICT` (לא `CASCADE`), כלומר לא ניתן למחוק סקר בזמן שיש לו תשובות. זה מגן על נתוני תגובה מפני אובדן מקרי. השתמש ב-soft-delete (`deletedAt`) בסקר במקום זאת.

המפתח הזר `userId` משתמש ב-@@TOK001@@@, שומר על נתוני תגובה אנונימיים גם כאשר חשבון משתמש נמחק.
:::

### אינדקסים

|שם|עמודות|הקלד|
|---|---|---|
|`survey_responses_survey_id_idx`|`surveyId`|B-עץ|
|`survey_responses_user_id_idx`|`userId`|B-עץ|
|`survey_responses_item_id_idx`|`itemId`|B-עץ|
|`survey_responses_completed_at_idx`|`completedAt`|B-עץ|

---

## TypeScript Types

```typescript
export type Survey = typeof surveys.$inferSelect;

export type SurveyItem = Survey & {
    responseCount?: number;
    isCompletedByUser?: boolean;
};

export type NewSurvey = typeof surveys.$inferInsert;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;
```

---

## תרשים יחסים

```mermaid
erDiagram
    surveys ||--o{ survey_responses : "has many"
    users ||--o{ survey_responses : "submits"

    surveys {
        text id PK
        text slug UK
        text title
        text type
        text item_id
        text status
        jsonb survey_json
        timestamp published_at
        timestamp closed_at
        timestamp deleted_at
    }

    survey_responses {
        text id PK
        text survey_id FK
        text user_id FK
        text item_id
        jsonb data
        timestamp completed_at
        text ip_address
    }
```

---

## Survey Lifecycle

```mermaid
stateDiagram-v2
    [*] --> draft : Created
    draft --> published : Admin publishes
    published --> closed : Admin closes
    draft --> draft : Edit questions
    published --> published : Collect responses
    closed --> [*]
```

---

## העמודה `surveyJson`

העמודה `surveyJson` JSONB מאחסנת את הגדרת הסקר המלאה. זוהי סכמה גמישה שיכולה לייצג סוגי שאלות שונים:

```typescript
// Example surveyJson structure
{
  "pages": [
    {
      "name": "page1",
      "elements": [
        {
          "type": "rating",
          "name": "satisfaction",
          "title": "How satisfied are you?",
          "rateMin": 1,
          "rateMax": 5
        },
        {
          "type": "text",
          "name": "feedback",
          "title": "Any additional feedback?"
        },
        {
          "type": "radiogroup",
          "name": "recommend",
          "title": "Would you recommend this?",
          "choices": ["Yes", "No", "Maybe"]
        }
      ]
    }
  ]
}
```

---

## Query Examples

### Create a survey

```typescript
import { db } from '@/lib/db/drizzle';
import { surveys } from '@/lib/db/schema';

await db.insert(surveys).values({
    slug: 'user-satisfaction-2025',
    title: 'סקר שביעות רצון משתמשים 2025',
    description: 'Help us improve our platform',
    type: 'global',
    status: 'draft',
    surveyJson: {
        pages: [{
            name: 'page1',
            elements: [
                { type: 'rating', name: 'overall', title: 'Overall satisfaction' }
            ]
        }]
    },
});
```

### Publish a survey

```typescript
await db
    .update(surveys)
    .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
    })
    .where(eq(surveys.id, surveyId));
```

### Submit a response

```typescript
import { surveyResponses } from '@/lib/db/schema';

await db.insert(surveyResponses).values({
    surveyId,
    userId,
    itemId: 'specific-item-slug', // Optional, for item-type surveys
    data: {
        overall: 4,
        feedback: 'Great platform, minor UI issues',
        recommend: 'Yes',
    },
    completedAt: new Date(),
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
});
```

### Get surveys with response counts

```typescript
import { sql } from 'drizzle-orm';

const surveysWithCounts = await db
    .select({
        id: surveys.id,
        title: surveys.title,
        status: surveys.status,
        responseCount: sql<number>`(
            SELECT count(*) FROM survey_responses
            WHERE survey_responses.survey_id = surveys.id
        )`,
    })
    .from(surveys)
    .where(isNull(surveys.deletedAt))
    .orderBy(desc(surveys.createdAt));
```

### Check if user completed a survey

```typescript
const completed = await db
    .select({ id: surveyResponses.id })
    .from(surveyResponses)
    .where(
        and(
            eq(surveyResponses.surveyId, surveyId),
            eq(surveyResponses.userId, userId)
        )
    )
    .limit(1);

const hasCompleted = completed.length > 0;
```

### Get published surveys for an item

```typescript
const itemSurveys = await db
    .select()
    .from(surveys)
    .where(
        and(
            eq(surveys.type, 'item'),
            eq(surveys.itemId, 'my-item-slug'),
            eq(surveys.status, 'published'),
            isNull(surveys.deletedAt)
        )
    );
```

---

## הערות עיצוב

- **JSONB לגמישות.** שימוש ב-`surveyJson` ו-`data` כעמודות JSONB מאפשר למערכת הסקרים לתמוך בכל סוג שאלה ללא העברות סכימה. הפשרה היא בטיחות סוג פחות קפדנית ברמת מסד הנתונים.
- **הגבלה על מחיקה.** סקרים עם תשובות לא ניתנים למחיקה קשה. השתמש במקום זאת בעמודה `deletedAt` soft-delete.
- **נתמכות בתגובות אנונימיות.** ה-`userId` ב-`survey_responses` הוא ריק ומשתמש ב-`SET NULL` במחיקה, מה שמאפשר הגשת סקרים מאומתים ואנונימיים כאחד.
- **הקשר של פריט.** השדה `itemId` בשתי הטבלאות מאפשר סקרים ספציפיים לפריט (למשל, "דרג כלי זה") תוך שמירה על הסכימה כללית מספיק עבור סקרים גלובליים.
