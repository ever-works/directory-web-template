---
id: type-definitions
title: Digitare Panoramica del sistema
sidebar_label: Definizioni di tipo
sidebar_position: 41
---

# Digitare Panoramica del sistema

Il modello centralizza le definizioni di tipo TypeScript in `template/lib/types/`. Questa directory contiene interfacce, alias di tipo, schemi di convalida Zod e DTO di richiesta/risposta utilizzati in repository, servizi e percorsi API.

**Directory di origine:** `template/lib/types/`

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

## Tipi di domini principali

### Tipi di elementi (`item.ts`)

Il sistema dei tipi di elementi è il più ampio e copre l'intero ciclo di vita di un elenco di directory.

**Tipi di chiavi:**

- **`ItemData`** -- il modello dati articolo primario con campi per `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at` e altro ancora
- **`CreateItemRequest`** -- DTO per la creazione di oggetti; richiede `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- DTO parziale per gli aggiornamenti degli articoli; tutti i campi sono facoltativi
- **`ReviewRequest`** -- contiene `status` (`'approved'` o `'rejected'`) e opzionale `review_notes`
- **`ItemListOptions`** -- opzioni di filtro e impaginazione: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Tipi di utente (`user.ts`)

Tipi di utenti a livello di autenticazione con schemi di convalida Zod.

**Tipi di chiavi:**

- **`AuthUserData`** -- rappresenta un record utente autenticato (id, email, create_at, ecc.)
- **`CreateUserRequest`** -- email e password per la creazione dell'utente
- **`UpdateUserRequest`** -- campi di aggiornamento parziale
- **`UserListOptions`** -- opzioni di impaginazione e filtro
- **`AuthUserListResponse`** -- risposta impaginata con `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- Schema Zod per la convalida completa della creazione dell'utente
- **`updateUserValidationSchema`** -- Schema Zod per la convalida parziale dell'aggiornamento utente

### Tipi di ruolo (`role.ts`)

Tipi di dati del ruolo per il sistema RBAC.

**Tipi di chiavi:**

- **`RoleData`** -- record del ruolo con `id`, `name`, `description`, `permissions`, `isDefault`, `status`, timestamp
- **`CreateRoleRequest`** -- campi necessari per creare un nuovo ruolo
- **`UpdateRoleRequest`** -- aggiornamento parziale del ruolo
- **`RoleListOptions`** -- opzioni di filtro tra cui `status`, ricerca e impaginazione
- **`RoleWithCount`** -- estende `RoleData` con `userCount` per la visualizzazione amministratore

### Tipi di tag (`tag.ts`)

Tipi di dati dei tag per il sistema di etichettatura/tagging.

**Tipi di chiavi:**

- **`TagData`** -- tag record con `id`, `name` e metadati opzionali
- **`CreateTagRequest`** -- richiede `id` e `name`
- **`UpdateTagRequest`** -- aggiornamento parziale dei tag
- **`TagListResponse`** -- elenco tag impaginato con `tags`, `total`, `page`, `limit`, `totalPages`

### Tipi di categoria (`category.ts`)

Tipi di dati di categoria per la tassonomia organizzativa.

**Tipi di chiavi:**

- **`CategoryData`** -- record di categoria con `id`, `name`, `description` e metadati
- **`CategoryWithCount`** -- estende `CategoryData` con un conteggio degli articoli
- **`CreateCategoryRequest`** -- richiede `id`, `name`, opzionale `description`
- **`UpdateCategoryRequest`** -- aggiornamento parziale della categoria (richiede `id`)
- **`CategoryListOptions`** -- opzioni di filtraggio, ordinamento e impaginazione
- **`CATEGORY_VALIDATION`** -- costanti per la convalida della lunghezza del campo (nome min/max, descrizione max, vincoli ID)

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

## Convenzioni sui modelli di tipo

### DTO di richiesta/risposta

La codebase segue uno schema coerente per gli oggetti di trasferimento dati:

- **`Create[Entity]Request`** -- contiene tutti i campi obbligatori per la creazione
- **`Update[Entity]Request`** -- tipo parziale in cui la maggior parte dei campi sono facoltativi; in genere richiede `id`
- **`[Entity]ListOptions`** -- parametri di filtraggio, ordinamento e impaginazione
- **`[Entity]ListResponse`** -- risposta impaginata con `items`, `total`, `page`, `limit`, `totalPages`

### Schemi di validazione

Gli schemi Zod sono posizionati insieme ai tipi corrispondenti:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

I repository utilizzano `.parse()` o `.pick()` su questi schemi prima di eseguire le mutazioni.

### Costanti di validazione

Per le entità supportate da Git (categorie, raccolte), le costanti di convalida vengono esportate come oggetti semplici:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

A questi si fa riferimento nei metodi di convalida del repository.

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

## Linee guida per l'uso

1. **Importa sempre i tipi da `@/lib/types/`** anziché dichiararli nuovamente in componenti o percorsi API
2. **Utilizza DTO di richiesta** per la convalida dell'input del gestore API, non per il modello dati completo
3. **Utilizzare gli schemi Zod** dove disponibili (tipi di utente) per la convalida del runtime
4. **Utilizza costanti di convalida** (categorie, raccolte) per vincoli di campo coerenti tra frontend e backend
5. **Estendi i tipi localmente** solo quando sono necessari tipi derivati specifici del componente che non appartengono al livello condiviso

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
