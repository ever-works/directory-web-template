---
id: surveys-schema-deep-dive
title: "Umfragen Schema Deep Dive"
sidebar_label: "Umfrageschema"
sidebar_position: 57
---

# Umfragen Schema Deep Dive

## Übersicht

Das Umfragemodul bietet ein flexibles Umfragesystem mit zwei Tabellentypen: `surveys` für Umfragedefinitionen und `survey_responses` für gesammelte Antworten. Umfragen können entweder global (standortweit) oder artikelspezifisch sein. Die Umfragestruktur wird als JSON-Blob (`surveyJson`) unter Verwendung des JSONB-Spaltentyps gespeichert, was dynamische Frageschemata ohne starre Datenbankmodellierung ermöglicht.

**Quelldatei:** `template/lib/db/schema.ts`

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

## Tabelle: `survey_responses`

Speichert individuelle Benutzerantworten auf Umfragen. Antwortdaten werden als JSONB-Blob gespeichert.

### Spalten

|Spalte|DB-Name|Typ|Nullbar|Standard|Einschränkungen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nein|`crypto.randomUUID()`|Primärschlüssel|
|`surveyId`|`survey_id`|`text`|Nein| - |FK -> `surveys.id` (EINSCHRÄNKEN)|
|`userId`|`user_id`|`text`|Ja| - |FK -> `users.id` (SET NULL)|
|`itemId`|`item_id`|`text`|Ja| - |Elementkontext-Slug|
|`data`|`data`|`jsonb`|Nein| - |Antwortantworten|
|`completedAt`|`completed_at`|`timestamp (tz)`|Nein| - |Wenn der Benutzer fertig ist|
|`ipAddress`|`ip_address`|`text`|Ja| - |Einsender-IP|
|`userAgent`|`user_agent`|`text`|Ja| - |Browser-Benutzeragent|
|`createdAt`|`created_at`|`timestamp (tz)`|Nein|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Nein|`now()`| - |

### Fremdschlüssel

|Spalte|Referenzen|Beim Löschen|
|---|---|---|
|`surveyId`|`surveys.id`|EINSCHRÄNKEN|
|`userId`|`users.id`|NULL SETZEN|

:::info DELETE-Verhalten
Der Fremdschlüssel `surveyId` verwendet `RESTRICT` (nicht `CASCADE`), was bedeutet, dass eine Umfrage nicht gelöscht werden kann, solange sie Antworten enthält. Dadurch werden Antwortdaten vor versehentlichem Verlust geschützt. Verwenden Sie stattdessen das vorläufige Löschen (`deletedAt`) für die Umfrage.

Der Fremdschlüssel `userId` verwendet `SET NULL` und behält anonyme Antwortdaten bei, selbst wenn ein Benutzerkonto gelöscht wird.
:::

### Indizes

|Name|Spalten|Typ|
|---|---|---|
|`survey_responses_survey_id_idx`|`surveyId`|B-Baum|
|`survey_responses_user_id_idx`|`userId`|B-Baum|
|`survey_responses_item_id_idx`|`itemId`|B-Baum|
|`survey_responses_completed_at_idx`|`completedAt`|B-Baum|

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

## Beziehungsdiagramm

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

## Die Spalte `surveyJson`

In der JSONB-Spalte `surveyJson` wird die vollständige Umfragedefinition gespeichert. Dabei handelt es sich um ein flexibles Schema, das verschiedene Fragetypen darstellen kann:

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
    title: „Umfrage zur Nutzerzufriedenheit 2025“,
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
        title: Umfragen.Titel,
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

## Designhinweise

- **JSONB für Flexibilität.** Durch die Verwendung von `surveyJson` und `data` als JSONB-Spalten kann das Umfragesystem jeden Fragetyp ohne Schemamigrationen unterstützen. Der Kompromiss besteht in einer weniger strengen Typsicherheit auf Datenbankebene.
- **BESCHRÄNKUNG beim Löschen.** Umfragen mit Antworten können nicht endgültig gelöscht werden. Verwenden Sie stattdessen die Spalte „`deletedAt` Soft-Delete“.
- **Anonyme Antworten werden unterstützt.** Das `userId` auf `survey_responses` ist nullbar und verwendet beim Löschen `SET NULL`, was sowohl authentifizierte als auch anonyme Umfrageeinreichungen ermöglicht.
- **Artikelkontext.** Das Feld `itemId` in beiden Tabellen ermöglicht artikelspezifische Umfragen (z. B. „Dieses Tool bewerten“), während das Schema generisch genug für globale Umfragen bleibt.
