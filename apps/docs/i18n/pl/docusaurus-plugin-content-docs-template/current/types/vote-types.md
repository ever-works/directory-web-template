---
id: vote-types
title: Definicje typów głosowania
sidebar_label: Rodzaje głosów
sidebar_position: 5
---

# Definicje typów głosowania

**Źródło:** `lib/types/vote.ts`

System głosowania umożliwia użytkownikom głosowanie na pozycje. Moduł ten definiuje schemat danych głosowania przy użyciu Zoda do sprawdzania poprawności w czasie wykonywania, wraz z typami odpowiedzi, błędów i stanów po stronie klienta.

## Schemat Zoda

### `voteSchema`

Schemat danych głosowania kanonicznego zdefiniowany za pomocą Zoda. Służy to zarówno jako walidator środowiska wykonawczego, jak i źródło typu `Vote` TypeScript.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Typy

### `Vote`

Typ danych głosowania wywnioskowany z `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Rozwiązuje się to następująco:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|Pole|Wpisz|Opis|
|-------|------|-------------|
|`id`|`string`|Unikalny identyfikator głosowania|
|`userId`|`string`|Identyfikator użytkownika, który oddał głos|
|`itemId`|`string`|Identyfikator lub ślimak głosowanego przedmiotu|
|`createdAt`|`Date`|Sygnatura czasowa oddania głosu|

### `VoteResponse`

Odpowiedź API zwrócona po operacji przełączania głosowania.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|Pole|Wpisz|Opis|
|-------|------|-------------|
|`success`|`boolean`|Czy operacja zakończyła się pomyślnie|
|`voteCount`|`number`|Zaktualizowano łączną liczbę głosów na przedmiot|
|`hasVoted`|`boolean`|Czy bieżący użytkownik głosował po operacji|
|`message`|`string?`|Opcjonalny komunikat o stanie|

### `VoteError`

Struktura reakcji na błędy w przypadku nieudanych operacji głosowania.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|Pole|Wpisz|Opis|
|-------|------|-------------|
|`error`|`string`|Komunikat o błędzie czytelny dla człowieka|
|`code`|`string?`|Czytelny maszynowo kod błędu do obsługi programowej|

### `VoteState`

Stan po stronie klienta dla komponentu interfejsu użytkownika głosowania. Używany z hakami React do zarządzania stanem głosowania w przeglądarce.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|Pole|Wpisz|Opis|
|-------|------|-------------|
|`voteCount`|`number`|Aktualna łączna liczba głosów wyświetlana użytkownikowi|
|`hasVoted`|`boolean`|Czy bieżący użytkownik głosował (kontroluje stan przycisku)|
|`isLoading`|`boolean`|Czy trwa operacja głosowania (wyłącza przycisk)|
|`error`|`string?`|Komunikat o błędzie do wyświetlenia, jeśli istnieje|

## Przykłady użycia

### Sprawdzanie danych głosowania za pomocą Zoda

```typescript
import { voteSchema } from '@/lib/types/vote';

const rawData = {
  id: 'vote-123',
  userId: 'user-456',
  itemId: 'my-tool',
  createdAt: new Date(),
};

const result = voteSchema.safeParse(rawData);
if (result.success) {
  console.log('Valid vote:', result.data);
} else {
  console.error('Invalid vote data:', result.error.issues);
}
```

### Zarządzanie stanem głosowania w komponencie React

```typescript
import type { VoteState, VoteResponse } from '@/lib/types/vote';
import { useState } from 'react';

function useVote(initialCount: number, initialVoted: boolean) {
  const [state, setState] = useState<VoteState>({
    voteCount: initialCount,
    hasVoted: initialVoted,
    isLoading: false,
  });

  async function toggleVote(itemId: string) {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const res = await fetch(`/api/items/${itemId}/vote`, {
        method: 'POST',
      });
      const data: VoteResponse = await res.json();

      if (data.success) {
        setState({
          voteCount: data.voteCount,
          hasVoted: data.hasVoted,
          isLoading: false,
        });
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to toggle vote',
      }));
    }
  }

  return { ...state, toggleVote };
}
```

### Obsługa błędów w głosowaniu

```typescript
import type { VoteError } from '@/lib/types/vote';

function handleVoteError(error: VoteError) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // Redirect to login
      break;
    case 'RATE_LIMITED':
      // Show rate limit message
      break;
    default:
      // Show generic error
      console.error(error.error);
  }
}
```

## Uwagi do projektu

### Przełącz zachowanie

System głosowania wykorzystuje wzorzec przełączania: wywołanie punktu końcowego głosowania dla elementu dodaje lub usuwa głos użytkownika. Pole `VoteResponse.hasVoted` wskazuje nowy stan po przełączeniu.

### Integracja Zoda i TypeScriptu

Typ `Vote` wywodzi się ze schematu Zoda, a nie jest definiowany osobno. Zapewnia to, że sprawdzanie poprawności w czasie wykonywania i sprawdzanie typu w czasie kompilacji korzystają z tej samej definicji:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Separacja stanu klient-serwer

- `Vote` reprezentuje rekord bazy danych
- `VoteResponse` to odpowiedź API po mutacji
- `VoteState` to stan interfejsu użytkownika po stronie klienta
- `VoteError` to struktura odpowiedzi na błąd

Dzięki temu rozdzieleniu wątpliwości dotyczące warstwy danych, warstwy API i warstwy interfejsu użytkownika są jasne.

## Powiązane typy

- [`Comment`](./comment-types.md) — inny typ interakcji użytkownika dotyczący elementu
- [`ItemData`](./item-types.md) — Element nadrzędny, do którego należą głosy
