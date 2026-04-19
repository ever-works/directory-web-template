---
id: survey-queries-deep-dive
title: Requêtes d'enquête approfondies
sidebar_label: Requêtes d'enquête approfondies
sidebar_position: 68
---

# Requêtes d'enquête approfondies

Référence complète pour toutes les fonctions de requête de base de données liées aux enquêtes, y compris l'enquête CRUD, la gestion des réponses, la pagination, le filtrage et le comptage des réponses.

## Aperçu

La couche de requête d'enquête gère les enquêtes et leurs réponses :

- **`survey.queries.ts`** -- CRUD d'enquête complet avec suppression logicielle, liste paginée avec filtres, nombre de réponses et statut d'achèvement JOIN, CRUD de réponse à l'enquête avec filtrage par plage de dates et comptage des réponses

Les enquêtes prennent en charge deux types : `global` (à l'échelle du site) et `item` (associé à un élément spécifique). Les réponses sont liées à la fois à une enquête et éventuellement à un élément, permettant la collecte de commentaires par élément.

## Fichier source

```
lib/db/queries/survey.queries.ts
```

---

## Function Reference

### Survey CRUD

#### `getSurveys`

Gets surveys with filters, pagination, and optional response count / completion status enrichment.

```typescript
async function getSurveys(filters?: {
  type?: 'global' | 'item';
  itemId?: string;
  status?: 'draft' | 'published' | 'closed';
  page?: number;
  limit?: number;
  userId?: string;
  withResponseCount?: boolean;
  withCompletionStatus?: boolean;
}): Promise<{
  surveys: (Survey & { responseCount?: number; isCompletedByUser?: boolean })[];
  total: number;
  totalPages: number;
}>
```

**Parameters:**

| Parameter              | Type                                | Required | Default | Description                                      |
|------------------------|-------------------------------------|----------|---------|--------------------------------------------------|
| `type`                 | `'global'` \| `'item'`             | No       | --      | Filter by survey type                            |
| `itemId`               | `string`                            | No       | --      | Filter by associated item                        |
| `status`               | `'draft'` \| `'published'` \| `'closed'` | No | --      | Filter by survey status                          |
| `page`                 | `number`                            | No       | `1`     | Page number                                      |
| `limit`                | `number`                            | No       | `10`    | Results per page                                 |
| `userId`               | `string`                            | No       | --      | User ID for completion status check              |
| `withResponseCount`    | `boolean`                           | No       | --      | Include response count per survey                |
| `withCompletionStatus` | `boolean`                           | No       | --      | Include whether the user has completed the survey |

**Returns:** Paginated survey list with optional `responseCount` and `isCompletedByUser` fields

**SQL Pattern (with JOINs):**

When `withResponseCount` or `withCompletionStatus` is enabled, the query uses a `LEFT JOIN` with `GROUP BY`:

```sql
SELECT surveys.*,
  COUNT(survey_responses.id) as response_count,
  COUNT(CASE WHEN survey_responses.user_id = ? THEN 1 END) as is_completed
FROM surveys
LEFT JOIN survey_responses ON surveys.id = survey_responses.survey_id
WHERE surveys.deleted_at IS NULL AND ...
GROUP BY surveys.id
ORDER BY surveys.created_at DESC
LIMIT ? OFFSET ?;
```

**SQL Pattern (simple):**

When no JOINs are needed, runs data and count queries in parallel via `Promise.all`:

```sql
-- Data query
SELECT * FROM surveys
WHERE deleted_at IS NULL AND ...
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- Count query
SELECT count(*) FROM surveys
WHERE deleted_at IS NULL AND ...;
```

**Design Notes:**
- All queries exclude soft-deleted surveys (`deleted_at IS NULL`)
- The simple path (no JOINs) is used when neither `withResponseCount` nor `withCompletionStatus` is requested, avoiding unnecessary JOIN overhead
- Completion status requires both `withCompletionStatus` and `userId` to be provided

---

#### `getSurveyBySlug`

Obtient une enquête par son slug d'URL, avec exclusion facultative d'un ID d'enquête spécifique (utile pour la validation de l'unicité lors des mises à jour).

```typescript
async function getSurveyBySlug(
  slug: string,
  ignoreId?: string
): Promise<Survey | null>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|------------|----------|----------|-------------------------------------------|
|`slug`|`string`|Oui|Limace d'enquête|
|`ignoreId`|`string`|Non|ID d'enquête à exclure de la recherche|

**Retours :** Enquête ou `null` si introuvable

**Modèle SQL :**

```sql
SELECT * FROM surveys
WHERE slug = ? AND deleted_at IS NULL
  AND id != ?  -- only if ignoreId provided
LIMIT 1;
```

---

#### `getSurveyById`

Gets a survey by its ID, excluding soft-deleted records.

```typescript
async function getSurveyById(id: string): Promise<Survey | null>
```

**SQL Pattern:**

```sql
SELECT * FROM surveys
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
```

---

#### `createSurvey`

Crée une nouvelle enquête.

```typescript
async function createSurvey(survey: NewSurvey): Promise<Survey>
```

**Renvoie :** L'enregistrement d'enquête créé (via `RETURNING`)

**Modèle SQL :**

```sql
INSERT INTO surveys (...) VALUES (...) RETURNING *;
```

---

#### `updateSurvey`

Updates a survey's fields. Automatically sets `updatedAt` to the current timestamp.

```typescript
async function updateSurvey(
  id: string,
  data: Partial<Survey>
): Promise<Survey>
```

**Parameters:**

| Parameter | Type              | Required | Description           |
|-----------|-------------------|----------|-----------------------|
| `id`      | `string`          | Yes      | Survey ID             |
| `data`    | `Partial<Survey>` | Yes      | Fields to update      |

**Returns:** Updated survey record

**SQL Pattern:**

```sql
UPDATE surveys
SET ..., updated_at = NOW()
WHERE id = ?
RETURNING *;
```

---

#### `deleteSurvey`

Soft supprime une enquête en définissant `deletedAt` sur l'horodatage actuel.

```typescript
async function deleteSurvey(id: string): Promise<void>
```

**Modèle SQL :**

```sql
UPDATE surveys SET deleted_at = NOW() WHERE id = ?;
```

**Remarque :** Toutes les requêtes de lecture sont filtrées sur `deleted_at IS NULL`, de sorte que les enquêtes supprimées de manière logicielle sont effectivement masquées de toutes les fonctions de récupération.

---

### Survey Response Queries

#### `createSurveyResponse`

Creates a new survey response.

```typescript
async function createSurveyResponse(
  response: NewSurveyResponse
): Promise<SurveyResponse>
```

**Returns:** The created response record (via `RETURNING`)

**SQL Pattern:**

```sql
INSERT INTO survey_responses (...) VALUES (...) RETURNING *;
```

---

#### `getSurveyResponses`

Obtient des réponses paginées à l’enquête avec un filtrage facultatif par élément, utilisateur et plage de dates.

```typescript
async function getSurveyResponses(
  surveyId: string,
  filters?: {
    itemId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  responses: SurveyResponse[];
  total: number;
  totalPages: number;
}>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Par défaut|Descriptif|
|-------------|----------|----------|---------|-----------------------------------|
|`surveyId`|`string`|Oui| --      |ID d'enquête pour lequel obtenir des réponses|
|`itemId`|`string`|Non| --      |Filtrer par article|
|`userId`|`string`|Non| --      |Filtrer par utilisateur|
|`startDate`|`string`|Non| --      |Filtrer les réponses après cette date|
|`endDate`|`string`|Non| --      |Filtrer les réponses avant cette date|
|`page`|`number`|Non| `1`     |Numéro de page|
|`limit`|`number`|Non| `10`    |Résultats par page|

**Renvois :** Liste de réponses paginée

**Modèle SQL :**

```sql
-- Data query
SELECT * FROM survey_responses
WHERE survey_id = ?
  AND item_id = ?           -- if itemId provided
  AND user_id = ?           -- if userId provided
  AND completed_at >= ?     -- if startDate provided
  AND completed_at <= ?     -- if endDate provided
ORDER BY completed_at DESC
LIMIT ? OFFSET ?;

-- Count query (same conditions)
SELECT count(*) FROM survey_responses WHERE ...;
```

**Remarques sur les performances :** Les requêtes de données et de comptage s'exécutent en parallèle via `Promise.all`.

---

#### `getSurveyResponseById`

Gets a single survey response by ID.

```typescript
async function getSurveyResponseById(
  id: string
): Promise<SurveyResponse | null>
```

**SQL Pattern:**

```sql
SELECT * FROM survey_responses WHERE id = ? LIMIT 1;
```

---

#### `getSurveyResponseCount`

Obtient le nombre total de réponses pour une enquête.

```typescript
async function getSurveyResponseCount(
  surveyId: string
): Promise<number>
```

**Retours :** La réponse compte comme un nombre

**Modèle SQL :**

```sql
SELECT count(*) FROM survey_responses WHERE survey_id = ?;
```

---

## Performance Notes

1. **Conditional JOINs** -- `getSurveys` uses two code paths: a simple `SELECT` when no enrichment is needed, and a `LEFT JOIN` with `GROUP BY` only when `withResponseCount` or `withCompletionStatus` is requested. This avoids unnecessary JOIN overhead for basic listing.

2. **Parallel query execution** -- Both `getSurveys` (simple path) and `getSurveyResponses` run data and count queries concurrently via `Promise.all`.

3. **Soft delete consistency** -- All survey read operations consistently filter `deleted_at IS NULL`, ensuring soft-deleted surveys never appear in results.

4. **Date range filtering** -- `getSurveyResponses` converts string dates to `Date` objects before comparison, using `gte`/`lte` operators on `completedAt` for efficient range queries.

5. **Completion status via CASE** -- User completion is calculated inline using `COUNT(CASE WHEN user_id = ? THEN 1 END)`, avoiding a separate subquery or additional database round-trip.

## Usage Examples

### Listing published surveys with response counts

```typescript
import { getSurveys } from '@/lib/db/queries';

const result = await getSurveys({
  status: 'published',
  withResponseCount: true,
  page: 1,
  limit: 20,
});

result.surveys.forEach(s => {
  console.log(`${s.title}: ${s.responseCount} responses`);
});
```

### Checking if a user completed a survey

```typescript
import { getSurveys } from '@/lib/db/queries';

const result = await getSurveys({
  type: 'global',
  status: 'published',
  userId: currentUserId,
  withCompletionStatus: true,
});

const incomplete = result.surveys.filter(s => !s.isCompletedByUser);
```

### Submitting a survey response

```typescript
import { createSurveyResponse } from '@/lib/db/queries';

await createSurveyResponse({
  surveyId: survey.id,
  userId: currentUserId,
  itemId: 'clockify',  // optional, for item-specific surveys
  answers: { q1: 'Very satisfied', q2: 4 },
  completedAt: new Date(),
});
```

### Fetching responses with date filtering

```typescript
import { getSurveyResponses } from '@/lib/db/queries';

const result = await getSurveyResponses(surveyId, {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
});

console.log(`${result.total} responses in Q1 2025`);
```

### Validating slug uniqueness on update

```typescript
import { getSurveyBySlug } from '@/lib/db/queries';

const existing = await getSurveyBySlug('my-survey-slug', surveyBeingEdited.id);
if (existing) {
  throw new Error('Slug already in use by another survey');
}
```
