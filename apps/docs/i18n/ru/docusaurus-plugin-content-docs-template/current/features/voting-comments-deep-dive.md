---
id: voting-comments-deep-dive
title: Голосование и комментарии Подробное описание
sidebar_label: Голосование и комментарии Подробное описание
sidebar_position: 36
---

# Голосование и комментарии Подробное описание

В этом глубоком обзоре рассматривается внутренняя механика систем голосования и комментирования, включая оптимистичные алгоритмы обновления, стратегии управления кэшем, агрегирование рейтингов, межкомпонентную координацию событий и рабочие процессы модерации администратора.

## Обзор архитектуры

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

## Внутреннее устройство системы голосования

### хук useItemVote

Хук управляет состоянием голосования для одного элемента с полной поддержкой оптимистических обновлений:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Государственный автомат голосования

Функция `handleVote` реализует конечный автомат на основе переключателей:

| Текущее состояние | Действие | Результат | Чистое изменение |
|--------------|--------|--------|------------|
| Нет голосования | Нажмите вверх | Проголосовать за | +1 |
| Нет голосования | Нажмите «Вниз» | Понизить голос | -1 |
| Проголосовали за | Нажмите вверх | Удалить голосование (выключить) | -1 |
| Проголосовали за | Нажмите «Вниз» | Переключиться на отрицательный голос | -2 |
| Проголосовано отрицательно | Нажмите «Вниз» | Удалить голосование (выключить) | +1 |
| Проголосовано отрицательно | Нажмите вверх | Переключиться на голосование | +2 |

Когда текущий голос пользователя соответствует запрошенному типу, перехватчик вызывает `unvote()` (DELETE). В противном случае он вызывает `vote(type)` (POST).

### Оптимистический расчет

Оптимистическое обновление вычисляет разницу счетчиков, не дожидаясь ответа сервера:

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

Вычисление `countDiff` обрабатывает три случая: выключение (вычитаем 1), новое голосование (добавляем 1) и переключение направления (добавляем 2 для полного хода).

### Шлюз аутентификации

Неаутентифицированным пользователям, которые пытаются проголосовать, вместо сообщения об ошибке отображается модальное окно входа:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

Ошибка перехватывается обработчиком мутации `onError` , который проверяет сообщение аутентификации и подавляет всплывающее сообщение об ошибке.

### Конфигурация запроса

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Утилиты кэширования голосов

Хук `useVoteCache` обеспечивает операции кросс-компонентного кэширования:

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

## Комментарии Внутреннее устройство системы

### использовать крючок для комментариев

Хук обеспечивает полные операции CRUD со встроенной поддержкой рейтингов:

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

### Возвращаемое значение

| Недвижимость | Тип | Описание |
|----------|------|-------------|
| `comments` | `CommentWithUser[]` | Комментарии с заполненными пользовательскими данными |
| `isPending` | `boolean` | True во время первоначальной выборки |
| `createComment` | `(data) => Promise` | Создать новый комментарий |
| `updateComment` | `(data) => Promise` | Редактировать существующий комментарий |
| `deleteComment` | `(id) => Promise` | Удалить комментарий |
| `rateComment` | `(data) => void` | Оценить комментарий |
| `updateCommentRating` | `(data) => void` | Обновить существующий рейтинг |
| `commentRating` | `number` | Совокупный рейтинг товара |

### Межкомпонентная система событий

Система комментариев отправляет пользовательские события DOM для координации между компонентами, которые не используют общие ключи кэша React Query:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

Это позволяет таким компонентам, как заголовок сведений об элементе (который показывает количество комментариев), реагировать на изменения комментариев без прямой связи с запросом комментариев.

### Агрегация рейтингов

Комментарии и рейтинги тесно интегрированы. После любой мутации комментария (создание, обновление, удаление) хук вызывает повторную выборку рейтинга элемента:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

Это гарантирует, что звездный рейтинг будет обновляться сразу после того, как пользователь отправит или отредактирует отзыв.

### Стабильность запросов

В запросе комментариев используются консервативные настройки обновления, чтобы предотвратить мерцание пользовательского интерфейса:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Модерация администратора

### useAdminComments Hook

Хук модерации администратора обеспечивает управление комментариями с разбивкой по страницам:

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

### Рабочий процесс модерации

1. Администратор переходит на страницу управления комментариями.
2. Комментарии отображаются с поиском и нумерацией страниц.
3. Состояние `isDeleting` отслеживает, какой комментарий удаляется, отключая его строку.
4. При удалении автору комментария будет отправлено уведомление через `NotificationService` .

## Конечные точки API

| Метод | Конечная точка | Описание |
|--------|----------|-------------|
| ПОЛУЧИТЬ | `/api/items/:id/votes` | Получение подсчета голосов и голосов пользователей |
| ПОСТ | `/api/items/:id/votes` | Отдать или изменить голос |
| УДАЛИТЬ | `/api/items/:id/votes` | Удалить голос |
| ПОЛУЧИТЬ | `/api/items/:id/comments` | Получение комментариев с пользовательскими данными |
| ПОСТ | `/api/items/:id/comments` | Создать новый комментарий |
| ПУТЬ | `/api/items/:id/comments/:commentId` | Обновить комментарий |
| УДАЛИТЬ | `/api/items/:id/comments/:commentId` | Удалить комментарий |
| ПОСТ | `/api/items/:id/comments/rating` | Оценить комментарий |
| ПУТЬ | `/api/items/:id/comments/rating` | Обновить рейтинг комментариев |
| ПОЛУЧИТЬ | `/api/items/:id/comments/rating` | Получить совокупный рейтинг товара |

## Интеграция флагов функций

И голосование, и комментарии учитывают флаги функций:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

Если база данных не настроена, эти функции автоматически отключаются.

## Доступность

- Кнопки голосования используют `aria-pressed` для обозначения текущего состояния голосования.
- Модальное окно входа, вызванное неаутентифицированными попытками голосования, захватывается фокусом.
- В формах комментариев используются правильные ассоциации `<label>` и сообщения проверки.
- Компонент звездного рейтинга поддерживает навигацию с помощью клавиш со стрелками.
- Таблицы модерации администратора включают индикаторы состояния на уровне строк и действия, доступные с клавиатуры.
- Состояния загрузки и ошибки имеют атрибуты `aria-busy` и `role="alert"` соответственно.

## Сопутствующая документация

- [Обзор голосования и комментариев](/docs/template/features/voting-comments) – общий обзор функций.
- [Компоненты сведений об элементе](/docs/template/comComponents/item-detail-comComponents) – где отображаются голоса и комментарии.
- [Система уведомлений](/docs/template/features/notification-system) – уведомления, активируемые комментариями.
- [Компоненты информационной панели](/docs/template/comComponents/dashboard-comComponents) - Аналитика голосования и комментариев.
