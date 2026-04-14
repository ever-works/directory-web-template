---
id: survey-queries-deep-dive
title: Enquêtevragen Deep Dive
sidebar_label: Enquêtevragen Deep Dive
sidebar_position: 68
---

# Enquêtevragen Deep Dive

Uitgebreid naslagwerk voor alle enquêtegerelateerde databasequeryfuncties, inclusief enquête-CRUD, responsbeheer, paginering, filtering en responstelling.

## Overzicht

De enquêtequerylaag beheert enquêtes en hun antwoorden:

- **`survey.queries.ts`** -- CRUD voor volledige enquête met zachte verwijdering, gepagineerde lijst met filters, aantal reacties en voltooiingsstatus JOIN's, CRUD voor enquêtereacties met datumbereikfiltering en telling van reacties

Enquêtes ondersteunen twee typen: `global` (voor de hele site) en `item` (gekoppeld aan een specifiek item). Reacties zijn gekoppeld aan zowel een enquête als optioneel een item, waardoor feedback per item kan worden verzameld.

## Bronbestand

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

Haalt een enquête op via de URL-slug, met optionele uitsluiting van een specifieke enquête-ID (handig voor validatie van de uniciteit tijdens updates).

```typescript
async function getSurveyBySlug(
  slug: string,
  ignoreId?: string
): Promise<Survey | null>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|------------|----------|----------|-------------------------------------------|
|`slug`|`string`|Ja|Onderzoeksslak|
|`ignoreId`|`string`|Nee|Enquête-ID die moet worden uitgesloten van de zoekopdracht|

**Retourzendingen:** Enquête of `null` indien niet gevonden

**SQL-patroon:**

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

Creëert een nieuwe enquête.

```typescript
async function createSurvey(survey: NewSurvey): Promise<Survey>
```

**Retouren:** Het aangemaakte onderzoeksrecord (via `RETURNING`)

**SQL-patroon:**

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

Zacht verwijdert een onderzoek door `deletedAt` in te stellen op de huidige tijdstempel.

```typescript
async function deleteSurvey(id: string): Promise<void>
```

**SQL-patroon:**

```sql
UPDATE surveys SET deleted_at = NOW() WHERE id = ?;
```

**Opmerking:** Alle leesquery's filteren op `deleted_at IS NULL`, dus zacht verwijderde onderzoeken worden effectief verborgen voor alle ophaalfuncties.

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

Ontvangt gepagineerde enquêtereacties met optionele filtering op item, gebruiker en datumbereik.

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

**Parameters:**

|Parameter|Typ|Vereist|Standaard|Beschrijving|
|-------------|----------|----------|---------|-----------------------------------|
|`surveyId`|`string`|Ja| --      |Enquête-ID waarvoor antwoorden moeten worden ontvangen|
|`itemId`|`string`|Nee| --      |Filter op artikel|
|`userId`|`string`|Nee| --      |Filter op gebruiker|
|`startDate`|`string`|Nee| --      |Filter reacties na deze datum|
|`endDate`|`string`|Nee| --      |Filter reacties vóór deze datum|
|`page`|`number`|Nee| `1`     |Paginanummer|
|`limit`|`number`|Nee| `10`    |Resultaten per pagina|

**Retourzendingen:** Gepagineerde antwoordlijst

**SQL-patroon:**

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

**Prestatie-opmerkingen:** Gegevens- en telquery's worden parallel uitgevoerd via `Promise.all`.

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

Krijgt het totale aantal reacties voor een enquête.

```typescript
async function getSurveyResponseCount(
  surveyId: string
): Promise<number>
```

**Retouren:** Het antwoord telt als een getal

**SQL-patroon:**

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
