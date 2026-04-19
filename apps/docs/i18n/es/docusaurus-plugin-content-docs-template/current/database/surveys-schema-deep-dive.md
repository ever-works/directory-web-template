---
id: surveys-schema-deep-dive
title: "Análisis profundo del esquema de encuestas"
sidebar_label: "Esquema de encuestas"
sidebar_position: 57
---

# Análisis profundo del esquema de encuestas

## Descripción general

El módulo de encuestas proporciona un sistema de encuestas flexible con dos tipos de tablas: `surveys` para definiciones de encuestas y `survey_responses` para respuestas recopiladas. Las encuestas pueden ser globales (para todo el sitio) o específicas de cada elemento. La estructura de la encuesta se almacena como un blob JSON (`surveyJson`) utilizando el tipo de columna JSONB, lo que permite esquemas de preguntas dinámicos sin un modelado rígido de bases de datos.

**Archivo fuente:** `template/lib/db/schema.ts`

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

## Tabla: `survey_responses`

Almacena las respuestas de los usuarios individuales a las encuestas. Los datos de respuesta se almacenan como un blob JSONB.

### columnas

|columna|Nombre de base de datos|Tipo|Anulable|Predeterminado|Restricciones|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No|`crypto.randomUUID()`|Clave primaria|
|`surveyId`|`survey_id`|`text`|No| - |FK -> `surveys.id` (RESTRICCIÓN)|
|`userId`|`user_id`|`text`|si| - |FK -> `users.id` (ESTABLECER NULO)|
|`itemId`|`item_id`|`text`|si| - |Slug de contexto del elemento|
|`data`|`data`|`jsonb`|No| - |Respuestas de respuesta|
|`completedAt`|`completed_at`|`timestamp (tz)`|No| - |Cuando el usuario terminó|
|`ipAddress`|`ip_address`|`text`|si| - |IP del remitente|
|`userAgent`|`user_agent`|`text`|si| - |Agente de usuario del navegador|
|`createdAt`|`created_at`|`timestamp (tz)`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|No|`now()`| - |

### Claves foráneas

|columna|Referencias|Al eliminar|
|---|---|---|
|`surveyId`|`surveys.id`|RESTRINGIR|
|`userId`|`users.id`|ESTABLECER NULO|

:::info BORRAR Comportamiento
La clave externa `surveyId` usa `RESTRICT` (no `CASCADE`), lo que significa que una encuesta no se puede eliminar mientras tenga respuestas. Esto protege los datos de respuesta contra pérdidas accidentales. Utilice la eliminación temporal (`deletedAt`) en la encuesta.

La clave externa `userId` utiliza `SET NULL`, preservando los datos de respuesta anónimos incluso cuando se elimina una cuenta de usuario.
:::

### Índices

|Nombre|columnas|Tipo|
|---|---|---|
|`survey_responses_survey_id_idx`|`surveyId`|árbol B|
|`survey_responses_user_id_idx`|`userId`|árbol B|
|`survey_responses_item_id_idx`|`itemId`|árbol B|
|`survey_responses_completed_at_idx`|`completedAt`|árbol B|

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

## Diagrama de relaciones

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

## La columna `surveyJson`

La columna `surveyJson` JSONB almacena la definición completa de la encuesta. Este es un esquema flexible que puede representar varios tipos de preguntas:

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
    title: 'Encuesta de Satisfacción de Usuarios 2025',
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
        title: encuestas.título,
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

## Notas de diseño

- **JSONB para mayor flexibilidad.** El uso de `surveyJson` y `data` como columnas JSONB permite que el sistema de encuestas admita cualquier tipo de pregunta sin migraciones de esquema. La contrapartida es una seguridad de tipos menos estricta a nivel de base de datos.
- **RESTRICT al eliminar.** Las encuestas con respuestas no se pueden eliminar definitivamente. Utilice la columna de eliminación temporal `deletedAt`.
- **Se admiten respuestas anónimas.** El `userId` en `survey_responses` es anulable y utiliza `SET NULL` al eliminarlo, lo que permite envíos de encuestas tanto autenticados como anónimos.
- **Contexto del elemento.** El campo `itemId` en ambas tablas habilita encuestas de elementos específicos (por ejemplo, "Califica esta herramienta") manteniendo el esquema lo suficientemente genérico para encuestas globales.
