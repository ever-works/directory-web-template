---
id: company-profiles
title: Фирмени профили
sidebar_label: Фирмени профили
sidebar_position: 16
---

# Фирмени профили

Шаблонът Ever Works включва пълна система за управление на компанията, която позволява на администраторите да създават, управляват и свързват компании с изброени елементи. Системата поддържа интелигентна дедупликация чрез съпоставяне на домейн и име, списък с страници с търсене и връзка едно към едно между елементи и компании.

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Клиентска кука за асоциации на артикул-компания |
| `company.service.ts` | `lib/services/company.service.ts` | Бизнес логика за създаване на компания и дедупликация |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Заявки в база данни за фирма CRUD и асоциации |
| `company.ts` | `types/company.ts` | Типови дефиниции на TypeScript |
| `company.ts` | `lib/validations/company.ts` | Схеми за валидиране на Zod |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Падащо меню за избор на фирма |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Създаване/редактиране на фирмен модал |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Показване на фирмена статистика |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Управлявайте асоциациите на артикулите |

## Модел на фирмени данни

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
| `id` | Уникален идентификатор (UUID) |
| `name` | Екранно име на компанията |
| `website` | Пълен URL адрес на уебсайт |
| `domain` | Нормализиран домейн (напр. `example.com` ) за дедупликация |
| `slug` | Защитен от URL охлюв, генериран от име |
| `status` | Активен или неактивен статус |

## Фирмено обслужване `company.service.ts` предоставя бизнес логика за създаване на компания с вградена дедупликация.

### Стратегия за дедупликация

Услугата използва стратегия за търсене в три стъпки, преди да създаде нова компания:

1. **Търсене на домейн** (първичен) -- Най-надеждният за идентифициране на същата компания
2. **Търсене на име** (резервен) – Точно съвпадение на името на компанията
3. **Създаване на нов** -- Само ако и двете търсения са неуспешни

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Създаване от клиентски данни

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Извличане на домейн

Услугата нормализира URL адресите, за да извлече чисти домейни:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Генериране на охлюв

Охлювите се генерират автоматично от имена на компании:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## Заявки към бази данни

Модулът `company.queries.ts` осигурява цялостни CRUD операции:

### Компания CRUD

| Функция | Описание |
|---|---|
| `createCompany(data)` | Създайте нова компания |
| `getCompanyById(id)` | Вземете компания чрез UUID |
| `getCompanyBySlug(slug)` | Вземете компания чрез slug (без значение за малки и големи букви) |
| `getCompanyByDomain(domain)` | Вземете фирма по домейн (без значение за малки и големи букви) |
| `getCompanyByName(name)` | Вземете фирма по точно име (без значение за малки и големи букви) |
| `updateCompany(id, data)` | Актуализиране на фирмени полета |
| `deleteCompany(id)` | Изтриване на фирма |

### Фирмена регистрация

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

### Асоциации на артикули и компании

Всеки артикул може да бъде свързан точно с една фирма. Асоциацията се управлява чрез съединителната таблица `itemsCompanies` :

| Функция | Описание |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Идемпотентна връзка (създава или актуализира) |
| `unlinkItemFromCompany(itemSlug)` | Идемпотентно прекратяване на връзката |
| `getCompanyByItemSlug(itemSlug)` | Вземете компания за артикул |
| `listItemsByCompany(companyId, params)` | Избройте елементи, принадлежащи на компания |
| `itemHasCompany(itemSlug)` | Проверете дали артикулът има фирма |
| `getCompaniesWithItemCount(params)` | Избройте компании с техния брой артикули |

Функцията `linkItemToCompany` е идемпотентна:
- Ако не съществува асоциация, тя създава такава
- Ако същата компания вече е свързана, тя връща съществуващата асоциация
- Ако е свързана различна компания, тя актуализира асоциацията

## Куката `useItemCompany` Куката от страна на клиента осигурява управлявано от React Query управление на компанията за елементи:

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

### Конфигурация на кеширане

| Настройка | Стойност |
|---|---|
| `staleTime` | 5 минути |
| `gcTime` | 10 минути |
| `retry` | 2 опита |

### API крайни точки

Куката комуникира със следните REST крайни точки:

| Метод | Крайна точка | Описание |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Извличане на текуща компания за артикул |
| `POST` | `/api/items/{slug}/company` | Присвояване на компания на артикул |
| `DELETE` | `/api/items/{slug}/company` | Премахване на фирма от артикул |

## Административни компоненти

### Селектор на фирма

Компонент от падащо меню за избор на съществуващи компании:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Фирмен модал

Модал за създаване или редактиране на компании:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Фирмена статистика

Показва обобщена статистика:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## Ключови файлове

| Файл | Път |
|---|---|
| Артикул Компания Кука | `hooks/use-item-company.ts` |
| Фирмено обслужване | `lib/services/company.service.ts` |
| Фирмени запитвания | `lib/db/queries/company.queries.ts` |
| Типове фирми | `types/company.ts` |
| Фирмени валидации | `lib/validations/company.ts` |
| Селектор на фирма | `components/admin/companies/company-selector.tsx` |
| Компания Modal | `components/admin/companies/company-modal.tsx` |
| Артикул Фирмен мениджър | `components/admin/items/item-company-manager.tsx` |
