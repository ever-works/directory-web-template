---
id: pagination-system
title: "Paginierungssystem"
sidebar_label: "Paginierungssystem"
sidebar_position: 45
---

# Paginierungssystem

## Übersicht

Das Paginierungssystem bietet serverseitige Paginierungsberechnung und clientseitige Dienstprogramme für die Seitennavigation. Es besteht aus zwei kleinen, fokussierten Modulen: `lib/paginate.ts` zum Berechnen von Seitenmetadaten (Seitenzahlen, Offsets) und `utils/pagination.ts` zum sicheren Festlegen von Seitenzahlen und Auslösen des Scroll-to-Top-Verhaltens bei Seitenänderungen.

## Architektur

Das Paginierungssystem ist absichtlich leichtgewichtig und auf zwei Ebenen aufgeteilt:

- **`lib/paginate.ts`** (Server/gemeinsam genutzt) – Reine Funktionen für Paginierungsmathematik. Wird in API-Routen, Serverkomponenten und Datenabruflogik verwendet, um zu berechnen, welcher Datenausschnitt zurückgegeben werden soll.
- **`utils/pagination.ts`** (Client) – Ein UI-Helfer, der Seitenzahlen auf gültige Bereiche beschränkt und die Seite nach oben scrollt. Wird von Paginierungskomponenten und Listenansichten verwendet.

Beide Module werden von den Paginierungs-UI-Komponenten und den Inhaltslistenseiten genutzt. Der `ConfigManager` liefert den `itemsPerPage`-Wert, der in diese Berechnungen einfließt.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## API-Referenz

### Exporte von `lib/paginate.ts`

#### `PER_PAGE: number`

Standardelemente pro Seitenkonstante. Wert: `12`.

#### `totalPages(size: number, perPage?: number): number`

Berechnet die Gesamtzahl der Seiten für eine bestimmte Sammlungsgröße. Verwendet `Math.ceil()`, um sicherzustellen, dass die letzte Teilseite enthalten ist.

**Parameter:**
- `size` – Gesamtzahl der Elemente in der Sammlung
- `perPage` – Elemente pro Seite (standardmäßig `PER_PAGE`)

**Rückgaben:** Gesamtseitenzahl (mindestens 1 für nicht leere Sammlungen)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Berechnet Paginierungsmetadaten aus einem Rohseitenparameter (der als Zeichenfolge aus URL-Abfrageparametern vorliegen kann).

**Parameter:**
- `rawPage` – Die angeforderte Seitenzahl (standardmäßig `1`). Akzeptiert sowohl `number` als auch `string`.
- `perPage` – Elemente pro Seite (standardmäßig `PER_PAGE`)

**Rücksendungen:**
- `page` – Die geparste Seitennummer als Ganzzahl
- `start` – Der nullbasierte Indexoffset für das Slicing des Datenarrays

### Exporte von `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Navigiert sicher zu einer neuen Seite, indem der Wert auf den gültigen Bereich `[1, total]` festgelegt wird, der Seitenstatus aktualisiert wird und das Fenster mit sanfter Animation nach oben gescrollt wird.

**Parameter:**
- `newPage` – Die angeforderte Seitenzahl (kann außerhalb des gültigen Bereichs liegen)
- `total` – Gesamtzahl der Seiten
- `setPage` – Reagieren Sie auf die State-Setter-Funktion für die aktuelle Seite

**Verhalten:**
- Klemmt `NaN` Werte auf Seite 1
- Klemmt Werte unter 1 auf Seite 1
- Klemmt Werte über `total` bis `total`
- Ruft `window.scrollTo({ top: 0, behavior: 'smooth' })` auf (sicher für SSR; prüft `typeof window`)

## Implementierungsdetails

**String-Parsing**: `paginateMeta` akzeptiert `string | number` für den Parameter `rawPage`, da URL-Abfrageparameter als Zeichenfolgen ankommen. Für die Konvertierung wird `parseInt()` verwendet.

**Nullbasierter Offset**: Der von `paginateMeta` zurückgegebene `start`-Wert wird als `(page - 1) * perPage` berechnet und stellt einen nullbasierten Index bereit, der für `Array.slice()`- oder SQL-`OFFSET`-Klauseln geeignet ist.

**SSR-Sicherheit**: `clampAndScrollToTop` überprüft `typeof window !== 'undefined'` vor dem Aufruf von `window.scrollTo()` und macht so den Aufruf in serverseitigen Rendering-Kontexten sicher.

**NaN-Verarbeitung**: `clampAndScrollToTop` konvertiert die Eingabe mit `Number()` und greift auf Seite 1 zurück, wenn das Ergebnis `NaN` ist.

## Konfiguration

Die Standardseitengröße (`PER_PAGE = 12`) ist eine Konstante in `lib/paginate.ts`. Die Laufzeitseitengröße kann über `ConfigManager` überschrieben werden:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

Der `ConfigManager` unterstützt zwei Paginierungstypen:
- `'standard'` – Traditionelle seitenweise Navigation
- `'infinite'` – Unendliches Scrollen/Mehr laden-Muster

## Anwendungsbeispiele

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

## Best Practices

- Verwenden Sie immer `paginateMeta()`, um Seitenparameter aus URL-Abfragezeichenfolgen zu analysieren, um Typzwang und Standardeinstellungen sicher zu handhaben.
- Übergeben Sie die `perPage`-Überschreibung von `ConfigManager`, anstatt sich auf die fest codierte `PER_PAGE`-Konstante zu verlassen, wenn der Administrator möglicherweise die Seitengröße geändert hat.
- Verwenden Sie `clampAndScrollToTop()` in der gesamten clientseitigen Seitennavigation, um Seitenzahlen außerhalb des zulässigen Bereichs zu verhindern und eine konsistente Benutzeroberfläche bereitzustellen.
- Verwenden Sie für Implementierungen mit unendlichem Scrollen den `start`-Offset von `paginateMeta()`, um den nächsten Abschnitt der anzuhängenden Elemente zu berechnen.
- Berücksichtigen Sie die Paginierung `type` von `ConfigManager` (`'standard'` vs. `'infinite'`), wenn Sie auswählen, welche Paginierungs-UI-Komponente gerendert werden soll.

## Verwandte Module

- [Config Manager System](./config-manager-system) – Bietet Laufzeit-Paginierungskonfiguration (`type`, `itemsPerPage`)
- [Inhaltsbibliothek](/template/architecture/content-library) – Verwendet Paginierung für Seiten mit Inhaltslisten
