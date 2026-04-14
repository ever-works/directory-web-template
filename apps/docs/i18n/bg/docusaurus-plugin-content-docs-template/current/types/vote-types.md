---
id: vote-types
title: Дефиниции на типа гласуване
sidebar_label: Видове гласове
sidebar_position: 5
---

# Дефиниции на типа гласуване

**Източник:** `lib/types/vote.ts`

Системата за гласуване позволява на потребителите да гласуват за елементи. Този модул дефинира схемата на данните за гласуване, използвайки Zod за валидиране по време на изпълнение, заедно с типове състояние на отговор, грешка и клиентска страна.

## Зод схема

### `voteSchema`

Каноничната схема на данни за гласуване, дефинирана със Zod. Това служи както като валидатор по време на изпълнение, така и като източник за типа `Vote` TypeScript.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Видове

### `Vote`

Типът данни за гласуване, изведен от `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Това решава:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`id`|`string`|Уникален идентификатор на гласуване|
|`userId`|`string`|ID на потребителя, който е гласувал|
|`itemId`|`string`|ID или охлюв на гласувания елемент|
|`createdAt`|`Date`|Времево клеймо, когато е подадено гласуването|

### `VoteResponse`

Отговор на API върнат след операция за превключване на гласуване.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`success`|`boolean`|Дали операцията е приключила успешно|
|`voteCount`|`number`|Актуализиран общ брой гласове за артикула|
|`hasVoted`|`boolean`|Дали текущият потребител е гласувал след операцията|
|`message`|`string?`|Съобщение за състояние по избор|

### `VoteError`

Структура на отговора за грешка при неуспешни гласуващи операции.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`error`|`string`|Човешкочетимо съобщение за грешка|
|`code`|`string?`|Машинно четим код за грешка за програмна обработка|

### `VoteState`

Състояние от страна на клиента за компонента на потребителския интерфейс за гласуване. Използва се с кукички на React за управление на състоянието на гласуване в браузъра.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`voteCount`|`number`|Текущ общ брой гласове, показван на потребителя|
|`hasVoted`|`boolean`|Дали текущият потребител е гласувал (контролира състоянието на бутона)|
|`isLoading`|`boolean`|Дали е в ход операция по гласуване (деактивира бутона)|
|`error`|`string?`|Съобщение за грешка за показване, ако има такова|

## Примери за използване

### Валидиране на данни за гласуване със Zod

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

### Управление на състоянието на гласуване в компонент на React

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

### Обработка на грешки при гласуване

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

## Бележки по дизайна

### Превключване на поведението

Системата за гласуване използва модел за превключване: извикването на крайната точка за гласуване за даден елемент добавя или премахва гласа на потребителя. Полето `VoteResponse.hasVoted` показва новото състояние след превключване.

### Zod + TypeScript интеграция

Типът `Vote` е получен от схемата на Zod, вместо да бъде дефиниран отделно. Това гарантира, че валидирането по време на изпълнение и проверката на типа по време на компилиране използват една и съща дефиниция:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Разделяне на състоянието клиент-сървър

- `Vote` представлява записът в базата данни
- `VoteResponse` е отговорът на API след мутация
- `VoteState` е състоянието на потребителския интерфейс от страна на клиента
- `VoteError` е структурата на отговора за грешка

Това разделяне поддържа ясни проблемите между слоя данни, API слоя и потребителския интерфейс.

## Свързани типове

- [`Comment`](./comment-types.md) - Друг тип взаимодействие с потребителя за всеки елемент
- [`ItemData`](./item-types.md) - Родителският елемент, на който принадлежат гласовете
