---
id: type-definitions
title: Typ Systeemoverzicht
sidebar_label: Typedefinities
sidebar_position: 41
---

# Typ Systeemoverzicht

De sjabloon centraliseert de TypeScript-typedefinities in `template/lib/types/`. Deze map bevat interfaces, typealiassen, Zod-validatieschema's en aanvraag/antwoord-DTO's die worden gebruikt in repository's, services en API-routes.

**Bronmap:** `template/lib/types/`

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

## Kerndomeintypen

### Artikeltypen (`item.ts`)

Het itemtypesysteem is het meest uitgebreid en bestrijkt de volledige levenscyclus van een directorylijst.

**Sleuteltypen:**

- **`ItemData`** -- het primaire artikelgegevensmodel met velden voor `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at` en meer
- **`CreateItemRequest`** -- DTO voor het maken van items; vereist `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- gedeeltelijke DTO voor artikelupdates; alle velden optioneel
- **`ReviewRequest`** -- bevat `status` (`'approved'` of `'rejected'`) en optioneel `review_notes`
- **`ItemListOptions`** -- filter- en pagineringsopties: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Gebruikerstypen (`user.ts`)

Gebruikerstypen op authenticatieniveau met Zod-validatieschema's.

**Sleuteltypen:**

- **`AuthUserData`** -- vertegenwoordigt een geverifieerd gebruikersrecord (id, e-mail, create_at, etc.)
- **`CreateUserRequest`** -- e-mailadres en wachtwoord voor het aanmaken van gebruikers
- **`UpdateUserRequest`** -- gedeeltelijke updatevelden
- **`UserListOptions`** -- paginering en filteropties
- **`AuthUserListResponse`** -- gepagineerd antwoord met `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- Zod-schema voor volledige validatie van het maken van gebruikers
- **`updateUserValidationSchema`** -- Zod-schema voor gedeeltelijke validatie van gebruikersupdates

### Roltypen (`role.ts`)

Rolgegevenstypen voor het RBAC-systeem.

**Sleuteltypen:**

- **`RoleData`** -- rolrecord met `id`, `name`, `description`, `permissions`, `isDefault`, `status`, tijdstempels
- **`CreateRoleRequest`** -- velden die nodig zijn om een nieuwe rol te maken
- **`UpdateRoleRequest`** -- gedeeltelijke rolupdate
- **`RoleListOptions`** -- filteropties inclusief `status`, zoeken en paginering
- **`RoleWithCount`** -- breidt `RoleData` uit met `userCount` voor beheerdersweergave

### Tagtypen (`tag.ts`)

Taggegevenstypen voor het etiketteer-/taggingsysteem.

**Sleuteltypen:**

- **`TagData`** -- tag record met `id`, `name` en optionele metagegevens
- **`CreateTagRequest`** -- vereist `id` en `name`
- **`UpdateTagRequest`** -- gedeeltelijke tag-update
- **`TagListResponse`** -- gepagineerde taglijst met `tags`, `total`, `page`, `limit`, `totalPages`

### Categorietypen (`category.ts`)

Categoriegegevenstypen voor de organisatietaxonomie.

**Sleuteltypen:**

- **`CategoryData`** -- categorierecord met `id`, `name`, `description` en metagegevens
- **`CategoryWithCount`** -- breidt `CategoryData` uit met een aantal items
- **`CreateCategoryRequest`** -- vereist `id`, `name`, optioneel `description`
- **`UpdateCategoryRequest`** -- gedeeltelijke categorie-update (vereist `id`)
- **`CategoryListOptions`** -- opties voor filteren, sorteren en pagineren
- **`CATEGORY_VALIDATION`** -- constanten voor veldlengtevalidatie (naam min/max, beschrijving max, ID-beperkingen)

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

## Typepatroonconventies

### Verzoek/antwoord DTO's

De codebase volgt een consistent patroon voor objecten voor gegevensoverdracht:

- **`Create[Entity]Request`** -- bevat alle verplichte velden voor creatie
- **`Update[Entity]Request`** -- gedeeltelijk type waarbij de meeste velden optioneel zijn; vereist doorgaans `id`
- **`[Entity]ListOptions`** -- parameters voor filteren, sorteren en pagineren
- **`[Entity]ListResponse`** -- gepagineerd antwoord met `items`, `total`, `page`, `limit`, `totalPages`

### Validatieschema's

Zod-schema's bevinden zich op dezelfde locatie als de overeenkomstige typen:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Opslagplaatsen gebruiken `.parse()` of `.pick()` op deze schema's voordat ze mutaties uitvoeren.

### Validatieconstanten

Voor door Git ondersteunde entiteiten (categorieën, verzamelingen) worden validatieconstanten geëxporteerd als gewone objecten:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

Hiernaar wordt verwezen in repositoryvalidatiemethoden.

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

## Gebruiksrichtlijnen

1. **Importeer typen altijd vanuit `@/lib/types/`** in plaats van ze opnieuw te declareren in componenten of API-routes
2. **Gebruik aanvraag-DTO's** voor invoervalidatie van de API-handler, niet het volledige gegevensmodel
3. **Gebruik Zod-schema's** waar beschikbaar (gebruikerstypen) voor runtime-validatie
4. **Gebruik validatieconstanten** (categorieën, verzamelingen) voor consistente veldbeperkingen in de frontend en backend
5. **Typen alleen lokaal uitbreiden** als u componentspecifieke afgeleide typen nodig hebt die niet in de gedeelde laag thuishoren

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
