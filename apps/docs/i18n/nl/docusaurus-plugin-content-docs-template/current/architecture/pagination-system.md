---
id: pagination-system
title: "Pagineringssysteem"
sidebar_label: "Pagineringssysteem"
sidebar_position: 45
---

# Pagineringssysteem

## Overzicht

Het Paginatiesysteem biedt pagineringsberekeningen op de server en hulpprogramma's voor paginanavigatie op de client. Het bestaat uit twee kleine, gerichte modules: `lib/paginate.ts` voor het berekenen van paginametagegevens (paginanummers, offsets) en `utils/pagination.ts` voor het veilig vastklemmen van paginanummers en het activeren van scroll-naar-top-gedrag bij paginawijzigingen.

## Architectuur

Het pagineringssysteem is opzettelijk licht van gewicht en verdeeld over twee lagen:

- **`lib/paginate.ts`** (Server/gedeeld) -- Pure functies voor pagineringswiskunde. Wordt gebruikt in API-routes, servercomponenten en logica voor het ophalen van gegevens om te berekenen welk gegevenssegment moet worden geretourneerd.
- **`utils/pagination.ts`** (Client) -- Een UI-helper die paginanummers vastlegt in geldige bereiken en de pagina naar boven schuift. Gebruikt door pagineringscomponenten en lijstweergaven.

Beide modules worden gebruikt door de paginerings-UI-componenten en de inhoudslijstpagina's. De `ConfigManager` levert de `itemsPerPage` waarde die in deze berekeningen wordt gebruikt.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## API-referentie

### Exporteert vanuit `lib/paginate.ts`

#### `PER_PAGE: number`

Standaarditems per paginaconstante. Waarde: `12`.

#### `totalPages(size: number, perPage?: number): number`

Berekent het totale aantal pagina's voor een bepaalde collectiegrootte. Gebruikt `Math.ceil()` om ervoor te zorgen dat de laatste gedeeltelijke pagina wordt opgenomen.

**Parameters:**
- `size` -- Totaal aantal items in de collectie
- `perPage` -- Items per pagina (standaard ingesteld op `PER_PAGE`)

**Retourzendingen:** Totaal aantal pagina's (minimaal 1 voor niet-lege collecties)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Berekent metagegevens van de paginering op basis van een onbewerkte paginaparameter (die kan komen als een tekenreeks uit URL-queryparameters).

**Parameters:**
- `rawPage` -- Het gevraagde paginanummer (standaard `1`). Accepteert zowel `number` als `string`.
- `perPage` -- Items per pagina (standaard ingesteld op `PER_PAGE`)

**Retourzendingen:**
- `page` -- Het geparseerde paginanummer als geheel getal
- `start` -- De op nul gebaseerde indexoffset voor het opdelen van de gegevensarray

### Exporteert vanuit `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Navigeer veilig naar een nieuwe pagina door de waarde vast te zetten in het geldige bereik `[1, total]`, de paginastatus bij te werken en het venster naar boven te scrollen met vloeiende animaties.

**Parameters:**
- `newPage` -- Het gevraagde paginanummer (kan buiten bereik zijn)
- `total` -- Totaal aantal pagina's
- `setPage` -- Functie voor het instellen van de status van de huidige pagina

**Gedrag:**
- Klemt `NaN` waarden vast op pagina 1
- Klemt waarden onder 1 naar pagina 1
- Klemt waarden boven `total` tot `total`
- Bellen `window.scrollTo({ top: 0, behavior: 'smooth' })` (veilig voor SSR; cheques `typeof window`)

## Implementatiedetails

**String parsing**: `paginateMeta` accepteert `string | number` voor de parameter `rawPage` omdat URL-queryparameters als tekenreeksen binnenkomen. Het gebruikt `parseInt()` voor conversie.

**Op nul gebaseerde offset**: de `start`-waarde die wordt geretourneerd door `paginateMeta` wordt berekend als `(page - 1) * perPage`, wat een op nul gebaseerde index oplevert die geschikt is voor `Array.slice()` of SQL `OFFSET`-clausules.

**SSR-veiligheid**: `clampAndScrollToTop` controleert `typeof window !== 'undefined'` voordat `window.scrollTo()` wordt aangeroepen, waardoor het veilig is om rendercontexten op de server aan te roepen.

**NaN-afhandeling**: `clampAndScrollToTop` converteert de invoer naar `Number()` en valt terug naar pagina 1 als het resultaat `NaN` is.

## Configuratie

Het standaardpaginaformaat (`PER_PAGE = 12`) is een constante in `lib/paginate.ts`. De runtime-paginagrootte kan worden overschreven via `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

De `ConfigManager` ondersteunt twee pagineringstypen:
- `'standard'` -- Traditionele navigatie per pagina
- `'infinite'` -- Oneindig scroll-/laad-meer-patroon

## Gebruiksvoorbeelden

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

## Beste praktijken

- Gebruik altijd `paginateMeta()` om paginaparameters uit URL-queryreeksen te parseren om typedwang en standaardwaarden veilig af te handelen.
- Geef de `perPage` overschrijving van `ConfigManager` door in plaats van te vertrouwen op de hardgecodeerde constante `PER_PAGE` wanneer de beheerder mogelijk de paginagrootte heeft gewijzigd.
- Gebruik `clampAndScrollToTop()` in alle paginanavigatie aan de clientzijde om paginanummers die buiten het bereik vallen te voorkomen en consistente UX te bieden.
- Voor oneindige scroll-implementaties gebruikt u de `start` offset van `paginateMeta()` om het volgende deel van de items te berekenen dat u wilt toevoegen.
- Houd rekening met de paginering `type` van `ConfigManager` (`'standard'` versus `'infinite'`) bij het kiezen van de paginering-UI-component die moet worden weergegeven.

## Gerelateerde modules

- [Config Manager System](./config-manager-system) -- Biedt runtime pagineringsconfiguratie (`type`, `itemsPerPage`)
- [Inhoudsbibliotheek](/template/architecture/content-library) -- Gebruikt paginering voor pagina's met inhoudslijsten
