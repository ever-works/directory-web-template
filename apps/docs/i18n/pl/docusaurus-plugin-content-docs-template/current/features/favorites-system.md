---
id: favorites-system
title: System ulubionych
sidebar_label: Ulubione
sidebar_position: 33
---

# System ulubionych

Funkcja ulubionych umożliwia uwierzytelnionym użytkownikom dodawanie zakładek do elementów katalogu w celu szybkiego dostępu. Zawiera dedykowaną stronę ulubionych, optymistyczne aktualizacje interfejsu użytkownika, pełne API REST wspierane przez PostgreSQL oraz integrację z flagami funkcji do renderowania warunkowego.

## Przegląd architektury

```
hooks/
  use-favorites.ts           # React Query hook with optimistic mutations

components/favorites/
  favorites-client.tsx       # Full favorites page with grid, sorting, pagination

app/api/favorites/
  route.ts                   # GET (list) and POST (add) endpoints
  [itemSlug]/route.ts        # DELETE endpoint for removing a favorite

lib/db/schema.ts             # favorites table definition
```

## Schemat bazy danych

Tabela `favorites` przechowuje relacje zakładek pomiędzy użytkownikami i elementami:

```ts
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemSlug: text('item_slug').notNull(),
  itemName: text('item_name').notNull(),
  itemIconUrl: text('item_icon_url'),
  itemCategory: text('item_category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
  userIdIndex: index('favorites_user_id_idx').on(table.userId),
  itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
  createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
}));
```

### Decyzje projektowe

- **Zdenormalizowane metadane** -- `itemName` , `itemIconUrl` i `itemCategory` są przechowywane obok ślimaka, dzięki czemu lista ulubionych jest wyświetlana bez łączenia się z tabelą elementów.
- **Złożone ograniczenie unikalności** -- indeks `(userId, itemSlug)` zapobiega duplikowaniu ulubionych na poziomie bazy danych.
- **Wyszukiwania indeksowane** — oddzielne indeksy dla `userId` , `itemSlug` i `createdAt` optymalizują typowe wzorce zapytań pod kątem listowania, liczenia i porządkowania chronologicznego.

## użyj haka do ulubionych

Podstawowy interfejs API po stronie klienta z pełną obsługą optymistycznych aktualizacji:

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

### Wartość zwracana

| Nieruchomość | Wpisz | Opis |
|---------|------|------------|
| `favorites` | `Favorite[]` | Aktualna lista ulubionych użytkowników |
| `isLoading` | `boolean` | Prawda podczas początkowego pobierania |
| `error` | `Error \| null` | Błąd pobierania, jeśli występuje |
| `refetch` | `() => void` | Ręcznie pobierz ponownie ulubione |
| `isFavorited` | `(slug: string) => boolean` | Sprawdź, czy element jest dodany do zakładek |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Dodaj lub usuń w oparciu o bieżący stan |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Dodaj wyraźnie ulubione |
| `removeFavorite` | `(slug: string) => void` | Usuń wyraźnie ulubione |
| `isAdding` | `boolean` | Prawda, gdy mutacja add jest w locie |
| `isRemoving` | `boolean` | Prawda, gdy mutacja usuwania jest w locie |

### Optymistyczny przepływ aktualizacji

Zarówno dodawanie, jak i usuwanie mutacji jest zgodne z optymistycznym wzorcem aktualizacji React Query:

1. ** `onMutate` ** — anuluj zapytania w locie, wykonaj migawkę poprzedniego stanu, natychmiast zastosuj optymistyczną zmianę. Dodaj mutacje, utwórz tymczasowe ulubione z identyfikatorem z prefiksem `temp-` .
2. ** `onError` ** -- wróć do migawki, jeśli wywołanie API nie powiedzie się, wyświetl komunikat o błędzie.
3. ** `onSuccess` ** -- zastąp optymistyczny wpis danymi potwierdzonymi przez serwer. Dodanie mutacji inteligentnie zastępuje wpis tymczasowy, dopasowując go do `itemSlug` , zapobiegając duplikacjom.

Unieważnienie `onSettled` zostało celowo pominięte, aby uniknąć niepotrzebnych ponownych pobrań. Aktualizacja optymistyczna oraz aktualizacja pamięci podręcznej `onSuccess` zapewniają wystarczającą spójność.

### Integracja flagi funkcji

Zapytanie jest włączone tylko wtedy, gdy spełnione są oba warunki:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

Gdy flaga funkcji `favorites` jest wyłączona lub użytkownik nie jest uwierzytelniony, przechwytywanie zwraca pustą tablicę bez wykonywania żadnych żądań sieciowych.

### Użycie

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## Punkty końcowe interfejsu API

### POBIERZ /api/ulubione

Zwraca wszystkie ulubione dla uwierzytelnionego użytkownika, uporządkowane według daty utworzenia.

### POST /api/ulubione

Dodaje element do ulubionych. Sprawdza za pomocą Zoda i sprawdza duplikaty (zwraca 409 w przypadku konfliktu).

| Pole | Wymagane | Opis |
|-------|----------|------------|
| `itemSlug` | Tak | Unikalny identyfikator przedmiotu |
| `itemName` | Tak | Nazwa wyświetlana listy ulubionych |
| `itemIconUrl` | Nie | Adres URL ikony do renderowania |
| `itemCategory` | Nie | Etykieta kategorii |

### USUŃ /api/favorites/[itemSlug]

Usuwa określony element z ulubionych użytkownika przez ślimak. Zwraca 404, jeśli nie został znaleziony.

## Strona ulubionych

Komponent `FavoritesClient` wyświetla pełną stronę ulubionych:

1. **Brama uwierzytelniająca** – monit o zalogowanie się dla nieuwierzytelnionych użytkowników.
2. **Ładowanie szkieletu** — symbol zastępczy siatki 8 kart podczas początkowego pobierania.
3. **Stan błędu** – komunikat o błędzie z przyciskiem ponownej próby.
4. **Stan pusty** – wiadomość z sekcją zastępczą „popularne przedmioty”.
5. **Siatka ulubionych** — elementy wyświetlane z sortowaniem, paginacją i przełączaniem układu.

### Opcje sortowania

| Wartość | Etykieta |
|-------|-------|
| `popularity` | Popularność |
| `name-asc` | Imię A-Z |
| `name-desc` | Imię Z-A |
| `date-asc` | Najstarszy |

### Integracja układu

Strona integruje się z `useLayoutTheme()` w celu przełączania widoku siatki/listy/karty. Nad pozycjami pojawiają się cyfry `ViewToggle` i `SortMenu` . Paginacja po stronie klienta dzieli ulubione na strony po 12, z `clampAndScrollToTop` przy zmianie strony.

## Synchronizacja między urządzeniami

Ulubione są przechowywane po stronie serwera w PostgreSQL, dzięki czemu są automatycznie synchronizowane na różnych urządzeniach po uwierzytelnieniu użytkownika. Pamięć podręczna React Query z 5-minutowym przestarzałym czasem równoważy świeżość i wydajność. Ręczna synchronizacja jest dostępna poprzez funkcję `refetch` .

## Dostępność

- Ulubiony przycisk przełączania wyłącza się podczas oczekujących mutacji, aby zapobiec podwójnym akcjom.
- Powiadomienia tostowe zapewniają informację zwrotną zarówno o udanych, jak i nieudanych operacjach.
- Siatka strony ulubionych wykorzystuje te same dostępne elementy kart, co lista główna.
- Stany puste i błędy obejmują elementy umożliwiające nawigację za pomocą klawiatury.

## Powiązana dokumentacja

- [Flagi funkcji](/docs/template/configuration/feature-config) -- Włączanie/wyłączanie funkcji ulubionych
- [Składniki udostępnionej karty](/docs/template/components/shared-card-components) -- Renderowanie kart w siatce ulubionych
- [Dostawcy kontekstu](/docs/template/components/context-providers) -- Integracja motywu układu
- [Komponenty pulpitu nawigacyjnego](/docs/template/components/dashboard-components) -- Ulubione liczniki w statystykach
