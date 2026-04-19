---
id: survey-endpoints
title: "Surveys API Endpoints"
sidebar_label: "Surveys API Endpoints"
---

# Enquêtes API-eindpunten

De Enquêtes-API biedt volledige CRUD-bewerkingen voor enquêtes en het verzamelen van reacties. Enquêtes kunnen **globaal** (sitebreed) of **itemspecifiek** zijn en ondersteunen de levenscyclusstatussen concept/gepubliceerd/gesloten.

**Bronbestanden:**
- `template/app/api/surveys/route.ts`
- `template/app/api/surveys/[surveyId]/route.ts`
- `template/app/api/surveys/[surveyId]/responses/route.ts`
- `template/app/api/surveys/responses/[responseId]/route.ts`

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| GET | `/api/surveys` | Optioneel | Enquêtes ophalen met filters |
| POST | `/api/surveys` | Beheerder | Een nieuwe enquête aanmaken |
| GET | `/api/surveys/{surveyId}` | Voorwaardelijk | Een enkele enquête ophalen op ID of slug |
| PUT | `/api/surveys/{surveyId}` | Beheerder | Een enquête bijwerken |
| DELETE | `/api/surveys/{surveyId}` | Beheerder | Een enquête verwijderen |
| GET | `/api/surveys/{surveyId}/responses` | Beheerder | Reacties voor een enquête weergeven |
| POST | `/api/surveys/{surveyId}/responses` | Optioneel | Een reactie indienen |
| GET | `/api/surveys/responses/{responseId}` | Beheerder | Een enkele reactie ophalen |

---

## GET `/api/surveys`

Haalt een gepagineerde lijst van enquêtes op met optioneel filteren. De beschikbaarheid van de database wordt gecontroleerd voor de verwerking.

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|----------|---------|-------------|
| `type` | `"global"` of `"item"` | Nee | -- | Filteren op enquêtetype |
| `itemId` | string | Nee | -- | Filteren op bijbehorend item-ID |
| `status` | `"draft"`, `"published"` of `"closed"` | Nee | -- | Filteren op status |
| `page` | integer | Nee | 1 | Paginanummer (minimaal 1) |
| `limit` | integer | Nee | 10 | Items per pagina (1-100) |

### Reactievorm

#### 200 -- Enquêtes opgehaald

```json
{
  "success": true,
  "data": {
    "surveys": [
      {
        "id": "survey_abc123",
        "title": "User Satisfaction Survey",
        "type": "global",
        "status": "published",
        "surveyJson": { "questions": [] }
      }
    ],
    "total": 25,
    "totalPages": 3,
    "page": 1
  }
}
```

### Foutafhandeling

Het eindpunt heeft speciale afhandeling voor veelvoorkomende databasefouten:

- **Verbindingsfouten** (ontbrekende `DATABASE_URL`, geweigerde verbindingen) geven **503** terug met een beschrijvend bericht.
- **Schemafouten** (ontbrekende tabellen/relaties) geven **503** terug met de suggestie dat migraties moeten worden uitgevoerd.
- Andere fouten geven **500** terug.

---

## POST `/api/surveys`

Maakt een nieuwe enquête aan. **Vereist beheerdersauthenticatie.**

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `title` | string | **Ja** | Titel van de enquête |
| `description` | string | Nee | Beschrijving van de enquête |
| `type` | `"global"` of `"item"` | **Ja** | Type enquête |
| `itemId` | string | Nee | Bijbehorend item-ID (voor enquêtes van het type item) |
| `status` | `"draft"`, `"published"` of `"closed"` | Nee | Beginstatus |
| `surveyJson` | object | **Ja** | Enquêtedefinitie (vragen, structuur) |

### Reactie: 201 Aangemaakt

```json
{
  "success": true,
  "data": {
    "id": "survey_new123",
    "title": "New Survey",
    "type": "global",
    "status": "draft",
    "surveyJson": { "questions": [] }
  }
}
```

---

## GET `/api/surveys/{surveyId}`

Haalt een enkele enquête op op basis van het ID of de slug. Niet-gepubliceerde enquêtes zijn alleen zichtbaar voor beheerders.

### Toegangscontrolelogica

```ts
// Gepubliceerde enquêtes zijn voor iedereen zichtbaar
if (survey.status !== 'published') {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { success: false, error: 'Survey not found' },
      { status: 404 }
    );
  }
}
```

Het eindpunt probeert eerst op te zoeken op ID, en valt daarna terug op opzoeken op slug.

### Reactie: 404 Niet gevonden

Wordt teruggegeven wanneer de enquête niet bestaat OF wanneer een niet-beheerder een niet-gepubliceerde enquête opvraagt:

```json
{
  "success": false,
  "error": "Survey not found"
}
```

---

## PUT `/api/surveys/{surveyId}`

Werkt een bestaande enquête bij. **Vereist beheerdersauthenticatie.** De afhandelaar lost eerst de enquête op via ID of slug voordat updates worden toegepast.

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `title` | string | Nee | Bijgewerkte titel |
| `description` | string | Nee | Bijgewerkte beschrijving |
| `status` | `"draft"`, `"published"` of `"closed"` | Nee | Bijgewerkte status |
| `surveyJson` | object | Nee | Bijgewerkte enquêtedefinitie |

### Reactie: 200 Bijgewerkt

```json
{
  "success": true,
  "data": { "id": "survey_abc", "title": "Updated Title" },
  "message": "Survey updated successfully"
}
```

---

## DELETE `/api/surveys/{surveyId}`

Verwijdert een enquête permanent. **Vereist beheerdersauthenticatie.**

### Reactie: 200 Verwijderd

```json
{
  "success": true,
  "data": null,
  "message": "Survey deleted successfully"
}
```

---

## GET `/api/surveys/{surveyId}/responses`

Haalt gepagineerde reacties op voor een specifieke enquête. **Vereist beheerdersauthenticatie.**

### Queryparameters

| Parameter | Type | Vereist | Beschrijving |
|-----------|------|----------|-------------|
| `itemId` | string | Nee | Reacties filteren op item-ID |
| `userId` | string | Nee | Reacties filteren op gebruikers-ID |
| `startDate` | string (datum) | Nee | Reacties filteren vanaf deze datum |
| `endDate` | string (datum) | Nee | Reacties filteren tot deze datum |
| `page` | integer | Nee | Paginanummer |
| `limit` | integer | Nee | Items per pagina |

### Reactie: 200

```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "id": "resp_123",
        "surveyId": "survey_abc",
        "userId": "user_456",
        "itemId": null,
        "data": { "q1": "answer1" },
        "completedAt": "2024-01-20T10:30:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 42,
    "totalPages": 5
  }
}
```

---

## POST `/api/surveys/{surveyId}/responses`

Dient een reactie in op een gepubliceerde enquête. Authenticatie is **optioneel** -- anonieme inzendingen worden ondersteund. Het eindpunt legt IP-adres- en user agent-metadata vast.

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `data` | object | **Ja** | Reactiegegevens van de enquête (antwoorden) |

### Hoe metadata wordt vastgelegd

```ts
const forwardedFor = request.headers.get('x-forwarded-for') || '';
const ipAddress =
  (forwardedFor.split(',')[0]?.trim()) ||
  request.headers.get('x-real-ip') ||
  'unknown';

const userAgent = request.headers.get('user-agent') || 'unknown';
```

### Reactie: 201 Aangemaakt

```json
{
  "success": true,
  "data": {
    "id": "resp_new123",
    "surveyId": "survey_abc",
    "data": { "q1": "my answer" },
    "completedAt": "2024-01-20T10:30:00.000Z"
  },
  "message": "Response submitted successfully"
}
```

#### 400 -- Ongeldige body

```json
{
  "success": false,
  "error": "Invalid request body: \"data\" is required"
}
```

---

## GET `/api/surveys/responses/{responseId}`

Haalt een enkele enquêtereactie op via het ID. **Vereist beheerdersauthenticatie.**

### Reactie: 200

```json
{
  "success": true,
  "data": {
    "id": "resp_123",
    "surveyId": "survey_abc",
    "userId": "user_456",
    "data": { "q1": "answer1" },
    "completedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Gerelateerde bronbestanden

| Bestand | Doel |
|------|---------|
| `template/app/api/surveys/route.ts` | Enquêtes weergeven en aanmaken |
| `template/app/api/surveys/[surveyId]/route.ts` | CRUD voor enkelvoudige enquête |
| `template/app/api/surveys/[surveyId]/responses/route.ts` | Enquêtereacties weergeven en indienen |
| `template/app/api/surveys/responses/[responseId]/route.ts` | Ophalen van enkelvoudige reactie |
| `template/lib/services/survey.service.ts` | Bedrijfslogica voor enquêtes |
| `template/lib/types/survey.ts` | TypeScript-typen en -interfaces |
