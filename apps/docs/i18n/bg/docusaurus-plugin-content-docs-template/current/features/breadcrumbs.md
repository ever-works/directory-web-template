---
id: breadcrumbs
title: Навигация чрез навигация
sidebar_label: галета
sidebar_position: 26
---

# Навигация чрез навигация

Шаблонът предоставя навигационна система за навигация с многократно използвани компоненти на потребителския интерфейс, специфични за страницата навигационни пътеки и поддръжка за интернационализация. Breadcrumbs подобрява както потребителската навигация, така и SEO чрез показване на текущата йерархия на страниците.

## Преглед на архитектурата

Навигационните трохи се изпълняват на три нива:

| Слой | Файл | Цел |
|-------|------|---------|
| **Потребителски интерфейс за многократна употреба** | `components/ui/breadcrumb.tsx` | Общ компонент на навигационен път, приемащ масив от елементи |
| **Подробности за артикула** | `components/item-detail/breadcrumb.tsx` | Навигационен път за конкретни артикули с разпознаване на категории |
| **Колекции** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Навигационен път на страница с колекции с i18n |

## Многократно използваем навигационен компонент

Базовият навигационен компонент живее на `components/ui/breadcrumb.tsx` и приема въведен масив от навигационни елементи.

### BreadcrumbItem интерфейс

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Всеки елемент има `label` за показване и незадължителен `href` за свързване. Последният елемент в масива автоматично се изобразява като обикновен текст (текущата страница), а не като връзка.

### Подпорки за галета

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **items** -- Масив от навигационни сегменти за показване след връзката Начало
- **homeLabel** -- Етикет за началната връзка (по подразбиране `'Home'` )
- **className** -- Допълнителни CSS класове за прилагане към елемента nav

### Основна употреба

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

### Поведение при изобразяване

Компонентът изобразява достъпен елемент `nav` с подреден списък:

1. **Връзка към дома** -- Винаги се показва първо с икона на къща SVG и текст `homeLabel` 2. **Междинни елементи** -- Представени като `Link` елементи с възможност за щракване (от `next/link` ) с шевронни разделители
3. **Последен елемент** -- Изобразява се като обикновен `span` с `aria-current="page"` за достъпност

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

## Навигационен път за детайли на елемент

Компонентът `ItemBreadcrumb` на `components/item-detail/breadcrumb.tsx` е специално проектиран за страници с подробности за артикулите. Той автоматично се интегрира със системата за категории.

### Реквизит

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Навигация, съобразена с категории

Навигационният път на елемента използва куката `useCategoriesEnabled` за условно изобразяване на сегмента на категорията. Когато категориите са активирани, навигационният път показва:

**Начало** > **Име на категория** > **Име на артикул**

Когато категориите са деактивирани, това се опростява до:

**Начало** > **Име на артикул**

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

### Генериране на охлюв

Компонентът обработва идентификатори на категории чрез помощната програма `slugify` , за да генерира URL безопасни пътища:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

Връзките към категориите следват шаблона `/categories/{encoded-slug}` .

### Съкращаване на текст

Името на елемента се съкращава до 200px максимална ширина с помощта на класовете `truncate max-w-[200px]` Tailwind, предотвратявайки дългите имена на елементи от нарушаване на оформлението.

## Колекции Breadcrumb

Компонентът `CollectionsBreadcrumb` на `app/[locale]/collections/components/collections-breadcrumb.tsx` демонстрира i18n-aware модела.

### Интернационализация

Този компонент използва `next-intl` за превод на етикетите за навигация:

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

Ключовете за превод са дефинирани в директорията `messages/` за всеки поддържан локал.

## Стил и тъмен режим

Всички компоненти на навигационен път поддържат тъмен режим чрез префиксните класове `dark:` на Tailwind:

| Елемент | Светъл режим | Тъмен режим |
|---------|-----------|-----------|
| Текст | `text-black` | `dark:text-white` |
| Връзки | `text-gray-800` | `dark:text-white/50` |
| Шевронни икони | `text-dark--theme-800` | `dark:text-white/50` |
| Състояние на задържане | `hover:text-gray-900` | `dark:hover:text-white` |

Преходите се прилагат с `transition-colors duration-300` за плавни ефекти при задържане.

## Достъпност

Компонентите на навигационния път следват най-добрите практики за навигация в навигационен път WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** на елемент `nav` идентифицира забележителността
- ** `aria-current="page"` ** на последния елемент от навигационния път маркира текущата страница
- ** `aria-hidden="true"` ** върху декоративни SVG икони (дом и шеврон) ги скрива от екранни четци
- **Семантичният HTML** използва структура `nav > ol > li` за правилен контур на документа

## Добавяне на персонализирани навигационни пътеки

За да създадете нов навигационен път за конкретна страница, използвайте повторно използваемия компонент `Breadcrumb` :

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

За страници, които се нуждаят от преведени етикети, обвийте компонента и предайте преведените низове:

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

## Свързани файлове

| Файл | Описание |
|------|-------------|
| `components/ui/breadcrumb.tsx` | Многократно използваем генеричен навигационен компонент |
| `components/item-detail/breadcrumb.tsx` | Страница с подробности за артикула |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Навигационен път на страница с колекции |
| `hooks/use-categories-enabled.ts` | Закачете, за да проверите дали функцията за категории е активна |
| `lib/utils/slug.ts` | Помощни програми за генериране на охлюв ( `slugify` , `deslugify` ) |
