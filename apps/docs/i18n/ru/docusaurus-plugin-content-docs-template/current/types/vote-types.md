---
id: vote-types
title: Определения типов голосования
sidebar_label: Типы голосования
sidebar_position: 5
---

# Определения типов голосования

**Источник:** `lib/types/vote.ts`

Система голосования позволяет пользователям голосовать за элементы. Этот модуль определяет схему данных голосования с использованием Zod для проверки во время выполнения, а также типы ответов, ошибок и состояний на стороне клиента.

## Схема Зода

### `voteSchema`

Схема данных канонического голосования, определенная с помощью Zod. Он служит одновременно средством проверки среды выполнения и источником типа `Vote` TypeScript.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Типы

### `Vote`

Тип данных голосования, полученный из `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Это решает:

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
|`id`|`string`|Уникальный идентификатор голосования|
|`userId`|`string`|Идентификатор пользователя, отдавшего голос|
|`itemId`|`string`|Идентификатор или номер проголосованного элемента|
|`createdAt`|`Date`|Временная метка, когда было подано голосование|

### `VoteResponse`

Ответ API возвращается после операции переключения голосования.

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
|`success`|`boolean`|Завершилась ли операция успешно|
|`voteCount`|`number`|Обновлено общее количество голосов за предмет.|
|`hasVoted`|`boolean`|Проголосовал ли текущий пользователь после операции|
|`message`|`string?`|Дополнительное сообщение о состоянии|

### `VoteError`

Структура ответа на ошибку для неудачных операций голосования.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`error`|`string`|Читабельное сообщение об ошибке|
|`code`|`string?`|Машиночитаемый код ошибки для программной обработки|

### `VoteState`

Состояние на стороне клиента для компонента пользовательского интерфейса голосования. Используется с хуками React для управления состоянием голосования в браузере.

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
|`voteCount`|`number`|Текущее общее количество голосов, отображаемое пользователю|
|`hasVoted`|`boolean`|Проголосовал ли текущий пользователь (управляет состоянием кнопки)|
|`isLoading`|`boolean`|Выполняется ли операция голосования (отключает кнопку)|
|`error`|`string?`|Сообщение об ошибке для отображения, если таковое имеется|

## Примеры использования

### Проверка данных голосования с помощью Zod

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

### Управление состоянием голосования в компоненте React

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

### Обработка ошибок голосования

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

## Примечания к проектированию

### Переключить поведение

В системе голосования используется шаблон переключения: вызов конечной точки голосования для элемента либо добавляет, либо удаляет голос пользователя. Поле `VoteResponse.hasVoted` указывает новое состояние после переключения.

### Интеграция Zod + TypeScript

Тип `Vote` получен из схемы Zod, а не определен отдельно. Это гарантирует, что проверка типа во время выполнения и проверка типа во время компиляции используют одно и то же определение:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Разделение состояний клиент-сервер

- `Vote` представляет запись базы данных.
- `VoteResponse` — это ответ API после мутации.
- `VoteState` — состояние пользовательского интерфейса на стороне клиента.
- `VoteError` — структура ответа на ошибку.

Такое разделение позволяет четко понять проблемы между уровнем данных, уровнем API и уровнем пользовательского интерфейса.

## Связанные типы

- [`Comment`](./comment-types.md) — еще один тип взаимодействия с пользователем для каждого элемента.
- [`ItemData`](./item-types.md) — родительский элемент, к которому принадлежат голоса.
