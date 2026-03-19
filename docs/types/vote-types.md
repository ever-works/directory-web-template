---
id: vote-types
title: Vote Type Definitions
sidebar_label: Vote Types
sidebar_position: 5
---

# Vote Type Definitions

**Source:** `lib/types/vote.ts`

The vote system allows users to upvote items. This module defines the vote data schema using Zod for runtime validation, along with response, error, and client-side state types.

## Zod Schema

### `voteSchema`

The canonical vote data schema defined with Zod. This serves as both the runtime validator and the source for the `Vote` TypeScript type.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Types

### `Vote`

The vote data type, inferred from `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

This resolves to:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique vote identifier |
| `userId` | `string` | ID of the user who cast the vote |
| `itemId` | `string` | ID or slug of the voted item |
| `createdAt` | `Date` | Timestamp when the vote was cast |

### `VoteResponse`

API response returned after a vote toggle operation.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the operation completed successfully |
| `voteCount` | `number` | Updated total vote count for the item |
| `hasVoted` | `boolean` | Whether the current user has voted after the operation |
| `message` | `string?` | Optional status message |

### `VoteError`

Error response structure for failed vote operations.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | `string` | Human-readable error message |
| `code` | `string?` | Machine-readable error code for programmatic handling |

### `VoteState`

Client-side state for the vote UI component. Used with React hooks to manage vote state in the browser.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `voteCount` | `number` | Current total vote count displayed to the user |
| `hasVoted` | `boolean` | Whether the current user has voted (controls button state) |
| `isLoading` | `boolean` | Whether a vote operation is in progress (disables the button) |
| `error` | `string?` | Error message to display, if any |

## Usage Examples

### Validating vote data with Zod

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

### Managing vote state in a React component

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

### Handling vote errors

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

## Design Notes

### Toggle Behavior

The vote system uses a toggle pattern: calling the vote endpoint for an item either adds or removes the user's vote. The `VoteResponse.hasVoted` field indicates the new state after toggling.

### Zod + TypeScript Integration

The `Vote` type is derived from the Zod schema rather than being defined separately. This ensures that runtime validation and compile-time type checking use the same definition:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Client-Server State Separation

- `Vote` represents the database record
- `VoteResponse` is the API response after a mutation
- `VoteState` is the client-side UI state
- `VoteError` is the error response structure

This separation keeps concerns clear between the data layer, API layer, and UI layer.

## Related Types

- [`Comment`](./comment-types.md) - Another per-item user interaction type
- [`ItemData`](./item-types.md) - The parent item that votes belong to
