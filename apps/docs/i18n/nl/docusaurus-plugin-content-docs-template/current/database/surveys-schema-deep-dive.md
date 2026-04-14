---
id: surveys-schema-deep-dive
title: "Enquêtesschema Deep Dive"
sidebar_label: "Enquêtesschema"
sidebar_position: 57
---

# Enquêtesschema Deep Dive

## Overzicht

De enquêtemodule biedt een flexibel enquêtesysteem met twee tabeltypen: `surveys` voor enquêtedefinities en `survey_responses` voor verzamelde antwoorden. Enquêtes kunnen globaal (site-wide) of itemspecifiek zijn. De enquêtestructuur wordt opgeslagen als een JSON-blob (`surveyJson`) met behulp van het JSONB-kolomtype, waardoor dynamische vraagschema's mogelijk zijn zonder rigide databasemodellering.

**Bronbestand:** `template/lib/db/schema.ts`

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

## Tabel: `survey_responses`

Slaat individuele gebruikersreacties op enquêtes op. Antwoordgegevens worden opgeslagen als een JSONB-blob.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`crypto.randomUUID()`|Primaire sleutel|
|`surveyId`|`survey_id`|`text`|Nee| - |FK -> `surveys.id` (BEPERKEN)|
|`userId`|`user_id`|`text`|Ja| - |FK -> `users.id` (SET NULL)|
|`itemId`|`item_id`|`text`|Ja| - |Itemcontextslug|
|`data`|`data`|`jsonb`|Nee| - |Reactie antwoorden|
|`completedAt`|`completed_at`|`timestamp (tz)`|Nee| - |Wanneer de gebruiker klaar is|
|`ipAddress`|`ip_address`|`text`|Ja| - |IP van indiener|
|`userAgent`|`user_agent`|`text`|Ja| - |Browsergebruikersagent|
|`createdAt`|`created_at`|`timestamp (tz)`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Nee|`now()`| - |

### Buitenlandse sleutels

|Kolom|Referenties|Bij Verwijderen|
|---|---|---|
|`surveyId`|`surveys.id`|BEPERKEN|
|`userId`|`users.id`|SET NUL|

:::info DELETE Gedrag
De externe sleutel `surveyId` gebruikt `RESTRICT` (niet `CASCADE`), wat betekent dat een enquête niet kan worden verwijderd zolang er reacties op zijn. Dit beschermt responsgegevens tegen onbedoeld verlies. Gebruik in plaats daarvan zacht verwijderen (`deletedAt`) in de enquête.

De externe sleutel `userId` gebruikt `SET NULL`, waardoor anonieme antwoordgegevens bewaard blijven, zelfs wanneer een gebruikersaccount wordt verwijderd.
:::

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`survey_responses_survey_id_idx`|`surveyId`|B-boom|
|`survey_responses_user_id_idx`|`userId`|B-boom|
|`survey_responses_item_id_idx`|`itemId`|B-boom|
|`survey_responses_completed_at_idx`|`completedAt`|B-boom|

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

## Relatiediagram

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

## De `surveyJson` kolom

In de JSONB-kolom `surveyJson` wordt de volledige onderzoeksdefinitie opgeslagen. Dit is een flexibel schema dat verschillende vraagtypen kan vertegenwoordigen:

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
    title: 'Gebruikerstevredenheidsonderzoek 2025',
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
        title: enquêtes.title,
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

## Ontwerpnotities

- **JSONB voor flexibiliteit.** Door `surveyJson` en `data` als JSONB-kolommen te gebruiken, kan het enquêtesysteem elk vraagtype ondersteunen zonder schemamigraties. De wisselwerking is een minder strikte typeveiligheid op databaseniveau.
- **BEPERKEN bij verwijderen.** Enquêtes met reacties kunnen niet permanent worden verwijderd. Gebruik in plaats daarvan de kolom `deletedAt` voor zacht verwijderen.
- **Anonieme reacties worden ondersteund.** De `userId` op `survey_responses` is nullable en gebruikt `SET NULL` bij verwijderen, waardoor zowel geverifieerde als anonieme enquête-inzendingen mogelijk zijn.
- **Itemcontext.** Het veld `itemId` in beide tabellen maakt itemspecifieke onderzoeken mogelijk (bijvoorbeeld 'Beoordeel deze tool'), terwijl het schema generiek genoeg blijft voor mondiale onderzoeken.
