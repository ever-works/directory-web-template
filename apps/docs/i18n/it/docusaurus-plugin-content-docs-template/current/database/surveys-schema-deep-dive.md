---
id: surveys-schema-deep-dive
title: "Approfondimento sullo schema dei sondaggi"
sidebar_label: "Schema dei sondaggi"
sidebar_position: 57
---

# Approfondimento sullo schema dei sondaggi

## Panoramica

Il modulo sondaggi fornisce un sistema di sondaggio flessibile con due tipi di tabelle: `surveys` per le definizioni del sondaggio e `survey_responses` per le risposte raccolte. I sondaggi possono essere globali (a livello di sito) o specifici per elemento. La struttura del sondaggio viene archiviata come BLOB JSON (`surveyJson`) utilizzando il tipo di colonna JSONB, consentendo schemi di domande dinamici senza una modellazione rigida del database.

**File sorgente:** `template/lib/db/schema.ts`

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

## Tabella: `survey_responses`

Memorizza le risposte dei singoli utenti ai sondaggi. I dati di risposta vengono archiviati come BLOB JSONB.

### Colonne

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No|`crypto.randomUUID()`|Chiave primaria|
|`surveyId`|`survey_id`|`text`|No| - |FK -> `surveys.id` (LIMITATO)|
|`userId`|`user_id`|`text`|Sì| - |FK -> `users.id` (SET NULL)|
|`itemId`|`item_id`|`text`|Sì| - |Slug del contesto dell'elemento|
|`data`|`data`|`jsonb`|No| - |Risposte di risposta|
|`completedAt`|`completed_at`|`timestamp (tz)`|No| - |Al termine dell'utente|
|`ipAddress`|`ip_address`|`text`|Sì| - |IP del mittente|
|`userAgent`|`user_agent`|`text`|Sì| - |Agente utente del browser|
|`createdAt`|`created_at`|`timestamp (tz)`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|No|`now()`| - |

### Chiavi esterne

|Colonna|Riferimenti|All'eliminazione|
|---|---|---|
|`surveyId`|`surveys.id`|LIMITARE|
|`userId`|`users.id`|IMPOSTA NULL|

:::info CANCELLA Comportamento
La chiave esterna `surveyId` utilizza `RESTRICT` (non `CASCADE`), il che significa che un sondaggio non può essere eliminato finché contiene risposte. Ciò protegge i dati di risposta dalla perdita accidentale. Utilizza invece l'eliminazione temporanea (`deletedAt`) nel sondaggio.

La chiave esterna `userId` utilizza `SET NULL`, preservando i dati di risposta anonimi anche quando un account utente viene eliminato.
:::

### Indici

|Nome|Colonne|Digitare|
|---|---|---|
|`survey_responses_survey_id_idx`|`surveyId`|B-albero|
|`survey_responses_user_id_idx`|`userId`|B-albero|
|`survey_responses_item_id_idx`|`itemId`|B-albero|
|`survey_responses_completed_at_idx`|`completedAt`|B-albero|

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

## Diagramma delle relazioni

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

## La colonna `surveyJson`

La colonna `surveyJson` JSONB memorizza la definizione completa del sondaggio. Questo è uno schema flessibile che può rappresentare vari tipi di domande:

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
    title: "Sondaggio sulla soddisfazione degli utenti 2025",
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
        title: sondaggi.titolo,
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

## Note di progettazione

- **JSONB per flessibilità.** L'utilizzo di `surveyJson` e `data` come colonne JSONB consente al sistema di sondaggio di supportare qualsiasi tipo di domanda senza migrazioni di schemi. Il compromesso è un'indipendenza dai tipi meno rigorosa a livello di database.
- **LIMITATA all'eliminazione.** I sondaggi con risposte non possono essere eliminati definitivamente. Utilizza invece la colonna di eliminazione temporanea `deletedAt`.
- **Risposte anonime supportate.** `userId` su `survey_responses` è annullabile e utilizza `SET NULL` per l'eliminazione, consentendo l'invio di sondaggi sia autenticati che anonimi.
- **Contesto dell'elemento.** Il campo `itemId` su entrambe le tabelle consente sondaggi specifici dell'elemento (ad esempio, "Valuta questo strumento") mantenendo lo schema sufficientemente generico per i sondaggi globali.
