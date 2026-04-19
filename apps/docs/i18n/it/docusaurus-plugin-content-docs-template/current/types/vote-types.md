---
id: vote-types
title: Definizioni del tipo di voto
sidebar_label: Tipi di voto
sidebar_position: 5
---

# Definizioni del tipo di voto

**Fonte:** `lib/types/vote.ts`

Il sistema di voto consente agli utenti di votare a favore degli articoli. Questo modulo definisce lo schema dei dati di voto utilizzando Zod per la convalida del runtime, insieme ai tipi di risposta, errore e stato lato client.

## Schema Zod

### `voteSchema`

Lo schema canonico dei dati di voto definito con Zod. Funziona sia come validatore di runtime che come origine per il tipo `Vote` TypeScript.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Tipi

### `Vote`

Il tipo di dati del voto, dedotto da `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Ciò si risolve in:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|Campo|Digitare|Descrizione|
|-------|------|-------------|
|`id`|`string`|Identificatore di voto univoco|
|`userId`|`string`|ID dell'utente che ha espresso il voto|
|`itemId`|`string`|ID o slug dell'elemento votato|
|`createdAt`|`Date`|Timestamp in cui è stato espresso il voto|

### `VoteResponse`

Risposta API restituita dopo un'operazione di attivazione/disattivazione del voto.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|Campo|Digitare|Descrizione|
|-------|------|-------------|
|`success`|`boolean`|Se l'operazione è stata completata correttamente|
|`voteCount`|`number`|Conteggio totale dei voti aggiornato per l'elemento|
|`hasVoted`|`boolean`|Se l'utente corrente ha votato dopo l'operazione|
|`message`|`string?`|Messaggio di stato facoltativo|

### `VoteError`

Struttura di risposta agli errori per operazioni di voto fallite.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|Campo|Digitare|Descrizione|
|-------|------|-------------|
|`error`|`string`|Messaggio di errore leggibile|
|`code`|`string?`|Codice di errore leggibile dalla macchina per la gestione programmatica|

### `VoteState`

Stato lato client per il componente dell'interfaccia utente di voto. Utilizzato con gli hook React per gestire lo stato del voto nel browser.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|Campo|Digitare|Descrizione|
|-------|------|-------------|
|`voteCount`|`number`|Conteggio totale attuale dei voti visualizzato all'utente|
|`hasVoted`|`boolean`|Se l'utente corrente ha votato (stato del pulsante di controllo)|
|`isLoading`|`boolean`|Se è in corso un'operazione di votazione (disabilita il pulsante)|
|`error`|`string?`|Messaggio di errore da visualizzare, se presente|

## Esempi di utilizzo

### Convalida dei dati di voto con Zod

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

### Gestire lo stato del voto in un componente React

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

### Gestione degli errori di voto

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

## Note di progettazione

### Attiva/Disattiva comportamento

Il sistema di voto utilizza un modello di attivazione/disattivazione: chiamando l'endpoint del voto per un elemento si aggiunge o si rimuove il voto dell'utente. Il campo `VoteResponse.hasVoted` indica il nuovo stato dopo la commutazione.

### Integrazione Zod + TypeScript

Il tipo `Vote` deriva dallo schema Zod anziché essere definito separatamente. Ciò garantisce che la convalida del runtime e il controllo del tipo in fase di compilazione utilizzino la stessa definizione:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Separazione dello stato client-server

- `Vote` rappresenta il record del database
- `VoteResponse` è la risposta API dopo una mutazione
- `VoteState` è lo stato dell'interfaccia utente lato client
- `VoteError` è la struttura della risposta all'errore

Questa separazione mantiene chiare le preoccupazioni tra il livello dati, il livello API e il livello UI.

## Tipi correlati

- [`Comment`](./comment-types.md) - Un altro tipo di interazione utente per elemento
- [`ItemData`](./item-types.md) - L'elemento principale a cui appartengono i voti
