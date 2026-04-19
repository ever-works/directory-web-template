---
id: survey-endpoints
title: "Endpoint API Sondaggi"
sidebar_label: "Sondaggi"
---

# Endpoint API Sondaggi

L'API Sondaggi fornisce operazioni CRUD complete per i sondaggi e la raccolta delle risposte. I sondaggi possono essere **globali** (a livello di sito) o **specifici per elemento**, e supportano gli stati del ciclo di vita bozza/pubblicato/chiuso.

**File sorgente:**
- `template/app/api/surveys/route.ts`
- `template/app/api/surveys/[surveyId]/route.ts`
- `template/app/api/surveys/[surveyId]/responses/route.ts`
- `template/app/api/surveys/responses/[responseId]/route.ts`

## Riepilogo Endpoint

| Metodo | Percorso | Auth | Descrizione |
|--------|------|------|-------------|
| GET | `/api/surveys` | Opzionale | Elenca i sondaggi con filtri |
| POST | `/api/surveys` | Amministratore | Crea un nuovo sondaggio |
| GET | `/api/surveys/{surveyId}` | Condizionale | Ottieni un singolo sondaggio per ID o slug |
| PUT | `/api/surveys/{surveyId}` | Amministratore | Aggiorna un sondaggio |
| DELETE | `/api/surveys/{surveyId}` | Amministratore | Elimina un sondaggio |
| GET | `/api/surveys/{surveyId}/responses` | Amministratore | Elenca le risposte per un sondaggio |
| POST | `/api/surveys/{surveyId}/responses` | Opzionale | Invia una risposta |
| GET | `/api/surveys/responses/{responseId}` | Amministratore | Ottieni una singola risposta |

---

## GET `/api/surveys`

Recupera un elenco paginato di sondaggi con filtri opzionali. La disponibilità del database viene verificata prima dell'elaborazione.

### Parametri di Query

| Parametro | Tipo | Richiesto | Predefinito | Descrizione |
|-----------|------|----------|---------|-------------|
| `type` | `"global"` o `"item"` | No | -- | Filtra per tipo di sondaggio |
| `itemId` | string | No | -- | Filtra per ID elemento associato |
| `status` | `"draft"`, `"published"`, o `"closed"` | No | -- | Filtra per stato |
| `page` | integer | No | 1 | Numero di pagina (minimo 1) |
| `limit` | integer | No | 10 | Elementi per pagina (1-100) |

### Forma della Risposta

#### 200 -- Sondaggi Recuperati

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

### Gestione degli Errori

L'endpoint gestisce in modo speciale gli errori di database comuni:

- **Errori di connessione** (`DATABASE_URL` mancante, connessioni rifiutate) restituiscono **503** con un messaggio descrittivo.
- **Errori di schema** (tabelle/relazioni mancanti) restituiscono **503** suggerendo di eseguire le migrazioni.
- Gli altri errori restituiscono **500**.

---

## POST `/api/surveys`

Crea un nuovo sondaggio. **Richiede autenticazione amministratore.**

### Corpo della Richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `title` | string | **Sì** | Titolo del sondaggio |
| `description` | string | No | Descrizione del sondaggio |
| `type` | `"global"` o `"item"` | **Sì** | Tipo di sondaggio |
| `itemId` | string | No | ID elemento associato (per sondaggi di tipo item) |
| `status` | `"draft"`, `"published"`, o `"closed"` | No | Stato iniziale |
| `surveyJson` | object | **Sì** | Definizione del sondaggio (domande, struttura) |

### Risposta: 201 Creato

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

Recupera un singolo sondaggio tramite ID o slug. I sondaggi non pubblicati sono visibili solo agli amministratori.

### Logica di Controllo Accesso

```ts
// I sondaggi pubblicati sono visibili a tutti
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

L'endpoint tenta prima la ricerca per ID, poi ricade sulla ricerca per slug.

### Risposta: 404 Non Trovato

Restituito quando il sondaggio non esiste OPPURE quando un non-amministratore richiede un sondaggio non pubblicato:

```json
{
  "success": false,
  "error": "Survey not found"
}
```

---

## PUT `/api/surveys/{surveyId}`

Aggiorna un sondaggio esistente. **Richiede autenticazione amministratore.** Il gestore risolve prima il sondaggio per ID o slug prima di applicare gli aggiornamenti.

### Corpo della Richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `title` | string | No | Titolo aggiornato |
| `description` | string | No | Descrizione aggiornata |
| `status` | `"draft"`, `"published"`, o `"closed"` | No | Stato aggiornato |
| `surveyJson` | object | No | Definizione del sondaggio aggiornata |

### Risposta: 200 Aggiornato

```json
{
  "success": true,
  "data": { "id": "survey_abc", "title": "Updated Title" },
  "message": "Survey updated successfully"
}
```

---

## DELETE `/api/surveys/{surveyId}`

Elimina definitivamente un sondaggio. **Richiede autenticazione amministratore.**

### Risposta: 200 Eliminato

```json
{
  "success": true,
  "data": null,
  "message": "Survey deleted successfully"
}
```

---

## GET `/api/surveys/{surveyId}/responses`

Recupera le risposte paginate per un sondaggio specifico. **Richiede autenticazione amministratore.**

### Parametri di Query

| Parametro | Tipo | Richiesto | Descrizione |
|-----------|------|----------|-------------|
| `itemId` | string | No | Filtra per ID elemento |
| `userId` | string | No | Filtra per ID utente |
| `startDate` | string (data) | No | Filtra le risposte da questa data |
| `endDate` | string (data) | No | Filtra le risposte fino a questa data |
| `page` | integer | No | Numero di pagina |
| `limit` | integer | No | Elementi per pagina |

### Risposta: 200

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

Invia una risposta a un sondaggio pubblicato. L'autenticazione è **opzionale** -- le submission anonime sono supportate. L'endpoint cattura metadati sull'indirizzo IP e lo user agent.

### Corpo della Richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `data` | object | **Sì** | Dati della risposta al sondaggio (risposte) |

### Come vengono Catturati i Metadati

```ts
const forwardedFor = request.headers.get('x-forwarded-for') || '';
const ipAddress =
  (forwardedFor.split(',')[0]?.trim()) ||
  request.headers.get('x-real-ip') ||
  'unknown';

const userAgent = request.headers.get('user-agent') || 'unknown';
```

### Risposta: 201 Creato

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

#### 400 -- Corpo Non Valido

```json
{
  "success": false,
  "error": "Invalid request body: \"data\" is required"
}
```

---

## GET `/api/surveys/responses/{responseId}`

Recupera una singola risposta al sondaggio per ID. **Richiede autenticazione amministratore.**

### Risposta: 200

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

## File Sorgente Correlati

| File | Scopo |
|------|-------|
| `template/app/api/surveys/route.ts` | Elenca e crea sondaggi |
| `template/app/api/surveys/[surveyId]/route.ts` | CRUD sondaggio singolo |
| `template/app/api/surveys/[surveyId]/responses/route.ts` | Elenco e invio risposte |
| `template/app/api/surveys/responses/[responseId]/route.ts` | Recupero risposta singola |
| `template/lib/services/survey.service.ts` | Logica di business dei sondaggi |
| `template/lib/types/survey.ts` | Tipi e interfacce TypeScript |
