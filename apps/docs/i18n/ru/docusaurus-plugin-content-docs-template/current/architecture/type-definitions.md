---
id: type-definitions
title: Тип Обзор системы
sidebar_label: Определения типов
sidebar_position: 41
---

# Тип Обзор системы

Шаблон централизует определения типов TypeScript в `template/lib/types/`. Этот каталог содержит интерфейсы, псевдонимы типов, схемы проверки Zod и DTO запроса/ответа, используемые в репозиториях, службах и маршрутах API.

**Исходный каталог:** `template/lib/types/`

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

## Основные типы доменов

### Типы предметов (`item.ts`)

Система типов элементов является самой обширной и охватывает полный жизненный цикл каталога.

**Типы ключей:**

- **`ItemData`** — модель данных первичного элемента с полями для `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at` и другие
- **`CreateItemRequest`** -- DTO для создания элемента; требуется `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- частичный DTO для обновлений элементов; все поля необязательны
- **`ReviewRequest`** -- содержит `status` (`'approved'` или `'rejected'`) и необязательный `review_notes`
- **`ItemListOptions`** -- параметры фильтрации и нумерации страниц: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Типы пользователей (`user.ts`)

Типы пользователей уровня аутентификации со схемами проверки Zod.

**Типы ключей:**

- **`AuthUserData`** — представляет собой аутентифицированную запись пользователя (идентификатор, адрес электронной почты, созданный_at и т. д.).
- **`CreateUserRequest`** -- адрес электронной почты и пароль для создания пользователя
- **`UpdateUserRequest`** -- поля частичного обновления
- **`UserListOptions`** — параметры нумерации страниц и фильтрации.
- **`AuthUserListResponse`** — ответ с разбивкой на страницы с `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** — схема Zod для полной проверки создания пользователя.
- **`updateUserValidationSchema`** — схема Zod для частичной проверки обновлений пользователя.

### Типы ролей (`role.ts`)

Ролевые типы данных для системы RBAC.

**Типы ключей:**

- **`RoleData`** -- запись роли с `id`, `name`, `description`, `permissions`, `isDefault`, `status`, временными метками
- **`CreateRoleRequest`** — поля, необходимые для создания новой роли.
- **`UpdateRoleRequest`** -- частичное обновление роли
- **`RoleListOptions`** — параметры фильтрации, включая `status`, поиск и нумерацию страниц.
- **`RoleWithCount`** -- расширяет `RoleData` `userCount` для отображения администратора

### Типы тегов (`tag.ts`)

Типы данных тегов для системы маркировки/маркировки.

**Типы ключей:**

- **`TagData`** — запись тега с `id`, `name` и дополнительными метаданными.
- **`CreateTagRequest`** -- требуется `id` и `name`
- **`UpdateTagRequest`** -- частичное обновление тега
- **`TagListResponse`** -- постраничный список тегов с `tags`, `total`, `page`, `limit`, `totalPages`

### Типы категорий (`category.ts`)

Типы данных категории для организационной таксономии.

**Типы ключей:**

- **`CategoryData`** — запись категории с `id`, `name`, `description` и метаданными
- **`CategoryWithCount`** -- расширяет `CategoryData` количеством элементов.
- **`CreateCategoryRequest`** -- требуется `id`, `name`, необязательно `description`
- **`UpdateCategoryRequest`** -- частичное обновление категории (требуется `id`)
- **`CategoryListOptions`** – параметры фильтрации, сортировки и нумерации страниц.
- **`CATEGORY_VALIDATION`** -- константы для проверки длины поля (минимальное/максное имя, максимальное описание, ограничения идентификатора)

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

## Условные обозначения типовых шаблонов

### DTO запроса/ответа

Кодовая база соответствует единообразному шаблону для объектов передачи данных:

- **`Create[Entity]Request`** -- содержит все необходимые поля для создания
- **`Update[Entity]Request`** -- частичный тип, где большинство полей являются необязательными; обычно требуется `id`
- **`[Entity]ListOptions`** -- параметры фильтрации, сортировки и нумерации страниц.
- **`[Entity]ListResponse`** — ответ с разбивкой на страницы с `items`, `total`, `page`, `limit`, `totalPages`

### Схемы проверки

Схемы Zod расположены рядом с соответствующими типами:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Репозитории используют `.parse()` или `.pick()` в этих схемах перед выполнением мутаций.

### Константы проверки

Для сущностей (категорий, коллекций), поддерживаемых Git, константы проверки экспортируются как простые объекты:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

На них есть ссылки в методах проверки репозитория.

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

## Рекомендации по использованию

1. **Всегда импортируйте типы из `@/lib/types/`**, а не переобъявляйте их в компонентах или маршрутах API.
2. **Используйте DTO запроса** для проверки входных данных обработчика API, а не полную модель данных.
3. **Используйте схемы Zod**, где это возможно (типы пользователей), для проверки во время выполнения.
4. **Используйте константы проверки** (категории, коллекции) для единообразных ограничений полей во внешнем и внутреннем интерфейсе.
5. **Расширяйте типы локально** только в том случае, если вам нужны производные типы, специфичные для компонента, которые не принадлежат общему слою.

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
