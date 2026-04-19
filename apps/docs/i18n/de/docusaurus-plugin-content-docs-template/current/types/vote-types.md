---
id: vote-types
title: Definitionen der Abstimmungstypen
sidebar_label: Abstimmungsarten
sidebar_position: 5
---

# Definitionen der Abstimmungstypen

**Quelle:** `lib/types/vote.ts`

Das Abstimmungssystem ermöglicht es Benutzern, Elemente positiv zu bewerten. Dieses Modul definiert das Abstimmungsdatenschema mithilfe von Zod für die Laufzeitvalidierung sowie Antwort-, Fehler- und clientseitige Statustypen.

## Zod-Schema

### `voteSchema`

Das mit Zod definierte kanonische Abstimmungsdatenschema. Dies dient sowohl als Laufzeitvalidator als auch als Quelle für den TypeScript-Typ `Vote`.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Typen

### `Vote`

Der Abstimmungsdatentyp, abgeleitet von `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Dies löst Folgendes aus:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|Feld|Typ|Beschreibung|
|-------|------|-------------|
|`id`|`string`|Eindeutige Abstimmungskennung|
|`userId`|`string`|ID des Benutzers, der die Stimme abgegeben hat|
|`itemId`|`string`|ID oder Slug des abgestimmten Elements|
|`createdAt`|`Date`|Zeitstempel der Stimmabgabe|

### `VoteResponse`

Nach einem Abstimmungsumschaltvorgang zurückgegebene API-Antwort.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|Feld|Typ|Beschreibung|
|-------|------|-------------|
|`success`|`boolean`|Ob der Vorgang erfolgreich abgeschlossen wurde|
|`voteCount`|`number`|Die Gesamtzahl der Stimmen für den Artikel wurde aktualisiert|
|`hasVoted`|`boolean`|Ob der aktuelle Benutzer nach der Operation abgestimmt hat|
|`message`|`string?`|Optionale Statusmeldung|

### `VoteError`

Fehlerantwortstruktur für fehlgeschlagene Abstimmungsvorgänge.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|Feld|Typ|Beschreibung|
|-------|------|-------------|
|`error`|`string`|Für Menschen lesbare Fehlermeldung|
|`code`|`string?`|Maschinenlesbarer Fehlercode für die programmgesteuerte Behandlung|

### `VoteState`

Clientseitiger Status für die Abstimmungs-UI-Komponente. Wird mit React-Hooks verwendet, um den Abstimmungsstatus im Browser zu verwalten.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|Feld|Typ|Beschreibung|
|-------|------|-------------|
|`voteCount`|`number`|Aktuelle Gesamtstimmenzahl, die dem Benutzer angezeigt wird|
|`hasVoted`|`boolean`|Ob der aktuelle Benutzer abgestimmt hat (steuert den Schaltflächenstatus)|
|`isLoading`|`boolean`|Ob ein Abstimmungsvorgang läuft (deaktiviert die Schaltfläche)|
|`error`|`string?`|Gegebenenfalls anzuzeigende Fehlermeldung|

## Anwendungsbeispiele

### Abstimmungsdaten mit Zod validieren

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

### Verwalten des Abstimmungsstatus in einer React-Komponente

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

### Umgang mit Abstimmungsfehlern

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

## Designhinweise

### Verhalten umschalten

Das Abstimmungssystem verwendet ein Umschaltmuster: Durch Aufrufen des Abstimmungsendpunkts für ein Element wird die Stimme des Benutzers entweder hinzugefügt oder entfernt. Das Feld `VoteResponse.hasVoted` zeigt den neuen Status nach dem Umschalten an.

### Zod + TypeScript-Integration

Der Typ `Vote` wird vom Zod-Schema abgeleitet und nicht separat definiert. Dadurch wird sichergestellt, dass die Laufzeitvalidierung und die Typprüfung zur Kompilierungszeit dieselbe Definition verwenden:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Client-Server-Statustrennung

- `Vote` stellt den Datenbankeintrag dar
- `VoteResponse` ist die API-Antwort nach einer Mutation
- `VoteState` ist der clientseitige UI-Status
- `VoteError` ist die Fehlerantwortstruktur

Durch diese Trennung bleiben die Bedenken zwischen der Datenschicht, der API-Schicht und der UI-Schicht klar.

## Verwandte Typen

- [`Comment`](./comment-types.md) – Ein weiterer Benutzerinteraktionstyp pro Element
- [`ItemData`](./item-types.md) – Das übergeordnete Element, zu dem die Stimmen gehören
