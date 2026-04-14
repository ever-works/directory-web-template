---
id: vote-types
title: Définitions des types de vote
sidebar_label: Types de votes
sidebar_position: 5
---

# Définitions des types de vote

**Source :** `lib/types/vote.ts`

Le système de vote permet aux utilisateurs de voter pour des éléments. Ce module définit le schéma de données de vote à l'aide de Zod pour la validation d'exécution, ainsi que les types de réponse, d'erreur et d'état côté client.

## Schéma Zod

### `voteSchema`

Le schéma canonique de données de vote défini avec Zod. Cela sert à la fois de validateur d'exécution et de source pour le type `Vote` TypeScript.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Espèces

### `Vote`

Le type de données de vote, déduit de `voteSchema` :

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Cela résout :

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|Champ|Tapez|Descriptif|
|-------|------|-------------|
|`id`|`string`|Identifiant de vote unique|
|`userId`|`string`|ID de l'utilisateur qui a voté|
|`itemId`|`string`|ID ou slug de l'élément voté|
|`createdAt`|`Date`|Horodatage du vote|

### `VoteResponse`

Réponse de l'API renvoyée après une opération de basculement de vote.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|Champ|Tapez|Descriptif|
|-------|------|-------------|
|`success`|`boolean`|Si l'opération s'est terminée avec succès|
|`voteCount`|`number`|Nombre total de votes mis à jour pour l'élément|
|`hasVoted`|`boolean`|Si l'utilisateur actuel a voté après l'opération|
|`message`|`string?`|Message d'état facultatif|

### `VoteError`

Structure de réponse aux erreurs pour les opérations de vote ayant échoué.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|Champ|Tapez|Descriptif|
|-------|------|-------------|
|`error`|`string`|Message d'erreur lisible par l'homme|
|`code`|`string?`|Code d'erreur lisible par machine pour la gestion programmatique|

### `VoteState`

État côté client pour le composant de l’interface utilisateur de vote. Utilisé avec les hooks React pour gérer l'état du vote dans le navigateur.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|Champ|Tapez|Descriptif|
|-------|------|-------------|
|`voteCount`|`number`|Nombre total de votes actuel affiché à l'utilisateur|
|`hasVoted`|`boolean`|Si l'utilisateur actuel a voté (contrôle l'état du bouton)|
|`isLoading`|`boolean`|Si une opération de vote est en cours (désactive le bouton)|
|`error`|`string?`|Message d'erreur à afficher, le cas échéant|

## Exemples d'utilisation

### Valider les données de vote avec Zod

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

### Gestion de l'état du vote dans un composant React

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

### Gestion des erreurs de vote

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

## Notes de conception

### Basculer le comportement

Le système de vote utilise un modèle de bascule : l'appel du point de terminaison de vote pour un élément ajoute ou supprime le vote de l'utilisateur. Le champ `VoteResponse.hasVoted` indique le nouvel état après basculement.

### Intégration Zod + TypeScript

Le type `Vote` est dérivé du schéma Zod plutôt que d'être défini séparément. Cela garantit que la validation à l'exécution et la vérification du type à la compilation utilisent la même définition :

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Séparation d'état client-serveur

- `Vote` représente l'enregistrement de la base de données
- `VoteResponse` est la réponse de l'API après une mutation
- `VoteState` est l'état de l'interface utilisateur côté client
- `VoteError` est la structure de réponse d'erreur

Cette séparation permet de clarifier les préoccupations entre la couche de données, la couche API et la couche UI.

## Types associés

- [`Comment`](./comment-types.md) - Un autre type d'interaction utilisateur par élément
- [`ItemData`](./item-types.md) - L'élément parent auquel appartiennent les votes
