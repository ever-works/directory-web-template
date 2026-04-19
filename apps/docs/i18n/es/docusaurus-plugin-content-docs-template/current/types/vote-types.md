---
id: vote-types
title: Definiciones de tipos de voto
sidebar_label: Tipos de voto
sidebar_position: 5
---

# Definiciones de tipos de voto

**Fuente:** `lib/types/vote.ts`

El sistema de votación permite a los usuarios votar a favor de los elementos. Este módulo define el esquema de datos de votación utilizando Zod para la validación en tiempo de ejecución, junto con los tipos de respuesta, error y estado del lado del cliente.

## Esquema Zod

### `voteSchema`

El esquema de datos de voto canónico definido con Zod. Esto sirve como validador de tiempo de ejecución y fuente para el tipo `Vote` TypeScript.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Tipos

### `Vote`

El tipo de datos de voto, inferido de `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Esto resuelve:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|campo|Tipo|Descripción|
|-------|------|-------------|
|`id`|`string`|Identificador de voto único|
|`userId`|`string`|ID del usuario que emitió el voto|
|`itemId`|`string`|ID o slug del artículo votado|
|`createdAt`|`Date`|Marca de tiempo en la que se emitió el voto.|

### `VoteResponse`

Se devolvió la respuesta API después de una operación de alternancia de votación.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|campo|Tipo|Descripción|
|-------|------|-------------|
|`success`|`boolean`|Si la operación se completó con éxito|
|`voteCount`|`number`|Recuento total de votos actualizado para el artículo.|
|`hasVoted`|`boolean`|Si el usuario actual ha votado después de la operación|
|`message`|`string?`|Mensaje de estado opcional|

### `VoteError`

Estructura de respuesta de error para operaciones de votación fallidas.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|campo|Tipo|Descripción|
|-------|------|-------------|
|`error`|`string`|Mensaje de error legible por humanos|
|`code`|`string?`|Código de error legible por máquina para manejo programático|

### `VoteState`

Estado del lado del cliente para el componente de la interfaz de usuario de votación. Se utiliza con ganchos de React para administrar el estado de la votación en el navegador.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|campo|Tipo|Descripción|
|-------|------|-------------|
|`voteCount`|`number`|El recuento total de votos actual se muestra al usuario|
|`hasVoted`|`boolean`|Si el usuario actual ha votado (controla el estado del botón)|
|`isLoading`|`boolean`|Si hay una operación de votación en curso (desactiva el botón)|
|`error`|`string?`|Mensaje de error a mostrar, si lo hubiera|

## Ejemplos de uso

### Validar datos de voto con Zod

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

### Gestionar el estado de los votos en un componente de React

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

### Manejo de errores de votación

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

## Notas de diseño

### Alternar comportamiento

El sistema de votación utiliza un patrón de alternancia: llamar al punto final de votación para un elemento agrega o elimina el voto del usuario. El campo `VoteResponse.hasVoted` indica el nuevo estado después de la conmutación.

### Integración Zod + TypeScript

El tipo `Vote` se deriva del esquema Zod en lugar de definirse por separado. Esto garantiza que la validación en tiempo de ejecución y la verificación de tipos en tiempo de compilación utilicen la misma definición:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Separación de estados cliente-servidor

- `Vote` representa el registro de la base de datos
- `VoteResponse` es la respuesta API después de una mutación
- `VoteState` es el estado de la interfaz de usuario del lado del cliente
- `VoteError` es la estructura de respuesta de error

Esta separación mantiene claras las preocupaciones entre la capa de datos, la capa API y la capa UI.

## Tipos relacionados

- [`Comment`](./comment-types.md): otro tipo de interacción de usuario por elemento
- [`ItemData`](./item-types.md): el elemento principal al que pertenecen los votos
