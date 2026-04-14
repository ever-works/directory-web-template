---
id: pagination-system
title: "System paginacji"
sidebar_label: "System paginacji"
sidebar_position: 45
---

# System paginacji

## Przegląd

System paginacji zapewnia obliczenia paginacji po stronie serwera i narzędzia do nawigacji po stronie po stronie klienta. Składa się z dwóch małych, wyspecjalizowanych modułów: `lib/paginate.ts` do obliczania metadanych strony (numery stron, przesunięcia) i `utils/pagination.ts` do bezpiecznego mocowania numerów stron i wywoływania zachowania przewijania do góry przy zmianach strony.

## Architektura

System paginacji jest celowo lekki i podzielony na dwie warstwy:

- **`lib/paginate.ts`** (serwer/współdzielony) — Czyste funkcje matematyczne do paginacji. Używany w trasach API, komponentach serwera i logice pobierania danych do obliczania, który fragment danych ma zostać zwrócony.
- **`utils/pagination.ts`** (Klient) — Pomocnik interfejsu użytkownika, który zawęża numery stron do prawidłowych zakresów i przewija stronę do góry. Używane przez komponenty paginacji i widoki list.

Obydwa moduły są wykorzystywane przez komponenty interfejsu użytkownika służące do paginacji oraz strony z listami treści. `ConfigManager` zapewnia wartość `itemsPerPage`, która jest uwzględniana w tych obliczeniach.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## Dokumentacja API

### Eksport z `lib/paginate.ts`

#### `PER_PAGE: number`

Domyślne elementy na stronę – stała. Wartość: `12`.

#### `totalPages(size: number, perPage?: number): number`

Oblicza całkowitą liczbę stron dla danego rozmiaru kolekcji. Używa `Math.ceil()`, aby zapewnić uwzględnienie ostatniej częściowej strony.

**Parametry:**
- `size` — Całkowita liczba elementów w kolekcji
- `perPage` — Liczba elementów na stronie (domyślnie `PER_PAGE`)

**Zwroty:** Łączna liczba stron (minimum 1 w przypadku niepustych kolekcji)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Oblicza metadane paginacji na podstawie surowego parametru strony (który może pochodzić jako ciąg znaków z parametrów zapytania adresu URL).

**Parametry:**
- `rawPage` — Żądany numer strony (domyślnie `1`). Akceptuje zarówno `number`, jak i `string`.
- `perPage` — Liczba elementów na stronie (domyślnie `PER_PAGE`)

**Zwroty:**
- `page` -- Przeanalizowany numer strony jako liczba całkowita
- `start` — Przesunięcie indeksu liczone od zera przy dzieleniu tablicy danych

### Eksport z `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Bezpiecznie przechodzi do nowej strony, ograniczając wartość do prawidłowego zakresu `[1, total]`, aktualizując stan strony i przewijając okno do góry z płynną animacją.

**Parametry:**
- `newPage` — Żądany numer strony (może być poza zakresem)
- `total` -- Całkowita liczba stron
- `setPage` — Funkcja ustawiania stanu reakcji dla bieżącej strony

**Zachowanie:**
- Mocuje wartości `NaN` do strony 1
- Mocuje wartości poniżej 1 do strony 1
- Mocuje wartości powyżej `total` do `total`
- Wzywa `window.scrollTo({ top: 0, behavior: 'smooth' })` (bezpieczne dla SSR; sprawdza `typeof window`)

## Szczegóły wdrożenia

**Przetwarzanie ciągów**: `paginateMeta` akceptuje `string | number` dla parametru `rawPage`, ponieważ parametry zapytania URL przychodzą jako ciągi znaków. Do konwersji używa `parseInt()`.

**Przesunięcie od zera**: Wartość `start` zwrócona przez `paginateMeta` jest obliczana jako `(page - 1) * perPage`, zapewniając indeks od zera odpowiedni dla klauzul `Array.slice()` lub SQL `OFFSET`.

**Bezpieczeństwo SSR**: `clampAndScrollToTop` sprawdza `typeof window !== 'undefined'` przed wywołaniem `window.scrollTo()`, dzięki czemu wywoływanie kontekstów renderowania po stronie serwera jest bezpieczne.

**Obsługa NaN**: `clampAndScrollToTop` konwertuje dane wejściowe za pomocą `Number()` i wraca do strony 1, jeśli wynikiem jest `NaN`.

## Konfiguracja

Domyślny rozmiar strony (`PER_PAGE = 12`) to stała w `lib/paginate.ts`. Rozmiar strony wykonawczej można zmienić za pomocą `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

`ConfigManager` obsługuje dwa typy paginacji:
- `'standard'` — Tradycyjna nawigacja strona po stronie
- `'infinite'` — Nieskończony wzór przewijania/ładowania

## Przykłady użycia

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

## Najlepsze praktyki

- Zawsze używaj `paginateMeta()` do analizowania parametrów strony z ciągów zapytań URL, aby bezpiecznie obsługiwać wymuszanie typów i wartości domyślne.
- Przekaż zastąpienie `perPage` z `ConfigManager` zamiast polegać na zakodowanej na stałe stałej `PER_PAGE`, gdy administrator mógł zmienić rozmiar strony.
- Użyj `clampAndScrollToTop()` we wszystkich nawigacjach po stronie klienta, aby zapobiec numerowaniu stron spoza zakresu i zapewnić spójny UX.
- W przypadku implementacji nieskończonego przewijania użyj przesunięcia `start` od `paginateMeta()`, aby obliczyć następny fragment elementów do dołączenia.
- Wybierając komponent interfejsu paginacji do renderowania, weź pod uwagę paginację `type` z `ConfigManager` (`'standard'` vs `'infinite'`).

## Powiązane moduły

- [Config Manager System](./config-manager-system) - Zapewnia konfigurację stronicowania w czasie wykonywania (`type`, `itemsPerPage`)
- [Biblioteka treści](/template/architecture/content-library) — Używa podziału na strony w przypadku stron z listami treści
