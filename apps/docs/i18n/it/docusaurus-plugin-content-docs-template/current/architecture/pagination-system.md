---
id: pagination-system
title: "Sistema di impaginazione"
sidebar_label: "Sistema di impaginazione"
sidebar_position: 45
---

# Sistema di impaginazione

## Panoramica

Il sistema di impaginazione fornisce il calcolo dell'impaginazione lato server e utilità di navigazione della pagina lato client. È composto da due moduli piccoli e mirati: `lib/paginate.ts` per il calcolo dei metadati della pagina (numeri di pagina, offset) e `utils/pagination.ts` per bloccare in modo sicuro i numeri di pagina e attivare il comportamento di scorrimento verso l'alto durante i cambi di pagina.

## Architettura

Il sistema di impaginazione è volutamente leggero e suddiviso su due livelli:

- **`lib/paginate.ts`** (Server/condiviso) -- Funzioni pure per la matematica dell'impaginazione. Utilizzato nelle route API, nei componenti server e nella logica di recupero dei dati per calcolare quale porzione di dati restituire.
- **`utils/pagination.ts`** (Client) -- Un helper dell'interfaccia utente che blocca i numeri di pagina in intervalli validi e scorre la pagina verso l'alto. Utilizzato dai componenti di impaginazione e dalle visualizzazioni elenco.

Entrambi i moduli vengono utilizzati dai componenti dell'interfaccia utente di impaginazione e dalle pagine di elenco dei contenuti. Il valore `ConfigManager` fornisce il valore `itemsPerPage` che alimenta questi calcoli.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## Riferimento API

### Esportazioni da `lib/paginate.ts`

#### `PER_PAGE: number`

Elementi predefiniti per costante di pagina. Valore: `12`.

#### `totalPages(size: number, perPage?: number): number`

Calcola il numero totale di pagine per una determinata dimensione della raccolta. Utilizza `Math.ceil()` per garantire che l'ultima pagina parziale sia inclusa.

**Parametri:**
- `size` -- Numero totale di elementi nella raccolta
- `perPage` -- Elementi per pagina (il valore predefinito è `PER_PAGE`)

**Resi:** Conteggio totale delle pagine (minimo 1 per raccolte non vuote)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Calcola i metadati di impaginazione da un parametro di pagina non elaborato (che può essere una stringa dai parametri di query dell'URL).

**Parametri:**
- `rawPage` -- Il numero di pagina richiesto (il valore predefinito è `1`). Accetta sia `number` che `string`.
- `perPage` -- Elementi per pagina (il valore predefinito è `PER_PAGE`)

**Resi:**
- `page` -- Il numero di pagina analizzato come numero intero
- `start` -- L'offset dell'indice in base zero per suddividere l'array di dati

### Esportazioni da `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Passa in modo sicuro a una nuova pagina bloccando il valore nell'intervallo valido `[1, total]`, aggiornando lo stato della pagina e scorrendo la finestra verso l'alto con un'animazione fluida.

**Parametri:**
- `newPage` -- Il numero di pagina richiesto (può essere fuori intervallo)
- `total` -- Numero totale di pagine
- `setPage` -- Funzione di impostazione dello stato di reazione per la pagina corrente

**Comportamento:**
- Blocca i valori `NaN` a pagina 1
- Blocca i valori inferiori a 1 nella pagina 1
- Blocca i valori superiori a `total` a `total`
- Chiama `window.scrollTo({ top: 0, behavior: 'smooth' })` (sicuro per SSR; controlla `typeof window`)

## Dettagli di implementazione

**Analisi della stringa**: `paginateMeta` accetta `string | number` per il parametro `rawPage` perché i parametri di query dell'URL arrivano come stringhe. Utilizza `parseInt()` per la conversione.

**Offset in base zero**: il valore `start` restituito da `paginateMeta` viene calcolato come `(page - 1) * perPage`, fornendo un indice in base zero adatto per le clausole `Array.slice()` o SQL `OFFSET`.

**Sicurezza SSR**: `clampAndScrollToTop` controlla `typeof window !== 'undefined'` prima di chiamare `window.scrollTo()`, rendendo sicura la chiamata in contesti di rendering lato server.

**Gestione NaN**: `clampAndScrollToTop` converte l'input con `Number()` e torna alla pagina 1 se il risultato è `NaN`.

## Configurazione

La dimensione della pagina predefinita (`PER_PAGE = 12`) è una costante in `lib/paginate.ts`. La dimensione della pagina di runtime può essere sovrascritta tramite `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

`ConfigManager` supporta due tipi di impaginazione:
- `'standard'` -- Navigazione tradizionale pagina per pagina
- `'infinite'` -- Scorrimento infinito/carica più pattern

## Esempi di utilizzo

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## Migliori pratiche

- Utilizza sempre `paginateMeta()` per analizzare i parametri della pagina dalle stringhe di query dell'URL per gestire in modo sicuro la coercizione del tipo e le impostazioni predefinite.
- Passa l'override `perPage` da `ConfigManager` anziché fare affidamento sulla costante `PER_PAGE` codificata quando l'amministratore potrebbe aver modificato le dimensioni della pagina.
- Utilizza `clampAndScrollToTop()` in tutta la navigazione delle pagine lato client per evitare numeri di pagina fuori intervallo e fornire UX coerente.
- Per implementazioni di scorrimento infinito, utilizzare l'offset `start` da `paginateMeta()` per calcolare la porzione successiva di elementi da aggiungere.
- Considerare l'impaginazione `type` da `ConfigManager` (`'standard'` vs `'infinite'`) quando si sceglie quale componente dell'interfaccia utente di impaginazione visualizzare.

## Moduli correlati

- [Config Manager System](./config-manager-system) -- Fornisce la configurazione dell'impaginazione runtime (`type`, `itemsPerPage`)
- [Libreria contenuti](/template/architecture/content-library) -- Utilizza l'impaginazione per le pagine di elenco dei contenuti
