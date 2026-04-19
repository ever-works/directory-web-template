---
id: type-definitions
title: Überblick über das Typsystem
sidebar_label: Typdefinitionen
sidebar_position: 41
---

# Überblick über das Typsystem

Die Vorlage zentralisiert ihre TypeScript-Typdefinitionen in `template/lib/types/`. Dieses Verzeichnis enthält Schnittstellen, Typaliase, Zod-Validierungsschemata und Anforderungs-/Antwort-DTOs, die in Repositorys, Diensten und API-Routen verwendet werden.

**Quellverzeichnis:** `template/lib/types/`

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

## Kerndomänentypen

### Artikeltypen (`item.ts`)

Das Elementtypsystem ist das umfangreichste und deckt den gesamten Lebenszyklus eines Verzeichniseintrags ab.

**Schlüsseltypen:**

- **`ItemData`** – das primäre Artikeldatenmodell mit Feldern für `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at` und mehr
- **`CreateItemRequest`** – DTO für die Artikelerstellung; erfordert `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** – Teil-DTO für Artikelaktualisierungen; Alle Felder sind optional
- **`ReviewRequest`** – enthält `status` (`'approved'` oder `'rejected'`) und optional `review_notes`
- **`ItemListOptions`** – Filter- und Paginierungsoptionen: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Benutzertypen (`user.ts`)

Benutzertypen auf Authentifizierungsebene mit Zod-Validierungsschemata.

**Schlüsseltypen:**

- **`AuthUserData`** – stellt einen authentifizierten Benutzerdatensatz dar (ID, E-Mail, erstelltes_at usw.)
- **`CreateUserRequest`** – E-Mail und Passwort für die Benutzererstellung
- **`UpdateUserRequest`** – teilweise Aktualisierungsfelder
- **`UserListOptions`** – Paginierungs- und Filteroptionen
- **`AuthUserListResponse`** – paginierte Antwort mit `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** – Zod-Schema für die vollständige Validierung der Benutzererstellung
- **`updateUserValidationSchema`** – Zod-Schema für die teilweise Validierung von Benutzeraktualisierungen

### Rollentypen (`role.ts`)

Rollendatentypen für das RBAC-System.

**Schlüsseltypen:**

- **`RoleData`** – Rollendatensatz mit `id`, `name`, `description`, `permissions`, `isDefault`, `status`, Zeitstempeln
- **`CreateRoleRequest`** – Felder, die zum Erstellen einer neuen Rolle erforderlich sind
- **`UpdateRoleRequest`** – teilweise Rollenaktualisierung
- **`RoleListOptions`** – Filteroptionen einschließlich `status`, Suche und Paginierung
- **`RoleWithCount`** – erweitert `RoleData` um `userCount` für die Admin-Anzeige

### Tag-Typen (`tag.ts`)

Tag-Datentypen für das Etikettier-/Tagging-System.

**Schlüsseltypen:**

- **`TagData`** – Tag-Datensatz mit `id`, `name` und optionalen Metadaten
- **`CreateTagRequest`** – erfordert `id` und `name`
- **`UpdateTagRequest`** – teilweise Tag-Aktualisierung
- **`TagListResponse`** – paginierte Tag-Liste mit `tags`, `total`, `page`, `limit`, `totalPages`

### Kategorietypen (`category.ts`)

Kategoriedatentypen für die Organisationstaxonomie.

**Schlüsseltypen:**

- **`CategoryData`** – Kategoriedatensatz mit `id`, `name`, `description` und Metadaten
- **`CategoryWithCount`** – erweitert `CategoryData` um eine Artikelanzahl
- **`CreateCategoryRequest`** – erfordert `id`, `name`, optional `description`
- **`UpdateCategoryRequest`** – teilweise Aktualisierung der Kategorie (erfordert `id`)
- **`CategoryListOptions`** – Filter-, Sortier- und Paginierungsoptionen
- **`CATEGORY_VALIDATION`** – Konstanten für die Feldlängenvalidierung (Name min./max., Beschreibung max., ID-Einschränkungen)

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

## Typmusterkonventionen

### Anfrage-/Antwort-DTOs

Die Codebasis folgt einem konsistenten Muster für Datenübertragungsobjekte:

- **`Create[Entity]Request`** – enthält alle erforderlichen Felder für die Erstellung
- **`Update[Entity]Request`** – Teiltyp, bei dem die meisten Felder optional sind; erfordert normalerweise `id`
- **`[Entity]ListOptions`** – Filter-, Sortier- und Paginierungsparameter
- **`[Entity]ListResponse`** – paginierte Antwort mit `items`, `total`, `page`, `limit`, `totalPages`

### Validierungsschemata

Zod-Schemata befinden sich zusammen mit ihren entsprechenden Typen:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Repositorys verwenden `.parse()` oder `.pick()` für diese Schemata, bevor sie Mutationen ausführen.

### Validierungskonstanten

Für Git-gestützte Entitäten (Kategorien, Sammlungen) werden Validierungskonstanten als einfache Objekte exportiert:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

Auf diese wird in Repository-Validierungsmethoden verwiesen.

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

## Nutzungsrichtlinien

1. **Importieren Sie immer Typen aus `@/lib/types/`**, anstatt sie in Komponenten oder API-Routen erneut zu deklarieren
2. **Verwenden Sie Anforderungs-DTOs** für die Validierung der API-Handler-Eingabe, nicht das vollständige Datenmodell
3. **Verwenden Sie Zod-Schemas**, sofern verfügbar (Benutzertypen), für die Laufzeitvalidierung
4. **Verwenden Sie Validierungskonstanten** (Kategorien, Sammlungen) für konsistente Feldeinschränkungen im Frontend und Backend
5. **Erweitern Sie Typen lokal** nur, wenn Sie komponentenspezifische abgeleitete Typen benötigen, die nicht zur gemeinsam genutzten Ebene gehören

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
