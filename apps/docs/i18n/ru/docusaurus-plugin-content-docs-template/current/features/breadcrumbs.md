---
id: breadcrumbs
title: Хлебная навигация
sidebar_label: Панировочные сухари
sidebar_position: 26
---

# Навигация по хлебным крошкам

Шаблон предоставляет навигационную систему с многоразовыми компонентами пользовательского интерфейса, навигационными цепочками для конкретных страниц и поддержкой интернационализации. Хлебные крошки улучшают как навигацию пользователя, так и SEO, отображая текущую иерархию страниц.

## Обзор архитектуры

Хлебные крошки реализованы на трех уровнях:

| Слой | Файл | Цель |
|-------|------|---------|
| **Многоразовый пользовательский интерфейс** | `components/ui/breadcrumb.tsx` | Общий компонент навигации, принимающий массив элементов |
| **Подробнее об объекте** | `components/item-detail/breadcrumb.tsx` | Хлебная крошка для конкретного товара с указанием категории |
| **Коллекции** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Страница коллекций с i18n |

## Многоразовый компонент хлебных крошек

Базовый компонент навигации находится по адресу `components/ui/breadcrumb.tsx` и принимает типизированный массив элементов навигации.

### Интерфейс элемента хлебной крошки

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Каждый элемент имеет `label` для отображения и дополнительный `href` для связи. Последний элемент массива автоматически отображается как обычный текст (текущая страница), а не как ссылка.

### Реквизит из хлебных крошек

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **items** — Массив сегментов навигации для отображения после ссылки на главную.
- **homeLabel** — метка домашней ссылки (по умолчанию `'Home'` ).
- **className** – дополнительные классы CSS для применения к элементу навигации.

### Базовое использование

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

function MyPage() {
  return (
    <Breadcrumb
      items={[
        { label: 'Categories', href: '/categories' },
        { label: 'Productivity', href: '/categories/productivity' },
        { label: 'Current Tool' },
      ]}
    />
  );
}
```

### Поведение рендеринга

Компонент отображает доступный элемент `nav` с упорядоченным списком:

1. **Ссылка на главную** – всегда отображается первой со значком домика в формате SVG и текстом `homeLabel` .
2. **Промежуточные элементы** – отображаются как кликабельные элементы `Link` (из `next/link` ) с шевронными разделителями.
3. **Последний элемент** – отображается как обычный `span` с `aria-current="page"` для удобства.

```tsx
<nav className={cn('flex mb-8', className)} aria-label="Breadcrumb">
  <ol className="inline-flex items-center space-x-1 md:space-x-3">
    {/* Home link with icon */}
    <li className="inline-flex items-center text-black dark:text-white">
      <Link href="/">
        <HomeIcon />
        {homeLabel}
      </Link>
    </li>
    {/* Dynamic breadcrumb items with chevron separators */}
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <li key={index} aria-current={isLast ? 'page' : undefined}>
          <div className="flex items-center">
            <ChevronIcon />
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
</nav>
```

## Хлебная крошка сведений об элементе

Компонент `ItemBreadcrumb` в `components/item-detail/breadcrumb.tsx` специально разработан для страниц сведений об элементе. Он автоматически интегрируется с системой категорий.

### Реквизит

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Навигация с учетом категорий

В хлебной крошке элемента используется крючок `useCategoriesEnabled` для условного отображения сегмента категории. Если категории включены, в навигационной цепочке отображаются:

**Главная страница** > **Название категории** > **Название элемента**

Когда категории отключены, становится проще:

**Главная** > **Название предмета**

```tsx
import { ItemBreadcrumb } from '@/components/item-detail/breadcrumb';

function ItemDetailPage({ item }) {
  return (
    <ItemBreadcrumb
      name={item.name}
      category={item.category}
      categoryName={item.categoryName}
    />
  );
}
```

### Генерация слизней

Компонент обрабатывает идентификаторы категорий с помощью утилиты `slugify` для создания URL-безопасных путей:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

Ссылки на категории следуют шаблону `/categories/{encoded-slug}` .

### Усечение текста

Имя элемента усекается до максимальной ширины 200 пикселей с использованием классов `truncate max-w-[200px]` Tailwind, что предотвращает нарушение макета длинными именами элементов.

## Хлебные крошки коллекций

Компонент `CollectionsBreadcrumb` в позиции `app/[locale]/collections/components/collections-breadcrumb.tsx` демонстрирует паттерн, учитывающий i18n.

### Интернационализация

Этот компонент использует `next-intl` для перевода меток навигационной навигации:

```tsx
import { useTranslations } from 'next-intl';

export function CollectionsBreadcrumb() {
  const t = useTranslations('common');

  return (
    <nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li>
          <Link href="/">{t('HOME')}</Link>
        </li>
        <li>
          <span>{t('COLLECTION')}</span>
        </li>
      </ol>
    </nav>
  );
}
```

Ключи перевода определяются в каталоге `messages/` для каждой поддерживаемой локали.

## Стилизация и темный режим

Все компоненты навигации поддерживают темный режим через классы префиксов `dark:` Tailwind:

| Элемент | Светлый режим | Темный режим |
|---------|-----------|-----------|
| Текст | `text-black` | `dark:text-white` |
| Ссылки | `text-gray-800` | `dark:text-white/50` |
| Иконки Шеврон | `text-dark--theme-800` | `dark:text-white/50` |
| Состояние наведения | `hover:text-gray-900` | `dark:hover:text-white` |

Переходы применяются с помощью `transition-colors duration-300` для плавного эффекта наведения.

## Доступность

Компоненты навигационной цепочки соответствуют лучшим практикам навигации по навигационной цепочке WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** на элементе `nav` обозначает ориентир
- ** `aria-current="page"` ** на последнем элементе навигации отмечает текущую страницу.
- ** `aria-hidden="true"` ** на декоративных значках SVG (дом и шеврон) скрывает их от программ чтения с экрана.
- **Семантический HTML** использует структуру `nav > ol > li` для правильной структуры документа.

## Добавление пользовательских хлебных крошек

Чтобы создать новую навигационную цепочку для конкретной страницы, используйте повторно используемый компонент `Breadcrumb` :

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function SettingsBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/client/dashboard' },
        { label: 'Settings' },
      ]}
      homeLabel="Home"
      className="mb-6"
    />
  );
}
```

Для страниц, которым необходимы переведенные метки, оберните компонент и передайте переведенные строки:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useTranslations } from 'next-intl';

export function LocalizedBreadcrumb() {
  const t = useTranslations('common');
  return (
    <Breadcrumb
      items={[
        { label: t('DASHBOARD'), href: '/client/dashboard' },
        { label: t('SETTINGS') },
      ]}
      homeLabel={t('HOME')}
    />
  );
}
```

## Связанные файлы

| Файл | Описание |
|------|-------------|
| `components/ui/breadcrumb.tsx` | Многоразовый универсальный компонент хлебных крошек |
| `components/item-detail/breadcrumb.tsx` | Хлебная крошка страницы сведений о товаре |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Навигационная цепочка страницы коллекций |
| `hooks/use-categories-enabled.ts` | Крючок, чтобы проверить, активна ли функция категорий |
| `lib/utils/slug.ts` | Утилиты для генерации слизней ( `slugify` , `deslugify` ) |
