---
id: pagination-system
title: "Система пагинации"
sidebar_label: "Система пагинации"
sidebar_position: 45
---

# Система пагинации

## Обзор

Система нумерации страниц обеспечивает вычисление пагинации на стороне сервера и утилиты навигации по страницам на стороне клиента. Он состоит из двух небольших специализированных модулей: `lib/paginate.ts` для расчета метаданных страницы (номера страниц, смещения) и `utils/pagination.ts` для безопасного фиксирования номеров страниц и запуска режима прокрутки вверх при изменении страниц.

## Архитектура

Система пагинации намеренно упрощена и разделена на два уровня:

- **`lib/paginate.ts`** (Серверный/общий) — чистые функции для нумерации страниц. Используется в маршрутах API, компонентах сервера и логике получения данных для вычисления того, какой фрагмент данных следует вернуть.
- **`utils/pagination.ts`** (Клиент) — помощник пользовательского интерфейса, который ограничивает номера страниц допустимыми диапазонами и прокручивает страницу вверх. Используется компонентами нумерации страниц и представлениями списков.

Оба модуля используются компонентами пользовательского интерфейса с нумерацией страниц и страницами со списком контента. `ConfigManager` предоставляет значение `itemsPerPage`, которое используется в этих вычислениях.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## Справочник по API

### Экспорт из `lib/paginate.ts`

#### `PER_PAGE: number`

Элементы по умолчанию на странице, константа. Значение: `12`.

#### `totalPages(size: number, perPage?: number): number`

Вычисляет общее количество страниц для заданного размера коллекции. Использует `Math.ceil()`, чтобы гарантировать включение последней частичной страницы.

**Параметры:**
- `size` -- Общее количество элементов в коллекции.
- `perPage` — количество элементов на странице (по умолчанию `PER_PAGE`)

**Возвраты:** Общее количество страниц (минимум 1 для непустых коллекций).

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Вычисляет метаданные нумерации страниц на основе необработанного параметра страницы (который может представлять собой строку из параметров URL-запроса).

**Параметры:**
- `rawPage` -- Номер запрошенной страницы (по умолчанию `1`). Принимает как `number`, так и `string`.
- `perPage` — количество элементов на странице (по умолчанию `PER_PAGE`)

**Возвраты:**
- `page` -- Номер проанализированной страницы в виде целого числа.
- `start` -- Смещение индекса, отсчитываемое от нуля, для нарезки массива данных.

### Экспорт из `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Безопасный переход на новую страницу путем фиксации значения в допустимом диапазоне `[1, total]`, обновления состояния страницы и прокрутки окна вверх с плавной анимацией.

**Параметры:**
- `newPage` -- Номер запрошенной страницы (может быть вне диапазона)
- `total` -- Общее количество страниц.
- `setPage` -- Функция установки состояния React для текущей страницы.

**Поведение:**
- Фиксирует значения `NaN` на странице 1.
- Фиксирует значения ниже 1 на странице 1
- Фиксирует значения от `total` до `total`
- Вызывает `window.scrollTo({ top: 0, behavior: 'smooth' })` (безопасно для SSR; проверяет `typeof window`)

## Детали реализации

**Разбор строк**: `paginateMeta` принимает `string | number` в качестве параметра `rawPage`, поскольку параметры запроса URL-адреса поступают в виде строк. Для преобразования используется `parseInt()`.

**Смещение от нуля**: Значение `start`, возвращаемое `paginateMeta`, рассчитывается как `(page - 1) * perPage`, обеспечивая индекс с отсчетом от нуля, подходящий для предложений `Array.slice()` или SQL `OFFSET`.

**Безопасность SSR**: `clampAndScrollToTop` проверяет `typeof window !== 'undefined'` перед вызовом `window.scrollTo()`, что делает безопасным вызов в контекстах рендеринга на стороне сервера.

**Обработка NaN**: `clampAndScrollToTop` преобразует входные данные с помощью `Number()` и возвращается к странице 1, если результатом является `NaN`.

## Конфигурация

Размер страницы по умолчанию (`PER_PAGE = 12`) является константой в `lib/paginate.ts`. Размер страницы времени выполнения можно переопределить с помощью `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

`ConfigManager` поддерживает два типа нумерации страниц:
- `'standard'` -- Традиционная постраничная навигация.
- `'infinite'` -- Бесконечная прокрутка/шаблон загрузки еще

## Примеры использования

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## Лучшие практики

- Всегда используйте `paginateMeta()` для анализа параметров страницы из строк запроса URL-адреса для безопасной обработки приведения типов и значений по умолчанию.
- Передайте переопределение `perPage` из `ConfigManager` вместо того, чтобы полагаться на жестко запрограммированную константу `PER_PAGE`, когда администратор мог изменить размер страницы.
- Используйте `clampAndScrollToTop()` во всей навигации по страницам на стороне клиента, чтобы предотвратить выход номеров страниц за пределы допустимого диапазона и обеспечить согласованный UX.
- Для реализации бесконечной прокрутки используйте смещение `start` от `paginateMeta()`, чтобы вычислить следующий фрагмент добавляемых элементов.
- Учитывайте нумерацию страниц `type` от `ConfigManager` (`'standard'` и `'infinite'`) при выборе компонента пользовательского интерфейса нумерации страниц для рендеринга.

## Связанные модули

- [Система диспетчера конфигураций](./config-manager-system) — обеспечивает конфигурацию нумерации страниц во время выполнения (`type`, `itemsPerPage`)
- [Библиотека контента](/template/architecture/content-library) — использует нумерацию страниц для страниц со списком контента.
