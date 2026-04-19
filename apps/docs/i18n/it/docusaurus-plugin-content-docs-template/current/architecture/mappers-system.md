---
id: mappers-system
title: "Sistema dei mappatori"
sidebar_label: "Sistema dei mappatori"
sidebar_position: 48
---

# Sistema dei mappatori

## Panoramica

Il sistema Mappers fornisce funzioni di trasformazione pure e prive di effetti collaterali che convertono i modelli di dati delle applicazioni interne in payload CRM (Customer Relationship Management) esterni. Attualmente implementa mappatori per l'integrazione di Twenty CRM, convertendo i payload `ClientProfile` e `Company` in entità `Person` e `Company` compatibili con Twenty con mappatura dei campi null-safe e convalida dei campi richiesti.

## Architettura

Il modulo dei mappatori si trova in `lib/mappers/` e segue un rigoroso modello di separazione degli interessi:

- I **Mapper** sono funzioni pure: nessun I/O, nessuna chiamata al database, nessuna richiesta HTTP.
- **Servizi** (in `lib/services/`) utilizzano mappatori per preparare i dati prima di inviarli ad API esterne.
- I **tipi** vengono importati dallo schema del database (`lib/db/schema`) e dalle definizioni dei tipi CRM (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

Il flusso di dati è:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## Riferimento API

### Esportazioni da `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Verifica che un ID entità sia presente e non vuoto. Si tratta di un controllo di sicurezza fondamentale che garantisce che ogni record CRM abbia un `external_id` valido che ricollega al sistema locale.

**Parametri:**
- `id` -- L'ID dell'entità locale (può essere non definito o nullo)
- `entityType` -- Nome del tipo di entità per i messaggi di errore (ad esempio, `'ClientProfile'`)

**Restituisce:** Stringa ID tagliata

**Genera:** `Error` se l'ID manca, è null, non definito o una stringa vuota.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Analizza una stringa di posizione in formato libero per estrarre il nome della città. Gestisce vari formati dividendoli in virgole e prendendo la prima parte.

**Formati supportati:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Restituisce:** Il nome della città o `null` se la posizione è vuota/non definita.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Mappa un'entità database locale `ClientProfile` su un payload Twenty CRM `Person`.

**Mappatura del campo:**

|Campo ProfiloCliente|Campo di venti persone|Obbligatorio|
|--------------------|--------------------|----------|
|`id`|`external_id`|Sì (lancia se manca)|
|`name`|`name`|Sì|
|`email`|`email`|Sì|
|`phone`|`phone`|Facoltativo|
|`jobTitle`|`job_title`|Facoltativo|
|`company`|`company_name`|Facoltativo|
|`website`|`website`|Facoltativo|
|`location`|`city` (estratto)|Facoltativo|
|`accountType`|`account_type`|Facoltativo|
|`plan`|`plan`|Facoltativo|
|`totalSubmissions`|`total_submissions`|Facoltativo|

**Restituisce:** Un oggetto `TwentyPerson` con solo campi compilati.

**Lancia:** `Error` se manca `clientProfile.id`.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Mappa un'entità locale `Company` su un payload Twenty CRM `Company`.

**Mappatura del campo:**

|Campo aziendale|Campo TwentyCompany|Obbligatorio|
|--------------|---------------------|----------|
|`id`|`external_id`|Sì (lancia se manca)|
|`name`|`name`|Sì|
|`domain`|`domain_name`|Facoltativo|
|`website`|`website`|Facoltativo|
|`status`|`status`|Facoltativo|

**Restituisce:** Un oggetto `TwentyCompany` con solo campi compilati.

**Lancia:** `Error` se manca `company.id`.

## Dettagli di implementazione

**Mappatura null-safe**: i campi facoltativi utilizzano controlli `if` espliciti prima dell'assegnazione, garantendo che `null`, `undefined` e i valori vuoti non vengano mai inviati al CRM. Ciò mantiene i payload puliti ed evita di sovrascrivere i dati CRM esistenti con valori nulli.

**Applicazione dell'ID esterno**: ogni mappatore chiama `ensureExternalId()` come prima operazione. Ciò genera immediatamente ID non validi, seguendo uno schema fail-fast che impedisce i record orfani nel CRM.

**Nessuna mutazione**: le funzioni del mapper creano nuovi oggetti anziché modificare l'input. L'oggetto ingresso `ClientProfile` o `Company` non viene mai modificato.

**Eliminazione dei campi facoltativa**: i campi vengono aggiunti all'oggetto di output solo quando hanno valori di verità. Ciò produce payload minimi che aggiornano solo i campi non nulli nel CRM.

**Euristica di estrazione della città**: la funzione `extractCityFromLocation()` utilizza un semplice approccio con la suddivisione in virgole. Gestisce i formati di posizione più comuni (Città, Città + Stato, Città + Stato + Paese) ma non tenta di analizzare formati di indirizzi complessi.

## Configurazione

No configuration is required. I mapper sono funzioni pure che dipendono solo dai tipi di input. La configurazione della connessione di Twenty CRM (URL API, token) è gestita dal livello del servizio di integrazione.

## Esempi di utilizzo

```typescript
import {
  mapClientProfileToPerson,
  mapCompanyToTwentyCompany,
  ensureExternalId,
  extractCityFromLocation,
} from '@/lib/mappers/twenty-crm.mapper';

// Map a client profile to a CRM person
const clientProfile = await db.query.clientProfiles.findFirst({
  where: eq(clientProfiles.id, userId),
});

const personPayload = mapClientProfileToPerson(clientProfile);
// {
//   external_id: "usr_abc123",
//   name: "Jane Doe",
//   email: "jane@example.com",
//   job_title: "CTO",
//   company_name: "Acme Corp",
//   city: "San Francisco",
//   plan: "premium",
// }

// Map a company to a CRM company
const company = await db.query.companies.findFirst({
  where: eq(companies.id, companyId),
});

const companyPayload = mapCompanyToTwentyCompany(company);
// {
//   external_id: "comp_xyz789",
//   name: "Acme Corp",
//   domain_name: "acme.com",
//   website: "https://acme.com",
//   status: "active",
// }

// Use utility functions independently
const city = extractCityFromLocation("Berlin, Germany");
// "Berlin"

const validId = ensureExternalId(user.id, "User");
// "usr_abc123" or throws Error
```

## Migliori pratiche

- Utilizza sempre le funzioni del mapper invece di costruire manualmente payload CRM per garantire una denominazione dei campi coerente e una sicurezza nulla.
- Gestire il `Error` lanciato da `ensureExternalId()` a livello di servizio; registralo e salta la sincronizzazione CRM per quel record invece di mandare in crash l'intero batch.
- Quando si aggiungono nuovi campi a un mapper, seguire il modello esistente: verificare la veridicità prima dell'assegnazione all'oggetto di output.
- Scrivi unit test per i mappatori poiché sono funzioni pure senza dipendenze, rendendoli facili da testare isolatamente.
- Se è necessaria una nuova integrazione CRM, creare un nuovo file mapper (ad esempio, `hubspot.mapper.ts`) nella stessa directory seguendo gli stessi schemi.

## Moduli correlati

- [Config Manager System](./config-manager-system) -- Configurazione dell'integrazione tramite `configService.integrations`
- [API Client Layer](/template/architecture/api-client-layer) -- Client HTTP utilizzato dai servizi CRM
