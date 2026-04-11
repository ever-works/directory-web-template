---
id: voting-comments-deep-dive
title: Гласуване и коментари Дълбоко гмуркане
sidebar_label: Гласуване и коментари Дълбоко гмуркане
sidebar_position: 36
---

# Гласуване и коментари Задълбочено гмуркане

Това задълбочено гмуркане обхваща вътрешната механика на системите за гласуване и коментиране, включително оптимистични алгоритми за актуализиране, стратегии за управление на кеша, агрегиране на рейтинги, координиране на междукомпонентни събития и работни процеси за модериране на администратори.

## Преглед на архитектурата

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

## Вътрешни елементи на системата за гласуване

### useItemVote Hook

Куката управлява състоянието на гласуване за един елемент с пълна поддръжка за оптимистична актуализация:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Гласуване State Machine

Функцията `handleVote` имплементира държавна машина, базирана на превключване:

| Текущо състояние | Действие | Резултат | Нетна промяна |
|--------------|--------|--------|------------|
| Без гласуване | Щракнете нагоре | Гласуване за | +1 |
| Без гласуване | Щракнете Надолу | Гласуване против | -1 |
| Гласуван за | Щракнете нагоре | Премахване на гласа (изключване) | -1 |
| Гласуван за | Щракнете Надолу | Превключване към гласуване против | -2 |
| Гласуван против | Щракнете Надолу | Премахване на гласа (изключване) | +1 |
| Гласуван против | Щракнете нагоре | Превключване към гласуване за | +2 |

Когато текущият глас на потребителя съответства на искания тип, куката извиква `unvote()` (DELETE). В противен случай извиква `vote(type)` (POST).

### Оптимистично броене

Оптимистичната актуализация изчислява разликата в броя, без да чака сървъра:

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

Изчислението `countDiff` обработва три случая: изключване (изваждане на 1), ново гласуване (добавяне на 1) и превключване на посоката (добавете 2 за пълен размах).

### Вход за удостоверяване

На неупълномощени потребители, които се опитват да гласуват, се показва модал за влизане, вместо да получат грешка:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

Грешката се улавя от манипулатора `onError` на мутацията, който проверява за съобщението за удостоверяване и потиска съобщението за грешка.

### Конфигурация на заявката

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Vote Cache Utilities

Куката `useVoteCache` осигурява междукомпонентни кеш операции:

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

## Коментари Вътрешни елементи на системата

### useComments Hook

Куката осигурява пълни CRUD операции с интегрирана поддръжка за оценка:

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

### Върната стойност

| Имот | Тип | Описание |
|----------|------|-------------|
| `comments` | `CommentWithUser[]` | Коментари с попълнени потребителски данни |
| `isPending` | `boolean` | Вярно по време на първоначалното извличане |
| `createComment` | `(data) => Promise` | Създайте нов коментар |
| `updateComment` | `(data) => Promise` | Редактиране на съществуващ коментар |
| `deleteComment` | `(id) => Promise` | Премахване на коментар |
| `rateComment` | `(data) => void` | Оценете коментар |
| `updateCommentRating` | `(data) => void` | Актуализиране на съществуваща оценка |
| `commentRating` | `number` | Обща оценка за артикула |

### Кръстокомпонентна система за събития

Системата за коментари изпраща персонализирани DOM събития за координация между компоненти, които не споделят кеш ключове на React Query:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

Това позволява на компоненти като заглавката на детайлите на елемента (което показва броя на коментарите) да реагират на промените в коментарите, без да бъдат директно свързани със заявката за коментари.

### Агрегиране на рейтинги

Коментарите и оценките са тясно интегрирани. След всяка мутация на коментар (създаване, актуализиране, изтриване), куката принуждава повторно извличане на оценката на елемента:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

Това гарантира, че показваната оценка със звезди се актуализира веднага след като потребителят изпрати или редактира рецензия.

### Стабилност на заявката

Заявката за коментари използва консервативни настройки за опресняване, за да предотврати трептенето на потребителския интерфейс:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Администраторско модериране

### useAdminComments Hook

Куката за модериране на администратора осигурява управление на коментари с страници:

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

### Работен процес на модериране

1. Администраторът навигира до страницата за управление на коментари.
2. Коментарите се показват с търсене и пагинация.
3. Състоянието `isDeleting` проследява кой коментар се премахва, дезактивирайки неговия ред.
4. Изтриването задейства известие до автора на коментара чрез `NotificationService` .

## API крайни точки

| Метод | Крайна точка | Описание |
|--------|----------|-------------|
| ВЗЕМЕТЕ | `/api/items/:id/votes` | Извличане на броя на гласовете и вота на потребителя |
| ПУБЛИКАЦИЯ | `/api/items/:id/votes` | Дайте или променете глас |
| ИЗТРИВАНЕ | `/api/items/:id/votes` | Премахване на глас |
| ВЗЕМЕТЕ | `/api/items/:id/comments` | Извличане на коментари с потребителски данни |
| ПУБЛИКАЦИЯ | `/api/items/:id/comments` | Създайте нов коментар |
| ПОСТАВЕТЕ | `/api/items/:id/comments/:commentId` | Актуализиране на коментар |
| ИЗТРИВАНЕ | `/api/items/:id/comments/:commentId` | Изтриване на коментар |
| ПУБЛИКАЦИЯ | `/api/items/:id/comments/rating` | Оценете коментар |
| ПОСТАВЕТЕ | `/api/items/:id/comments/rating` | Актуализиране на оценка на коментар |
| ВЗЕМЕТЕ | `/api/items/:id/comments/rating` | Вземете обобщена оценка на артикул |

## Интегриране на флаг за функции

И гласуването, и коментарите зачитат флаговете на функциите:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

Когато базата данни не е конфигурирана, тези функции се деактивират автоматично.

## Достъпност

- Бутоните за гласуване използват `aria-pressed` , за да покажат текущото състояние на гласуване.
- Модалът за влизане, задействан от неавтентифицирани опити за гласуване, е прихванат във фокуса.
- Формулярите за коментари използват правилни `<label>` асоциации и съобщения за валидиране.
- Компонентът за оценка със звезди поддържа навигация от клавиатурата с клавиши със стрелки.
- Таблиците за модериране на администратора включват индикатори за състояние на ниво ред и действия, достъпни от клавиатурата.
- Състоянията на зареждане и грешка осигуряват съответно `aria-busy` и `role="alert"` атрибути.

## Свързана документация

- [Общ преглед на гласуване и коментари](/docs/template/features/voting-comments) -- Общ преглед на функциите на високо ниво
- [Компоненти на детайлите на артикула](/docs/template/components/item-detail-components) -- Където се рендират гласове и коментари
- [Система за уведомяване](/docs/template/features/notification-system) -- Известия, задействани от коментари
- [Компоненти на таблото за управление](/docs/template/components/dashboard-components) - Гласуване и анализ на коментари
