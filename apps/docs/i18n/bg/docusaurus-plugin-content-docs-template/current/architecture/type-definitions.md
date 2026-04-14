---
id: type-definitions
title: Тип Преглед на системата
sidebar_label: Типови дефиниции
sidebar_position: 41
---

# Тип Преглед на системата

Шаблонът централизира своите дефиниции на тип TypeScript в `template/lib/types/`. Тази директория съдържа интерфейси, псевдоними на типове, схеми за валидиране на Zod и DTO заявки/отговори, използвани в хранилища, услуги и API маршрути.

**Директория източник:** `template/lib/types/`

---

## Directory Listing

| File | Purpose |
|------|---------|
| `item.ts` | Item data model, create/update/review requests, list options, status types |
| `user.ts` | Authentication user data, create/update requests, Zod validation schemas, list options |
| `role.ts` | Role data model, create/update requests, list options, role-with-count type |
| `tag.ts` | Tag data model, create/update requests, paginated list response |
| `category.ts` | Category data model with count, create/update requests, validation constants, list options |
| `comment.ts` | Comment data structures |
| `vote.ts` | Vote data structures |
| `client.ts` | Client profile types |
| `client-item.ts` | Client-facing item types |
| `profile.ts` | User profile types |
| `survey.ts` | Survey data structures |
| `location.ts` | Location/geography types |
| `sponsor-ad.ts` | Sponsor and advertisement types |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity model types |
| `twenty-crm-errors.types.ts` | Twenty CRM error handling types |
| `twenty-crm-sync.types.ts` | Twenty CRM synchronization types |

---

## Основни типове домейни

### Типове артикули (`item.ts`)

Системата за типове артикули е най-обширната, покриваща пълния жизнен цикъл на списък с директории.

**Ключови типове:**

- **`ItemData`** -- основният модел на данни за артикул с полета за `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at` и други
- **`CreateItemRequest`** -- DTO за създаване на артикул; изисква `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- частичен DTO за актуализации на артикули; всички полета са незадължителни
- **`ReviewRequest`** -- съдържа `status` (`'approved'` или `'rejected'`) и по избор `review_notes`
- **`ItemListOptions`** -- опции за филтриране и страниране: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Типове потребители (`user.ts`)

Потребителски типове на ниво удостоверяване със схеми за валидиране на Zod.

**Ключови типове:**

- **`AuthUserData`** -- представлява удостоверен потребителски запис (id, имейл, created_at и т.н.)
- **`CreateUserRequest`** -- имейл и парола за създаване на потребител
- **`UpdateUserRequest`** -- полета за частична актуализация
- **`UserListOptions`** -- опции за пагиниране и филтриране
- **`AuthUserListResponse`** -- пагиниран отговор с `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- Zod схема за пълно валидиране на създаване на потребител
- **`updateUserValidationSchema`** -- Zod схема за валидиране на частична потребителска актуализация

### Типове роли (`role.ts`)

Ролеви типове данни за системата RBAC.

**Ключови типове:**

- **`RoleData`** -- ролев запис с `id`, `name`, `description`, `permissions`, `isDefault`, `status`, времеви клейма
- **`CreateRoleRequest`** -- полета, необходими за създаване на нова роля
- **`UpdateRoleRequest`** -- частична актуализация на ролята
- **`RoleListOptions`** -- опции за филтриране, включително `status`, търсене и пагинация
- **`RoleWithCount`** -- разширява `RoleData` с `userCount` за администраторски дисплей

### Типове тагове (`tag.ts`)

Типове данни за етикети за системата за етикетиране/маркиране.

**Ключови типове:**

- **`TagData`** -- запис на етикет с `id`, `name` и незадължителни метаданни
- **`CreateTagRequest`** -- изисква `id` и `name`
- **`UpdateTagRequest`** -- частична актуализация на етикета
- **`TagListResponse`** -- списък със страници с етикети `tags`, `total`, `page`, `limit`, `totalPages`

### Типове категории (`category.ts`)

Категорични типове данни за организационната таксономия.

**Ключови типове:**

- **`CategoryData`** -- запис на категория с `id`, `name`, `description` и метаданни
- **`CategoryWithCount`** -- разширява `CategoryData` с брой артикули
- **`CreateCategoryRequest`** -- изисква `id`, `name`, незадължително `description`
- **`UpdateCategoryRequest`** -- частична актуализация на категория (изисква `id`)
- **`CategoryListOptions`** -- опции за филтриране, сортиране и пагиниране
- **`CATEGORY_VALIDATION`** -- константи за проверка на дължината на полето (име min/max, описание max, ID ограничения)

---

## Integration Types

### Twenty CRM Types

Four files define the type system for the Twenty CRM integration:

| File | Contents |
|------|----------|
| `twenty-crm-config.types.ts` | Configuration types for CRM connection settings |
| `twenty-crm-entities.types.ts` | Entity models mapping to CRM objects |
| `twenty-crm-errors.types.ts` | Error types for CRM API error handling |
| `twenty-crm-sync.types.ts` | Synchronization state and operation types |

---

## Типови шаблони

### DTO за заявка/отговор

Кодовата база следва последователен модел за обекти за пренос на данни:

- **`Create[Entity]Request`** -- съдържа всички задължителни полета за създаване
- **`Update[Entity]Request`** -- частичен тип, където повечето полета са незадължителни; обикновено изисква `id`
- **`[Entity]ListOptions`** -- параметри за филтриране, сортиране и страниране
- **`[Entity]ListResponse`** -- пагиниран отговор с `items`, `total`, `page`, `limit`, `totalPages`

### Схеми за валидиране

Схемите на Zod са разположени заедно със съответните им типове:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Репозиториите използват `.parse()` или `.pick()` на тези схеми, преди да изпълнят мутации.

### Валидиращи константи

За обекти, поддържани от Git (категории, колекции), константите за валидиране се експортират като обикновени обекти:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

Те са посочени в методите за валидиране на хранилище.

---

## Type Relationships

```
ItemData
  ├── references CategoryData (via category field)
  ├── references TagData (via tags field)
  ├── references Collection (via collections field)
  └── referenced by ClientDashboardRepository

AuthUserData
  ├── references RoleData (via role assignments)
  └── referenced by UserRepository

RoleData
  ├── contains Permission[] (from permissions/definitions)
  └── referenced by RoleRepository

CategoryData
  └── referenced by items (category field)

TagData
  └── referenced by items (tags field)
```

---

## Указания за употреба

1. **Винаги импортирайте типове от `@/lib/types/`**, вместо да ги декларирате повторно в компоненти или API маршрути
2. **Използвайте заявка DTOs** за валидиране на входа на манипулатора на API, а не пълния модел на данни
3. **Използвайте Zod схеми**, където са налични (потребителски типове) за валидиране по време на изпълнение
4. **Използвайте константи за валидиране** (категории, колекции) за последователни ограничения на полетата във фронтенда и бекенда
5. **Разширете типовете локално** само когато имате нужда от специфични за компонента производни типове, които не принадлежат към споделения слой

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
