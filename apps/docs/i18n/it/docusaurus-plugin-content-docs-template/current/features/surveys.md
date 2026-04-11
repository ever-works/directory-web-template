---
id: surveys
title: Sistema di indagini
sidebar_label: Sondaggi
sidebar_position: 11
---

# Sistema di indagini

Il modello Ever Works include un sistema di sondaggi integrato che supporta sia sondaggi globali (feedback a livello di sito) sia sondaggi specifici per elemento (allegati a singoli elementi della directory). I sondaggi vengono gestiti tramite la dashboard di amministrazione e le risposte vengono raccolte dagli utenti autenticati.

## Architettura

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## Tipi di sondaggio

| Digitare | Descrizione | Caso d'uso |
|------|-------------|----------|
| **Globale** | Sondaggio su tutto il sito, non legato ad alcun elemento | Feedback generali, sondaggi NPS, soddisfazione degli utenti |
| **Specifico per l'articolo** | Collegato a un articolo specifico tramite `itemId` | Feedback sul prodotto, revisioni del servizio, richieste di funzionalità |

##ServizioSondaggi

La classe `SurveyService` ( `lib/services/survey.service.ts` ) gestisce tutta la logica aziendale. È un servizio solo lato server (non importare componenti client).

### Operazioni CRUD

| Metodo | Descrizione |
|--------|-------------|
| `create(data)` | Crea un nuovo sondaggio con lo slug generato automaticamente |
| `getOne(id)` | Ottieni sondaggio per ID |
| `getBySlug(slug)` | Ottieni il sondaggio tramite slug URL-friendly |
| `getMany(filters?, userId?)` | Elenca i sondaggi con impaginazione, filtraggio e stato di completamento |
| `update(id, data)` | Aggiorna i campi del sondaggio e gestisci le transizioni di stato |
| `delete(id)` | Elimina sondaggio (bloccato se esistono risposte) |

### Operazioni di risposta

| Metodo | Descrizione |
|--------|-------------|
| `submitResponse(data)` | Invia una risposta al sondaggio (convalida la pubblicazione del sondaggio) |
| `getResponses(surveyId, filters?)` | Ottieni risposte impaginate per un sondaggio |
| `getResponseById(id)` | Ottieni una risposta unica |

### Generazione di lumache

Gli slug del sondaggio vengono generati automaticamente dal titolo con il supporto Unicode:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

Il servizio garantisce l'unicità dello slug aggiungendo un contatore se viene rilevata una collisione.

## Ciclo di vita del sondaggio

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Stato | Descrizione |
|--------|-------------|
| `draft` | Il sondaggio è in fase di modifica, non visibile agli utenti |
| `published` | Il sondaggio è attivo e accetta risposte |
| `closed` | Il sondaggio non accetta più risposte |

Le transizioni di stato aggiornano i timestamp dei metadati:

- Impostando lo stato su `published` si imposta `publishedAt` - Impostando lo stato su `closed` si imposta `closedAt` ## Struttura dei dati del sondaggio

I sondaggi utilizzano una definizione di domanda basata su JSON memorizzata nella colonna `surveyJson` . Ciò consente strutture di sondaggio flessibili senza modifiche allo schema.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### Struttura della risposta al sondaggio

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## Gestione amministrativa

Le pagine del sondaggio amministrativo forniscono un'interfaccia completa per la gestione del ciclo di vita:

### Percorsi amministrativi

| Itinerario | Descrizione |
|-------|-------------|
| `/admin/surveys` | Elenco dei sondaggi con schede di stato |
| `/admin/surveys/create` | Nuovo modulo per la creazione del sondaggio |
| `/admin/surveys/[slug]/edit` | Modifica sondaggio esistente |
| `/admin/surveys/[slug]/preview` | Anteprima del sondaggio prima della pubblicazione |
| `/admin/surveys/[slug]/responses` | Visualizza e analizza le risposte |

### Funzionalità di amministrazione

- **Crea sondaggi** con titolo, descrizione, tipo e domanda JSON
- **Modifica sondaggi** in stato bozza o pubblicato
- **Anteprima** prima della pubblicazione per verificare l'aspetto
- **Pubblica/chiudi** sondaggi per controllare la raccolta delle risposte
- **Visualizza risposte** con filtraggio e impaginazione
- **Elimina sondaggi** (solo se non sono state raccolte risposte)

Il metodo `getMany` supporta interrogazioni efficienti con:

- **Conteggio delle risposte** tramite SQL JOIN (query singola, no N+1)
- **Stato di completamento** per utente (mostra se l'utente corrente ha già risposto)
- **Impaginazione** con parametri di pagina/limite
- **Filtraggio** per stato e tipo

## Gestione degli errori

Il servizio include una solida gestione degli errori per problemi comuni del database:

| Condizione di errore | Comportamento |
|----------------|----------|
| Tabella non trovata | Messaggio chiaro: "Esegui migrazioni database" |
| Connessione rifiutata | "Connessione al database non riuscita" |
| DATABASE_URL mancante | "Database non configurato" |
| Sondaggio non trovato | Errore stile 404 |
| Sondaggio non pubblicato | "Il sondaggio è [status] e non accetta risposte" |
| Elimina con risposte | "Impossibile eliminare il sondaggio con N risposte" |

## Flag di funzionalità

I sondaggi sono controllati dal sistema di flag delle funzionalità. Il flag `surveys` viene abilitato automaticamente quando viene configurato `DATABASE_URL` :

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Utilizzo lato client

I componenti client utilizzano il wrapper client API anziché direttamente il servizio:

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## Test E2E

I sondaggi sono coperti da più file di test E2E:

- `e2e/tests/admin/surveys.spec.ts` -- Flussi di lavoro di gestione amministrativa
- `e2e/tests/public/surveys.spec.ts` -- Visualizzazione e invio di sondaggi pubblici
- `e2e/page-objects/admin/surveys.page.ts` -- Oggetto della pagina del sondaggio di amministrazione

## File correlati

- `lib/services/survey.service.ts` -- Servizio di logica aziendale
- `lib/db/schema.ts` -- Definizioni tabella `surveys` e `survey_responses` - `lib/db/queries/` -- Query del database dei sondaggi
- `lib/types/survey.ts` -- Definizioni del tipo TypeScript
- `lib/api/survey-api.client.ts` -- Wrapper API lato client
- `app/[locale]/admin/surveys/` -- Pagine di amministrazione
- `components/admin/` -- Componenti dell'interfaccia utente di amministrazione
- `e2e/tests/admin/surveys.spec.ts` -- Test E2E di amministrazione
- `e2e/tests/public/surveys.spec.ts` -- Test E2E pubblici
