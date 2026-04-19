---
id: surveys-schema-deep-dive
title: "Aprofundamento do esquema de pesquisas"
sidebar_label: "Esquema de pesquisas"
sidebar_position: 57
---

# Aprofundamento do esquema de pesquisas

## Visão geral

O módulo de pesquisas fornece um sistema de pesquisa flexível com dois tipos de tabela: `surveys` para definições de pesquisa e `survey_responses` para respostas coletadas. As pesquisas podem ser globais (em todo o site) ou específicas de um item. A estrutura da pesquisa é armazenada como um blob JSON (`surveyJson`) usando o tipo de coluna JSONB, permitindo esquemas de perguntas dinâmicos sem modelagem rígida de banco de dados.

**Arquivo fonte:** `template/lib/db/schema.ts`

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

Armazena respostas individuais de usuários a pesquisas. Os dados de resposta são armazenados como um blob JSONB.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`crypto.randomUUID()`|Chave Primária|
|`surveyId`|`survey_id`|`text`|Não| - |FK -> `surveys.id` (RESTRITO)|
|`userId`|`user_id`|`text`|Sim| - |FK -> `users.id` (DEFINIR NULO)|
|`itemId`|`item_id`|`text`|Sim| - |Slug de contexto do item|
|`data`|`data`|`jsonb`|Não| - |Respostas de resposta|
|`completedAt`|`completed_at`|`timestamp (tz)`|Não| - |Quando o usuário terminar|
|`ipAddress`|`ip_address`|`text`|Sim| - |IP do remetente|
|`userAgent`|`user_agent`|`text`|Sim| - |Agente de usuário do navegador|
|`createdAt`|`created_at`|`timestamp (tz)`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Não|`now()`| - |

### Chaves Estrangeiras

|Coluna|Referências|Ao excluir|
|---|---|---|
|`surveyId`|`surveys.id`|RESTRITO|
|`userId`|`users.id`|DEFINIR NULO|

:::info DELETE Comportamento
A chave estrangeira `surveyId` usa `RESTRICT` (não `CASCADE`), o que significa que uma pesquisa não pode ser excluída enquanto tiver respostas. Isso protege os dados de resposta contra perdas acidentais. Use exclusão reversível (`deletedAt`) na pesquisa.

A chave estrangeira `userId` usa `SET NULL`, preservando dados de resposta anônima mesmo quando uma conta de usuário é excluída.
:::

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`survey_responses_survey_id_idx`|`surveyId`|Árvore B|
|`survey_responses_user_id_idx`|`userId`|Árvore B|
|`survey_responses_item_id_idx`|`itemId`|Árvore B|
|`survey_responses_completed_at_idx`|`completedAt`|Árvore B|

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

## Diagrama de Relações

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

## A coluna `surveyJson`

A coluna `surveyJson` JSONB armazena a definição completa da pesquisa. Este é um esquema flexível que pode representar vários tipos de perguntas:

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
    title: 'Pesquisa de Satisfação do Usuário 2025',
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
        title: pesquisas.title,
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

## Notas de projeto

- **JSONB para flexibilidade.** Usar `surveyJson` e `data` como colunas JSONB permite que o sistema de pesquisa ofereça suporte a qualquer tipo de pergunta sem migrações de esquema. A compensação é uma segurança de tipo menos rigorosa no nível do banco de dados.
- **RESTRITAR na exclusão.** As pesquisas com respostas não podem ser excluídas permanentemente. Use a coluna de exclusão reversível `deletedAt`.
- **Respostas anônimas suportadas.** O `userId` em `survey_responses` é anulável e usa `SET NULL` na exclusão, permitindo envios de pesquisas autenticados e anônimos.
- **Contexto do item.** O campo `itemId` em ambas as tabelas permite pesquisas específicas do item (por exemplo, "Avaliar esta ferramenta"), mantendo o esquema genérico o suficiente para pesquisas globais.
