---
id: survey-endpoints-deep-dive
title: "Surveys API Reference"
sidebar_label: "Surveys API Reference"
---

# Enquêtes API-referentie

## Overzicht

De Enquêtes-API biedt volledige CRUD-bewerkingen voor enquêtes en hun reacties. Enquêtes kunnen globaal of itemspecifiek zijn en ondersteunen de levenscyclusstatussen concept/gepubliceerd/gesloten. Het aanmaken, bijwerken en verwijderen van enquêtes vereist beheerdersauthenticatie, terwijl openbare gebruikers gepubliceerde enquêtes kunnen bekijken en reacties kunnen indienen.

## Eindpunten

### GET /api/surveys

Enquêtes ophalen met optionele filters en paginering. Controleert de beschikbaarheid van de database voor de verwerking.

**Aanvraag**

| Parameter | Type    | In    | Beschrijving                                               |
| --------- | ------- | ----- | --------------------------------------------------------- |
| type      | string  | query | Filteren op type: `"global"` of `"item"`                  |
| itemId    | string  | query | Filteren op item-ID                                        |
| status    | string  | query | Filteren op status: `"draft"`, `"published"` of `"closed"` |
| page      | integer | query | Paginanummer (standaard: 1, minimaal: 1)                   |
| limit     | integer | query | Items per pagina (standaard: 10, min: 1, max: 100)         |

**Reactie**

```typescript
{
  success: true;
  data: {
    surveys: Array<Survey>;
    total: number;
    totalPages: number;
    page: number;
  }
}
```

**Voorbeeld**

```typescript
const response = await fetch(
  "/api/surveys?type=global&status=published&page=1&limit=10",
);
const { data } = await response.json();
// data.surveys = [{ id: "...", title: "User Satisfaction", type: "global", ... }]
```

### POST /api/surveys

Een nieuwe enquête aanmaken. Vereist beheerdersauthenticatie.

**Aanvraag**

```typescript
{
  title: string;              // Vereist
  description?: string;
  type: "global" | "item";    // Vereist
  itemId?: string;            // Vereist als type "item" is
  status?: "draft" | "published" | "closed";
  surveyJson: object;         // Vereist -- SurveyJS-compatibele JSON-definitie
}
```

**Reactie**

```typescript
{
  success: true;
  data: Survey; // Het aangemaakte enquêteobject
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/surveys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "User Satisfaction Survey",
    type: "global",
    status: "draft",
    surveyJson: {
      pages: [
        {
          elements: [
            {
              type: "rating",
              name: "satisfaction",
              title: "How satisfied are you?",
            },
          ],
        },
      ],
    },
  }),
});
const { data: survey } = await response.json();
```

### GET `/api/surveys/{surveyId}`

Een specifieke enquête ophalen op ID of slug. Niet-gepubliceerde enquêtes zijn alleen zichtbaar voor beheerders.

**Aanvraag**

| Parameter | Type   | In   | Beschrijving                         |
| --------- | ------ | ---- | ------------------------------------ |
| surveyId  | string | path | Enquête-ID of slug (vereist)         |

**Reactie**

```typescript
{
  success: true;
  data: Survey;
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/surveys/user-satisfaction-2024");
const { data: survey } = await response.json();
```

### PUT `/api/surveys/{surveyId}`

Een enquête bijwerken op ID of slug. Vereist beheerdersauthenticatie.

**Aanvraag**

```typescript
{
  title?: string;
  description?: string;
  status?: "draft" | "published" | "closed";
  surveyJson?: object;
}
```

**Reactie**

```typescript
{
  success: true;
  data: Survey;
  message: "Survey updated successfully";
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/surveys/abc-123", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "published" }),
});
```

### DELETE `/api/surveys/{surveyId}`

Een enquête verwijderen op ID of slug. Vereist beheerdersauthenticatie.

**Aanvraag**

| Parameter | Type   | In   | Beschrijving                         |
| --------- | ------ | ---- | ------------------------------------ |
| surveyId  | string | path | Enquête-ID of slug (vereist)         |

**Reactie**

```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### GET `/api/surveys/{surveyId}/responses`

Gepagineerde reacties ophalen voor een specifieke enquête. Vereist beheerdersauthenticatie.

**Aanvraag**

| Parameter | Type   | In    | Beschrijving                            |
| --------- | ------ | ----- | --------------------------------------- |
| surveyId  | string | path  | Enquête-ID (vereist)                    |
| itemId    | string | query | Filteren op item-ID                     |
| userId    | string | query | Filteren op gebruikers-ID               |
| startDate | string | query | Filteren vanaf datum (ISO-formaat)      |
| endDate   | string | query | Filteren tot datum (ISO-formaat)        |
| page      | number | query | Paginanummer                            |
| limit     | number | query | Items per pagina                        |

**Reactie**

```typescript
{
  success: true;
  data: {
    responses: Array<{
      id: string;
      surveyId: string;
      userId: string | null;
      itemId: string | null;
      data: object; // Antwoordgegevens van de enquête
      completedAt: string; // ISO 8601
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    totalPages: number;
  }
}
```

### POST `/api/surveys/{surveyId}/responses`

Een reactie indienen op een gepubliceerde enquête. Authenticatie is optioneel -- anonieme inzendingen zijn toegestaan.

**Aanvraag**

```typescript
{
  surveyId: string; // Moet overeenkomen met de padparameter
  data: object; // Vereist -- antwoordgegevens van de enquête
}
```

**Reactie**

```typescript
{
  success: true;
  data: {
    id: string;
    surveyId: string;
    userId: string | null; // Ingesteld als gebruiker geauthenticeerd is
    itemId: string | null;
    data: object;
    completedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    updatedAt: string;
  }
  message: "Response submitted successfully";
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/surveys/abc-123/responses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    surveyId: "abc-123",
    data: { satisfaction: 5, feedback: "Great product!" },
  }),
});
```

### GET `/api/surveys/responses/{responseId}`

Een specifieke enquêtereactie ophalen op ID. Vereist beheerdersauthenticatie.

**Aanvraag**

| Parameter  | Type   | In   | Beschrijving                  |
| ---------- | ------ | ---- | ----------------------------- |
| responseId | string | path | Reactie-ID (vereist)          |

**Reactie**

```typescript
{
  success: true;
  data: SurveyResponse;
}
```

## Authenticatie

| Eindpunt                                  | Authenticatie vereist                                          |
| ----------------------------------------- | -------------------------------------------------------------- |
| GET /api/surveys                          | Openbaar (database moet beschikbaar zijn)                      |
| POST /api/surveys                         | Alleen beheerder                                               |
| `GET /api/surveys/{surveyId}`             | Openbaar voor gepubliceerde; beheerder voor concept/gesloten   |
| `PUT /api/surveys/{surveyId}`             | Alleen beheerder                                               |
| `DELETE /api/surveys/{surveyId}`          | Alleen beheerder                                               |
| `GET /api/surveys/{surveyId}/responses`   | Alleen beheerder                                               |
| `POST /api/surveys/{surveyId}/responses`  | Openbaar (optionele authenticatie voor gebruikersregistratie)  |
| `GET /api/surveys/responses/{responseId}` | Alleen beheerder                                               |

## Foutreacties

| Status | Beschrijving                                                              |
| ------ | ------------------------------------------------------------------------- |
| 400    | Ongeldige aanvraagbody -- ontbrekend verplicht `data`-veld of misvormde JSON |
| 401    | Niet geautoriseerd -- beheerdersauthenticatie vereist                     |
| 404    | Enquête of reactie niet gevonden                                          |
| 500    | Interne serverfout -- databaseprobleem                                    |
| 503    | Database niet beschikbaar of schema niet geïnitialiseerd                  |

## Snelheidsbeperking

Geen expliciete snelheidsbeperking. Reactie-inzendingen leggen IP-adres en user agent vast voor auditdoeleinden. Het eindpunt GET /api/surveys controleert de beschikbaarheid van de database voor de verwerking en geeft `503` terug als de database niet bereikbaar is.

## Gerelateerde eindpunten

- [Config Feature Endpoints](./config-feature-endpoints) -- Controleren of de enquêtefunctie is ingeschakeld
