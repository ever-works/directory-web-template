---
id: vote-types
title: Definities van stemtypes
sidebar_label: Stemtypes
sidebar_position: 5
---

# Definities van stemtypes

**Bron:** `lib/types/vote.ts`

Met het stemsysteem kunnen gebruikers op items stemmen. Deze module definieert het stemgegevensschema met behulp van Zod voor runtime-validatie, samen met respons-, fout- en client-side statustypen.

## Zod-schema

### `voteSchema`

Het canonieke stemgegevensschema gedefinieerd met Zod. Dit dient zowel als runtime-validator als als bron voor het `Vote` TypeScript-type.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Soorten

### `Vote`

Het stemgegevenstype, afgeleid van `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Dit lost het volgende op:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|Veld|Typ|Beschrijving|
|-------|------|-------------|
|`id`|`string`|Unieke stem-ID|
|`userId`|`string`|ID van de gebruiker die de stem heeft uitgebracht|
|`itemId`|`string`|ID of slug van het gestemde item|
|`createdAt`|`Date`|Tijdstempel waarop de stem is uitgebracht|

### `VoteResponse`

API-antwoord geretourneerd na een stemwisselbewerking.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|Veld|Typ|Beschrijving|
|-------|------|-------------|
|`success`|`boolean`|Of de bewerking succesvol is voltooid|
|`voteCount`|`number`|Totaal aantal stemmen voor het item bijgewerkt|
|`hasVoted`|`boolean`|Of de huidige gebruiker na de bewerking heeft gestemd|
|`message`|`string?`|Optioneel statusbericht|

### `VoteError`

Foutreactiestructuur voor mislukte stembewerkingen.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|Veld|Typ|Beschrijving|
|-------|------|-------------|
|`error`|`string`|Voor mensen leesbare foutmelding|
|`code`|`string?`|Machineleesbare foutcode voor programmatische afhandeling|

### `VoteState`

Status aan de clientzijde voor de stem-UI-component. Wordt gebruikt met React-hooks om de stemstatus in de browser te beheren.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|Veld|Typ|Beschrijving|
|-------|------|-------------|
|`voteCount`|`number`|Het huidige totale aantal stemmen dat aan de gebruiker wordt weergegeven|
|`hasVoted`|`boolean`|Of de huidige gebruiker heeft gestemd (controleert knopstatus)|
|`isLoading`|`boolean`|Of er een stemoperatie gaande is (schakelt de knop uit)|
|`error`|`string?`|Eventuele foutmelding die moet worden weergegeven|

## Gebruiksvoorbeelden

### Stemgegevens valideren met Zod

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

### Stemstatus beheren in een React-component

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

### Stemfouten afhandelen

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

## Ontwerpnotities

### Schakel Gedrag in

Het stemsysteem maakt gebruik van een schakelpatroon: door het stemeindpunt voor een item aan te roepen, wordt de stem van de gebruiker toegevoegd of verwijderd. Het veld `VoteResponse.hasVoted` geeft de nieuwe status aan na het schakelen.

### Zod + TypeScript-integratie

Het type `Vote` is afgeleid van het Zod-schema en wordt niet afzonderlijk gedefinieerd. Dit zorgt ervoor dat runtime-validatie en typecontrole tijdens het compileren dezelfde definitie gebruiken:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Scheiding van client-serverstatus

- `Vote` vertegenwoordigt het databaserecord
- `VoteResponse` is het API-antwoord na een mutatie
- `VoteState` is de UI-status aan de clientzijde
- `VoteError` is de foutreactiestructuur

Deze scheiding zorgt ervoor dat er geen zorgen meer zijn tussen de datalaag, de API-laag en de UI-laag.

## Gerelateerde typen

- [`Comment`](./comment-types.md) - Een ander type gebruikersinteractie per item
- [`ItemData`](./item-types.md) - Het bovenliggende item waartoe de stemmen behoren
