---
id: survey-types
title: Definizioni del tipo di sondaggio
sidebar_label: Tipi di sondaggio
sidebar_position: 6
---

# Definizioni del tipo di sondaggio

**Fonte:** `lib/types/survey.ts`

Questo modulo definisce tutte le definizioni di tipo condiviso per i sondaggi e le risposte ai sondaggi. Serve come unica fonte di verità per le strutture di dati relative al sondaggio utilizzate dal servizio di sondaggio, dal client API del sondaggio e dai gestori di percorsi API.

## Enumerazioni

### `SurveyTypeEnum`

Definisce se un sondaggio si applica a livello globale o ha come ambito un elemento specifico.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Valore|Descrizione|
|-------|-------------|
|`GLOBAL`|Il sondaggio appare a livello di sito, non legato a nessun elemento specifico|
|`ITEM`|Il sondaggio è associato a un elemento specifico (tramite `itemId`)|

### `SurveyStatusEnum`

Stati del ciclo di vita per un sondaggio.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Valore|Descrizione|
|-------|-------------|
|`DRAFT`|Il sondaggio è in fase di creazione/modifica e non è visibile agli intervistati|
|`PUBLISHED`|Il sondaggio è attivo e accetta risposte|
|`CLOSED`|Il sondaggio non accetta più risposte ma i dati vengono conservati|

## Interfacce

### `CreateSurveyData`

Dati necessari per creare un nuovo sondaggio.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}
```

|Campo|Digitare|Obbligatorio|Descrizione|
|-------|------|----------|-------------|
|`title`|`string`|Sì|Visualizza il titolo del sondaggio|
|`description`|`string`|No|Descrizione/sottotitolo facoltativi|
|`type`|`SurveyTypeEnum`|Sì|Se l'indagine è globale o limitata a un elemento|
|`itemId`|`string`|No|ID articolo (richiesto quando `type` è `ITEM`)|
|`status`|`SurveyStatusEnum`|No|Stato iniziale (predefinito su `DRAFT`)|
|`surveyJson`|`any`|Sì|Definizione JSON compatibile con Survey.js|

### `UpdateSurveyData`

Dati per l'aggiornamento di un sondaggio esistente. Tutti i campi sono facoltativi.

```typescript
interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}
```

### `SubmitResponseData`

Dati per l'invio di una risposta al sondaggio da parte di un intervistato.

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}
```

|Campo|Digitare|Obbligatorio|Descrizione|
|-------|------|----------|-------------|
|`surveyId`|`string`|Sì|ID del sondaggio a cui si è risposto|
|`userId`|`string`|No|ID utente autenticato (null per anonimo)|
|`itemId`|`string`|No|Contesto dell'elemento per le indagini con ambito elemento|
|`data`|`any`|Sì|Oggetto dati di risposta Survey.js|
|`ipAddress`|`string`|No|IP rispondente per analisi/deduplicazione|
|`userAgent`|`string`|No|Stringa dell'agente utente del browser|

### `SurveyFilters`

Filtri per eseguire query sui sondaggi negli endpoint dell'elenco.

```typescript
interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}
```

### `ResponseFilters`

Filtri per interrogare le risposte al sondaggio.

```typescript
interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

|Campo|Digitare|Descrizione|
|-------|------|-------------|
|`itemId`|`string?`|Filtra le risposte per elemento|
|`userId`|`string?`|Filtra le risposte per utente|
|`startDate`|`string?`|Stringa di data ISO per l'inizio dell'intervallo|
|`endDate`|`string?`|Stringa di data ISO per la fine dell'intervallo|
|`page`|`number?`|Numero di pagina dell'impaginazione|
|`limit`|`number?`|Risultati per pagina|

## Esempi di utilizzo

### Creazione di un sondaggio globale

```typescript
import type { CreateSurveyData } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const surveyData: CreateSurveyData = {
  title: 'User Satisfaction Survey',
  description: 'Help us improve by sharing your experience',
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.DRAFT,
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you with our platform?',
            rateMin: 1,
            rateMax: 5,
          },
          {
            type: 'comment',
            name: 'feedback',
            title: 'Any additional feedback?',
          },
        ],
      },
    ],
  },
};
```

### Creazione di un sondaggio con ambito elemento

```typescript
import { SurveyTypeEnum } from '@/lib/types/survey';

const itemSurvey: CreateSurveyData = {
  title: 'Product Review',
  type: SurveyTypeEnum.ITEM,
  itemId: 'my-tool-slug',
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'quality',
            title: 'Rate this product',
          },
        ],
      },
    ],
  },
};
```

### Filtraggio dei sondaggi

```typescript
import type { SurveyFilters } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const filters: SurveyFilters = {
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.PUBLISHED,
  page: 1,
  limit: 10,
};
```

### Invio di una risposta

```typescript
import type { SubmitResponseData } from '@/lib/types/survey';

const response: SubmitResponseData = {
  surveyId: 'survey-uuid-123',
  userId: 'user-uuid-456',
  data: {
    satisfaction: 4,
    feedback: 'The platform is easy to use!',
  },
};
```

### Filtraggio delle risposte per intervallo di date

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Note di progettazione

### Integrazione Survey.js

Il campo `surveyJson` utilizza il tipo `any` per accettare le definizioni JSON Survey.js. Survey.js è una libreria di terze parti che definisce i sondaggi come oggetti JSON che descrivono pagine, elementi e la loro configurazione. Il modello memorizza questo JSON così com'è e ne esegue il rendering utilizzando il componente Survey.js React.

### Ciclo di vita del sondaggio

1. **Bozza**: il sondaggio viene creato e può essere modificato liberamente
2. **Pubblicato** - Il sondaggio è attivo; è possibile inviare risposte
3. **Chiuso**: il sondaggio non accetta più risposte; i dati esistenti vengono conservati

### Sondaggi globali e per articolo

- **Sondaggi globali** (`SurveyTypeEnum.GLOBAL`) vengono visualizzati in tutto il sito e non sono collegati ad alcun elemento
- **Sondaggi sugli articoli** (`SurveyTypeEnum.ITEM`) vengono visualizzati nelle pagine dei dettagli degli articoli specifici e richiedono un `itemId`

Il campo `ItemData.showSurveys` (da `item.ts`) controlla se la sezione dei sondaggi viene visualizzata nella pagina di un elemento.

## Tipi correlati

- [`ItemData.showSurveys`](./item-types.md) - Controlla la visibilità del sondaggio per articolo
- [`ItemData.action`](./item-types.md) - L'azione `'start-survey'` si collega a un sondaggio
