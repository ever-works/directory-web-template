---
id: pagination-system
title: "Система за страниране"
sidebar_label: "Система за страниране"
sidebar_position: 45
---

# Система за страниране

## Преглед

Системата за страниране осигурява изчисление за страниране от страна на сървъра и помощни програми за навигация на страници от страна на клиента. Състои се от два малки, фокусирани модула: `lib/paginate.ts` за изчисляване на метаданни на страницата (номера на страници, отмествания) и `utils/pagination.ts` за безопасно фиксиране на номера на страници и задействане на поведение на превъртане към върха при промени на страницата.

## Архитектура

Системата за страниране е умишлено олекотена и разделена на два слоя:

- **`lib/paginate.ts`** (Сървър/споделен) -- Чисти функции за математика на страниците. Използва се в API маршрути, сървърни компоненти и логика за извличане на данни за изчисляване кой фрагмент от данни да се върне.
- **`utils/pagination.ts`** (Клиент) -- Помощник на потребителския интерфейс, който притиска номерата на страниците към валидни диапазони и превърта страницата до върха. Използва се от компоненти за страниране и списъчни изгледи.

И двата модула се използват от компонентите на потребителския интерфейс за страниране и страниците със съдържание. `ConfigManager` осигурява `itemsPerPage` стойността, която се включва в тези изчисления.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## Справка за API

### Износ от `lib/paginate.ts`

#### `PER_PAGE: number`

Постоянни елементи по подразбиране на страница. Стойност: `12`.

#### `totalPages(size: number, perPage?: number): number`

Изчислява общия брой страници за даден размер на колекция. Използва `Math.ceil()`, за да гарантира, че е включена последната частична страница.

**Параметри:**
- `size` -- Общ брой елементи в колекцията
- `perPage` -- Елементи на страница (по подразбиране `PER_PAGE`)

**Връщания:** Общ брой страници (минимум 1 за непразни колекции)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Изчислява метаданни за страниране от необработен параметър на страница (който може да дойде като низ от параметри на URL заявка).

**Параметри:**
- `rawPage` -- Исканият номер на страница (по подразбиране е `1`). Приема както `number`, така и `string`.
- `perPage` -- Елементи на страница (по подразбиране `PER_PAGE`)

**Връща:**
- `page` -- Анализираният номер на страница като цяло число
- `start` -- Базираното на нула индексно отместване за нарязване на масива от данни

### Износ от `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Безопасно преминава към нова страница чрез фиксиране на стойността към валидния диапазон `[1, total]`, актуализиране на състоянието на страницата и превъртане на прозореца до върха с плавна анимация.

**Параметри:**
- `newPage` -- Исканият номер на страница (може да е извън диапазона)
- `total` -- Общ брой страници
- `setPage` -- Функция за задаване на състояние на реакция за текущата страница

**Поведение:**
- Закрепва стойностите на `NaN` към страница 1
- Закрепва стойности под 1 към страница 1
- Затяга стойности над `total` до `total`
- Извиква `window.scrollTo({ top: 0, behavior: 'smooth' })` (безопасно за SSR; проверява `typeof window`)

## Подробности за изпълнението

**Разбор на низове**: `paginateMeta` приема `string | number` за параметъра `rawPage`, тъй като параметрите на URL заявката пристигат като низове. Той използва `parseInt()` за преобразуване.

**Базирано на нула отместване**: Стойността на `start`, върната от `paginateMeta`, се изчислява като `(page - 1) * perPage`, предоставяйки базиран на нула индекс, подходящ за `Array.slice()` или SQL `OFFSET` клаузи.

**SSR безопасност**: `clampAndScrollToTop` проверява `typeof window !== 'undefined'` преди да извика `window.scrollTo()`, което прави безопасно извикването в контексти на изобразяване от страна на сървъра.

**Обработка на NaN**: `clampAndScrollToTop` преобразува входа с `Number()` и се връща на страница 1, ако резултатът е `NaN`.

## Конфигурация

Размерът на страницата по подразбиране (`PER_PAGE = 12`) е константа в `lib/paginate.ts`. Размерът на страницата по време на изпълнение може да бъде заменен чрез `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

`ConfigManager` поддържа два типа пагинация:
- `'standard'` -- Традиционна навигация страница по страница
- `'infinite'` -- Безкрайно превъртане/модел за зареждане на повече

## Примери за използване

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

## Най-добри практики

- Винаги използвайте `paginateMeta()`, за да анализирате параметрите на страницата от низове на заявка за URL адрес, за да се справите безопасно с принудителното въвеждане на типа и настройките по подразбиране.
- Предайте `perPage` отмяна от `ConfigManager`, вместо да разчитате на твърдо кодираната `PER_PAGE` константа, когато администраторът може да е променил размера на страницата.
- Използвайте `clampAndScrollToTop()` във всички навигационни страници от страна на клиента, за да предотвратите номерата на страниците извън диапазона и да осигурите последователен потребителски интерфейс.
- За реализации с безкрайно превъртане използвайте `start` отместването от `paginateMeta()`, за да изчислите следващия отрязък от елементи за добавяне.
- Помислете за пагинацията `type` от `ConfigManager` (`'standard'` срещу `'infinite'`), когато избирате кой компонент на потребителския интерфейс за пагинация да изобразите.

## Свързани модули

- [Config Manager System](./config-manager-system) -- Осигурява конфигурация за страниране по време на изпълнение (`type`, `itemsPerPage`)
- [Библиотека със съдържание](/template/architecture/content-library) -- Използва пагинация за страници със съдържание
