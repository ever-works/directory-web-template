---
id: favorites-system
title: Система за предпочитани
sidebar_label: Любими
sidebar_position: 33
---

# Система за предпочитани

Функцията за любими позволява на удостоверените потребители да отбелязват елементи от директорията за бърз достъп. Той включва специална страница с любими, оптимистични актуализации на потребителския интерфейс, пълен REST API, подкрепен от PostgreSQL, и интеграция с флагове на функции за условно изобразяване.

## Преглед на архитектурата

```
hooks/
  use-favorites.ts           # React Query hook with optimistic mutations

components/favorites/
  favorites-client.tsx       # Full favorites page with grid, sorting, pagination

app/api/favorites/
  route.ts                   # GET (list) and POST (add) endpoints
  [itemSlug]/route.ts        # DELETE endpoint for removing a favorite

lib/db/schema.ts             # favorites table definition
```

## Схема на база данни

Таблицата `favorites` съхранява връзки на отметки между потребители и елементи:

```ts
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemSlug: text('item_slug').notNull(),
  itemName: text('item_name').notNull(),
  itemIconUrl: text('item_icon_url'),
  itemCategory: text('item_category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
  userIdIndex: index('favorites_user_id_idx').on(table.userId),
  itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
  createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
}));
```

### Дизайнерски решения

- **Денормализирани метаданни** -- `itemName` , `itemIconUrl` и `itemCategory` се съхраняват заедно с охлюва, така че списъкът с любими се изобразява, без да се присъединява към таблицата с елементи.
- **Композитно уникално ограничение** -- индексът `(userId, itemSlug)` предотвратява дублиране на предпочитани на ниво база данни.
- **Индексирани търсения** -- отделни индекси на `userId` , `itemSlug` и `createdAt` оптимизират общи модели на заявки за изброяване, преброяване и хронологично подреждане.

## useFavorites Hook

Основният API от страна на клиента с пълна поддръжка за оптимистична актуализация:

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

### Върната стойност

| Имот | Тип | Описание |
|----------|------|-------------|
| `favorites` | `Favorite[]` | Текущ списък с любими потребители |
| `isLoading` | `boolean` | Вярно по време на първоначалното извличане |
| `error` | `Error \| null` | Грешка при извличане, ако има такава |
| `refetch` | `() => void` | Ръчно повторно извличане на любими |
| `isFavorited` | `(slug: string) => boolean` | Проверете дали даден елемент е маркиран |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Добавяне или премахване въз основа на текущото състояние |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Изрично добавете любим |
| `removeFavorite` | `(slug: string) => void` | Изрично премахване на любим |
| `isAdding` | `boolean` | Вярно, докато добавянето на мутация е в полет |
| `isRemoving` | `boolean` | Вярно, докато премахването на мутацията е в полет |

### Оптимистичен поток на актуализиране

Както добавянето, така и премахването на мутации следват оптимистичния модел за актуализиране на React Query:

1. ** `onMutate` ** -- анулиране на заявки по време на полет, снимка на предишното състояние, незабавно прилагане на оптимистичната промяна. Добавете мутации, създайте временен фаворит с `temp-` префикс ID.
2. ** `onError` ** -- връщане към моментната снимка, ако извикването на API е неуспешно, показване на съобщение за грешка.
3. ** `onSuccess` ** -- заменете оптимистичния запис с потвърдени от сървъра данни. Мутацията за добавяне интелигентно замества временния запис чрез съпоставяне на `itemSlug` , предотвратявайки дубликати.

Невалидността `onSettled` е умишлено пропусната, за да се избегнат ненужни повторни извличания. Оптимистичната актуализация плюс `onSuccess` актуализация на кеша осигуряват достатъчна последователност.

### Интегриране на флаг на функция

Заявката е разрешена само когато са изпълнени и двете условия:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

Когато флагът на функцията `favorites` е деактивиран или потребителят не е удостоверен, куката връща празен масив, без да прави никакви мрежови заявки.

### Използване

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## API крайни точки

### ВЗЕМЕТЕ /api/favorites

Връща всички любими за удостоверения потребител, подредени по дата на създаване.

### ПУБЛИКУВАЙТЕ /api/favorites

Добавя елемент към любими. Валидира със Zod и проверява за дубликати (връща 409 при конфликт).

| Поле | Задължително | Описание |
|-------|----------|-------------|
| `itemSlug` | Да | Уникален идентификатор на артикул |
| `itemName` | Да | Показвано име за списъка с предпочитани |
| `itemIconUrl` | Не | URL адрес на икона за изобразяване |
| `itemCategory` | Не | Етикет на категория |

### ИЗТРИВАНЕ /api/favorites/[itemSlug]

Премахва конкретен елемент от любимите на потребителя чрез slug. Връща 404, ако не бъде намерен.

## Страница с любими

Компонентът `FavoritesClient` изобразява цялата страница с любими:

1. **Вход за удостоверяване** -- подкана за влизане за неавтентифицирани потребители.
2. **Скелет за зареждане** -- Заместител на решетка с 8 карти по време на първоначалното извличане.
3. **Състояние на грешка** -- съобщение за грешка с бутон за повторен опит.
4. **Празно състояние** -- съобщение с резервна секция "популярни елементи".
5. **Решетка с любими** -- елементи, показани със сортиране, пагиниране и превключване на оформлението.

### Опции за сортиране

| Стойност | Етикет |
|-------|-------|
| `popularity` | Популярност |
| `name-asc` | Име A-Z |
| `name-desc` | Име Я-А |
| `date-asc` | Най-старият |

### Интеграция на оформлението

Страницата се интегрира с `useLayoutTheme()` за превключване на изгледите на мрежа/списък/карта. Над елементите се появяват `ViewToggle` и `SortMenu` . Пагинацията от страна на клиента разделя любимите на страници по 12, с `clampAndScrollToTop` при промяна на страницата.

## Синхронизиране между устройства

Любимите се съхраняват от страна на сървъра в PostgreSQL, така че те се синхронизират автоматично между устройствата, когато потребителят е удостоверен. Кешът на React Query с 5-минутно време на изчакване балансира свежестта с производителността. Ръчното синхронизиране е достъпно чрез функцията `refetch` .

## Достъпност

- Любимият бутон за превключване се деактивира по време на чакащи мутации, за да се предотвратят двойни действия.
- Тост известията осигуряват обратна връзка както за успешни, така и за неуспешни операции.
- Мрежата на любимите страници използва същите достъпни компоненти на картата като основния списък.
- Празните състояния и състоянията на грешка включват активни елементи за навигация от клавиатурата.

## Свързана документация

- [Флагове за функции](/docs/template/configuration/feature-config) -- Активиране/деактивиране на функцията за любими
- [Компоненти на споделени карти](/docs/template/components/shared-card-components) -- Изобразяване на карти в мрежата с любими
– [Доставчици на контекст](/docs/template/components/context-providers) – Интегриране на тема на оформлението
- [Компоненти на таблото за управление](/docs/template/components/dashboard-components) -- Броят на любимите в анализите
