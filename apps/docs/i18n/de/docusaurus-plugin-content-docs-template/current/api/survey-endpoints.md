---
id: survey-endpoints
title: "Surveys API Endpoints"
sidebar_label: "Surveys API Endpoints"
---

# Umfrage-Endpunkte

Das Umfragesystem ermöglicht das Erstellen und Beantworten von Umfragen. Admins können Umfragen verwalten, während Benutzer an Umfragen teilnehmen können.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|----------|---------|-------------------|--------------|
| `/api/surveys` | GET | Öffentlich | Alle aktiven Umfragen abrufen |
| `/api/surveys` | POST | Admin | Neue Umfrage erstellen |
| `/api/surveys/[id]` | GET | Öffentlich | Einzelne Umfrage abrufen |
| `/api/surveys/[id]` | PUT | Admin | Umfrage aktualisieren |
| `/api/surveys/[id]` | DELETE | Admin | Umfrage löschen |
| `/api/surveys/[id]/responses` | GET | Admin | Antworten einer Umfrage abrufen |
| `/api/surveys/[id]/responses` | POST | Benutzer | Antwort auf Umfrage einreichen |
| `/api/surveys/[id]/responses/[responseId]` | GET | Admin | Einzelne Antwort abrufen |

## Umfragen abrufen

```
GET /api/surveys
```

Gibt alle aktiven Umfragen zurück.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "survey_abc123",
      "title": "Nutzerzufriedenheit 2024",
      "description": "Helfen Sie uns, unseren Service zu verbessern",
      "status": "active",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question": "Wie zufrieden sind Sie?",
          "options": ["Sehr zufrieden", "Zufrieden", "Neutral", "Unzufrieden"]
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Umfrage erstellen

```
POST /api/surveys
```

**Authentifizierung:** Erforderlich (Admin)

**Anfragekörper:**

```json
{
  "title": "Produktfeedback Q1",
  "description": "Ihre Meinung zählt",
  "status": "active",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Wie oft nutzen Sie unser Produkt?",
      "options": ["Täglich", "Wöchentlich", "Monatlich", "Selten"],
      "required": true
    },
    {
      "type": "text",
      "question": "Was können wir verbessern?",
      "required": false
    }
  ]
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `title` | string | Ja | Umfragetitel |
| `description` | string | Nein | Beschreibung |
| `status` | string | Nein | `active` oder `inactive` (Standard: `active`) |
| `questions` | array | Ja | Liste der Fragen |

**Erfolgsantwort (201):**

```json
{
  "success": true,
  "data": {
    "id": "survey_new123",
    "title": "Produktfeedback Q1",
    "status": "active"
  }
}
```

## Einzelne Umfrage abrufen

```
GET /api/surveys/[id]
```

Gibt eine einzelne Umfrage mit allen Fragen zurück.

| Status | Bedingung |
|--------|-----------|
| 404 | Umfrage nicht gefunden |
| 503 | Datenbankverbindungsfehler oder Schema-Fehler |

## Umfrage aktualisieren

```
PUT /api/surveys/[id]
```

**Authentifizierung:** Erforderlich (Admin)

Aktualisiert Titel, Beschreibung, Status oder Fragen einer bestehenden Umfrage.

## Umfrage löschen

```
DELETE /api/surveys/[id]
```

**Authentifizierung:** Erforderlich (Admin)

Löscht eine Umfrage und alle zugehörigen Antworten.

## Antworten abrufen

```
GET /api/surveys/[id]/responses
```

**Authentifizierung:** Erforderlich (Admin)

Gibt alle Antworten auf eine Umfrage zurück.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "resp_abc",
      "surveyId": "survey_abc123",
      "userId": "user_xyz",
      "answers": [
        { "questionId": "q1", "value": "Täglich" }
      ],
      "submittedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Antwort einreichen

```
POST /api/surveys/[id]/responses
```

**Authentifizierung:** Erforderlich (Benutzer)

**Anfragekörper:**

```json
{
  "answers": [
    { "questionId": "q1", "value": "Täglich" },
    { "questionId": "q2", "value": "Bessere mobile App" }
  ]
}
```

| Status | Bedingung |
|--------|-----------|
| 400 | Fehlende oder ungültige Antworten |
| 401 | Nicht angemeldet |
| 404 | Umfrage nicht gefunden |
| 409 | Benutzer hat bereits geantwortet |
| 503 | Datenbankverbindungsfehler |

**Quelle:** `template/app/api/surveys/`

## Fehlerbehandlung bei Datenbankfehlern

Bei Datenbankverbindungs- oder Schema-Fehlern geben alle Umfrage-Endpunkte `503 Service Unavailable` anstelle von `500` zurück. Dies ermöglicht Load Balancern, Anfragen an gesunde Instanzen weiterzuleiten.
