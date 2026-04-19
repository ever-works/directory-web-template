---
id: surveys-schema-deep-dive
title: "Дълбоко потапяне в схемата на проучванията"
sidebar_label: "Схема на анкетите"
sidebar_position: 57
---

# Дълбоко потапяне в схемата на проучванията

## Преглед

Модулът за анкети предоставя гъвкава система за анкети с два типа таблици: `surveys` за дефиниции на анкети и `survey_responses` за събрани отговори. Проучванията могат да бъдат глобални (за целия сайт) или специфични за артикул. Структурата на проучването се съхранява като JSON blob (`surveyJson`), като се използва тип колона JSONB, което позволява динамични схеми на въпроси без твърдо моделиране на база данни.

**Изходен файл:** `template/lib/db/schema.ts`

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

## Таблица: `survey_responses`

Съхранява индивидуалните потребителски отговори на анкети. Данните за отговор се съхраняват като JSONB blob.

### Колони

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|не|`crypto.randomUUID()`|Първичен ключ|
|`surveyId`|`survey_id`|`text`|не| - |FK -> `surveys.id` (ОГРАНИЧЕНИЕ)|
|`userId`|`user_id`|`text`|да| - |FK -> `users.id` (SET NULL)|
|`itemId`|`item_id`|`text`|да| - |Контекст на елемент|
|`data`|`data`|`jsonb`|не| - |Отговорни отговори|
|`completedAt`|`completed_at`|`timestamp (tz)`|не| - |Когато потребителят приключи|
|`ipAddress`|`ip_address`|`text`|да| - |IP на подателя|
|`userAgent`|`user_agent`|`text`|да| - |Потребителски агент на браузъра|
|`createdAt`|`created_at`|`timestamp (tz)`|не|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|не|`now()`| - |

### Чужди ключове

|Колона|Референции|При изтриване|
|---|---|---|
|`surveyId`|`surveys.id`|ОГРАНИЧАВАНЕ|
|`userId`|`users.id`|SET NULL|

:::info Изтриване на поведение
Външният ключ `surveyId` използва `RESTRICT` (не `CASCADE`), което означава, че анкета не може да бъде изтрита, докато има отговори. Това предпазва данните за отговор от случайна загуба. Вместо това използвайте soft-delete (`deletedAt`) в анкетата.

Външният ключ `userId` използва `SET NULL`, като запазва анонимни данни за отговор дори когато потребителски акаунт е изтрит.
:::

### Индекси

|Име|Колони|Тип|
|---|---|---|
|`survey_responses_survey_id_idx`|`surveyId`|B-дърво|
|`survey_responses_user_id_idx`|`userId`|B-дърво|
|`survey_responses_item_id_idx`|`itemId`|B-дърво|
|`survey_responses_completed_at_idx`|`completedAt`|B-дърво|

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

## Диаграма на отношенията

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

## Колоната `surveyJson`

Колоната `surveyJson` JSONB съхранява пълната дефиниция на проучването. Това е гъвкава схема, която може да представя различни типове въпроси:

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
    title: „Проучване на удовлетвореността на потребителите 2025 г.“,
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

## Бележки по дизайна

- **JSONB за гъвкавост.** Използването на `surveyJson` и `data` като JSONB колони позволява на системата за проучване да поддържа всеки тип въпрос без миграции на схеми. Компромисът е по-малко стриктна безопасност на типа на ниво база данни.
- **ОГРАНИЧЕНИЕ на изтриването.** Проучванията с отговори не могат да бъдат изтрити твърдо. Вместо това използвайте колоната за меко изтриване `deletedAt`.
- **Поддържат се анонимни отговори.** `userId` на `survey_responses` е nullable и използва `SET NULL` при изтриване, което позволява както удостоверени, така и анонимни изпращания на анкети.
- **Контекст на артикула.** Полето `itemId` в двете таблици позволява проучвания за конкретни артикули (напр. „Оценете този инструмент“), като същевременно запазва схемата достатъчно обща за глобални проучвания.
