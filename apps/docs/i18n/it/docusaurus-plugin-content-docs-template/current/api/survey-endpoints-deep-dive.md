---
id: survey-endpoints-deep-dive
title: "Riferimento API Sondaggi"
sidebar_label: "Sondaggi (Approfondimento)"
---

# Riferimento API Sondaggi

## Panoramica

L'API Sondaggi fornisce operazioni CRUD complete per i sondaggi e le relative risposte. I sondaggi possono essere globali o specifici per elemento, e supportano gli stati del ciclo di vita bozza/pubblicato/chiuso. La creazione, l'aggiornamento e l'eliminazione di sondaggi richiedono l'autenticazione come amministratore, mentre gli utenti pubblici possono visualizzare i sondaggi pubblicati e inviare risposte.

## Endpoint

### GET /api/surveys

Recupera i sondaggi con filtri opzionali e paginazione. Verifica la disponibilità del database prima dell'elaborazione.

**Richiesta**

| Parametro | Tipo    | In    | Descrizione |
| --------- | ------- | ----- | ----------- |
| type      | string  | query | Filtra per tipo: `"global"` o `"item"` |
| itemId    | string  | query | Filtra per ID elemento |
| status    | string  | query | Filtra per stato: `"draft"`, `"published"`, o `"closed"` |
| page      | integer | query | Numero di pagina (predefinito: 1, minimo: 1) |
| limit     | integer | query | Elementi per pagina (predefinito: 10, min: 1, max: 100) |

**Risposta**

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

**Esempio**

```typescript
const response = await fetch(
  "/api/surveys?type=global&status=published&page=1&limit=10",
);
const { data } = await response.json();
// data.surveys = [{ id: "...", title: "User Satisfaction", type: "global", ... }]
```

### POST /api/surveys

Crea un nuovo sondaggio. Richiede autenticazione amministratore.

**Richiesta**

```typescript
{
  title: string;              // Obbligatorio
  description?: string;
  type: "global" | "item";    // Obbligatorio
  itemId?: string;            // Obbligatorio se type è "item"
  status?: "draft" | "published" | "closed";
  surveyJson: object;         // Obbligatorio -- definizione JSON compatibile con SurveyJS
}
```

**Risposta**

```typescript
{
  success: true;
  data: Survey; // L'oggetto sondaggio creato
}
```

**Esempio**

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

Recupera un sondaggio specifico per ID o slug. I sondaggi non pubblicati sono visibili solo agli amministratori.

**Richiesta**

| Parametro | Tipo   | In   | Descrizione |
| --------- | ------ | ---- | ----------- |
| surveyId  | string | path | ID o slug del sondaggio (obbligatorio) |

**Risposta**

```typescript
{
  success: true;
  data: Survey;
}
```

**Esempio**

```typescript
const response = await fetch("/api/surveys/user-satisfaction-2024");
const { data: survey } = await response.json();
```

### PUT `/api/surveys/{surveyId}`

Aggiorna un sondaggio per ID o slug. Richiede autenticazione amministratore.

**Richiesta**

```typescript
{
  title?: string;
  description?: string;
  status?: "draft" | "published" | "closed";
  surveyJson?: object;
}
```

**Risposta**

```typescript
{
  success: true;
  data: Survey;
  message: "Survey updated successfully";
}
```

**Esempio**

```typescript
const response = await fetch("/api/surveys/abc-123", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "published" }),
});
```

### DELETE `/api/surveys/{surveyId}`

Elimina un sondaggio per ID o slug. Richiede autenticazione amministratore.

**Richiesta**

| Parametro | Tipo   | In   | Descrizione |
| --------- | ------ | ---- | ----------- |
| surveyId  | string | path | ID o slug del sondaggio (obbligatorio) |

**Risposta**

```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### GET `/api/surveys/{surveyId}/responses`

Recupera le risposte paginate per un sondaggio specifico. Richiede autenticazione amministratore.

**Richiesta**

| Parametro | Tipo   | In    | Descrizione |
| --------- | ------ | ----- | ----------- |
| surveyId  | string | path  | ID sondaggio (obbligatorio) |
| itemId    | string | query | Filtra per ID elemento |
| userId    | string | query | Filtra per ID utente |
| startDate | string | query | Filtra dalla data (formato ISO) |
| endDate   | string | query | Filtra fino alla data (formato ISO) |
| page      | number | query | Numero di pagina |
| limit     | number | query | Elementi per pagina |

**Risposta**

```typescript
{
  success: true;
  data: {
    responses: Array<{
      id: string;
      surveyId: string;
      userId: string | null;
      itemId: string | null;
      data: object; // Dati risposte al sondaggio
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

Invia una risposta a un sondaggio pubblicato. L'autenticazione è opzionale -- le submission anonime sono consentite.

**Richiesta**

```typescript
{
  surveyId: string; // Deve corrispondere al parametro di percorso
  data: object; // Obbligatorio -- dati delle risposte al sondaggio
}
```

**Risposta**

```typescript
{
  success: true;
  data: {
    id: string;
    surveyId: string;
    userId: string | null; // Impostato se l'utente è autenticato
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

**Esempio**

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

Recupera una specifica risposta al sondaggio per ID. Richiede autenticazione amministratore.

**Richiesta**

| Parametro  | Tipo   | In   | Descrizione |
| ---------- | ------ | ---- | ----------- |
| responseId | string | path | ID risposta (obbligatorio) |

**Risposta**

```typescript
{
  success: true;
  data: SurveyResponse;
}
```

## Autenticazione

| Endpoint | Auth Richiesta |
| ----------------------------------------- | -------------------------------------------- |
| GET /api/surveys | Pubblica (il database deve essere disponibile) |
| POST /api/surveys | Solo amministratore |
| `GET /api/surveys/{surveyId}` | Pubblica per pubblicati; amministratore per bozza/chiuso |
| `PUT /api/surveys/{surveyId}` | Solo amministratore |
| `DELETE /api/surveys/{surveyId}` | Solo amministratore |
| `GET /api/surveys/{surveyId}/responses` | Solo amministratore |
| `POST /api/surveys/{surveyId}/responses` | Pubblica (auth opzionale per tracciamento utente) |
| `GET /api/surveys/responses/{responseId}` | Solo amministratore |

## Risposte di Errore

| Stato | Descrizione |
| ------ | ----------------------------------------------------------------------- |
| 400    | Corpo della richiesta non valido -- campo `data` obbligatorio mancante o JSON non valido |
| 401    | Non autorizzato -- autenticazione amministratore richiesta |
| 404    | Sondaggio o risposta non trovata |
| 500    | Errore interno del server -- errore di database |
| 503    | Database non disponibile o schema non inizializzato |

## Limitazione della Velocità

Nessuna limitazione della velocità esplicita. Le submission di risposte catturano l'indirizzo IP e lo user agent per scopi di audit. L'endpoint GET /api/surveys verifica la disponibilità del database prima dell'elaborazione e restituisce `503` se il database non è raggiungibile.
