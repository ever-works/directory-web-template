---
id: voting-comments-deep-dive
title: Głosowanie i komentarze Głębokie nurkowanie
sidebar_label: Głosowanie i komentarze Głębokie nurkowanie
sidebar_position: 36
---

# Głosowanie i komentarze Głębokie nurkowanie

To szczegółowe omówienie obejmuje wewnętrzną mechanikę systemów głosowania i komentowania, w tym optymistyczne algorytmy aktualizacji, strategie zarządzania pamięcią podręczną, agregację ocen, koordynację wydarzeń między komponentami i przepływy pracy związane z moderacją przez administratora.

## Przegląd architektury

```
hooks/
  use-item-vote.ts           # Vote hook with optimistic mutations and cache utilities
  use-comments.ts            # Comment CRUD hook with rating integration
  use-admin-comments.ts      # Admin moderation hook with pagination

app/api/items/[id]/
  votes/route.ts             # GET/POST/DELETE vote endpoints
  comments/route.ts          # GET/POST comment endpoints
  comments/[commentId]/route.ts  # PUT/DELETE single comment
  comments/rating/route.ts   # POST/PUT/GET rating endpoints

lib/db/schema.ts             # votes and comments table definitions
```

## Wewnętrzne elementy systemu głosowania

### hook useItemVote

Hak zarządza stanem głosowania dla pojedynczego elementu z pełną obsługą optymistycznej aktualizacji:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Głosuj na maszynę stanu

Funkcja `handleVote` implementuje maszynę stanu opartą na przełączniku:

| Stan obecny | Akcja | Wynik | Zmiana netto |
|-------------|--------|-------|------------|
| Nie ma głosu | Kliknij W górę | Głosuj za | +1 |
| Nie ma głosu | Kliknij w dół | Głos w dół | -1 |
| Przegłosowano | Kliknij W górę | Usuń głos (wyłącz) | -1 |
| Przegłosowano | Kliknij w dół | Przełącz na głosowanie przeciw | -2 |
| Odrzucono | Kliknij w dół | Usuń głos (wyłącz) | +1 |
| Odrzucono | Kliknij W górę | Przełącz na głosowanie | +2 |

Kiedy bieżący głos użytkownika odpowiada żądanemu typowi, hak wywołuje `unvote()` (DELETE). W przeciwnym razie wywołuje `vote(type)` (POST).

### Optymistyczne obliczenia

Aktualizacja optymistyczna oblicza różnicę zliczeń bez czekania na serwer:

```ts
onMutate: async (type) => {
  const previousVotes = queryClient.getQueryData(['item-votes', itemId]);
  queryClient.setQueryData(['item-votes', itemId], (old) => {
    if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
    const countDiff = old.userVote === type ? -1
      : old.userVote === null ? 1
      : 2; // switching direction
    return {
      count: old.count + (type === 'up' ? countDiff : -countDiff),
      userVote: old.userVote === type ? null : type
    };
  });
  return { previousVotes };
},
```

Obliczenie „0” uwzględnia trzy przypadki: wyłączenie (odejmij 1), nowe głosowanie (dodaj 1) i kierunek zmiany (dodaj 2, aby uzyskać pełny ruch).

### Brama uwierzytelniająca

Nieuwierzytelnionym użytkownikom, którzy próbują głosować, zamiast otrzymywać komunikat o błędzie, wyświetla się moduł logowania:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

Błąd jest wychwytywany przez procedurę obsługi mutacji `onError` , która sprawdza komunikat uwierzytelniający i pomija komunikat o błędzie.

### Konfiguracja zapytania

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Narzędzia do buforowania głosów

Hak `useVoteCache` umożliwia operacje na pamięci podręcznej między komponentami:

```ts
function useVoteCache() {
  return {
    invalidateAllVotes,    // Invalidate all vote queries
    invalidateItemVotes,   // Invalidate votes for a specific item
    clearVoteCache,        // Remove all vote data from cache
    prefetchItemVotes,     // Pre-fetch votes for an item (e.g., on hover)
  };
}
```

## Komentarze Wewnętrzne elementy systemu

### użyj haka na komentarze

Hak zapewnia pełne operacje CRUD ze zintegrowaną obsługą ocen:

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}
```

### Wartość zwracana

| Nieruchomość | Wpisz | Opis |
|---------|------|------------|
| `comments` | `CommentWithUser[]` | Komentarze z wypełnionymi danymi użytkownika |
| `isPending` | `boolean` | Prawda podczas początkowego pobierania |
| `createComment` | `(data) => Promise` | Utwórz nowy komentarz |
| `updateComment` | `(data) => Promise` | Edytuj istniejący komentarz |
| `deleteComment` | `(id) => Promise` | Usuń komentarz |
| `rateComment` | `(data) => void` | Oceń komentarz |
| `updateCommentRating` | `(data) => void` | Zaktualizuj istniejącą ocenę |
| `commentRating` | `number` | Łączna ocena przedmiotu |

### Międzyskładnikowy system zdarzeń

System komentarzy wywołuje niestandardowe zdarzenia DOM w celu koordynacji pomiędzy komponentami, które nie współdzielą kluczy pamięci podręcznej React Query:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

Dzięki temu komponenty takie jak nagłówek szczegółów elementu (który pokazuje liczbę komentarzy) mogą reagować na zmiany w komentarzach bez bezpośredniego łączenia z zapytaniem o komentarze.

### Agregacja ocen

Komentarze i oceny są ściśle zintegrowane. Po dowolnej zmianie komentarza (utwórz, zaktualizuj, usuń) hak wymusza ponowne pobranie oceny przedmiotu:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

Dzięki temu liczba gwiazdek będzie aktualizowana natychmiast po przesłaniu lub zmodyfikowaniu recenzji przez użytkownika.

### Stabilność zapytań

Zapytanie dotyczące komentarzy wykorzystuje konserwatywne ustawienia odświeżania, aby zapobiec migotaniu interfejsu użytkownika:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Moderacja administracyjna

### useAdminComments Hook

Hak moderacji administracyjnej umożliwia zarządzanie komentarzami podzielonymi na strony:

```ts
function useAdminComments({ page, limit, search }) {
  return {
    comments: AdminCommentItem[],
    totalComments: number,
    totalPages: number,
    isDeleting: string | null,  // ID of comment being deleted
    deleteComment: (id: string) => Promise<boolean>,
  };
}
```

### Przebieg moderacji

1. Administrator przechodzi do strony zarządzania komentarzami.
2. Komentarze są wyświetlane z wyszukiwaniem i paginacją.
3. Stan `isDeleting` śledzi, który komentarz jest usuwany, wyłączając jego wiersz.
4. Usunięcie powoduje powiadomienie autora komentarza poprzez `NotificationService` .

## Punkty końcowe interfejsu API

| Metoda | Punkt końcowy | Opis |
|--------|----------|------------|
| OTRZYMAJ | `/api/items/:id/votes` | Pobierz liczbę głosów i głos użytkownika |
| POST | `/api/items/:id/votes` | Oddaj lub zmień głos |
| USUŃ | `/api/items/:id/votes` | Usuń głos |
| OTRZYMAJ | `/api/items/:id/comments` | Pobierz komentarze z danymi użytkownika |
| POST | `/api/items/:id/comments` | Utwórz nowy komentarz |
| POSTAW | `/api/items/:id/comments/:commentId` | Zaktualizuj komentarz |
| USUŃ | `/api/items/:id/comments/:commentId` | Usuń komentarz |
| POST | `/api/items/:id/comments/rating` | Oceń komentarz |
| POSTAW | `/api/items/:id/comments/rating` | Zaktualizuj ocenę komentarza |
| OTRZYMAJ | `/api/items/:id/comments/rating` | Uzyskaj zbiorczą ocenę przedmiotu |

## Integracja flagi funkcji

Zarówno głosowanie, jak i komentarze uwzględniają flagi funkcyjne:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

Jeśli baza danych nie jest skonfigurowana, funkcje te są automatycznie wyłączane.

## Dostępność

- Przyciski głosowania używają `aria-pressed` do wskazania bieżącego stanu głosowania.
- Tryb logowania wywołany nieuwierzytelnionymi próbami głosowania jest pułapką fokusu.
- Formularze komentarzy korzystają z odpowiednich skojarzeń i komunikatów potwierdzających.
- Komponent oceny w postaci gwiazdek obsługuje nawigację za pomocą klawiatury za pomocą klawiszy strzałek.
- Tabele moderacji administratora obejmują wskaźniki stanu na poziomie wiersza i akcje dostępne za pomocą klawiatury.
- Stany ładowania i błędy zapewniają odpowiednio atrybuty `aria-busy` i `role="alert"` .

## Powiązana dokumentacja

– [Omówienie głosowania i komentarzy](/docs/template/features/voting-comments) -- Ogólny przegląd funkcji
- [Komponenty szczegółów elementu](/docs/template/components/item-detail-components) -- Gdzie renderowane są głosy i komentarze
- [System powiadomień](/docs/template/features/notification-system) -- Powiadomienia uruchamiane komentarzem
- [Komponenty panelu kontrolnego](/docs/template/components/dashboard-components) -- Analityka głosowania i komentowania
