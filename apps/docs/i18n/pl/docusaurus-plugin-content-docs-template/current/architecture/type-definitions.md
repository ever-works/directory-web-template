---
id: type-definitions
title: Wpisz Przegląd systemu
sidebar_label: Definicje typów
sidebar_position: 41
---

# Wpisz Przegląd systemu

Szablon centralizuje definicje typów TypeScript w `template/lib/types/`. Ten katalog zawiera interfejsy, aliasy typów, schematy sprawdzania poprawności ZOD i DTO żądania/odpowiedzi używane w repozytoriach, usługach i trasach API.

**Katalog źródłowy:** `template/lib/types/`

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

## Podstawowe typy domen

### Typy elementów (`item.ts`)

System typów pozycji jest najbardziej rozbudowany i obejmuje pełny cykl życia wpisu w katalogu.

**Kluczowe typy:**

- **`ItemData`** -- podstawowy model danych pozycji z polami dla `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at` i więcej
- **`CreateItemRequest`** — DTO do tworzenia przedmiotów; wymaga `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** — częściowe DTO dla aktualizacji przedmiotów; wszystkie pola opcjonalne
- **`ReviewRequest`** -- zawiera `status` (`'approved'` lub `'rejected'`) i opcjonalnie `review_notes`
- **`ItemListOptions`** -- opcje filtrowania i paginacji: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Typy użytkowników (`user.ts`)

Typy użytkowników na poziomie uwierzytelniania ze schematami sprawdzania poprawności ZOD.

**Kluczowe typy:**

- **`AuthUserData`** — reprezentuje uwierzytelniony rekord użytkownika (identyfikator, adres e-mail, utworzony_at itp.)
- **`CreateUserRequest`** -- adres e-mail i hasło do utworzenia użytkownika
- **`UpdateUserRequest`** -- pola częściowej aktualizacji
- **`UserListOptions`** -- opcje paginacji i filtrowania
- **`AuthUserListResponse`** -- odpowiedź podzielona na strony z `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- Schemat Zoda do pełnej walidacji tworzenia użytkowników
- **`updateUserValidationSchema`** -- Schemat Zoda do częściowej weryfikacji aktualizacji użytkownika

### Typy ról (`role.ts`)

Typy danych ról dla systemu RBAC.

**Kluczowe typy:**

- **`RoleData`** -- rekord roli z `id`, `name`, `description`, `permissions`, `isDefault`, `status`, znaczniki czasu
- **`CreateRoleRequest`** -- pola potrzebne do utworzenia nowej roli
- **`UpdateRoleRequest`** -- częściowa aktualizacja roli
- **`RoleListOptions`** — opcje filtrowania, w tym `status`, wyszukiwanie i paginacja
- **`RoleWithCount`** — rozszerza `RoleData` o `userCount` do wyświetlania administratora

### Typy tagów (`tag.ts`)

Typy danych znaczników dla systemu etykietowania/tagowania.

**Kluczowe typy:**

- **`TagData`** — rekord znacznika z `id`, `name` i opcjonalnymi metadanymi
- **`CreateTagRequest`** — wymaga `id` i `name`
- **`UpdateTagRequest`** -- częściowa aktualizacja tagu
- **`TagListResponse`** -- paginowana lista tagów zawierająca `tags`, `total`, `page`, `limit`, `totalPages`

### Typy kategorii (`category.ts`)

Typy danych kategorii dla taksonomii organizacyjnej.

**Kluczowe typy:**

- **`CategoryData`** -- rekord kategorii z `id`, `name`, `description` i metadanymi
- **`CategoryWithCount`** -- rozszerza `CategoryData` o liczbę elementów
- **`CreateCategoryRequest`** -- wymaga `id`, `name`, opcjonalnie `description`
- **`UpdateCategoryRequest`** -- częściowa aktualizacja kategorii (wymaga `id`)
- **`CategoryListOptions`** – opcje filtrowania, sortowania i paginacji
- **`CATEGORY_VALIDATION`** -- stałe do sprawdzania długości pola (nazwa min/max, opis max, ograniczenia ID)

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

## Konwencje wzorców typów

### DTO żądania/odpowiedzi

Baza kodu ma spójny wzór dla obiektów przesyłania danych:

- **`Create[Entity]Request`** -- zawiera wszystkie pola wymagane do utworzenia
- **`Update[Entity]Request`** -- typ częściowy, w którym większość pól jest opcjonalna; zazwyczaj wymaga `id`
- **`[Entity]ListOptions`** -- parametry filtrowania, sortowania i paginacji
- **`[Entity]ListResponse`** -- odpowiedź podzielona na strony z `items`, `total`, `page`, `limit`, `totalPages`

### Schematy walidacji

Schematy Zoda są powiązane z odpowiadającymi im typami:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Repozytoria używają `.parse()` lub `.pick()` na tych schematach przed wykonaniem mutacji.

### Stałe walidacyjne

W przypadku jednostek wspieranych przez Git (kategorie, kolekcje) stałe walidacyjne są eksportowane jako zwykłe obiekty:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

Odwołują się do nich metody sprawdzania poprawności repozytorium.

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

## Wskazówki dotyczące użytkowania

1. **Zawsze importuj typy z `@/lib/types/`** zamiast ponownie deklarować je w komponentach lub trasach API
2. **Użyj żądań DTO** do sprawdzania poprawności danych wejściowych procedury obsługi API, a nie pełnego modelu danych
3. **Użyj schematów Zoda**, jeśli są dostępne (typy użytkowników) do sprawdzania poprawności środowiska wykonawczego
4. **Użyj stałych walidacyjnych** (kategorie, kolekcje), aby uzyskać spójne ograniczenia pól w interfejsie i zapleczu
5. **Rozszerzaj typy lokalnie** tylko wtedy, gdy potrzebujesz typów pochodnych specyficznych dla komponentu, które nie należą do warstwy współdzielonej

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
