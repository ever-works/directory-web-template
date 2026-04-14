---
id: types-overview
title: Digitare Panoramica del sistema
sidebar_label: Panoramica
sidebar_position: 0
---

# Digitare Panoramica del sistema

Il modello utilizza un sistema di tipo TypeScript completo situato in `lib/types/`. Queste definizioni di tipo fungono da unica fonte attendibile per le strutture dati utilizzate nelle route API, nei servizi, nei repository e nei componenti dell'interfaccia utente.

## Digita file

La directory `lib/types/` contiene i seguenti moduli:

|Archivio|Descrizione|
|------|-------------|
|`item.ts`|Dati dell'elemento, richieste CRUD, opzioni dell'elenco, costanti di convalida e definizioni di stato|
|`user.ts`|Dati utente amministratore, tipi di autenticazione, schemi di convalida Zod e funzioni di supporto|
|`profile.ts`|Struttura del profilo utente pubblico inclusi collegamenti social, competenze, portfolio e invii|
|`category.ts`|Dati di categoria, richieste CRUD, opzioni di elenco e costanti di convalida|
|`comment.ts`|Tipi di commenti dedotti dallo schema del database, inclusi i commenti arricchiti dall'utente|
|`vote.ts`|Schema di voto (Zod), tipi di risposta, tipi di errore e stato di voto lato client|
|`survey.ts`|Sondaggio e tipi di risposta al sondaggio, opzioni di filtro ed enumerazioni di stato/tipo|
|`location.ts`|Impostazioni di posizione, tipi di query geografiche, tipi di provider di mappe e dati di coordinate|
|`sponsor-ad.ts`|Tipi di annunci dello sponsor tra cui richieste, risposte, statistiche e dati del dashboard|
|`client.ts`|Tipi di profilo cliente per il portale rivolto al cliente, inclusi dashboard e statistiche|
|`client-item.ts`|Tipi di invio di elementi lato client con metriche di coinvolgimento e filtri di stato|
|`role.ts`|Tipi di ruolo e autorizzazione per il sistema RBAC|
|`tag.ts`|Taggare dati, richieste CRUD, opzioni di elenco e costanti di convalida|
|`twenty-crm-config.types.ts`|Venti tipi di configurazione di integrazione CRM e test di connessione|
|`twenty-crm-entities.types.ts`|Venti tipi di entità CRM per record personali e aziendali|
|`twenty-crm-errors.types.ts`|Tipi di errore strutturati, codici di errore e protezioni dei tipi per errori CRM|
|`twenty-crm-sync.types.ts`|Operazioni di upsert, voci della cache e tipi correlati alla sincronizzazione|

## Modelli di architettura

### Modello CRUD coerente

La maggior parte dei tipi di entità seguono uno schema coerente di interfacce:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Costanti di validazione

Ogni modulo entità esporta un oggetto costanti di convalida utilizzando `as const` per l'indipendenza dal tipo:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Queste costanti vengono utilizzate sia nella convalida lato server che nella convalida del modulo lato client, garantendo regole coerenti in tutto lo stack.

### Risposte sindacali discriminate

I tipi di risposta API utilizzano unioni discriminate per la gestione degli errori indipendente dai tipi:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Questo modello è utilizzato da `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` e altri.

### Integrazione dello schema Zod

Diversi moduli utilizzano Zod per la convalida del runtime insieme ai tipi TypeScript:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Viene utilizzato in `vote.ts` (per lo schema di voto) e `user.ts` (per la convalida dell'utente).

### Tipi estesi con relazioni

I tipi che includono dati correlati utilizzano la parola chiave `extends`:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## Convenzioni di importazione

I tipi vengono importati utilizzando la parola chiave `type` per le importazioni di soli tipi:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Ciò garantisce che i tipi vengano cancellati in fase di compilazione e non influiscano sulla dimensione del bundle.

## Configurazione e tipi di runtime

Il modulo di localizzazione mostra un modello utilizzato per la configurazione:

- **Tipi di configurazione** utilizzano `snake_case` per corrispondere ai file di configurazione YAML
- **I tipi di runtime** utilizzano `camelCase` per l'utilizzo idiomatico di TypeScript
- Una funzione di mappatura converte tra i due formati

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## Enumerazioni ed etichette di stato

I valori di stato sono definiti come oggetti const con etichette e mappature di colori corrispondenti:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Tipi dedotti dal database

Alcuni tipi sono dedotti direttamente dallo schema Drizzle ORM:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Questo approccio garantisce che i tipi rimangano automaticamente sincronizzati con le migrazioni del database.

## Documentazione correlata

- [Tipi di elemento](./item-types.md) - Strutture dati degli elementi principali
- [Tipi di utente](./user-types.md) - Autenticazione utente e tipi di profilo
- [Tipi di categoria](./category-types.md) - Tipi di gestione delle categorie
- [Tipi di commento](./comment-types.md) - Tipi di commenti e recensioni
- [Tipi di voto](./vote-types.md) - Tipi di sistemi di voto
- [Tipi di sondaggio](./survey-types.md) - Tipi di sondaggio e risposta
- [Tipi di posizione](./location-types.md) - Geolocalizzazione e tipi di mappa
- [Tipi di annunci sponsorizzati](./sponsor-ad-types.md) - Tipi di sponsorizzazione e pubblicità
- [Tipi CRM](./crm-types.md): venti tipi di integrazione CRM
