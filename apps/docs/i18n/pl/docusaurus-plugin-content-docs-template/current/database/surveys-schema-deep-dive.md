---
id: surveys-schema-deep-dive
title: "Głębokie nurkowanie w schemacie ankiet"
sidebar_label: "Schemat ankiet"
sidebar_position: 57
---

# Głębokie nurkowanie w schemacie ankiet

## Przegląd

Moduł ankiet zapewnia elastyczny system ankiet z dwoma typami tabel: `surveys` dla definicji ankiet i `survey_responses` dla zebranych odpowiedzi. Ankiety mogą mieć charakter globalny (obejmujący całą witrynę) lub dotyczący konkretnego elementu. Struktura ankiety jest przechowywana w postaci obiektu blob JSON (`surveyJson`) przy użyciu typu kolumny JSONB, co pozwala na dynamiczne schematy pytań bez sztywnego modelowania bazy danych.

**Plik źródłowy:** `template/lib/db/schema.ts`

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

## Tabela: `survey_responses`

Przechowuje indywidualne odpowiedzi użytkowników na ankiety. Dane odpowiedzi są przechowywane jako obiekt blob JSONB.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`crypto.randomUUID()`|Klucz podstawowy|
|`surveyId`|`survey_id`|`text`|Nie| - |FK -> `surveys.id` (OGRANICZ)|
|`userId`|`user_id`|`text`|Tak| - |FK -> `users.id` (USTAW NULL)|
|`itemId`|`item_id`|`text`|Tak| - |Błąd kontekstu elementu|
|`data`|`data`|`jsonb`|Nie| - |Odpowiedzi na pytania|
|`completedAt`|`completed_at`|`timestamp (tz)`|Nie| - |Kiedy użytkownik skończył|
|`ipAddress`|`ip_address`|`text`|Tak| - |Adres IP nadawcy|
|`userAgent`|`user_agent`|`text`|Tak| - |Agent użytkownika przeglądarki|
|`createdAt`|`created_at`|`timestamp (tz)`|Nie|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Nie|`now()`| - |

### Klucze obce

|Kolumna|Referencje|Przy usuwaniu|
|---|---|---|
|`surveyId`|`surveys.id`|OGRANICZ|
|`userId`|`users.id`|USTAW NULL|

:::info USUŃ Zachowanie
Klucz obcy `surveyId` wykorzystuje `RESTRICT` (a nie `CASCADE`), co oznacza, że ankiety nie można usunąć, dopóki zawiera ona odpowiedzi. Chroni to dane odpowiedzi przed przypadkową utratą. Zamiast tego użyj w ankiecie usuwania nietrwałego (`deletedAt`).

Klucz obcy `userId` wykorzystuje `SET NULL`, zachowując anonimowe dane odpowiedzi nawet w przypadku usunięcia konta użytkownika.
:::

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`survey_responses_survey_id_idx`|`surveyId`|Drzewo B|
|`survey_responses_user_id_idx`|`userId`|Drzewo B|
|`survey_responses_item_id_idx`|`itemId`|Drzewo B|
|`survey_responses_completed_at_idx`|`completedAt`|Drzewo B|

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

## Schemat relacji

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

## Kolumna `surveyJson`

Kolumna `surveyJson` JSONB przechowuje pełną definicję ankiety. Jest to elastyczny schemat, który może reprezentować różne typy pytań:

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
    title: „Badanie Satysfakcji Użytkowników 2025”,
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
        title: ankiety.title,
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

## Uwagi do projektu

- **JSONB zapewniający elastyczność.** Użycie `surveyJson` i `data` jako kolumn JSONB umożliwia systemowi ankiet obsługę dowolnego typu pytań bez migracji schematu. Kompromisem jest mniej rygorystyczne bezpieczeństwo typów na poziomie bazy danych.
- **OGRANICZ przy usuwaniu.** Ankiet zawierających odpowiedzi nie można trwale usunąć. Zamiast tego użyj kolumny miękkiego usuwania `deletedAt`.
- **Obsługiwane są odpowiedzi anonimowe.** Wartość `userId` w `survey_responses` dopuszcza wartość null, a przy usuwaniu używa `SET NULL`, co pozwala na przesyłanie ankiet zarówno uwierzytelnionych, jak i anonimowych.
- **Kontekst pozycji.** Pole `itemId` w obu tabelach umożliwia przeprowadzanie ankiet dotyczących konkretnych pozycji (np. „Oceń to narzędzie”), zachowując jednocześnie schemat wystarczająco ogólny dla ankiet globalnych.
