---
id: favorites-system
title: Система избранного
sidebar_label: Избранное
sidebar_position: 33
---

# Система избранного

Функция избранного позволяет прошедшим проверку подлинности пользователям добавлять элементы каталога в закладки для быстрого доступа. Он включает в себя специальную страницу избранного, оптимистичные обновления пользовательского интерфейса, полный REST API на базе PostgreSQL и интеграцию с флагами функций для условного рендеринга.

## Обзор архитектуры

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

## Схема базы данных

В таблице `favorites` хранятся отношения закладок между пользователями и элементами:

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

### Дизайнерские решения

- **Денормализованные метаданные** – `itemName` , `itemIconUrl` и `itemCategory` хранятся рядом с фрагментом, поэтому список избранного отображается без присоединения к таблице элементов.
- **Составное уникальное ограничение** – индекс `(userId, itemSlug)` предотвращает дублирование избранного на уровне базы данных.
- **Индексированный поиск** – отдельные индексы по `userId` , `itemSlug` и `createdAt` оптимизируют общие шаблоны запросов для составления списков, подсчета и хронологического упорядочения.

## useFavorites Hook

Основной клиентский API с полной поддержкой оптимистичных обновлений:

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

### Возвращаемое значение

| Недвижимость | Тип | Описание |
|----------|------|-------------|
| `favorites` | `Favorite[]` | Текущий список избранного пользователя |
| `isLoading` | `boolean` | True во время первоначальной выборки |
| `error` | `Error \| null` | Получить ошибку, если таковая имеется |
| `refetch` | `() => void` | Повторно загрузить избранное вручную |
| `isFavorited` | `(slug: string) => boolean` | Проверьте, добавлен ли элемент в закладки |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Добавить или удалить в зависимости от текущего состояния |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Явно добавить избранное |
| `removeFavorite` | `(slug: string) => void` | Явно удалить избранное |
| `isAdding` | `boolean` | Правда, пока мутация add находится в стадии разработки |
| `isRemoving` | `boolean` | Правда, пока мутация удаления находится в полете |

### Оптимистичный процесс обновления

Как добавление, так и удаление мутаций соответствует шаблону оптимистического обновления React Query:

1. ** `onMutate` ** — отменить текущие запросы, сделать снимок предыдущего состояния, немедленно применить оптимистические изменения. Добавление мутаций создает временный фаворит с идентификатором с префиксом `temp-` .
2. ** `onError` ** — откат к снимку, если вызов API не удался, отобразить всплывающее сообщение об ошибке.
3. ** `onSuccess` ** — замените оптимистичную запись данными, подтвержденными сервером. Мутация add разумно заменяет временную запись сопоставлением `itemSlug` , предотвращая дублирование.

Недействительность `onSettled` намеренно опущена, чтобы избежать ненужных повторных выборок. Оптимистичное обновление плюс обновление кэша `onSuccess` обеспечивают достаточную согласованность.

### Интеграция флагов функций

Запрос активен только при выполнении обоих условий:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

Когда флаг функции `favorites` отключен или пользователь не аутентифицирован, перехватчик возвращает пустой массив без каких-либо сетевых запросов.

### Использование

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

## Конечные точки API

### ПОЛУЧИТЬ /api/favorites

Возвращает все избранное для аутентифицированного пользователя, упорядоченное по дате создания.

### POST /api/favorites

Добавляет элемент в избранное. Проверяет с помощью Zod и проверяет наличие дубликатов (в случае конфликта возвращает 409).

| Поле | Требуется | Описание |
|-------|----------|-------------|
| `itemSlug` | Да | Уникальный идентификатор товара |
| `itemName` | Да | Отображаемое имя для списка избранного |
| `itemIconUrl` | Нет | URL-адрес значка для рендеринга |
| `itemCategory` | Нет | Ярлык категории |

### УДАЛИТЬ /api/favorites/[itemSlug]

Удаляет определенный элемент из избранного пользователя с помощью пули. Возвращает 404, если не найден.

## Страница избранного

Компонент `FavoritesClient` отображает полную страницу избранного:

1. **Шлюз аутентификации** – приглашение на вход для неаутентифицированных пользователей.
2. **Загрузка скелета** – заполнитель сетки из 8 карточек при первоначальной выборке.
3. **Состояние ошибки** — сообщение об ошибке с кнопкой повтора.
4. **Пустое состояние** – сообщение с резервным разделом "Популярные элементы".
5. **Сетка избранного** – элементы отображаются с сортировкой, нумерацией страниц и переключением макета.

### Параметры сортировки

| Значение | Этикетка |
|-------|-------|
| `popularity` | Популярность |
| `name-asc` | Имя от А до Я |
| `name-desc` | Имя Z-A |
| `date-asc` | Самый старый |

### Интеграция макета

Страница интегрирована с `useLayoutTheme()` для переключения вида сетки/списка/карточки. Над элементами появляются `ViewToggle` и `SortMenu` . Пагинация на стороне клиента делит избранное на страницы по 12, при этом при смене страницы отображается `clampAndScrollToTop` .

## Синхронизация между устройствами

Избранное хранится на стороне сервера в PostgreSQL, поэтому оно автоматически синхронизируется между устройствами при аутентификации пользователя. Кэш запросов React с 5-минутным временем хранения обеспечивает баланс между свежестью и производительностью. Ручная синхронизация доступна с помощью функции `refetch` .

## Доступность

- Кнопка переключения избранного отключается во время ожидания мутаций, чтобы предотвратить двойные действия.
- Всплывающие уведомления предоставляют информацию как об успешных, так и о неудачных операциях.
- В сетке страницы избранного используются те же доступные компоненты карточек, что и в основном списке.
- Состояния «Пусто» и «Ошибка» включают активные элементы для навигации с помощью клавиатуры.

## Сопутствующая документация

— [Флаги функций](/docs/template/configuration/feature-config) — включение/отключение функции избранного.
— [Компоненты общей карты](/docs/template/comComponents/shared-card-comComponents) — Отображение карты в сетке избранного.
- [Поставщики контекста](/docs/template/comComponents/context-providers) – интеграция темы макета.
- [Компоненты панели мониторинга](/docs/template/comComponents/dashboard-comComponents) – избранные счетчики в аналитике.
