---
id: company-profiles
title: Профили компании
sidebar_label: Профили компании
sidebar_position: 16
---

# Профили компаний

Шаблон Ever Works включает в себя полную систему управления компанией, которая позволяет администраторам создавать, управлять и связывать компании с перечисленными элементами. Система поддерживает интеллектуальную дедупликацию посредством сопоставления доменов и имен, постраничный список с поиском и связь «один к одному» между товарами и компаниями.

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Клиентский крючок для связи товара с компанией |
| `company.service.ts` | `lib/services/company.service.ts` | Бизнес-логика для создания компаний и дедупликации |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Запросы к базе данных для компании CRUD и ассоциаций |
| `company.ts` | `types/company.ts` | Определения типов TypeScript |
| `company.ts` | `lib/validations/company.ts` | Схемы проверки Zod |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Раскрывающийся список выбора компании |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Модальное окно создания/редактирования компании |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Отображение статистики компании |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Управление ассоциациями товаров и компаний |

## Модель данных компании

```tsx
// types/company.ts
type Company = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  slug: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};
```

| Поле | Описание |
|---|---|
| `id` | Уникальный идентификатор (UUID) |
| `name` | Отображаемое название компании |
| `website` | Полный URL-адрес веб-сайта |
| `domain` | Нормализованный домен (например, `example.com` ) для дедупликации |
| `slug` | URL-безопасный фрагмент, созданный на основе имени |
| `status` | Активный или неактивный статус |

## Сервис компании `company.service.ts` обеспечивает бизнес-логику для создания компании со встроенной дедупликацией.

### Стратегия дедупликации

Служба использует трехэтапную стратегию поиска перед созданием новой компании:

1. **Поиск домена** (основной) – наиболее надежный способ идентификации одной и той же компании.
2. **Поиск имени** (резервный вариант) – точное совпадение названия компании.
3. **Создать новый** – только если оба поиска не удались.

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Создание на основе данных клиента

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Извлечение домена

Сервис нормализует URL-адреса для извлечения чистых доменов:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Генерация слизней

Слаги автоматически генерируются из названий компаний:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## Запросы к базе данных

Модуль `company.queries.ts` обеспечивает комплексные операции CRUD:

### Компания CRUD

| Функция | Описание |
|---|---|
| `createCompany(data)` | Создать новую компанию |
| `getCompanyById(id)` | Получить компанию по UUID |
| `getCompanyBySlug(slug)` | Получить компанию по пулю (регистронезависимо) |
| `getCompanyByDomain(domain)` | Получить компанию по домену (без учета регистра) |
| `getCompanyByName(name)` | Получить компанию по точному названию (без учета регистра) |
| `updateCompany(id, data)` | Обновить поля компании |
| `deleteCompany(id)` | Удалить компанию |

### Список компаний

```tsx
import { listCompanies } from '@/lib/db/queries/company.queries';

const result = await listCompanies({
  page: 1,
  limit: 10,
  search: 'acme',           // Searches name and domain
  status: 'active',
  sortBy: 'createdAt',      // 'name' | 'createdAt' | 'updatedAt'
  sortOrder: 'desc'
});

// Returns: { companies, total, page, totalPages, limit, activeCount, inactiveCount }
```

### Ассоциации между товаром и компанией

Каждый элемент может быть связан только с одной компанией. Ассоциация управляется через соединительную таблицу `itemsCompanies` :

| Функция | Описание |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Идемпотентная ссылка (создает или обновляет) |
| `unlinkItemFromCompany(itemSlug)` | Идемпотентная отвязка |
| `getCompanyByItemSlug(itemSlug)` | Получить компанию для предмета |
| `listItemsByCompany(companyId, params)` | Список предметов, принадлежащих компании |
| `itemHasCompany(itemSlug)` | Проверьте, есть ли у товара компания |
| `getCompaniesWithItemCount(params)` | Перечислите компании с указанием количества позиций |

Функция `linkItemToCompany` идемпотентна:
- Если ассоциации не существует, она создается
- Если та же компания уже связана, возвращается существующая ассоциация.
- Если связана другая компания, она обновляет ассоциацию.

## Крючок `useItemCompany` Перехватчик на стороне клиента обеспечивает управление компанией с помощью React Query для элементов:

```tsx
import { useItemCompany } from '@/hooks/use-item-company';

function ItemCompanyManager({ itemSlug }) {
  const {
    company,       // Current company or null
    isLoading,     // Loading state
    isAssigning,   // Assignment in progress
    isRemoving,    // Removal in progress
    assignCompany, // Assign company by ID
    removeCompany, // Remove company association
    refetch        // Refresh data
  } = useItemCompany({ itemSlug, enabled: true });

  const handleAssign = async (companyId: string) => {
    const success = await assignCompany(companyId);
    if (success) console.log('Company assigned!');
  };

  return (
    <div>
      {company ? (
        <div>
          <span>Company: {company.name}</span>
          <button onClick={removeCompany}>Remove</button>
        </div>
      ) : (
        <CompanySelector onSelect={(id) => handleAssign(id)} />
      )}
    </div>
  );
}
```

### Конфигурация кэширования

| Настройка | Значение |
|---|---|
| `staleTime` | 5 минут |
| `gcTime` | 10 минут |
| `retry` | 2 попытки |

### Конечные точки API

Перехватчик взаимодействует со следующими конечными точками REST:

| Метод | Конечная точка | Описание |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Получить текущую компанию для товара |
| `POST` | `/api/items/{slug}/company` | Присвоить элементу компанию |
| `DELETE` | `/api/items/{slug}/company` | Удалить компанию из элемента |

## Компоненты администрирования

### Выбор компании

Выпадающий компонент для выбора существующих компаний:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Модальное окно компании

Модальное создание или редактирование компаний:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Статистика компании

Отображает совокупную статистику:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## Ключевые файлы

| Файл | Путь |
|---|---|
| Товар Компания Крючок | `hooks/use-item-company.ts` |
| Сервис компании | `lib/services/company.service.ts` |
| Вопросы о компании | `lib/db/queries/company.queries.ts` |
| Типы компаний | `types/company.ts` |
| Проверка компании | `lib/validations/company.ts` |
| Выбор компании | `components/admin/companies/company-selector.tsx` |
| Компания Модал | `components/admin/companies/company-modal.tsx` |
| Пункт Менеджер компании | `components/admin/items/item-company-manager.tsx` |
